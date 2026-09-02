import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Music2,
  Video,
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
  FileText,
  ShieldCheck,
  Radio,
  UserCheck
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";
import { ipcClient } from "../core/ipc/ipcClient";

export interface TiktokAccountItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  followers: string;
  region: string;
  groupName?: string;
  chromeProfileId?: string;
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
  accountUsername: string;
  uploadTime: string;
  status: "success" | "failed";
  caption: string;
  url?: string;
  views?: string;
}

const INITIAL_TIKTOKS: TiktokAccountItem[] = [
  {
    id: "tt_1",
    username: "@thanhdacloc.official",
    displayName: "Thanh Đắc Lộc (TikTok Creator)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    followers: "245.8K",
    region: "VN (Việt Nam)",
    groupName: "Kênh Chính - Giải Trí",
    chromeProfileId: "Profile 1",
    status: "active"
  },
  {
    id: "tt_2",
    username: "@anime_4k_recap",
    displayName: "Review Anime & Phim 4K",
    avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&h=100&fit=crop",
    followers: "162.3K",
    region: "US (Hoa Kỳ)",
    groupName: "Kênh Anime Global",
    chromeProfileId: "Profile 2",
    status: "active"
  },
  {
    id: "tt_3",
    username: "@ai_trends_daily",
    displayName: "Góc AI & Công Nghệ Mới",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop",
    followers: "89.5K",
    region: "VN (Việt Nam)",
    groupName: "Kênh Công Nghệ",
    chromeProfileId: "Profile 3",
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
      title: `shenkong_highlight_tiktok_part_${String(i + 1).padStart(2, "0")}.mp4`,
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
    id: "TT_HIST_01",
    videoTitle: "shenkong_highlight_tiktok_part_01.mp4",
    accountUsername: "@thanhdacloc.official",
    uploadTime: "2026-09-01 08:30:15",
    status: "success",
    caption: "Cực phẩm hoạt hình mới nhất hôm nay! #xuhuong #fyp #trending #anime",
    url: "https://tiktok.com/@thanhdacloc.official/video/74019283749102",
    views: "18.4K"
  },
  {
    id: "TT_HIST_02",
    videoTitle: "vietnamese_dubbing_anime_ep_01.mp4",
    accountUsername: "@anime_4k_recap",
    uploadTime: "2026-08-31 21:10:00",
    status: "success",
    caption: "Bản lồng tiếng cực nét mùa hè #anime #recap #reviewphim",
    url: "https://tiktok.com/@anime_4k_recap/video/73928194857201",
    views: "42.1K"
  }
];

