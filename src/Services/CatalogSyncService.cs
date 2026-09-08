// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: CatalogSyncService.cs
// Target: C# .NET 9 (SQLite WAL Catalog Synchronizer & WeakReferenceMessenger Broadcast)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using CreatorOS.Core.Models;

namespace CreatorOS.Core.Services;

/// <summary>
/// Thông điệp phát tán qua WeakReferenceMessenger khi một gói sản phẩm được đóng gói thành công.
/// </summary>
public sealed class AssetBundlePackagedMessage : ValueChangedMessage<AssetBundleResult>
{
    public AssetBundlePackagedMessage(AssetBundleResult value) : base(value)
    {
    }
}

/// <summary>
/// CatalogSyncService: Đồng bộ hóa chỉ mục gói tài nguyên vào SQLite WAL và thông báo giao diện.
/// </summary>
public sealed class CatalogSyncService
{
    private readonly VideoIndexDatabase _database;

    public CatalogSyncService(VideoIndexDatabase? database = null)
    {
        _database = database ?? new VideoIndexDatabase();
    }

    /// <summary>
    /// Đồng bộ gói tài nguyên vừa đóng gói vào cơ sở dữ liệu SQLite WAL và thông báo UI.
    /// </summary>
    public async Task<VideoCatalogItem> SyncBundleToCatalogAsync(
        AssetBundleResult bundleResult,
        PathContext context,
        double durationSeconds = 60.0,
        int width = 1080,
        int height = 1920,
        CancellationToken ct = default)
    {
        if (!bundleResult.IsSuccess || string.IsNullOrEmpty(bundleResult.FinalVideoPath))
        {
            throw new InvalidOperationException("Không thể đồng bộ bundle bị lỗi hoặc không có video đích.");
        }

        var fileInfo = new FileInfo(bundleResult.FinalVideoPath);
        long fileSize = fileInfo.Exists ? fileInfo.Length : bundleResult.TotalBundleSizeBytes;

        var item = new VideoCatalogItem
        {
            Id = Guid.NewGuid().ToString("N"),
            FilePath = bundleResult.FinalVideoPath,
            FileName = Path.GetFileName(bundleResult.FinalVideoPath),
            Title = string.IsNullOrWhiteSpace(context.Title) ? Path.GetFileNameWithoutExtension(bundleResult.FinalVideoPath) : context.Title,
            Tags = $"{context.Platform}, {context.Genre}, {context.Lang}, {context.Author}".Trim(',', ' '),
            FileSizeBytes = fileSize,
            DurationSeconds = durationSeconds,
            Width = width,
            Height = height,
            VideoCodec = "h264_nvenc",
            AudioCodec = "aac",
            BitrateKbps = 8000,
            FrameRate = 30.0,
            AspectRatio = height > width ? VideoAspectRatio.Vertical9x16 : VideoAspectRatio.Horizontal16x9,
            EditStatus = VideoEditStatus.Rendered,
            ThumbnailPath = bundleResult.ThumbnailPath,
            CreatedAt = context.CompletionDate == default ? DateTime.UtcNow : context.CompletionDate,
            LastModifiedAt = DateTime.UtcNow
        };

        // Ghi bản ghi vào SQLite WAL qua Batch Upsert (đảm bảo atomic transaction)
        await _database.UpsertBatchAsync(new List<VideoCatalogItem> { item }, ct).ConfigureAwait(false);

        // Phát thông điệp WeakReferenceMessenger để VideoCatalogViewModel nạp trực tiếp thẻ mà không cần quét lại ổ đĩa
        WeakReferenceMessenger.Default.Send(new AssetBundlePackagedMessage(bundleResult));

        return item;
    }
}
