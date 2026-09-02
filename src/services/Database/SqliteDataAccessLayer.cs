using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace CreatorOS.Services.Database
{
    /// <summary>
    /// Giao diện Data Access Layer (DAL) chuẩn cho các thao tác CSDL SQLite bất đồng bộ
    /// </summary>
    public interface ISqliteDataAccessLayer
    {
        Task<int> ExecuteNonQueryAsync(
            string sql,
            object? parameters = null,
            CancellationToken cancellationToken = default);

        Task<T?> ExecuteScalarAsync<T>(
            string sql,
            object? parameters = null,
            CancellationToken cancellationToken = default);

        Task<T?> QuerySingleOrDefaultAsync<T>(
            string sql,
            Func<DbDataReader, T> mapper,
            object? parameters = null,
            CancellationToken cancellationToken = default);

        Task<List<T>> QueryListAsync<T>(
            string sql,
            Func<DbDataReader, T> mapper,
            object? parameters = null,
            CancellationToken cancellationToken = default);

        Task ExecuteInTransactionAsync(
            Func<SqliteConnection, SqliteTransaction, Task> transactionalWork,
            CancellationToken cancellationToken = default);

        Task<T> ExecuteInTransactionAsync<T>(
            Func<SqliteConnection, SqliteTransaction, Task<T>> transactionalWork,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Triển khai Data Access Layer tối ưu hóa cho Microsoft.Data.Sqlite:
    /// - Quản lý vòng đời kết nối an toàn với 'await using' (ngăn chặn triệt để rò rỉ unmanaged handle)
    /// - Chống SQL Injection tuyệt đối qua Parameterized Commands
    /// - Cơ chế Retry tự động khi gặp trạng thái SQLite Busy/Locked ngẫu nhiên
    /// </summary>
    public class SqliteDataAccessLayer : ISqliteDataAccessLayer
    {
        private readonly ISqliteConnectionFactory _connectionFactory;
        private const int MaxLockRetries = 3;
        private const int BaseBackoffDelayMs = 50;

        public SqliteDataAccessLayer(ISqliteConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }

        public async Task<int> ExecuteNonQueryAsync(
            string sql,
            object? parameters = null,
            CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                // Sử dụng 'await using' đảm bảo connection và command được giải phóng ngay cả khi có Exception
                await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken).ConfigureAwait(false);
                await using var command = CreateCommand(connection, null, sql, parameters);

                return await command.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
            }, cancellationToken).ConfigureAwait(false);
        }

        public async Task<T?> ExecuteScalarAsync<T>(
            string sql,
            object? parameters = null,
            CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken).ConfigureAwait(false);
                await using var command = CreateCommand(connection, null, sql, parameters);

                var rawResult = await command.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
                if (rawResult == null || rawResult == DBNull.Value)
                {
                    return default;
                }

                if (typeof(T) == typeof(Guid) && rawResult is string strGuid)
                {
                    return (T)(object)Guid.Parse(strGuid);
                }

                return (T)Convert.ChangeType(rawResult, typeof(T));
            }, cancellationToken).ConfigureAwait(false);
        }

        public async Task<T?> QuerySingleOrDefaultAsync<T>(
            string sql,
            Func<DbDataReader, T> mapper,
            object? parameters = null,
            CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken).ConfigureAwait(false);
                await using var command = CreateCommand(connection, null, sql, parameters);

                // CommandBehavior.SingleRow tối ưu hóa đọc 1 bản ghi duy nhất
                await using var reader = await command.ExecuteReaderAsync(CommandBehavior.SingleRow, cancellationToken).ConfigureAwait(false);

                if (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
                {
                    return mapper(reader);
                }

                return default;
            }, cancellationToken).ConfigureAwait(false);
        }

        public async Task<List<T>> QueryListAsync<T>(
            string sql,
            Func<DbDataReader, T> mapper,
            object? parameters = null,
            CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken).ConfigureAwait(false);
                await using var command = CreateCommand(connection, null, sql, parameters);

                await using var reader = await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);

                var results = new List<T>();
                while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
                {
                    results.Add(mapper(reader));
                }

                return results;
            }, cancellationToken).ConfigureAwait(false);
        }

        public async Task ExecuteInTransactionAsync(
            Func<SqliteConnection, SqliteTransaction, Task> transactionalWork,
            CancellationToken cancellationToken = default)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken).ConfigureAwait(false);
                
                // Kích hoạt Deferred/Immediate transaction an toàn
                await using var transaction = (SqliteTransaction)await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken).ConfigureAwait(false);

                try
                {
                    await transactionalWork(connection, transaction).ConfigureAwait(false);
                    await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
                }
                catch
                {
                    // Tự động Rollback khi gặp lỗi
                    try
                    {
                        await transaction.RollbackAsync(cancellationToken).ConfigureAwait(false);
                    }
                    catch
                    {
                        // Bỏ qua lỗi rollback phụ nếu connection đã đứt
                    }
                    throw;
                }

                return true;
            }, cancellationToken).ConfigureAwait(false);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(
            Func<SqliteConnection, SqliteTransaction, Task<T>> transactionalWork,
            CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken).ConfigureAwait(false);
                await using var transaction = (SqliteTransaction)await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken).ConfigureAwait(false);

                try
                {
                    var result = await transactionalWork(connection, transaction).ConfigureAwait(false);
                    await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
                    return result;
                }
                catch
                {
                    try
                    {
                        await transaction.RollbackAsync(cancellationToken).ConfigureAwait(false);
                    }
                    catch
                    {
                        // Ignore secondary rollback issues
                    }
                    throw;
                }
            }, cancellationToken).ConfigureAwait(false);
        }

        /// <summary>
        /// Tạo SqliteCommand với danh sách tham số dạng Parameterized an toàn
        /// </summary>
        public static SqliteCommand CreateCommand(
            SqliteConnection connection,
            SqliteTransaction? transaction,
            string sql,
            object? parameters)
        {
            var command = connection.CreateCommand();
            command.CommandText = sql;
            if (transaction != null)
            {
                command.Transaction = transaction;
            }

            if (parameters != null)
            {
                if (parameters is IEnumerable<SqliteParameter> paramList)
                {
                    foreach (var p in paramList)
                    {
                        command.Parameters.Add(p);
                    }
                }
                else if (parameters is IDictionary<string, object?> dict)
                {
                    foreach (var kvp in dict)
                    {
                        var paramName = kvp.Key.StartsWith("@") ? kvp.Key : "@" + kvp.Key;
                        command.Parameters.AddWithValue(paramName, kvp.Value ?? DBNull.Value);
                    }
                }
                else
                {
                    // Reflection ánh xạ thuộc tính đối tượng ẩn danh (Anonymous Object)
                    var props = parameters.GetType().GetProperties();
                    foreach (var prop in props)
                    {
                        var value = prop.GetValue(parameters);
                        command.Parameters.AddWithValue("@" + prop.Name, value ?? DBNull.Value);
                    }
                }
            }

            return command;
        }

        /// <summary>
        /// Thực thi với cơ chế Retry khi gặp ngoại lệ SQLite Locked/Busy (Error Code 5)
        /// </summary>
        private static async Task<TResult> ExecuteWithRetryAsync<TResult>(
            Func<Task<TResult>> operation,
            CancellationToken cancellationToken)
        {
            int attempt = 0;
            while (true)
            {
                attempt++;
                try
                {
                    return await operation().ConfigureAwait(false);
                }
                catch (SqliteException ex) when (ex.SqliteErrorCode == 5 /* SQLITE_BUSY */ || ex.SqliteErrorCode == 6 /* SQLITE_LOCKED */)
                {
                    if (attempt > MaxLockRetries)
                    {
                        throw new InvalidOperationException($"Cơ sở dữ liệu đang bị khóa sau {MaxLockRetries} lần thử lại.", ex);
                    }

                    int delayMs = BaseBackoffDelayMs * (int)Math.Pow(2, attempt - 1);
                    await Task.Delay(delayMs, cancellationToken).ConfigureAwait(false);
                }
            }
        }
    }
}
