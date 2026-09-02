import { useState, useCallback, useMemo, useEffect } from "react";
import {
  VideoDownloadItem,
  DownloaderConfig,
  DownloaderLogEntry,
  BatchStats
} from "../types";
import {
  downloaderService,
  scanUrls,
  deleteJob
} from "../services/downloaderService";
import { batchDownloaderWorkerService } from "../services/batchDownloaderWorkerService";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";

const DEFAULT_CONFIG: DownloaderConfig = {
  saveDirectory: "D:\\Downloads\\CreatorOS\\BatchVault",
  cookieHeader: "passport_csrf_token=9fa81b2; sessionid=cr_892246381;",
  proxyServer: "http://127.0.0.1:7890 (Clash Auto-Rotate)",
  concurrency: 4,
  removeWatermark: true,
  extractMp3: true,
  extractSubtitles: true,
  gpuAcceleration: true,
  preferredQuality: "original",
  autoOrganizeByAuthor: true,
  format: "both"
};

const INITIAL_QUEUE_ITEMS: VideoDownloadItem[] = [];

export function useBatchDownloader() {
  const { addToast } = useToast();

  const [rawUrlInput, setRawUrlInput] = useState<string>("");
  const [items, setItems] = useState<VideoDownloadItem[]>(INITIAL_QUEUE_ITEMS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<DownloaderConfig>(DEFAULT_CONFIG);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [logs, setLogs] = useState<DownloaderLogEntry[]>([
    {
      id: "log_1",
      timestamp: "14:20:01",
      type: "info",
      message: "CreatorOS FastCrawl Core V5 initialized with Dual-NVENC acceleration."
    },
    {
      id: "log_2",
      timestamp: "14:20:05",
      type: "success",
      message: "Proxy tunnel active: 127.0.0.1:7890 (Zero-drop streaming mode)."
    }
  ]);

  const addLog = useCallback((type: DownloaderLogEntry["type"], message: string) => {
    const newEntry: DownloaderLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
      type,
      message
    };
    setLogs((prev) => [...prev.slice(-100), newEntry]);
  }, []);

  // Subscribe to Background Worker Service events (Progress, State, Logs)
  useEffect(() => {
    const unsubProgress = batchDownloaderWorkerService.onProgress((prog) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === prog.jobId
            ? {
                ...item,
                progress: prog.progress,
                speed: prog.speed,
                eta: prog.etaSeconds !== undefined ? `${prog.etaSeconds}s` : item.eta
              }
            : item
        )
      );
    });

    const unsubState = batchDownloaderWorkerService.onTaskState((state) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== state.jobId) return item;
          const updated: VideoDownloadItem = {
            ...item,
            status: state.status as any,
            filePath: state.filePath || item.filePath,
            audioPath: state.audioPath || item.audioPath
          };
          if (state.status === "completed") {
            updated.progress = 100;
            updated.speed = "0 MB/s";
            updated.eta = "0s";
          } else if (state.status === "canceled") {
            updated.speed = "0 MB/s";
            updated.eta = "Đã hủy";
          } else if (state.status === "error") {
            updated.speed = "0 MB/s";
            updated.eta = "Lỗi";
          }
          return updated;
        })
      );
    });

    const unsubLog = batchDownloaderWorkerService.onLog((type, msg) => {
      addLog(type as any, msg);
    });

    return () => {
      unsubProgress();
      unsubState();
      unsubLog();
    };
  }, [addLog]);

  // Keep worker concurrency in sync with config
  useEffect(() => {
    batchDownloaderWorkerService.setConcurrency(config.concurrency || 4);
  }, [config.concurrency]);

  // Compute parsed URL count from raw text
  const detectedUrls = useMemo(() => {
    return downloaderService.extractUrls(rawUrlInput);
  }, [rawUrlInput]);

  // Filtered queue items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, platformFilter, statusFilter, searchQuery]);

  // Batch stats summary
  const stats: BatchStats = useMemo(() => {
    return {
      total: items.length,
      completed: items.filter((i) => i.status === "completed").length,
      downloading: items.filter((i) => i.status === "downloading" || i.status === "extracting_audio").length,
      queued: items.filter((i) => i.status === "queued").length,
      failed: items.filter((i) => i.status === "error").length,
      totalDownloadedMb: items
        .filter((i) => i.status === "completed")
        .reduce((acc, i) => acc + (parseFloat(i.fileSize) || 0), 0)
    };
  }, [items]);

  // Action: Start Batch Scan via Backend API
  const handleStartScan = useCallback(async () => {
    if (detectedUrls.length === 0) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng dán ít nhất 1 đường link hợp lệ vào khung nhập liệu!", "warning");
      return;
    }

    setIsScanning(true);
    soundSynth.playSfx("pop");
    addLog("info", `[IPC] Đang gửi yêu cầu quét metadata cho ${detectedUrls.length} liên kết tới backend...`);

    try {
      // Call actual backend scan API
      const result = await scanUrls(detectedUrls, {
        extractCover: true,
        detectAudio: true
      });

      if (result.success && result.items.length > 0) {
        setItems((prev) => [...result.items, ...prev]);
        setSelectedIds(new Set(result.items.map((n) => n.id)));
        setRawUrlInput("");
        addLog("success", `[IPC Quét xong] Đã nạp ${result.items.length} video với đầy đủ thông số độ phân giải và tác giả.`);
        soundSynth.playSfx("success");
        addToast(`Đã thêm thành công ${result.items.length} video vào danh sách chờ tải!`, "success");
      } else {
        throw new Error("Không thể trích xuất video từ danh sách liên kết.");
      }
    } catch (err: any) {
      addLog("error", `Lỗi quét URL: ${err.message || "Unknown error"}`);
      addToast(`Lỗi quét liên kết: ${err.message}`, "error");
    } finally {
      setIsScanning(false);
    }
  }, [detectedUrls, addLog, addToast]);

  // Action: Start Downloading Selected via Background Worker Service
  const handleDownloadSelected = useCallback(async () => {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : items.map((i) => i.id);
    const toDownload = items.filter((i) => targetIds.includes(i.id) && i.status !== "completed");

    if (toDownload.length === 0) {
      soundSynth.playSfx("pop");
      addToast("Không có video nào ở trạng thái chờ tải trong danh sách đã chọn.", "info");
      return;
    }

    setIsDownloading(true);
    soundSynth.playSfx("pop");
    addLog("nvenc", `[WorkerService] Đang chuyển giao ${toDownload.length} tác vụ sang Background Worker Service...`);

    try {
      // Execute all download jobs asynchronously using the Semaphore-managed Worker Service
      const tasks = toDownload.map((item) =>
        batchDownloaderWorkerService.executeTask(item, config)
      );

      await Promise.allSettled(tasks);

      soundSynth.playSfx("success");
      addToast(`Đã hoàn thành xử lý hàng đợi ${toDownload.length} tác vụ!`, "success");
    } catch (err: any) {
      addLog("error", `Lỗi tiến trình Worker Service: ${err.message}`);
      addToast(`Lỗi hàng đợi Worker: ${err.message}`, "error");
    } finally {
      setIsDownloading(false);
    }
  }, [selectedIds, items, config, addLog, addToast]);

  // Action: Remove / Cancel Item via API
  const handleRemoveItem = useCallback(async (id: string) => {
    soundSynth.playSfx("pop");
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // Notify backend to cancel / delete job
    try {
      await deleteJob(id);
      addLog("info", `Đã hủy tác vụ [${id}] khỏi hàng đợi.`);
    } catch {
      // Local removal succeeded
    }
  }, [addLog]);

  // Action: Cancel Single Task via CancellationToken
  const handleCancelTask = useCallback((jobId: string) => {
    soundSynth.playSfx("pop");
    const cancelled = batchDownloaderWorkerService.cancelTask(jobId, "Người dùng bấm hủy tác vụ");
    if (cancelled) {
      addToast(`Đã hủy tác vụ [${jobId}] thành công.`, "info");
      addLog("warning", `[CancellationToken] Hủy thành công tác vụ [${jobId}]`);
    } else {
      handleRemoveItem(jobId);
    }
  }, [addToast, addLog, handleRemoveItem]);

  // Action: Cancel All Active Downloads
  const handleCancelAll = useCallback(() => {
    soundSynth.playSfx("whoosh");
    batchDownloaderWorkerService.cancelAll("Người dùng bấm dừng toàn bộ");
    addToast("Đã gửi tín hiệu hủy toàn bộ tiến trình tải xuống.", "warning");
    addLog("warning", "[CancellationToken] Đã hủy toàn bộ tác vụ trong hàng đợi Worker.");
  }, [addToast, addLog]);

  // Action: Clear Queue
  const handleClearQueue = useCallback(() => {
    soundSynth.playSfx("pop");
    setItems([]);
    setSelectedIds(new Set());
    addLog("info", "Đã dọn dẹp sạch toàn bộ hàng đợi tải.");
    addToast("Đã xóa toàn bộ danh sách hàng đợi.", "info");
  }, [addLog, addToast]);

  // Action: Toggle Select All
  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  }, [selectedIds, filteredItems]);

  // Action: Toggle Single Selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    rawUrlInput,
    setRawUrlInput,
    detectedUrls,
    items,
    filteredItems,
    selectedIds,
    config,
    setConfig,
    isScanning,
    isDownloading,
    platformFilter,
    setPlatformFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    logs,
    addLog,
    stats,
    handleStartScan,
    handleDownloadSelected,
    handleCancelTask,
    handleCancelAll,
    handleClearQueue,
    handleToggleSelectAll,
    handleToggleSelect,
    handleRemoveItem
  };
}
