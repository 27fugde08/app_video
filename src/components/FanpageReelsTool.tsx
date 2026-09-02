import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Flag,
  Video,
  FolderPlus,
  FolderOpen,
  Search,
  Trash2,
  Plus,
  Check,
  X,
  Play,
  Pause,
  Clock,
  Calendar as CalendarIcon,
  Sparkles,
  Chrome,
  Share2,
  FileSpreadsheet,
  Film,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Layers,
  Zap,
  RotateCcw,
  Copy,
  Terminal,
  Settings2,
  Hash,
  FileText
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";

export interface FanpageItem {
  id: string;
  name: string;
  avatar: string;
  pageId: string;
  followers: string;
  category: string;
  groupName?: string;
  status: "active" | "checkpoint" | "expired";
}

export interface VideoFolderItem {
  id: string;
  stt: number;
  folderName: string;
  selectedCount: number;
  totalCount: number;
  videos: {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    size: string;
    selected: boolean;
  }[];
}

export interface UploadHistoryItem {
  id: string;
  videoTitle: string;
  fanpageName: string;
  uploadTime: string;
  status: "success" | "failed";
  caption: string;
  url?: string;
}

const INITIAL_FANPAGES: FanpageItem[] = [
  {
    id: "fp_1",
    name: "Thanh Đắc Lộc (Media Studio)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    pageId: "109847294820194",
    followers: "128.5K",
    category: "Media / Tin tức",
    groupName: "Nhóm Media Chính",
    status: "active"
  },
  {
    id: "fp_2",
    name: "Review Phim & Anime Hay 4K",
    avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&h=100&fit=crop",
    pageId: "294810394857201",
    followers: "84.2K",
    category: "Phim ảnh & Giải trí",
    groupName: "Nhóm Phim Ảnh",
    status: "active"
  },
  {
    id: "fp_3",
    name: "Góc Công Nghệ & AI Trends 2026",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop",
    pageId: "859302194857302",
    followers: "52.0K",
    category: "Khoa học & Công nghệ",
    groupName: "Nhóm Công Nghệ",
    status: "active"
  }
];

const INITIAL_FOLDERS: VideoFolderItem[] = [
  {
    id: "fold_1",
    stt: 1,
    folderName: "深空拾光",
    selectedCount: 0,
    totalCount: 10,
    videos: Array.from({ length: 10 }).map((_, i) => ({
      id: `v_fold1_${i + 1}`,
      title: `shenkong_highlight_recap_part_${String(i + 1).padStart(2, "0")}.mp4`,
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=120&fit=crop",
      duration: "00:58",
      size: "28.4 MB",
      selected: false
    }))
  },
  {
    id: "fold_2",
    stt: 2,
    folderName: "dubbing",
    selectedCount: 0,
    totalCount: 10,
    videos: Array.from({ length: 10 }).map((_, i) => ({
      id: `v_fold2_${i + 1}`,
      title: `vietnamese_dubbing_anime_ep_${String(i + 1).padStart(2, "0")}.mp4`,
      thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=120&fit=crop",
      duration: "01:15",
      size: "34.1 MB",
      selected: false
    }))
  },
  {
    id: "fold_3",
    stt: 3,
    folderName: "dubbing",
    selectedCount: 0,
    totalCount: 1,
    videos: [
      {
        id: "v_fold3_1",
        title: "dubbing_viet_sub_special_trailer.mp4",
        thumbnail: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=120&fit=crop",
        duration: "00:45",
        size: "19.2 MB",
        selected: false
      }
    ]
  },
  {
    id: "fold_4",
    stt: 4,
    folderName: "深空拾光",
    selectedCount: 0,
    totalCount: 16,
    videos: Array.from({ length: 16 }).map((_, i) => ({
      id: `v_fold4_${i + 1}`,
      title: `shenkong_daily_vlog_ep_${String(i + 1).padStart(2, "0")}.mp4`,
      thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=120&fit=crop",
      duration: "01:05",
      size: "31.8 MB",
      selected: false
    }))
  }
];

