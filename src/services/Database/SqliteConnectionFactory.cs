using System;
using System.Data;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace CreatorOS.Services.Database
{
    /// <summary>
    /// Cấu hình kết nối cơ sở dữ liệu SQLite cho ứng dụng Desktop CreatorOS
    /// </summary>
    public class SqliteDbConfiguration
    {
        /// <summary>
        /// Đường dẫn tệp tin cơ sở dữ liệu .db trên ổ cứng
        /// </summary>
        public string DatabasePath { get; set; } = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "CreatorOS",
            "data",
            "creatoros.db");

        /// <summary>
        /// Thời gian chờ giải phóng khóa trước khi ném ngoại lệ (Busy Timeout tính bằng mili-giây)
        /// </summary>
        public int BusyTimeoutMs { get; set; } = 5000;

        /// <summary>
        /// Bộ nhớ đệm trang SQLite (âm số biểu thị KB, ví dụ -20000 = ~20MB RAM cache)
        /// </summary>
        public int CacheSizeKb { get; set; } = -20000;

        /// <summary>
        /// Bật/tắt chế độ khóa ngoại quan hệ dữ liệu
        /// </summary>
        public bool EnableForeignKeys { get; set; } = true;
    }

    /// <summary>
    /// Factory quản lý và khởi tạo kết nối Microsoft.Data.Sqlite tối ưu hóa hiệu năng cao:
    /// - Kích hoạt WAL Mode (Write-Ahead Logging) cho phép Đọc & Ghi đồng thời từ nhiều luồng
    /// - Đồng bộ synchronous = NORMAL giảm tải I/O đĩa mà vẫn đảm bảo độ bền dữ liệu
    /// - Cấu hình busy_timeout 5s triệt tiêu hiện tượng 'database is locked'
    /// </summary>
    public interface ISqliteConnectionFactory
    {
        /// <summary>
        /// Tạo và mở kết nối bất đồng bộ đã được cấu hình đầy đủ PRAGMA WAL
        /// </summary>
        Task<SqliteConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Lấy chuỗi kết nối đã được chuẩn hóa
        /// </summary>
        string ConnectionString { get; }
    }

    /// <summary>
    /// Triển khai ISqliteConnectionFactory tiêu chuẩn
    /// </summary>
    public class SqliteConnectionFactory : ISqliteConnectionFactory
    {
        private readonly SqliteDbConfiguration _config;
        private readonly string _connectionString;
        private bool _isPragmaInitialized = false;
        private readonly SemaphoreSlim _initLock = new SemaphoreSlim(1, 1);

        public SqliteConnectionFactory(SqliteDbConfiguration? config = null)
        {
            _config = config ?? new SqliteDbConfiguration();

            // Đảm bảo thư mục lưu trữ DB tồn tại trước khi khởi tạo
            var directory = Path.GetDirectoryName(_config.DatabasePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var builder = new SqliteConnectionStringBuilder
            {
                DataSource = _config.DatabasePath,
                Mode = SqliteOpenMode.ReadWriteCreate,
                Cache = SqliteCacheMode.Shared, // Tận dụng cache chia sẻ giữa các luồng
                Pooling = true,
                DefaultTimeout = (int)TimeSpan.FromMilliseconds(_config.BusyTimeoutMs).TotalSeconds
            };

            _connectionString = builder.ToString();
        }

        public string ConnectionString => _connectionString;

        public async Task<SqliteConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken = default)
        {
            var connection = new SqliteConnection(_connectionString);

            try
            {
                await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

                // Cấu hình PRAGMA cho từng kết nối được cấp phát
                await ApplyConnectionPragmasAsync(connection, cancellationToken).ConfigureAwait(false);

                return connection;
            }
            catch
            {
                // Nếu mở lỗi, bắt buộc giải phóng handle ngay lập tức để tránh leak
                await connection.DisposeAsync().ConfigureAwait(false);
                throw;
            }
        }

        /// <summary>
        /// Áp dụng các chỉ thị PRAGMA tối ưu hóa hiệu năng đọc/ghi đa luồng đồng thời
        /// </summary>
        private async Task ApplyConnectionPragmasAsync(SqliteConnection connection, CancellationToken cancellationToken)
        {
            // 1. Cấu hình cấp cơ sở dữ liệu (chỉ cần chạy một lần khi khởi động)
            if (!_isPragmaInitialized)
            {
                await _initLock.WaitAsync(cancellationToken).ConfigureAwait(false);
                try
                {
                    if (!_isPragmaInitialized)
                    {
                        await using (var cmd = connection.CreateCommand())
                        {
                            // BẮT BUỘC: WAL Mode cho phép nhiều Reader và 1 Writer hoạt động cùng lúc mà không khóa lẫn nhau
                            cmd.CommandText = @"
                                PRAGMA journal_mode = WAL;
                                PRAGMA synchronous = NORMAL;
                                PRAGMA temp_store = MEMORY;
                                PRAGMA mmap_size = 268435456; -- 256MB Memory-Mapped I/O
                            ";
                            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
                        }
                        _isPragmaInitialized = true;
                    }
                }
                finally
                {
                    _initLock.Release();
                }
            }

            // 2. Cấu hình cấp phiên kết nối (áp dụng cho từng connection instance)
            await using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = $@"
                    PRAGMA busy_timeout = {_config.BusyTimeoutMs};
                    PRAGMA foreign_keys = {(_config.EnableForeignKeys ? "ON" : "OFF")};
                    PRAGMA cache_size = {_config.CacheSizeKb};
                ";
                await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
            }
        }
    }
}