export const TiktokPostTool: React.FC = () => {
  const { addToast } = useToast();

  // Top Left: Tiktok tab
  const [activeTiktokTab, setActiveTiktokTab] = useState<"accounts" | "groups">("accounts");
  const [tiktoks, setTiktoks] = useState<TiktokAccountItem[]>(INITIAL_TIKTOKS);
  const [selectedTiktokIds, setSelectedTiktokIds] = useState<string[]>([]);
  const [tiktokSearch, setTiktokSearch] = useState<string>("");

  // TikTok range select
  const [ttRangeFrom, setTtRangeFrom] = useState<number>(0);
  const [ttRangeTo, setTtRangeTo] = useState<number>(0);

  // Top Right: Video Folders
  const [folders, setFolders] = useState<VideoFolderItem[]>(INITIAL_FOLDERS);
  const [folderSearch, setFolderSearch] = useState<string>("");
  const [activeFolderModal, setActiveFolderModal] = useState<VideoFolderItem | null>(null);

  // Bottom Settings
  const [skipUploaded, setSkipUploaded] = useState<boolean>(false);
  const [bypassCopyright, setBypassCopyright] = useState<boolean>(true); // Checked in screenshot!
  const [removeHashtags, setRemoveHashtags] = useState<boolean>(false);
  const [removeContent, setRemoveContent] = useState<boolean>(false);
  const [distributeVideos, setDistributeVideos] = useState<boolean>(false);
  const [aiContentMode, setAiContentMode] = useState<string>("none");
  const [executionEngine, setExecutionEngine] = useState<string>("default");
  const [delayFrom, setDelayFrom] = useState<number>(1);
  const [delayTo, setDelayTo] = useState<number>(2);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");

  // Log terminal state
  const [logs, setLogs] = useState<string[]>([
    "[08:35:00] Khởi tạo hệ thống tự động đăng Video TikTok...",
    "[08:35:02] Đã nạp danh sách cấu hình và kiểm tra kết nối Chrome Profiles."
  ]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeChromeCount, setActiveChromeCount] = useState<number>(0);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Modals & AI Copy Generator
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isVideoPickerModalOpen, setIsVideoPickerModalOpen] = useState<boolean>(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiTopicInput, setAiTopicInput] = useState<string>("Bí quyết làm video lồng tiếng AI triệu view 2026");
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [generatedCopy, setGeneratedCopy] = useState<{ title: string; description: string; hashtags: string[]; generatedBy?: string } | null>(null);

  const [newUsername, setNewUsername] = useState<string>("");
  const [newDisplayName, setNewDisplayName] = useState<string>("");
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>(INITIAL_UPLOAD_HISTORY);

  const handleGenerateAiCopy = async () => {
    try {
      setAiGenerating(true);
      soundSynth.playSfx("pop");
      const res = await ipcClient.invoke("/api/ai/generate-copy", "POST", {
        title: aiTopicInput || "Video TikTok Viral",
        platform: "tiktok",
        tone: "viral"
      });
      if (res && res.success && res.data) {
        setGeneratedCopy(res.data);
        soundSynth.playSfx("success");
        addToast("Đã tạo Caption & Hashtag Viral bằng Gemini AI!", "success");
      } else {
        throw new Error(res?.error || "Dịch vụ AI không phản hồi");
      }
    } catch (err: any) {
      addToast(`Lỗi tạo nội dung AI: ${err?.message || "Không thể kết nối dịch vụ AI"}`, "error");
    } finally {
      setAiGenerating(false);
    }
  };

  // Auto scroll logs
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Filter TikTok accounts
  const filteredTiktoks = useMemo(() => {
    return tiktoks.filter((tt) => {
      if (!tiktokSearch.trim()) return true;
      return (
        tt.username.toLowerCase().includes(tiktokSearch.toLowerCase()) ||
        tt.displayName.toLowerCase().includes(tiktokSearch.toLowerCase()) ||
        (tt.groupName && tt.groupName.toLowerCase().includes(tiktokSearch.toLowerCase()))
      );
    });
  }, [tiktoks, tiktokSearch]);

  // Filter Folders
  const filteredFolders = useMemo(() => {
    return folders.filter((fold) => {
      if (!folderSearch.trim()) return true;
      return fold.folderName.toLowerCase().includes(folderSearch.toLowerCase());
    });
  }, [folders, folderSearch]);

  // Handle Select All TikToks
  const isAllTiktoksSelected =
    filteredTiktoks.length > 0 &&
    filteredTiktoks.every((tt) => selectedTiktokIds.includes(tt.id));

  const handleToggleSelectAllTiktoks = () => {
    soundSynth.playSfx("pop");
    if (isAllTiktoksSelected) {
      setSelectedTiktokIds([]);
    } else {
      setSelectedTiktokIds(filteredTiktoks.map((tt) => tt.id));
    }
  };

  const handleToggleSelectTiktok = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedTiktokIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Range select TikTok accounts
  const handleRangeSelectTiktoks = () => {
    soundSynth.playSfx("pop");
    const from = Math.max(1, ttRangeFrom);
    const to = Math.max(from, ttRangeTo);

    const ids: string[] = [];
    filteredTiktoks.forEach((tt, idx) => {
      const order = idx + 1;
      if (order >= from && order <= to) {
        ids.push(tt.id);
      }
    });

    setSelectedTiktokIds(ids);
    addToast(`Đã chọn ${ids.length} tài khoản TikTok từ số ${from} đến ${to}`, "info");
  };

  // Delete selected TikTok accounts
  const handleDeleteTiktoks = () => {
    if (selectedTiktokIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 tài khoản TikTok để xoá!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const toDeleteSet = new Set(selectedTiktokIds);
    setTiktoks((prev) => prev.filter((tt) => !toDeleteSet.has(tt.id)));
    setSelectedTiktokIds([]);
    addToast(`Đã xoá ${toDeleteSet.size} tài khoản TikTok đã chọn!`, "success");
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
    if (tiktoks.length === 0) {
      addToast("Chưa có tài khoản TikTok nào được nạp vào hệ thống!", "warning");
      return;
    }
    const totalSelectedVideos = folders.reduce((acc, f) => acc + f.selectedCount, 0);
    if (totalSelectedVideos === 0) {
      addToast("Vui lòng nhấn [Xem] ở Thư mục video để tích chọn ít nhất 1 video!", "warning");
      return;
    }

    soundSynth.playSfx("pop");
    setIsRunning(true);
    setActiveChromeCount(1);
    const targetAccounts = selectedTiktokIds.length > 0 ? selectedTiktokIds.length : tiktoks.length;
    addToast(`Bắt đầu chạy tác vụ đăng Video lên ${targetAccounts} kênh TikTok...`, "info");

    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      `[${timeStr}] 🚀 Khởi chạy trình duyệt tự động đăng TikTok...`,
      `[${timeStr}] 🌐 Cơ chế thực thi: ${executionEngine === "default" ? "Mặc định (Chrome Automation)" : executionEngine}`,
      `[${timeStr}] 🛡️ Bỏ qua kiểm tra bản quyền TikTok: ${bypassCopyright ? "BẬT (Auto pitch & shift frequency)" : "TẮT"}`,
      `[${timeStr}] 🤖 Chế độ AI Caption: ${aiContentMode !== "none" ? aiContentMode : "Không (Giữ nguyên gốc)"}`,
      `[${timeStr}] 📊 Đang phân phối ${totalSelectedVideos} video cho các tài khoản TikTok...`
    ]);

    // Simulate progress steps
    setTimeout(() => {
      const t1 = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        `[${t1}] ⏳ Đang mở Chrome Profile #1 -> Đăng nhập TikTok Creator Studio [${tiktoks[0]?.username}]...`,
        `[${t1}] 🎬 Đang nạp tệp video và gắn thẻ bản quyền âm thanh TikTok...`
      ]);
    }, 1200);

    setTimeout(() => {
      const t2 = new Date().toLocaleTimeString();
      const newHistoryItem: UploadHistoryItem = {
        id: `TT_HIST_${Date.now().toString().slice(-4)}`,
        videoTitle: "shenkong_highlight_tiktok_part_02.mp4",
        accountUsername: tiktoks[0]?.username || "@thanhdacloc.official",
        uploadTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        status: "success",
        caption: "Top video triệu view thịnh hành hôm nay! #xuhuong #fyp #trending #viral",
        url: "https://tiktok.com/@thanhdacloc.official/video/74092817482910",
        views: "1"
      };
      setUploadHistory((prev) => [newHistoryItem, ...prev]);

      setLogs((prev) => [
        ...prev,
        `[${t2}] ✅ ĐĂNG THÀNH CÔNG VIDEO TIKTOK LÊN [${tiktoks[0]?.username}]!`,
        `[${t2}] 🔗 Video URL: ${newHistoryItem.url}`,
        `[${t2}] ⏱️ Đang chờ khoảng nghỉ (${delayFrom} - ${delayTo} phút) trước khi thực hiện luồng tiếp theo...`
      ]);
      soundSynth.playSfx("success");
      setIsRunning(false);
      setActiveChromeCount(0);
      addToast("Đăng video TikTok hoàn tất thành công!", "success");
    }, 2800);
  };

  // Stop posting
  const handleStopPosting = () => {
    soundSynth.playSfx("pop");
    setIsRunning(false);
    setActiveChromeCount(0);
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timeStr}] 🛑 Đã nhận lệnh dừng tác vụ bởi người dùng. Đóng các tiến trình Chrome.`]);
    addToast("Đã dừng tác vụ đăng bài!", "info");
  };

  // Schedule button
  const handleSchedulePost = () => {
    soundSynth.playSfx("pop");
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      `[${timeStr}] 📅 Đã ghi nhận lịch hẹn đăng TikTok: ${scheduledDateTime || "Ngay khung giờ vàng 19:30 tối nay"}`
    ]);
    soundSynth.playSfx("success");
    addToast("Đã lên lịch đăng TikTok thành công!", "success");
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header & Top Action Buttons (Matching Screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-600/10 border border-pink-500/30 flex items-center justify-center shadow-inner">
            <Music2 className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-xs text-pink-400">🎵</span> Đăng Tiktok
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">
                TikTok Auto Poster
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Đăng hàng loạt video ngắn lên TikTok, bypass kiểm tra bản quyền âm thanh, phân phối thư mục & AI caption
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
            className="px-4 py-1.5 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-pink-500/20 cursor-pointer"
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
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 hover:border-pink-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Chọn nhóm Video</span>
          </button>
        </div>
      </div>

      {/* 2. Top Main Content Grid: Left (TikTok accounts list) & Right (Video Folders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT COLUMN: Danh sách Tiktok / Danh sách nhóm Tiktok */}
        <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col">
          {/* Sub-tabs header: [Danh sách Tiktok] & [Danh sách nhóm Tiktok] */}
          <div className="flex items-center border-b border-white/10 pb-3 gap-3">
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setActiveTiktokTab("accounts");
              }}
              className={`text-xs font-bold pb-1 transition-all cursor-pointer relative ${
                activeTiktokTab === "accounts"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Danh sách Tiktok
              {activeTiktokTab === "accounts" && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#ff2b54] rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setActiveTiktokTab("groups");
              }}
              className={`text-xs font-bold pb-1 transition-all cursor-pointer relative ${
                activeTiktokTab === "groups"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Danh sách nhóm Tiktok
              {activeTiktokTab === "groups" && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#ff2b54] rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setIsAddAccountModalOpen(true);
              }}
              className="ml-auto text-[11px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 border border-pink-500/30 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm TikTok</span>
            </button>
          </div>

          {/* Search Input: Tìm kiếm... */}
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={tiktokSearch}
              onChange={(e) => setTiktokSearch(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-pink-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Action Row: [Xóa tài khoản] & Tích chọn từ [0] đến [0] [Chọn] */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
            <button
              onClick={handleDeleteTiktoks}
              disabled={selectedTiktokIds.length === 0}
              className="px-3 py-1.5 bg-slate-900 hover:bg-pink-500/20 text-slate-300 hover:text-pink-300 border border-white/10 hover:border-pink-500/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 text-pink-400" />
              <span>Xóa Tiktok</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 font-medium">Tích chọn từ</span>
              <input
                type="number"
                min={0}
                value={ttRangeFrom}
                onChange={(e) => setTtRangeFrom(parseInt(e.target.value) || 0)}
                className="w-10 bg-slate-950 border border-white/10 rounded px-1 py-0.5 text-center font-mono text-white outline-none focus:border-pink-500 text-xs"
              />
              <span className="text-slate-400 font-medium">đến</span>
              <input
                type="number"
                min={0}
                value={ttRangeTo}
                onChange={(e) => setTtRangeTo(parseInt(e.target.value) || 0)}
                className="w-10 bg-slate-950 border border-white/10 rounded px-1 py-0.5 text-center font-mono text-white outline-none focus:border-pink-500 text-xs"
              />
              <button
                onClick={handleRangeSelectTiktoks}
                className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer text-xs"
              >
                Chọn
              </button>
            </div>
          </div>

          {/* TikTok Account Table / List / Empty State (Matching Screenshot "Không có Tiktok nào") */}
          <div className="mt-3 flex-1 min-h-[220px] max-h-[280px] overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-slate-950/40 p-2">
            {filteredTiktoks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                <Music2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium">Không có Tiktok nào</p>
                <button
                  onClick={() => setIsAddAccountModalOpen(true)}
                  className="mt-2 text-xs text-pink-400 hover:underline cursor-pointer"
                >
                  + Nhấn vào đây để thêm tài khoản TikTok
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Header Row */}
                <div className="flex items-center gap-3 px-2 py-1 text-[11px] font-bold text-slate-400 border-b border-white/5">
                  <input
                    type="checkbox"
                    checked={isAllTiktoksSelected}
                    onChange={handleToggleSelectAllTiktoks}
                    className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-pink-500"
                  />
                  <span className="flex-1">Kênh TikTok / Username</span>
                  <span>Followers</span>
                  <span className="w-20 text-center">Profile Chrome</span>
                </div>

                {filteredTiktoks.map((tt, idx) => {
                  const isChecked = selectedTiktokIds.includes(tt.id);
                  return (
                    <div
                      key={tt.id}
                      onClick={() => handleToggleSelectTiktok(tt.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-pink-500/10 border-pink-500/30"
                          : "bg-slate-900/60 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-pink-500"
                      />
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                        <img
                          src={tt.avatar}
                          alt={tt.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-xs truncate">
                          {tt.displayName}
                        </div>
                        <div className="text-[10px] text-pink-400 font-mono truncate">
                          {tt.username} {tt.groupName && `• ${tt.groupName}`}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                        {tt.followers}
                      </span>
                      <span className="w-20 text-center">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10">
                          {tt.chromeProfileId || "Profile 1"}
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
              <FolderOpen className="w-4 h-4 text-pink-400" />
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
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-pink-500"
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
          <Settings2 className="w-4 h-4 text-pink-400" />
          <span>Cài đặt tác vụ</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Cài đặt chi tiết */}
          <div className="lg:col-span-7 space-y-3 text-xs">
            {/* Option 1: Bỏ qua video đã đăng thành công + [Lịch sử upload] button */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipUploaded}
                  onChange={(e) => setSkipUploaded(e.target.checked)}
                  className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-4 h-4 accent-pink-500"
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

            {/* Checkbox: Bỏ qua kiểm tra bản quyền (Checked in screenshot!) */}
            <div className="pl-6">
              <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={bypassCopyright}
                  onChange={(e) => setBypassCopyright(e.target.checked)}
                  className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-4 h-4 accent-[#ff2b54]"
                />
                <span className="text-white">Bỏ qua kiểm tra bản quyền</span>
              </label>
            </div>

            {/* Checkbox Rows: Xoá #hashtag, Xoá nội dung, Chia đều video */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeHashtags}
                  onChange={(e) => setRemoveHashtags(e.target.checked)}
                  className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-pink-500"
                />
                <span>Xoá #hashtag</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeContent}
                  onChange={(e) => setRemoveContent(e.target.checked)}
                  className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-pink-500"
                />
                <span>Xoá nội dung</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={distributeVideos}
                  onChange={(e) => setDistributeVideos(e.target.checked)}
                  className="rounded border-white/20 text-pink-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-pink-500"
                />
                <span>Chia đều video cho các tài khoản</span>
              </label>
            </div>

            {/* AI Dropdown: Sử dụng AI để làm mới nội dung */}
            <div className="pt-1">
              <label className="block text-[11px] text-slate-400 mb-1">
                Sử dụng AI để làm mới nội dung
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={aiContentMode}
                  onChange={(e) => setAiContentMode(e.target.value)}
                  className="w-full sm:w-80 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="none">Không</option>
                  <option value="gemini_viral">
                    Gemini 2.5 Flash: Viết lại caption & tạo hashtag viral TikTok
                  </option>
                  <option value="hook_3s">
                    Tạo câu Hook 3s giật gân tăng Retention Rate
                  </option>
                  <option value="translate_vi">
                    Dịch thuật & Lồng tiếng việt tự nhiên
                  </option>
                  <option value="rewrite_genz">
                    Viết lại caption chuẩn ngôn ngữ GenZ & Trend
                  </option>
                </select>

                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Tự động sinh Tiêu Đề, Caption & Hashtag Viral bằng Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>Tạo Caption & Hashtag AI</span>
                </button>
              </div>
            </div>

            {/* Chạy bằng: Dropdown (Matching Screenshot) */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-slate-300 font-medium min-w-[80px]">
                Chạy bằng:
              </span>
              <select
                value={executionEngine}
                onChange={(e) => setExecutionEngine(e.target.value)}
                className="w-48 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="default">Mặc định</option>
                <option value="chrome_headless">Chrome Headless</option>
                <option value="tiktok_studio_web">TikTok Studio Web</option>
                <option value="tiktok_official_api">TikTok Creator API v2</option>
                <option value="mobile_adb_farm">Phone Farm (ADB Android)</option>
              </select>
            </div>

            {/* Thời gian nghỉ: [1] đến [2] phút */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-slate-300 font-medium min-w-[80px]">
                Thời gian nghỉ:
              </span>
              <input
                type="number"
                min={0}
                value={delayFrom}
                onChange={(e) => setDelayFrom(parseInt(e.target.value) || 1)}
                className="w-12 bg-slate-950 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-white outline-none focus:border-pink-500 text-xs"
              />
              <span className="text-slate-400">đến</span>
              <input
                type="number"
                min={0}
                value={delayTo}
                onChange={(e) => setDelayTo(parseInt(e.target.value) || 2)}
                className="w-12 bg-slate-950 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-white outline-none focus:border-pink-500 text-xs"
              />
              <span className="text-slate-400">phút</span>
            </div>

            {/* Action Buttons: [Đăng ngay] (#ff2b54) | [Đặt lịch] | [Dừng lại] */}
            <div className="flex items-center gap-2.5 pt-2">
              {/* Nút Đỏ: Đăng ngay */}
              <button
                onClick={handleStartPosting}
                disabled={isRunning}
                className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-pink-500/20 disabled:opacity-50 cursor-pointer"
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

            {/* Status text matching screenshot: "Có 0 chrome đang thực thi nhiệm vụ." */}
            <div className="pt-2 text-xs text-slate-400 font-medium">
              Có <strong className={activeChromeCount > 0 ? "text-emerald-400" : "text-white"}>{activeChromeCount}</strong> chrome đang thực thi nhiệm vụ.
            </div>
          </div>

          {/* RIGHT: Lịch sử đăng (Matching Screenshot empty state / Terminal viewer) */}
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
                        ? "text-pink-400 font-bold"
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

      {/* MODAL 1: Xem Thư Mục Video */}
      {activeFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-pink-600/25 via-rose-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Thư mục: {activeFolderModal.folderName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Đã chọn: <strong className="text-pink-400">{activeFolderModal.selectedCount}</strong> / {activeFolderModal.totalCount} videos
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
                  Tích chọn video để đưa vào hàng đợi đăng bài TikTok
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
                          ? "bg-pink-500/15 border-pink-500/40"
                          : "bg-slate-900/80 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={vid.selected}
                        onChange={() => {}}
                        className="rounded text-pink-600 accent-pink-500 w-3.5 h-3.5 cursor-pointer"
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
            <div className="p-4 bg-gradient-to-r from-pink-600/25 via-rose-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                  <Video className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Chọn Video Đăng TikTok</h3>
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
                      className="p-2.5 bg-slate-950/60 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-white">{f.folderName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {f.totalCount} clips
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff2b54] text-white font-bold">
                          Mở thư mục
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-white/15 hover:border-pink-500/50 rounded-xl text-center cursor-pointer transition-colors bg-slate-900/30">
                <Video className="w-6 h-6 mx-auto mb-1 text-pink-400" />
                <p className="font-semibold text-slate-200">
                  Hoặc kéo thả tệp .mp4 từ máy tính vào đây
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Định dạng: MP4, MOV 9:16 (dưới 500MB mỗi video)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Lịch Sử Upload */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-pink-600/25 via-rose-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                  <History className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Lịch Sử Upload TikTok</h3>
                  <p className="text-[11px] text-slate-400">
                    Danh sách các video đã từng tải lên thành công
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
              <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
                {uploadHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/80 border border-white/10 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs truncate max-w-xs">
                        {item.videoTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Đã đăng thành công
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                      <span>👤 {item.accountUsername}</span>
                      <span>🕒 {item.uploadTime}</span>
                      {item.views && <span>👁️ {item.views} lượt xem</span>}
                    </div>

                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg italic">
                      "{item.caption}"
                    </p>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-pink-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>🔗 Xem bài đăng trên TikTok:</span>
                        <span className="truncate">{item.url}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    soundSynth.playSfx("pop");
                    setUploadHistory([]);
                    addToast("Đã xóa trắng lịch sử upload!", "info");
                  }}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Xóa toàn bộ lịch sử
                </button>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-white/10"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Thêm Tài Khoản TikTok */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-pink-600/25 via-rose-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thêm Tài Khoản TikTok</h3>
                  <p className="text-[11px] text-slate-400">Gán tài khoản hoặc Profile Chrome</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tên hiển thị kênh:
                </label>
                <input
                  type="text"
                  placeholder="VD: Kênh Review Phim Hay"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-pink-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Username (@handle):
                </label>
                <input
                  type="text"
                  placeholder="VD: @reviewphim4k.official"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-pink-500 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-white/10"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (!newUsername.trim()) {
                      addToast("Vui lòng nhập Username TikTok!", "warning");
                      return;
                    }
                    soundSynth.playSfx("success");
                    const newAcc: TiktokAccountItem = {
                      id: `tt_${Date.now()}`,
                      username: newUsername.startsWith("@") ? newUsername : `@${newUsername}`,
                      displayName: newDisplayName.trim() || newUsername,
                      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
                      followers: "0",
                      region: "VN (Việt Nam)",
                      groupName: "Nhóm Mới",
                      chromeProfileId: `Profile ${tiktoks.length + 1}`,
                      status: "active"
                    };
                    setTiktoks((prev) => [...prev, newAcc]);
                    setNewUsername("");
                    setNewDisplayName("");
                    setIsAddAccountModalOpen(false);
                    addToast(`Đã thêm tài khoản TikTok ${newAcc.username} thành công!`, "success");
                  }}
                  className="px-5 py-2 bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-md"
                >
                  Lưu tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Copy & Hashtag Generator */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-600/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Trình Sinh Caption & Hashtag Viral AI</h3>
                  <p className="text-[11px] text-slate-400">Kết nối trực tiếp Gemini 2.5 Flash API</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Chủ đề / Tiêu đề video gốc:
                </label>
                <input
                  type="text"
                  value={aiTopicInput}
                  onChange={(e) => setAiTopicInput(e.target.value)}
                  placeholder="Nhập chủ đề hoặc tiêu đề video..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateAiCopy}
                  disabled={aiGenerating}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{aiGenerating ? "Đang tạo bằng Gemini AI..." : "Tạo Nội Dung Viral AI"}</span>
                </button>
              </div>

              {generatedCopy && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-pink-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-pink-400 uppercase">
                      Kết quả AI ({generatedCopy.generatedBy || "Gemini Flash"})
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${generatedCopy.title}\n\n${generatedCopy.description}`);
                        soundSynth.playSfx("pop");
                        addToast("Đã sao chép nội dung AI vào clipboard!", "info");
                      }}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-pink-400" />
                      <span>Sao chép</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400">Tiêu đề Gợi ý:</label>
                    <p className="text-xs font-bold text-white">{generatedCopy.title}</p>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400">Caption & Hashtags:</label>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{generatedCopy.description}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
