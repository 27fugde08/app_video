import { useState, useCallback, useMemo, useEffect } from "react";
import {
  VideoDownloadItem,
  DownloaderConfig,
  DownloaderLogEntry,
  BatchStats
} from "../types";
import {
  MOCK_DOWNLOAD_TEST_ITEMS,
  MOCK_BACKEND_TEST_LOGS
} from "../data/mockDownloaderTestData";
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
  cookieHeader: "",
  proxyServer: "",
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

      const results = await Promise.allSettled(tasks);

      const downloadedVideos = toDownload.map((item, index) => {
        const result = results[index]?.status === "fulfilled" ? results[index].value : undefined;
        return {
          id: `dl_v_${item.id}`,
          videoId: item.id,
          title: item.title.endsWith(".mp4") ? item.title : `${item.title}.mp4`,
          thumbnail: item.thumbnail,
          duration: item.duration,
          resolution: item.resolution,
          fileSize: item.fileSize,
          platform: item.platform,
          views: item.views || 0,
          likes: item.likes || 0,
          downloadDate: new Date().toLocaleDateString("vi-VN"),
          filePath: result?.filePath || item.filePath || `${config.saveDirectory}\\${item.id}.mp4`,
          hasAudioExtracted: config.extractMp3
        };
      });
      const folderData = {
        id: "f_downloaded_batchvault",
        stt: 1,
        name: "Thư Mục Vừa Tải (BatchVault)",
        videoCount: downloadedVideos.length,
        path: config.saveDirectory,
        platform: downloadedVideos[0]?.platform || "general",
        createdAt: new Date().toLocaleString("vi-VN"),
        totalSize: `${downloadedVideos.reduce((total, video) => total + (parseFloat(video.fileSize) || 0), 0).toFixed(1)} MB`,
        coverImage: downloadedVideos[0]?.thumbnail || "",
        videos: downloadedVideos
      };
      const existingRaw = localStorage.getItem("creatoros_downloaded_folders");
      const existingFolders = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem(
        "creatoros_downloaded_folders",
        JSON.stringify([folderData, ...existingFolders.filter((folder: any) => folder.id !== folderData.id)])
      );
      window.dispatchEvent(new CustomEvent("creatoros:video_downloaded", { detail: folderData }));

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

  // Action: Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Action: Delete Selected Items
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    soundSynth.playSfx("pop");
    const count = selectedIds.size;
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    addLog("info", `Đã xóa ${count} mục đã chọn khỏi hàng đợi.`);
    addToast(`Đã xóa ${count} mục khỏi danh sách.`, "info");
  }, [selectedIds, addLog, addToast]);

  // Action: Retry Failed Items
  const handleRetryFailedTasks = useCallback(() => {
    soundSynth.playSfx("whoosh");
    let count = 0;
    setItems((prev) =>
      prev.map((i) => {
        if (i.status === "error" || i.status === "cancelled") {
          count++;
          return {
            ...i,
            status: "queued",
            progress: 0,
            error: undefined,
            eta: "Đang xếp lại luồng...",
            speed: "0 MB/s"
          };
        }
        return i;
      })
    );
    if (count > 0) {
      addToast(`Đã đưa ${count} tác vụ lỗi/hủy vào lại hàng đợi sẵn sàng tải!`, "success");
      addLog("info", `[Retry Engine] Đã phục hồi ${count} tác vụ lỗi/hủy vào hàng đợi.`);
    } else {
      addToast("Không có tác vụ lỗi nào trong danh sách.", "info");
    }
  }, [addToast, addLog]);

  // Action: Batch Rename
  const handleBatchRename = useCallback(
    (renamedList: { id: string; newTitle: string; newFileName: string }[]) => {
      const map = new Map(renamedList.map((r) => [r.id, r]));
      setItems((prev) =>
        prev.map((item) => {
          const match = map.get(item.id);
          if (match) {
            return {
              ...item,
              title: match.newTitle,
              filePath: item.filePath
                ? item.filePath.replace(/[^\\]+$/, match.newFileName)
                : `D:\\Downloads\\CreatorOS\\BatchVault\\${match.newFileName}`
            };
          }
          return item;
        })
      );
      addLog("success", `Đã áp dụng quy tắc đổi tên cho ${renamedList.length} video.`);
    },
    [addLog]
  );

  // Action: Transfer to AI Dubbing Studio
  const handleBatchTransferToDubbing = useCallback(() => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;
    soundSynth.playSfx("cash");

    // Persist downloaded items to localStorage for TranslateVideoTool
    try {
      const folderData = {
        id: "f_downloaded_batchvault",
        stt: 1,
        folderName: "📁 Thư Mục Vừa Tải (BatchVault)",
        count: selected.length,
        isSelected: true,
        videos: selected.map((s, idx) => ({
          id: `dl_v_${s.id}`,
          title: s.title.endsWith(".mp4") ? s.title : `${s.title}.mp4`,
          duration: s.duration || "01:30",
          size: s.fileSize || "45.2 MB",
          filePath: s.filePath || `D:\\Downloads\\CreatorOS\\BatchVault\\${s.title}.mp4`,
          status: "idle"
        }))
      };
      
      const existingRaw = localStorage.getItem("creatoros_downloaded_folders");
      let existingFolders = [];
      if (existingRaw) {
        try { existingFolders = JSON.parse(existingRaw); } catch {}
      }
      
      // Update or prepend folder
      const filtered = existingFolders.filter((f: any) => f.id !== folderData.id);
      const updatedFolders = [folderData, ...filtered];
      localStorage.setItem("creatoros_downloaded_folders", JSON.stringify(updatedFolders));
      
      window.dispatchEvent(new CustomEvent("creatoros:transferred_videos", { detail: folderData }));
      window.dispatchEvent(new CustomEvent("creatoros:video_downloaded", { detail: folderData }));
    } catch (e) {
      console.warn("Error persisting downloaded folders:", e);
    }

    addToast(
      `Đã chuyển ${selected.length} video vừa tải sang Studio Dịch Lồng Tiếng AI!`,
      "success"
    );
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("creatoros:navigate", { detail: "translate" }));
    }, 600);
  }, [items, selectedIds, addToast]);

  // Action: Load Mock Test Data for Frontend <-> Backend testing
  const handleLoadMockTestData = useCallback(() => {
    soundSynth.playSfx("cash");
    setItems(MOCK_DOWNLOAD_TEST_ITEMS);
    setSelectedIds(new Set([MOCK_DOWNLOAD_TEST_ITEMS[0].id, MOCK_DOWNLOAD_TEST_ITEMS[1].id]));

    // Inject rich test logs
    MOCK_BACKEND_TEST_LOGS.forEach((l) => {
      addLog(l.type, l.message);
    });

    // Sync mock downloaded items for TranslateVideoTool
    try {
      const mockFolder = {
        id: "f_downloaded_batchvault",
        stt: 1,
        folderName: "📁 Thư Mục Vừa Tải (BatchVault)",
        count: MOCK_DOWNLOAD_TEST_ITEMS.length,
        isSelected: true,
        videos: MOCK_DOWNLOAD_TEST_ITEMS.map((item) => ({
          id: `vid_dl_${item.id}`,
          title: item.title.endsWith(".mp4") ? item.title : `${item.title}.mp4`,
          duration: item.duration || "02:15",
          size: item.fileSize || "68.4 MB",
          filePath: item.filePath || `D:\\Downloads\\CreatorOS\\BatchVault\\${item.title}.mp4`,
          status: "idle"
        }))
      };
      localStorage.setItem("creatoros_downloaded_folders", JSON.stringify([mockFolder]));
      window.dispatchEvent(new CustomEvent("creatoros:video_downloaded", { detail: mockFolder }));
    } catch {}

    addToast(
      "🧪 Đã nạp dữ liệu mẫu kiểm thử luồng Frontend ↔ Backend (6 trạng thái, log IPC, Demucs GPU lock)!",
      "success"
    );

    // Dynamic ticker: Increment progress of downloading item to show active responsiveness
    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === "test_job_102" && item.status === "downloading") {
            const nextProgress = Math.min(100, item.progress + 6);
            if (nextProgress >= 100) {
              clearInterval(timer);
              return {
                ...item,
                progress: 100,
                status: "completed",
                eta: "Hoàn tất",
                speed: "0 MB/s"
              };
            }
            return {
              ...item,
              progress: nextProgress,
              speed: `${(15 + Math.random() * 4).toFixed(1)} MB/s (NVENC)`
            };
          }
          return item;
        })
      );
    }, 1800);
  }, [addLog, addToast]);

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
    handleRemoveItem,
    handleClearSelection,
    handleDeleteSelected,
    handleRetryFailedTasks,
    handleBatchRename,
    handleBatchTransferToDubbing,
    handleLoadMockTestData
  };
}
