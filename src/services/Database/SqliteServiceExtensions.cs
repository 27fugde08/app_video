using System;
using Microsoft.Extensions.DependencyInjection;
using CreatorOS.Services.Database.Repositories;

namespace CreatorOS.Services.Database
{
    /// <summary>
    /// Tiện ích đăng ký Dependency Injection cho SQLite Data Access Layer trong .NET Desktop App
    /// </summary>
    public static class SqliteServiceExtensions
    {
        public static IServiceCollection AddCreatorOSSqliteDatabase(
            this IServiceCollection services,
            Action<SqliteDbConfiguration>? configure = null)
        {
            var config = new SqliteDbConfiguration();
            configure?.Invoke(config);

            services.AddSingleton(config);
            services.AddSingleton<ISqliteConnectionFactory, SqliteConnectionFactory>();
            services.AddScoped<ISqliteDataAccessLayer, SqliteDataAccessLayer>();
            services.AddScoped<IMediaProjectRepository, MediaProjectRepository>();

            return services;
        }
    }
}
