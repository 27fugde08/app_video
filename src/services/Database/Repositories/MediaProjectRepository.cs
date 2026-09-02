using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Services.Database.Entities;
using Microsoft.Data.Sqlite;

namespace CreatorOS.Services.Database.Repositories
{
    /// <summary>
    /// Giao diện Repository quản lý dữ liệu Video Projects
    /// </summary>
    public interface IMediaProjectRepository
    {
        Task InitializeDatabaseSchemaAsync(CancellationToken cancellationToken = default);
        Task<int> CreateAsync(VideoProjectEntity project, CancellationToken cancellationToken = default);
        Task<VideoProjectEntity?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
        Task<List<VideoProjectEntity>> GetAllAsync(int limit = 50, int offset = 0, CancellationToken cancellationToken = default);
        Task<List<VideoProjectEntity>> GetByStatusAsync(VideoProjectStatus status, CancellationToken cancellationToken = default);
        Task<int> UpdateStatusAndProgressAsync(string id, VideoProjectStatus status, double progress, string? errorMessage = null, CancellationToken cancellationToken = default);
        Task<int> UpdateRenderedPathAsync(string id, string renderedPath, long fileSizeBytes, CancellationToken cancellationToken = default);
        Task<int> DeleteAsync(string id, CancellationToken cancellationToken = default);
        Task<int> BatchInsertAsync(IEnumerable<VideoProjectEntity> projects, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Triển khai Repository sử dụng Microsoft.Data.Sqlite DAL với async/await, WAL mode và transaction an toàn
    /// </summary>
    public class MediaProjectRepository : IMediaProjectRepository
    {
        private readonly ISqliteDataAccessLayer _dal;

        public MediaProjectRepository(ISqliteDataAccessLayer dal)
        {
            _dal = dal ?? throw new ArgumentNullException(nameof(dal));
        }

        /// <summary>
        /// Khởi tạo cấu trúc bảng CSDL và chỉ mục (Indexes) nếu chưa tồn tại
        /// </summary>
        public async Task InitializeDatabaseSchemaAsync(CancellationToken cancellationToken = default)
        {
            const string createTablesSql = @"
                CREATE TABLE IF NOT EXISTS VideoProjects (
                    Id TEXT PRIMARY KEY NOT NULL,
                    Title TEXT NOT NULL,
                    SourceUrl TEXT,
                    SourcePlatform TEXT NOT NULL DEFAULT 'unknown',
                    RawFilePath TEXT,
                    RenderedFilePath TEXT,
                    Status INTEGER NOT NULL DEFAULT 0,
                    ProgressPercent REAL NOT NULL DEFAULT 0.0,
                    FileSizeBytes INTEGER NOT NULL DEFAULT 0,
                    DurationSeconds REAL NOT NULL DEFAULT 0.0,
                    ErrorMessage TEXT,
                    SettingsJson TEXT NOT NULL DEFAULT '{}',
                    CreatedAtUtc TEXT NOT NULL,
                    UpdatedAtUtc TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS IX_VideoProjects_Status ON VideoProjects(Status);
                CREATE INDEX IF NOT EXISTS IX_VideoProjects_CreatedAt ON VideoProjects(CreatedAtUtc DESC);
                CREATE INDEX IF NOT EXISTS IX_VideoProjects_Platform ON VideoProjects(SourcePlatform);
            ";

            await _dal.ExecuteNonQueryAsync(createTablesSql, null, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Thêm mới 1 dự án video bất đồng bộ (Create)
        /// </summary>
        public async Task<int> CreateAsync(VideoProjectEntity project, CancellationToken cancellationToken = default)
        {
            const string sql = @"
                INSERT INTO VideoProjects (
                    Id, Title, SourceUrl, SourcePlatform, RawFilePath, RenderedFilePath,
                    Status, ProgressPercent, FileSizeBytes, DurationSeconds, ErrorMessage,
                    SettingsJson, CreatedAtUtc, UpdatedAtUtc
                ) VALUES (
                    @Id, @Title, @SourceUrl, @SourcePlatform, @RawFilePath, @RenderedFilePath,
                    @Status, @ProgressPercent, @FileSizeBytes, @DurationSeconds, @ErrorMessage,
                    @SettingsJson, @CreatedAtUtc, @UpdatedAtUtc
                );
            ";

            var parameters = new
            {
                Id = project.Id,
                Title = project.Title,
                SourceUrl = project.SourceUrl,
                SourcePlatform = project.SourcePlatform,
                RawFilePath = project.RawFilePath,
                RenderedFilePath = project.RenderedFilePath,
                Status = (int)project.Status,
                ProgressPercent = project.ProgressPercent,
                FileSizeBytes = project.FileSizeBytes,
                DurationSeconds = project.DurationSeconds,
                ErrorMessage = project.ErrorMessage,
                SettingsJson = project.SettingsJson,
                CreatedAtUtc = project.CreatedAtUtc.ToString("o"),
                UpdatedAtUtc = project.UpdatedAtUtc.ToString("o")
            };

            return await _dal.ExecuteNonQueryAsync(sql, parameters, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Lấy chi tiết dự án theo khóa chính Id (Read Single)
        /// </summary>
        public async Task<VideoProjectEntity?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            const string sql = "SELECT * FROM VideoProjects WHERE Id = @Id LIMIT 1;";
            return await _dal.QuerySingleOrDefaultAsync(sql, MapEntity, new { Id = id }, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Lấy danh sách dự án có phân trang (Read List)
        /// </summary>
        public async Task<List<VideoProjectEntity>> GetAllAsync(int limit = 50, int offset = 0, CancellationToken cancellationToken = default)
        {
            const string sql = "SELECT * FROM VideoProjects ORDER BY CreatedAtUtc DESC LIMIT @Limit OFFSET @Offset;";
            return await _dal.QueryListAsync(sql, MapEntity, new { Limit = limit, Offset = offset }, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Lấy danh sách dự án theo trạng thái (Queued, Processing, etc.)
        /// </summary>
        public async Task<List<VideoProjectEntity>> GetByStatusAsync(VideoProjectStatus status, CancellationToken cancellationToken = default)
        {
            const string sql = "SELECT * FROM VideoProjects WHERE Status = @Status ORDER BY CreatedAtUtc ASC;";
            return await _dal.QueryListAsync(sql, MapEntity, new { Status = (int)status }, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Cập nhật trạng thái và tiến độ xử lý của tác vụ (Update Status & Progress)
        /// </summary>
        public async Task<int> UpdateStatusAndProgressAsync(
            string id,
            VideoProjectStatus status,
            double progress,
            string? errorMessage = null,
            CancellationToken cancellationToken = default)
        {
            const string sql = @"
                UPDATE VideoProjects
                SET Status = @Status,
                    ProgressPercent = @Progress,
                    ErrorMessage = COALESCE(@ErrorMessage, ErrorMessage),
                    UpdatedAtUtc = @UpdatedAtUtc
                WHERE Id = @Id;
            ";

            var parameters = new
            {
                Id = id,
                Status = (int)status,
                Progress = progress,
                ErrorMessage = errorMessage ?? (object)DBNull.Value,
                UpdatedAtUtc = DateTime.UtcNow.ToString("o")
            };

            return await _dal.ExecuteNonQueryAsync(sql, parameters, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Cập nhật đường dẫn file thành phẩm sau khi render xong
        /// </summary>
        public async Task<int> UpdateRenderedPathAsync(
            string id,
            string renderedPath,
            long fileSizeBytes,
            CancellationToken cancellationToken = default)
        {
            const string sql = @"
                UPDATE VideoProjects
                SET RenderedFilePath = @RenderedPath,
                    FileSizeBytes = @FileSizeBytes,
                    Status = @Status,
                    ProgressPercent = 100.0,
                    UpdatedAtUtc = @UpdatedAtUtc
                WHERE Id = @Id;
            ";

            var parameters = new
            {
                Id = id,
                RenderedPath = renderedPath,
                FileSizeBytes = fileSizeBytes,
                Status = (int)VideoProjectStatus.Completed,
                UpdatedAtUtc = DateTime.UtcNow.ToString("o")
            };

            return await _dal.ExecuteNonQueryAsync(sql, parameters, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Xóa dự án theo Id (Delete)
        /// </summary>
        public async Task<int> DeleteAsync(string id, CancellationToken cancellationToken = default)
        {
            const string sql = "DELETE FROM VideoProjects WHERE Id = @Id;";
            return await _dal.ExecuteNonQueryAsync(sql, new { Id = id }, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Thêm hàng loạt dự án trong một Transaction duy nhất (Batch Insert Atomic)
        /// </summary>
        public async Task<int> BatchInsertAsync(IEnumerable<VideoProjectEntity> projects, CancellationToken cancellationToken = default)
        {
            return await _dal.ExecuteInTransactionAsync(async (connection, transaction) =>
            {
                const string sql = @"
                    INSERT INTO VideoProjects (
                        Id, Title, SourceUrl, SourcePlatform, RawFilePath, RenderedFilePath,
                        Status, ProgressPercent, FileSizeBytes, DurationSeconds, ErrorMessage,
                        SettingsJson, CreatedAtUtc, UpdatedAtUtc
                    ) VALUES (
                        @Id, @Title, @SourceUrl, @SourcePlatform, @RawFilePath, @RenderedFilePath,
                        @Status, @ProgressPercent, @FileSizeBytes, @DurationSeconds, @ErrorMessage,
                        @SettingsJson, @CreatedAtUtc, @UpdatedAtUtc
                    );
                ";

                int insertedCount = 0;
                await using var command = connection.CreateCommand();
                command.Transaction = transaction;
                command.CommandText = sql;

                // Chuẩn bị trước các tham số tái sử dụng để đạt tốc độ tối đa
                var pId = command.Parameters.Add("@Id", SqliteType.Text);
                var pTitle = command.Parameters.Add("@Title", SqliteType.Text);
                var pSourceUrl = command.Parameters.Add("@SourceUrl", SqliteType.Text);
                var pSourcePlatform = command.Parameters.Add("@SourcePlatform", SqliteType.Text);
                var pRawFilePath = command.Parameters.Add("@RawFilePath", SqliteType.Text);
                var pRenderedFilePath = command.Parameters.Add("@RenderedFilePath", SqliteType.Text);
                var pStatus = command.Parameters.Add("@Status", SqliteType.Integer);
                var pProgress = command.Parameters.Add("@ProgressPercent", SqliteType.Real);
                var pFileSizeBytes = command.Parameters.Add("@FileSizeBytes", SqliteType.Integer);
                var pDurationSeconds = command.Parameters.Add("@DurationSeconds", SqliteType.Real);
                var pErrorMessage = command.Parameters.Add("@ErrorMessage", SqliteType.Text);
                var pSettingsJson = command.Parameters.Add("@SettingsJson", SqliteType.Text);
                var pCreatedAtUtc = command.Parameters.Add("@CreatedAtUtc", SqliteType.Text);
                var pUpdatedAtUtc = command.Parameters.Add("@UpdatedAtUtc", SqliteType.Text);

                foreach (var project in projects)
                {
                    pId.Value = project.Id;
                    pTitle.Value = project.Title;
                    pSourceUrl.Value = project.SourceUrl ?? (object)DBNull.Value;
                    pSourcePlatform.Value = project.SourcePlatform;
                    pRawFilePath.Value = project.RawFilePath ?? (object)DBNull.Value;
                    pRenderedFilePath.Value = project.RenderedFilePath ?? (object)DBNull.Value;
                    pStatus.Value = (int)project.Status;
                    pProgress.Value = project.ProgressPercent;
                    pFileSizeBytes.Value = project.FileSizeBytes;
                    pDurationSeconds.Value = project.DurationSeconds;
                    pErrorMessage.Value = project.ErrorMessage ?? (object)DBNull.Value;
                    pSettingsJson.Value = project.SettingsJson;
                    pCreatedAtUtc.Value = project.CreatedAtUtc.ToString("o");
                    pUpdatedAtUtc.Value = project.UpdatedAtUtc.ToString("o");

                    insertedCount += await command.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
                }

                return insertedCount;
            }, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Hàm mapper chuyển đổi DbDataReader sang VideoProjectEntity
        /// </summary>
        private static VideoProjectEntity MapEntity(DbDataReader reader)
        {
            return new VideoProjectEntity
            {
                Id = reader.GetString(reader.GetOrdinal("Id")),
                Title = reader.GetString(reader.GetOrdinal("Title")),
                SourceUrl = reader.IsDBNull(reader.GetOrdinal("SourceUrl")) ? string.Empty : reader.GetString(reader.GetOrdinal("SourceUrl")),
                SourcePlatform = reader.GetString(reader.GetOrdinal("SourcePlatform")),
                RawFilePath = reader.IsDBNull(reader.GetOrdinal("RawFilePath")) ? string.Empty : reader.GetString(reader.GetOrdinal("RawFilePath")),
                RenderedFilePath = reader.IsDBNull(reader.GetOrdinal("RenderedFilePath")) ? string.Empty : reader.GetString(reader.GetOrdinal("RenderedFilePath")),
                Status = (VideoProjectStatus)reader.GetInt32(reader.GetOrdinal("Status")),
                ProgressPercent = reader.GetDouble(reader.GetOrdinal("ProgressPercent")),
                FileSizeBytes = reader.GetInt64(reader.GetOrdinal("FileSizeBytes")),
                DurationSeconds = reader.GetDouble(reader.GetOrdinal("DurationSeconds")),
                ErrorMessage = reader.IsDBNull(reader.GetOrdinal("ErrorMessage")) ? string.Empty : reader.GetString(reader.GetOrdinal("ErrorMessage")),
                SettingsJson = reader.GetString(reader.GetOrdinal("SettingsJson")),
                CreatedAtUtc = DateTime.Parse(reader.GetString(reader.GetOrdinal("CreatedAtUtc")), null, System.Globalization.DateTimeStyles.RoundtripKind),
                UpdatedAtUtc = DateTime.Parse(reader.GetString(reader.GetOrdinal("UpdatedAtUtc")), null, System.Globalization.DateTimeStyles.RoundtripKind)
            };
        }
    }
}