const INITIAL_UPLOAD_HISTORY: UploadHistoryItem[] = [
  {
    id: "HIST_01",
    videoTitle: "shenkong_highlight_recap_part_01.mp4",
    fanpageName: "Thanh Đắc Lộc (Media Studio)",
    uploadTime: "2026-09-01 09:15:00",
    status: "success",
    caption: "Tập recap mới nhất cực cuốn hút! #reels #viral #trending",
    url: "https://facebook.com/reel/102948572019485"
  },
  {
    id: "HIST_02",
    videoTitle: "vietnamese_dubbing_anime_ep_01.mp4",
    fanpageName: "Review Phim & Anime Hay 4K",
    uploadTime: "2026-08-31 20:30:00",
    status: "success",
    caption: "Lồng tiếng cực chuẩn anime mùa mới #anime #recap",
    url: "https://facebook.com/reel/294810394857201"
  }
];

export const FanpageReelsTool: React.FC = () => {
  const { addToast } = useToast();

  // Top Left: Fanpages tab
  const [activeFanpageTab, setActiveFanpageTab] = useState<"pages" | "groups">("pages");
  const [fanpages, setFanpages] = useState<FanpageItem[]>(INITIAL_FANPAGES);
  const [selectedFanpageIds, setSelectedFanpageIds] = useState<string[]>([]);
  const [fanpageSearch, setFanpageSearch] = useState<string>("");

  // Fanpage range select
  const [fpRangeFrom, setFpRangeFrom] = useState<number>(0);
  const [fpRangeTo, setFpRangeTo] = useState<number>(0);

  // Top Right: Video Folders
  const [folders, setFolders] = useState<VideoFolderItem[]>(INITIAL_FOLDERS);
  const [folderSearch, setFolderSearch] = useState<string>("");
  const [activeFolderModal, setActiveFolderModal] = useState<VideoFolderItem | null>(null);

  // Bottom Settings
  const [skipUploaded, setSkipUploaded] = useState<boolean>(true);
  const [removeHashtags, setRemoveHashtags] = useState<boolean>(false);
  const [removeContent, setRemoveContent] = useState<boolean>(false);
  const [distributeVideos, setDistributeVideos] = useState<boolean>(true);
  const [shareToStory, setShareToStory] = useState<boolean>(false);
  const [useChromeAutomation, setUseChromeAutomation] = useState<boolean>(true);
  const [aiContentMode, setAiContentMode] = useState<string>("none");
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");
  const [delayFrom, setDelayFrom] = useState<number>(1);
  const [delayTo, setDelayTo] = useState<number>(2);

  // Log terminal state
  const [logs, setLogs] = useState<string[]>([
    "[08:30:00] Khởi tạo hệ thống tự động đăng Reels Fanpage Facebook...",
    "[08:30:02] Đã nạp danh sách cấu hình và kiểm tra kết nối Chrome Profiles."
  ]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isVideoPickerModalOpen, setIsVideoPickerModalOpen] = useState<boolean>(false);
  const [isAddFanpageModalOpen, setIsAddFanpageModalOpen] = useState<boolean>(false);
  const [newFanpageName, setNewFanpageName] = useState<string>("");
  const [newFanpageId, setNewFanpageId] = useState<string>("");
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>(INITIAL_UPLOAD_HISTORY);

  // Auto scroll logs
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Filter Fanpages
  const filteredFanpages = useMemo(() => {
    return fanpages.filter((fp) => {
      if (!fanpageSearch.trim()) return true;
      return (
        fp.name.toLowerCase().includes(fanpageSearch.toLowerCase()) ||
        fp.pageId.includes(fanpageSearch) ||
        (fp.groupName && fp.groupName.toLowerCase().includes(fanpageSearch.toLowerCase()))
      );
    });
  }, [fanpages, fanpageSearch]);

  // Filter Folders
  const filteredFolders = useMemo(() => {
    return folders.filter((fold) => {
      if (!folderSearch.trim()) return true;
      return fold.folderName.toLowerCase().includes(folderSearch.toLowerCase());
    });
  }, [folders, folderSearch]);

  // Handle Select All Fanpages
  const isAllFanpagesSelected =
    filteredFanpages.length > 0 &&
    filteredFanpages.every((fp) => selectedFanpageIds.includes(fp.id));

  const handleToggleSelectAllFanpages = () => {
    soundSynth.playSfx("pop");
    if (isAllFanpagesSelected) {
      setSelectedFanpageIds([]);
    } else {
      setSelectedFanpageIds(filteredFanpages.map((fp) => fp.id));
    }
  };

  const handleToggleSelectFanpage = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedFanpageIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Range select fanpages
  const handleRangeSelectFanpages = () => {
    soundSynth.playSfx("pop");
    const from = Math.max(1, fpRangeFrom);
    const to = Math.max(from, fpRangeTo);

    const ids: string[] = [];
    filteredFanpages.forEach((fp, idx) => {
      const order = idx + 1;
      if (order >= from && order <= to) {
        ids.push(fp.id);
      }
    });

    setSelectedFanpageIds(ids);
    addToast(`Đã chọn ${ids.length} fanpage từ số ${from} đến ${to}`, "info");
  };

  // Delete Fanpages
  const handleDeleteFanpages = () => {
    if (selectedFanpageIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 fanpage để xoá!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const toDeleteSet = new Set(selectedFanpageIds);
    setFanpages((prev) => prev.filter((fp) => !toDeleteSet.has(fp.id)));
    setSelectedFanpageIds([]);
    addToast(`Đã xoá ${toDeleteSet.size} fanpage đã chọn!`, "success");
  };

  // Toggle Video in Folder Modal
  const handleToggleVideoInFolder = (folderId: string, videoId: string) => {
    soundSynth.playSfx("pop");
    setFolders((prev) =>
      prev.map((fold) => {
        if (fold.id !== folderId) return fold;
        const updatedVideos = fold.videos.map((v) =>
          v.id === videoId ? { ...v, selected: !v.selected } : v
        );
        const selCount = updatedVideos.filter((v) => v.selected).length;
        return {
          ...fold,
          videos: updatedVideos,
          selectedCount: selCount
        };
      })
    );

    if (activeFolderModal && activeFolderModal.id === folderId) {
      setActiveFolderModal((prev) => {
        if (!prev) return null;
        const updatedVideos = prev.videos.map((v) =>
          v.id === videoId ? { ...v, selected: !v.selected } : v
        );
        return {
          ...prev,
          videos: updatedVideos,
          selectedCount: updatedVideos.filter((v) => v.selected).length
        };
      });
    }
  };

  // Select all videos in folder modal
  const handleToggleSelectAllInFolder = (folderId: string) => {
    soundSynth.playSfx("pop");
    if (!activeFolderModal) return;
    const allSelected = activeFolderModal.videos.every((v) => v.selected);

    setFolders((prev) =>
      prev.map((fold) => {
        if (fold.id !== folderId) return fold;
        const updatedVideos = fold.videos.map((v) => ({ ...v, selected: !allSelected }));
        return {
          ...fold,
          videos: updatedVideos,
          selectedCount: allSelected ? 0 : updatedVideos.length
        };
      })
    );

    setActiveFolderModal((prev) => {
      if (!prev) return null;
      const updatedVideos = prev.videos.map((v) => ({ ...v, selected: !allSelected }));
      return {
        ...prev,
        videos: updatedVideos,
        selectedCount: allSelected ? 0 : updatedVideos.length
      };
    });
  };

  // Execute Post Now
  const handleStartPosting = () => {
    if (fanpages.length === 0) {
      addToast("Chưa có Fanpage nào được thêm vào hệ thống!", "warning");
      return;
    }
    const totalSelectedVideos = folders.reduce((acc, f) => acc + f.selectedCount, 0);
    if (totalSelectedVideos === 0) {
      addToast("Vui lòng nhấn [Xem] ở Thư mục video để tích chọn ít nhất 1 video!", "warning");
      return;
    }

    soundSynth.playSfx("pop");
    setIsRunning(true);
    const targetFp = selectedFanpageIds.length > 0 ? selectedFanpageIds.length : fanpages.length;
    addToast(`Bắt đầu chạy tác vụ đăng Reels lên ${targetFp} Fanpage...`, "info");

    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      `[${timeStr}] 🚀 Bắt đầu phiên đăng Reels tự động...`,
      `[${timeStr}] 🌐 Cơ chế đăng: ${useChromeAutomation ? "Chrome Headless Automation" : "Graph API v20.0"}`,
      `[${timeStr}] 🤖 Chế độ AI Caption: ${aiContentMode !== "none" ? aiContentMode : "Giữ nguyên gốc"}`,
      `[${timeStr}] 📊 Đang phân phối ${totalSelectedVideos} video cho các Fanpage...`
    ]);

    // Simulate progress steps
    setTimeout(() => {
      const t1 = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        `[${t1}] ⏳ Đang mở Profile Chrome #1 -> Fanpage [${fanpages[0]?.name}]...`,
        `[${t1}] 🎬 Đang nạp video và render metadata...`
      ]);
    }, 1200);

    setTimeout(() => {
      const t2 = new Date().toLocaleTimeString();
      const newHistoryItem: UploadHistoryItem = {
        id: `HIST_${Date.now().toString().slice(-4)}`,
        videoTitle: "shenkong_highlight_recap_part_02.mp4",
        fanpageName: fanpages[0]?.name || "Thanh Đắc Lộc (Media Studio)",
        uploadTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        status: "success",
        caption: "Bản tin siêu hot mới nhất hôm nay! #reels #trending",
        url: "https://facebook.com/reel/948201948572018"
      };
      setUploadHistory((prev) => [newHistoryItem, ...prev]);

      setLogs((prev) => [
        ...prev,
        `[${t2}] ✅ ĐĂNG THÀNH CÔNG REELS LÊN [${fanpages[0]?.name}]!`,
        `[${t2}] 🔗 Reel URL: ${newHistoryItem.url}`,
        `[${t2}] ⏱️ Nghỉ ngơi giữa các bài đăng (${delayFrom} - ${delayTo} phút) để an toàn tài khoản...`
      ]);
      soundSynth.playSfx("success");
      setIsRunning(false);
      addToast("Đăng Reels lên Fanpage hoàn tất thành công!", "success");
    }, 2800);
  };

  // Stop posting
  const handleStopPosting = () => {
    soundSynth.playSfx("pop");
    setIsRunning(false);
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timeStr}] 🛑 Đã nhận lệnh dừng tác vụ bởi người dùng.`]);
    addToast("Đã dừng tác vụ đăng bài!", "info");
  };

  // Schedule button
  const handleSchedulePost = () => {
    soundSynth.playSfx("pop");
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      `[${timeStr}] 📅 Đã ghi nhận lịch hẹn đăng: ${scheduledDateTime || "Ngay khung giờ vàng trưa mai"}`
    ]);
    soundSynth.playSfx("success");
    addToast("Đã lên lịch đăng Reels thành công!", "success");
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header & Top Action Buttons (Matching Screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <Flag className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-xs text-rose-400">🚩</span> Đăng reels Fanpage
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Facebook Reels Auto
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Đăng hàng loạt video ngắn lên Fanpage, tự động phân bổ thư mục, làm mới nội dung AI
            </p>
          </div>
        </div>

        {/* Top Action Buttons (Matching Screenshot: [Chọn Video] & [Chọn nhóm Video]) */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {/* Red Button: Chọn Video (#ff2b54) */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsVideoPickerModalOpen(true);
            }}
            className="px-4 py-1.5 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Chọn Video</span>
          </button>

          {/* Outlined Button: Chọn nhóm Video */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              if (folders.length > 0) {
                setActiveFolderModal(folders[0]);
              }
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Chọn nhóm Video</span>
          </button>
        </div>
      </div>

      {/* 2. Top Main Content Grid: Left (Fanpage list) & Right (Video Folders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT COLUMN: Danh sách Fanpage / Danh sách nhóm Fanpage */}
        <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col">
          {/* Sub-tabs header: [Danh sách Fanpage] & [Danh sách nhóm Fanpage] */}
          <div className="flex items-center border-b border-white/10 pb-3 gap-3">
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setActiveFanpageTab("pages");
              }}
              className={`text-xs font-bold pb-1 transition-all cursor-pointer relative ${
                activeFanpageTab === "pages"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Danh sách Fanpage
              {activeFanpageTab === "pages" && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setActiveFanpageTab("groups");
              }}
              className={`text-xs font-bold pb-1 transition-all cursor-pointer relative ${
                activeFanpageTab === "groups"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Danh sách nhóm Fanpage
              {activeFanpageTab === "groups" && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setIsAddFanpageModalOpen(true);
              }}
              className="ml-auto text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm Fanpage</span>
            </button>
          </div>

          {/* Search Input: Tìm kiếm... */}
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={fanpageSearch}
              onChange={(e) => setFanpageSearch(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Action Row: [Xóa fanpage] & Tích chọn từ [0] đến [0] [Chọn] */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
            <button
              onClick={handleDeleteFanpages}
              disabled={selectedFanpageIds.length === 0}
              className="px-3 py-1.5 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Xóa fanpage</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 font-medium">Tích chọn từ</span>
              <input
                type="number"
                min={0}
                value={fpRangeFrom}
                onChange={(e) => setFpRangeFrom(parseInt(e.target.value) || 0)}
                className="w-10 bg-slate-950 border border-white/10 rounded px-1 py-0.5 text-center font-mono text-white outline-none focus:border-rose-500 text-xs"
              />
              <span className="text-slate-400 font-medium">đến</span>
              <input
                type="number"
                min={0}
                value={fpRangeTo}
                onChange={(e) => setFpRangeTo(parseInt(e.target.value) || 0)}
                className="w-10 bg-slate-950 border border-white/10 rounded px-1 py-0.5 text-center font-mono text-white outline-none focus:border-rose-500 text-xs"
              />
              <button
                onClick={handleRangeSelectFanpages}
                className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer text-xs"
              >
                Chọn
              </button>
            </div>
          </div>

          {/* Fanpage Table / List / Empty State */}
          <div className="mt-3 flex-1 min-h-[220px] max-h-[280px] overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-slate-950/40 p-2">
            {filteredFanpages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                <Flag className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs">Không có Fanpage nào</p>
                <button
                  onClick={() => setIsAddFanpageModalOpen(true)}
                  className="mt-2 text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  + Nhấn vào đây để thêm Fanpage
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Header Row */}
                <div className="flex items-center gap-3 px-2 py-1 text-[11px] font-bold text-slate-400 border-b border-white/5">
                  <input
                    type="checkbox"
                    checked={isAllFanpagesSelected}
                    onChange={handleToggleSelectAllFanpages}
                    className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                  />
                  <span className="flex-1">Fanpage / Page ID</span>
                  <span>Followers</span>
                  <span className="w-16 text-center">Trạng thái</span>
                </div>

                {filteredFanpages.map((fp, idx) => {
                  const isChecked = selectedFanpageIds.includes(fp.id);
                  return (
                    <div
                      key={fp.id}
                      onClick={() => handleToggleSelectFanpage(fp.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-rose-500/10 border-rose-500/30"
                          : "bg-slate-900/60 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                      />
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                        <img
                          src={fp.avatar}
                          alt={fp.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-xs truncate">
                          {fp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {fp.pageId} {fp.groupName && `• ${fp.groupName}`}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                        {fp.followers}
                      </span>
                      <span className="w-16 text-center">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Sẵn sàng
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Danh sách thư mục video (Matching Screenshot) */}
        <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col">
          {/* Header Title: Danh sách thư mục video */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-rose-400" />
              <span>Danh sách thư mục video</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {folders.length} Thư mục
            </span>
          </div>

          {/* Search Input: Tìm kiếm... */}
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Table with Solid Red Header (#ff2b54) */}
          <div className="mt-3 flex-1 overflow-x-auto custom-scrollbar border border-white/5 rounded-xl bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#ff2b54] text-white uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3">Tên thư mục</th>
                  <th className="py-2.5 px-3 w-28 text-center">Video đã chọn</th>
                  <th className="py-2.5 px-3 w-24 text-center">Số lượng</th>
                  <th className="py-2.5 px-3 w-20 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredFolders.map((fold, idx) => (
                  <tr
                    key={fold.id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    {/* STT */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Tên thư mục */}
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">{fold.folderName}</span>
                    </td>

                    {/* Video đã chọn */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      <span
                        className={
                          fold.selectedCount > 0 ? "text-emerald-400" : "text-slate-400"
                        }
                      >
                        {fold.selectedCount}
                      </span>
                    </td>

                    {/* Số lượng */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {fold.totalCount}
                    </td>

                    {/* Nút Xem (#ff2b54) */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          soundSynth.playSfx("pop");
                          setActiveFolderModal(fold);
                        }}
                        className="px-3 py-1 rounded bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Bottom Box: Cài đặt tác vụ & Lịch sử đăng (Matching Screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-rose-400" />
          <span>Cài đặt tác vụ</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Cài đặt chi tiết */}
          <div className="lg:col-span-7 space-y-3.5 text-xs">
            {/* Option 1: Bỏ qua video đã đăng thành công + [Lịch sử upload] button */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipUploaded}
                  onChange={(e) => setSkipUploaded(e.target.checked)}
                  className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-4 h-4 accent-rose-500"
                />
                <span>Bỏ qua những video đã đăng thành công</span>
              </label>

              <button
                onClick={() => {
                  soundSynth.playSfx("pop");
                  setIsHistoryModalOpen(true);
                }}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Lịch sử upload</span>
              </button>
            </div>

            {/* Checkbox Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeHashtags}
                  onChange={(e) => setRemoveHashtags(e.target.checked)}
                  className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                />
                <span>Xoá #hashtag</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeContent}
                  onChange={(e) => setRemoveContent(e.target.checked)}
                  className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                />
                <span>Xoá nội dung</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={distributeVideos}
                  onChange={(e) => setDistributeVideos(e.target.checked)}
                  className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                />
                <span>Chia đều video cho các tài khoản</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareToStory}
                  onChange={(e) => setShareToStory(e.target.checked)}
                  className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                />
                <span>Chia sẻ lên story</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={useChromeAutomation}
                  onChange={(e) => setUseChromeAutomation(e.target.checked)}
                  className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                />
                <span>Sử dụng cơ chế đăng bằng chrome</span>
              </label>
            </div>

            {/* AI Dropdown: Sử dụng AI để làm mới nội dung */}
            <div className="pt-1">
              <label className="block text-[11px] text-slate-400 mb-1">
                Sử dụng AI để làm mới nội dung
              </label>
              <select
                value={aiContentMode}
                onChange={(e) => setAiContentMode(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="none">Không</option>
                <option value="gemini_viral">
                  Gemini 2.5 Flash: Viết lại caption & tạo hashtag viral
                </option>
                <option value="rewrite_keep_meaning">
                  AI Rewrite: Giữ nguyên ý, đổi phong cách giật gân
                </option>
                <option value="translate_vi">
                  Dịch thuật & Bản địa hoá tiếng Việt tự nhiên
                </option>
                <option value="generate_hook">
                  Tự động tạo câu mở đầu Hook 3 giây đầu cuốn hút
                </option>
              </select>
            </div>

            {/* Schedule & Delay Inputs */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-300 font-medium min-w-[140px]">
                  Đặt lịch trên nền tảng:
                </span>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium min-w-[140px]">
                  Thời gian nghỉ:
                </span>
                <input
                  type="number"
                  min={0}
                  value={delayFrom}
                  onChange={(e) => setDelayFrom(parseInt(e.target.value) || 1)}
                  className="w-12 bg-slate-950 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-white outline-none focus:border-rose-500"
                />
                <span className="text-slate-400">đến</span>
                <input
                  type="number"
                  min={0}
                  value={delayTo}
                  onChange={(e) => setDelayTo(parseInt(e.target.value) || 2)}
                  className="w-12 bg-slate-950 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-white outline-none focus:border-rose-500"
                />
                <span className="text-slate-400">phút</span>
              </div>
            </div>

            {/* Action Buttons: [Đăng ngay] (#ff2b54) | [Đặt lịch] | [Dừng lại] */}
            <div className="flex items-center gap-2.5 pt-2">
              {/* Nút Đỏ: Đăng ngay */}
              <button
                onClick={handleStartPosting}
                disabled={isRunning}
                className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? "Đang đăng..." : "Đăng ngay"}</span>
              </button>

              {/* Nút Đặt lịch */}
              <button
                onClick={handleSchedulePost}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Đặt lịch</span>
              </button>

              {/* Nút Dừng lại */}
              <button
                onClick={handleStopPosting}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Dừng lại</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Lịch sử đăng (Terminal / Log Viewer) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lịch sử đăng</span>
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Xóa log
              </button>
            </div>

            <div
              ref={logTerminalRef}
              className="flex-1 min-h-[260px] max-h-[300px] bg-slate-950 border border-white/10 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-y-auto custom-scrollbar space-y-1 shadow-inner"
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600">
                  Chưa có nhật ký hoạt động nào
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      log.includes("✅") || log.includes("THÀNH CÔNG")
                        ? "text-emerald-400"
                        : log.includes("🚀")
                        ? "text-cyan-400 font-bold"
                        : log.includes("🛑")
                        ? "text-amber-400"
                        : "text-slate-300"
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Xem Thư Mục Video (Popup list of videos with checkboxes) */}
      {activeFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-rose-600/25 via-pink-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Thư mục: {activeFolderModal.folderName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Đã chọn: <strong className="text-rose-400">{activeFolderModal.selectedCount}</strong> / {activeFolderModal.totalCount} videos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveFolderModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleToggleSelectAllInFolder(activeFolderModal.id)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {activeFolderModal.videos.every((v) => v.selected)
                    ? "Bỏ chọn tất cả"
                    : "Chọn tất cả"}
                </button>
                <span className="text-xs text-slate-400">
                  Tích chọn video để đưa vào hàng đợi đăng bài
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                {activeFolderModal.videos.map((vid) => {
                  return (
                    <div
                      key={vid.id}
                      onClick={() => handleToggleVideoInFolder(activeFolderModal.id, vid.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex gap-2.5 items-center ${
                        vid.selected
                          ? "bg-rose-500/15 border-rose-500/40"
                          : "bg-slate-900/80 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={vid.selected}
                        onChange={() => {}}
                        className="rounded text-rose-600 accent-rose-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="w-12 h-9 rounded overflow-hidden bg-slate-800 shrink-0 relative">
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-white">
                          {vid.duration}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-[11px] truncate font-mono">
                          {vid.title}
                        </div>
                        <div className="text-[10px] text-slate-400">{vid.size}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    soundSynth.playSfx("success");
                    setActiveFolderModal(null);
                    addToast("Đã lưu các video được chọn!", "success");
                  }}
                  className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Chọn Video (Quick picker) */}
      {isVideoPickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-rose-600/25 via-pink-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Video className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Chọn Video Đăng Reels</h3>
                  <p className="text-[11px] text-slate-400">Chọn thư mục hoặc tệp video đơn lẻ</p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoPickerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-900/70 border border-white/10 rounded-xl space-y-2">
                <label className="font-bold text-slate-200 block">
                  Chọn từ danh sách thư mục đã nạp:
                </label>
                <div className="space-y-1.5">
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        soundSynth.playSfx("pop");
                        setIsVideoPickerModalOpen(false);
                        setActiveFolderModal(f);
                      }}
                      className="p-2.5 bg-slate-950/60 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-white">{f.folderName}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {f.totalCount} videos (Đã chọn: {f.selectedCount})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setIsVideoPickerModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Lịch sử upload (Past uploads table) */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-amber-600/25 via-orange-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <History className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Lịch Sử Upload Reels</h3>
                  <p className="text-[11px] text-slate-400">
                    Danh sách các video đã từng đăng tải để tránh đăng trùng lặp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="overflow-x-auto custom-scrollbar border border-white/10 rounded-xl bg-slate-950/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 font-bold border-b border-white/10">
                      <th className="py-2.5 px-3">Tên Video</th>
                      <th className="py-2.5 px-3">Fanpage</th>
                      <th className="py-2.5 px-3">Thời gian đăng</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {uploadHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-white/[0.04]">
                        <td className="py-2.5 px-3 font-mono text-white">{h.videoTitle}</td>
                        <td className="py-2.5 px-3 text-cyan-400">{h.fanpageName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{h.uploadTime}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Đã đăng
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Thêm Fanpage */}
      {isAddFanpageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-rose-600/25 via-pink-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thêm Fanpage Mới</h3>
                  <p className="text-[11px] text-slate-400">Nạp Fanpage Facebook để đăng Reels tự động</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddFanpageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Tên Fanpage:</label>
                <input
                  type="text"
                  placeholder="VD: Thế Giới Phim Hay 4K"
                  value={newFanpageName}
                  onChange={(e) => setNewFanpageName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Page ID / UID:</label>
                <input
                  type="text"
                  placeholder="VD: 109847294820194"
                  value={newFanpageId}
                  onChange={(e) => setNewFanpageId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsAddFanpageModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (!newFanpageName.trim()) {
                      addToast("Vui lòng nhập tên Fanpage!", "warning");
                      return;
                    }
                    soundSynth.playSfx("pop");
                    const newFp: FanpageItem = {
                      id: `fp_${Date.now()}`,
                      name: newFanpageName,
                      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
                      pageId: newFanpageId || `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
                      followers: "10.5K",
                      category: "Tổng hợp",
                      status: "active"
                    };
                    setFanpages((prev) => [newFp, ...prev]);
                    setNewFanpageName("");
                    setNewFanpageId("");
                    setIsAddFanpageModalOpen(false);
                    soundSynth.playSfx("success");
                    addToast("Đã thêm Fanpage mới thành công!", "success");
                  }}
                  className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Fanpage</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
