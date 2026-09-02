import React, { useState, useMemo } from "react";
import {
  FolderOpen,
  UploadCloud,
  Upload,
  Layers,
  Save,
  Trash2,
  Play,
  Copy,
  ExternalLink,
  Film,
  Scissors,
  Check,
  Search,
  Plus,
  ArrowUpDown,
  Sparkles,
  Download,
  CheckCircle2,
  FolderPlus,
  Share2,
  HardDrive,
  Eye,
  Clock,
  Video,
  Grid,
  List,
  SlidersHorizontal,
  RefreshCw,
  FileSpreadsheet,
  Music,
  CheckSquare,
  Square,
  Maximize2,
  FolderSync,
  Volume2,
  Flame,
  ThumbsUp,
  FolderCheck,
  Send,
  CloudUpload,
  ArrowRight,
  Info,
  Mic,
  X
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";
import { useQueue } from "../context/QueueContext";

export interface DownloadedFolderVideo {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  resolution: string;
  fileSize: string;
  platform: string;
  views: number;
  likes: number;
  downloadDate: string;
  filePath: string;
  hasAudioExtracted?: boolean;
}

export interface DownloadedFolderItem {
  id: string;
  stt: number;
  name: string;
  videoCount: number;
  path: string;
  platform: "douyin" | "tiktok" | "youtube" | "kuaishou" | "facebook" | "general";
  createdAt: string;
  totalSize: string;
  coverImage: string;
  videos: DownloadedFolderVideo[];
}

const INITIAL_FOLDERS: DownloadedFolderItem[] = [
  {
    id: "folder_1",
    stt: 1,
    name: "深空拾光 (Khám Phá Vũ Trụ 4K)",
    videoCount: 8,
    path: "D:\\Downloads\\CreatorOS\\深空拾光_batch1",
    platform: "douyin",
    createdAt: "01/09/2026 14:20",
    totalSize: "482 MB",
    coverImage: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&h=350&fit=crop",
    videos: [
      {
        id: "vid_1_1",
        videoId: "7345678912345678901",
        title: "【科幻震撼】深空拾光：探索未知星系与虫洞穿梭之谜",
        thumbnail: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&h=225&fit=crop",
        duration: "00:48",
        resolution: "1080x1920 (9:16)",
        fileSize: "48.2 MB",
        platform: "douyin",
        views: 890000,
        likes: 124000,
        downloadDate: "01/09/2026",
        filePath: "D:\\Downloads\\CreatorOS\\深空拾光_batch1\\7345678912345678901.mp4",
        hasAudioExtracted: true
      },
      {
        id: "vid_1_2",
        videoId: "7345678912345678902",
        title: "深空拾光第2集：星际流浪者的孤独独白 #科幻 #解说",
        thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=225&fit=crop",
        duration: "01:12",
        resolution: "1080x1920 (9:16)",
        fileSize: "62.4 MB",
        platform: "douyin",
        views: 1250000,
        likes: 210000,
        downloadDate: "01/09/2026",
        filePath: "D:\\Downloads\\CreatorOS\\深空拾光_batch1\\7345678912345678902.mp4",
        hasAudioExtracted: true
      },
      {
        id: "vid_1_3",
        videoId: "7345678912345678903",
        title: "黑洞边缘的时间膨胀效应实景模拟",
        thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop",
        duration: "00:35",
        resolution: "1080x1920 (9:16)",
        fileSize: "36.8 MB",
        platform: "douyin",
        views: 640000,
        likes: 85000,
        downloadDate: "01/09/2026",
        filePath: "D:\\Downloads\\CreatorOS\\深空拾光_batch1\\7345678912345678903.mp4",
        hasAudioExtracted: false
      }
    ]
  },
  {
    id: "folder_2",
    stt: 2,
    name: "Voice Acting Trends & Dubbing",
    videoCount: 6,
    path: "D:\\Downloads\\CreatorOS\\dubbing_project",
    platform: "tiktok",
    createdAt: "01/09/2026 11:15",
    totalSize: "395 MB",
    coverImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=350&fit=crop",
    videos: [
      {
        id: "vid_2_1",
        videoId: "730372860995515653",
        title: "Top 5 Voice acting trends in animation movie 2026 #dubbing #voiceover",
        thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=225&fit=crop",
        duration: "00:54",
        resolution: "1080x1920 (9:16)",
        fileSize: "41.5 MB",
        platform: "tiktok",
        views: 450000,
        likes: 67000,
        downloadDate: "01/09/2026",
        filePath: "D:\\Downloads\\CreatorOS\\dubbing_project\\730372860995515653.mp4",
        hasAudioExtracted: true
      },
      {
        id: "vid_2_2",
        videoId: "7311894523910245638",
        title: "Cách lồng tiếng AI khớp khẩu hình 100% không lo lệch nhịp",
        thumbnail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=225&fit=crop",
        duration: "01:05",
        resolution: "1080x1920 (9:16)",
        fileSize: "53.2 MB",
        platform: "tiktok",
        views: 890000,
        likes: 112000,
        downloadDate: "01/09/2026",
        filePath: "D:\\Downloads\\CreatorOS\\dubbing_project\\7311894523910245638.mp4",
        hasAudioExtracted: true
      }
    ]
  },
  {
    id: "folder_3",
    stt: 3,
    name: "Masterclass Studio Tutorials (YT)",
    videoCount: 4,
    path: "D:\\Downloads\\CreatorOS\\youtube_masterclass",
    platform: "youtube",
    createdAt: "31/08/2026 18:40",
    totalSize: "288 MB",
    coverImage: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=350&fit=crop",
    videos: [
      {
        id: "vid_3_1",
        videoId: "3fM4pU8qW4Y",
        title: "Mastering Voice Dubbing & AI Speech Synthesis Full Guide 2026",
        thumbnail: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=225&fit=crop",
        duration: "03:20",
        resolution: "1920x1080 (16:9)",
        fileSize: "88.0 MB",
        platform: "youtube",
        views: 320000,
        likes: 42000,
        downloadDate: "31/08/2026",
        filePath: "D:\\Downloads\\CreatorOS\\youtube_masterclass\\3fM4pU8qW4Y.mp4",
        hasAudioExtracted: true
      }
    ]
  },
  {
    id: "folder_4",
    stt: 4,
    name: "Reels Viral Hooks & Mini Vlogs",
    videoCount: 12,
    path: "D:\\Downloads\\CreatorOS\\reels_viral_hooks",
    platform: "facebook",
    createdAt: "30/08/2026 09:30",
    totalSize: "620 MB",
    coverImage: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&h=350&fit=crop",
    videos: [
      {
        id: "vid_4_1",
        videoId: "FB_789456123001",
        title: "Công thức mở đầu 3 giây giữ chân 90% người xem Reels",
        thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=225&fit=crop",
        duration: "00:42",
        resolution: "1080x1920 (9:16)",
        fileSize: "39.5 MB",
        platform: "facebook",
        views: 1450000,
        likes: 198000,
        downloadDate: "30/08/2026",
        filePath: "D:\\Downloads\\CreatorOS\\reels_viral_hooks\\FB_789456123001.mp4",
        hasAudioExtracted: true
      }
    ]
  }
];

interface DownloadedVideosToolProps {
  onNavigateToTab?: (tab: string) => void;
}

export function DownloadedVideosTool({ onNavigateToTab }: DownloadedVideosToolProps) {
  const { addToast } = useToast();
  const { addTask } = useQueue();

  // State
  const [activeSubTab, setActiveSubTab] = useState<"folders" | "audio" | "recovery">("folders");
  const [folders, setFolders] = useState<DownloadedFolderItem[]>(INITIAL_FOLDERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "table" | "all-videos">("grid");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Modals & Drawers
  const [viewingFolder, setViewingFolder] = useState<DownloadedFolderItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [newFolderPath, setNewFolderPath] = useState<string>("D:\\Downloads\\CreatorOS\\New_Folder");
  const [newFolderPlatform, setNewFolderPlatform] = useState<DownloadedFolderItem["platform"]>("douyin");
  const [mergeTargetName, setMergeTargetName] = useState<string>("Merged_Videos_Collection");

  // Video Preview Player Modal
  const [activePreviewVideo, setActivePreviewVideo] = useState<DownloadedFolderVideo | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Statistics
  const totalVideosCount = useMemo(() => {
    return folders.reduce((acc, f) => acc + f.videoCount, 0);
  }, [folders]);

  const totalStorageSize = useMemo(() => {
    const totalMb = folders.reduce((acc, f) => {
      const num = parseInt(f.totalSize.replace(/[^0-9]/g, "") || "0");
      return acc + num;
    }, 0);
    return totalMb >= 1024 ? `${(totalMb / 1024).toFixed(2)} GB` : `${totalMb} MB`;
  }, [folders]);

  // Flatten all videos for "all-videos" gallery view
  const allFlattenedVideos = useMemo(() => {
    const list: (DownloadedFolderVideo & { folderName: string; folderId: string })[] = [];
    folders.forEach((f) => {
      f.videos.forEach((v) => {
        list.push({ ...v, folderName: f.name, folderId: f.id });
      });
    });
    return list;
  }, [folders]);

  // Filtered folders
  const displayedFolders = useMemo(() => {
    return folders.filter((f) => {
      const matchSearch =
        !searchQuery.trim() ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlatform = platformFilter === "all" || f.platform === platformFilter;
      return matchSearch && matchPlatform;
    });
  }, [folders, searchQuery, platformFilter]);

  const displayedVideosGallery = useMemo(() => {
    return allFlattenedVideos.filter((v) => {
      const matchSearch =
        !searchQuery.trim() ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.videoId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlatform = platformFilter === "all" || v.platform === platformFilter;
      return matchSearch && matchPlatform;
    });
  }, [allFlattenedVideos, searchQuery, platformFilter]);

  const isAllSelected = displayedFolders.length > 0 && selectedIds.size === displayedFolders.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedFolders.map((f) => f.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng nhập tên thư mục cần thêm.", "warning");
      return;
    }

    const newFolder: DownloadedFolderItem = {
      id: `folder_${Date.now()}`,
      stt: folders.length + 1,
      name: newFolderName.trim(),
      videoCount: 4,
      path: newFolderPath || `D:\\Downloads\\CreatorOS\\${newFolderName.trim()}`,
      platform: newFolderPlatform,
      createdAt:
        new Date().toLocaleDateString("vi-VN") +
        " " +
        new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      totalSize: "185 MB",
      coverImage: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=350&fit=crop",
      videos: [
        {
          id: `vid_${Date.now()}_1`,
          videoId: String(Math.floor(100000000000000000 + Math.random() * 900000000000000000)),
          title: `${newFolderName.trim()} - Đoạn trích 01 (1080p 60fps No Watermark)`,
          thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=225&fit=crop",
          duration: "00:45",
          resolution: "1080x1920 (9:16)",
          fileSize: "37.5 MB",
          platform: newFolderPlatform,
          views: 120000,
          likes: 24000,
          downloadDate: new Date().toLocaleDateString("vi-VN"),
          filePath: `${newFolderPath}\\video_01.mp4`,
          hasAudioExtracted: true
        }
      ]
    };

    setFolders((prev) => [...prev, newFolder]);
    setIsUploadModalOpen(false);
    setNewFolderName("");
    soundSynth.playSfx("success");
    addToast(`Đã thêm thư mục "${newFolder.name}" vào danh sách!`, "success");
  };

  const handleOpenMergeModal = () => {
    if (selectedIds.size < 2) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng chọn ít nhất 2 thư mục để thực hiện gộp.", "warning");
      return;
    }
    setIsMergeModalOpen(true);
    soundSynth.playSfx("pop");
  };

  const handleExecuteMerge = () => {
    const selectedFolders = folders.filter((f) => selectedIds.has(f.id));
    const allVideos: DownloadedFolderVideo[] = [];
    selectedFolders.forEach((f) => {
      allVideos.push(...f.videos);
    });

    const mergedFolder: DownloadedFolderItem = {
      id: `folder_merged_${Date.now()}`,
      stt: folders.filter((f) => !selectedIds.has(f.id)).length + 1,
      name: mergeTargetName.trim() || "Merged_Collection",
      videoCount: allVideos.length,
      path: `D:\\Downloads\\CreatorOS\\${mergeTargetName.trim()}`,
      platform: "douyin",
      createdAt:
        new Date().toLocaleDateString("vi-VN") +
        " " +
        new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      totalSize: `${selectedFolders.reduce(
        (acc, f) => acc + parseInt(f.totalSize.replace(/[^0-9]/g, "") || "50"),
        0
      )} MB`,
      coverImage: selectedFolders[0]?.coverImage || "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&h=350&fit=crop",
      videos: allVideos
    };

    setFolders((prev) => {
      const remaining = prev.filter((f) => !selectedIds.has(f.id));
      return [...remaining, mergedFolder].map((item, idx) => ({ ...item, stt: idx + 1 }));
    });

    setSelectedIds(new Set());
    setIsMergeModalOpen(false);
    soundSynth.playSfx("success");
    addToast(
      `Đã gộp thành công ${selectedFolders.length} thư mục thành "${mergedFolder.name}"!`,
      "success"
    );
  };

  const handleBackupCatalog = (type: "json" | "csv" | "m3u") => {
    soundSynth.playSfx("pop");
    if (type === "json") {
      const jsonCatalog = JSON.stringify(folders, null, 2);
      const blob = new Blob([jsonCatalog], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CreatorOS_Downloaded_Catalog_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === "csv") {
      let csv = "STT,Tên thư mục,Nền tảng,Số video,Dung lượng,Đường dẫn,Ngày tạo\n";
      folders.forEach((f) => {
        csv += `"${f.stt}","${f.name}","${f.platform}","${f.videoCount}","${f.totalSize}","${f.path}","${f.createdAt}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CreatorOS_Catalog_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let m3u = "#EXTM3U\n";
      allFlattenedVideos.forEach((v) => {
        m3u += `#EXTINF:-1,${v.title}\n${v.filePath}\n`;
      });
      const blob = new Blob([m3u], { type: "audio/x-mpegurl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CreatorOS_Playlist_${Date.now()}.m3u`;
      a.click();
      URL.revokeObjectURL(url);
    }

    soundSynth.playSfx("success");
    addToast(`Đã xuất danh mục định dạng .${type.toUpperCase()} thành công!`, "success");
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng tích chọn các thư mục cần xóa khỏi danh sách.", "warning");
      return;
    }

    const count = selectedIds.size;
    setFolders((prev) => {
      const remaining = prev.filter((f) => !selectedIds.has(f.id));
      return remaining.map((item, idx) => ({ ...item, stt: idx + 1 }));
    });
    setSelectedIds(new Set());
    soundSynth.playSfx("pop");
    addToast(`Đã xóa ${count} thư mục khỏi danh sách quản lý.`, "info");
  };

  const handleSendToEditor = (folderName: string, count: number) => {
    soundSynth.playSfx("success");
    addTask({
      title: `Chuyển ${count} video [${folderName}] sang Studio Bán Content`,
      type: "render",
      status: "running",
      progress: 45
    });
    addToast(`Đã nạp ${count} video từ "${folderName}" vào Timeline Studio 3 lớp!`, "success");
  };

  const handleSendToHighlight = (folderName: string, count: number) => {
    soundSynth.playSfx("success");
    addTask({
      title: `Bóc tách AI Hook cho ${count} video [${folderName}]`,
      type: "ai_script",
      status: "running",
      progress: 30
    });
    addToast(`Đã chuyển ${count} video sang AI Highlight & Kịch bản Viral!`, "success");
  };

  const handleSendToDubbing = (folderName: string, count: number) => {
    soundSynth.playSfx("success");
    addTask({
      title: `Nạp ${count} video [${folderName}] sang Lồng tiếng AI`,
      type: "render",
      status: "running",
      progress: 20
    });
    addToast(`Đã chuyển ${count} video sang Trình Lồng Tiếng AI!`, "success");
    if (onNavigateToTab) {
      onNavigateToTab("translate");
    } else {
      window.dispatchEvent(new CustomEvent("creatoros:navigate", { detail: "translate" }));
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "douyin":
        return {
          name: "Douyin",
          bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          icon: "🎵"
        };
      case "tiktok":
        return {
          name: "TikTok",
          bg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
          icon: "📱"
        };
      case "youtube":
        return {
          name: "YouTube",
          bg: "bg-red-500/15 text-red-400 border-red-500/30",
          icon: "▶️"
        };
      case "facebook":
        return {
          name: "Reels",
          bg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          icon: "🎬"
        };
      case "kuaishou":
        return {
          name: "Kuaishou",
          bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          icon: "⚡"
        };
      default:
        return {
          name: "Local Vault",
          bg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          icon: "📁"
        };
    }
  };

  return (
    <div className="w-full space-y-5 font-sans text-slate-100 antialiased select-none pb-14">
      {/* 1. Header Banner & Storage Overview */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/80 shadow-2xl p-6 backdrop-blur-xl">
        {/* Glow background accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold text-white tracking-tight">
                    Danh Sách Video Đã Quét & Lưu Trữ
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    VAULT PRO V48
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Quản lý các tệp video đã bóc tách bản quyền, sẵn sàng đưa vào Studio Edit Bán Content & AI Highlight
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-rose-400" /> Thư mục
              </span>
              <span className="text-lg font-bold text-white mt-1">{folders.length} nhóm</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-cyan-400" /> Tổng video
              </span>
              <span className="text-lg font-bold text-cyan-300 mt-1">{totalVideosCount} video</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Dung lượng
              </span>
              <span className="text-lg font-bold text-emerald-300 mt-1">{totalStorageSize}</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> GPU Cache
              </span>
              <span className="text-lg font-bold text-purple-300 mt-1">Dual-NVENC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vault Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            setActiveSubTab("folders");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "folders"
              ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>1. Thư Mục & Video Kho Vault</span>
        </button>

        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            setActiveSubTab("audio");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "audio"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Music className="w-4 h-4" />
          <span>2. Kho Âm Thanh MP3 Trích Xuất</span>
        </button>

        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            setActiveSubTab("recovery");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "recovery"
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>3. Tệp Lỗi & Khôi Phục</span>
        </button>
      </div>

      {/* 1.5 Desktop Drag & Drop Direct Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          const files = Array.from(e.dataTransfer.files) as File[];
          if (files.length > 0) {
            const videoFiles: File[] = files.filter((f: File) => f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|mkv|avi|webm)$/i));
            if (videoFiles.length > 0) {
              const newFolder: DownloadedFolderItem = {
                id: `folder_desktop_${Date.now()}`,
                stt: folders.length + 1,
                name: `Tệp Máy Tính Direct Drop (${videoFiles.length})`,
                videoCount: videoFiles.length,
                path: `C:\\Users\\Desktop\\Local_Import_${Date.now()}`,
                platform: "douyin",
                createdAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                totalSize: `${(videoFiles.reduce((acc: number, f: File) => acc + (f.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`,
                coverImage: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=350&fit=crop",
                videos: videoFiles.map((vf: File, idx: number) => ({
                  id: `vf_${Date.now()}_${idx}`,
                  videoId: String(Math.floor(100000000000000000 + Math.random() * 900000000000000000)),
                  title: vf.name,
                  thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=225&fit=crop",
                  duration: "01:30",
                  resolution: "1080x1920 (9:16)",
                  fileSize: `${(vf.size / (1024 * 1024)).toFixed(1)} MB`,
                  platform: "douyin",
                  views: 0,
                  likes: 0,
                  downloadDate: new Date().toLocaleDateString("vi-VN"),
                  filePath: `C:\\Users\\Desktop\\${vf.name}`,
                  hasAudioExtracted: false
                }))
              };
              setFolders(prev => [newFolder, ...prev]);
              soundSynth.playSfx("success");
              addToast(`Đã nhập trực tiếp ${videoFiles.length} video từ máy tính vào Kho Video!`, "success");
            } else {
              addToast("Vui lòng thả các tệp video (.mp4, .mov, .mkv) từ máy tính.", "warning");
            }
          }
        }}
        className={`relative rounded-2xl border-2 border-dashed p-4 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer shadow-lg ${
          isDraggingFile
            ? "bg-rose-950/50 border-rose-400 text-rose-200 ring-4 ring-rose-500/20"
            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <Upload className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Kéo Thả Video Trực Tiếp Từ Máy Tính (Desktop Direct Import)</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">1-Click Local Sync</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Thả tệp .MP4 / .MOV / .MKV từ ổ đĩa máy tính vào đây để tự động tạo thư mục vault quản lý
            </p>
          </div>
        </div>

        <label className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95">
          <Plus className="w-3.5 h-3.5" />
          <span>Nạp Tệp Máy Tính</span>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || []) as File[];
              if (files.length > 0) {
                const newFolder: DownloadedFolderItem = {
                  id: `folder_desktop_${Date.now()}`,
                  stt: folders.length + 1,
                  name: `Tệp Máy Tính Imported (${files.length})`,
                  videoCount: files.length,
                  path: `C:\\Users\\Desktop\\Imported_${Date.now()}`,
                  platform: "douyin",
                  createdAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                  totalSize: `${(files.reduce((acc: number, f: File) => acc + (f.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`,
                  coverImage: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=350&fit=crop",
                  videos: files.map((vf: File, idx: number) => ({
                    id: `vf_${Date.now()}_${idx}`,
                    videoId: String(Math.floor(100000000000000000 + Math.random() * 900000000000000000)),
                    title: vf.name,
                    thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=225&fit=crop",
                    duration: "01:30",
                    resolution: "1080x1920 (9:16)",
                    fileSize: `${(vf.size / (1024 * 1024)).toFixed(1)} MB`,
                    platform: "douyin",
                    views: 0,
                    likes: 0,
                    downloadDate: new Date().toLocaleDateString("vi-VN"),
                    filePath: `C:\\Users\\Desktop\\${vf.name}`,
                    hasAudioExtracted: false
                  }))
                };
                setFolders(prev => [newFolder, ...prev]);
                soundSynth.playSfx("success");
                addToast(`Đã thêm ${files.length} video từ máy tính vào Kho Video!`, "success");
              }
            }}
            className="hidden"
          />
        </label>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 backdrop-blur-md">
        {/* Left: Quick Actions (Upload / Merge / Backup / Delete) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tải lên thư mục */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsUploadModalOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tải lên thư mục</span>
          </button>

          {/* Gộp thư mục */}
          <button
            onClick={handleOpenMergeModal}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              selectedIds.size >= 2
                ? "bg-purple-600/20 border-purple-500/40 text-purple-200 hover:bg-purple-600/30"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
            }`}
            title="Chọn ít nhất 2 thư mục để gộp"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Gộp thư mục</span>
            {selectedIds.size > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-[10px] text-purple-300 font-mono">
                {selectedIds.size}
              </span>
            )}
          </button>

          {/* Quick Send Selected to Dubbing */}
          <button
            onClick={() => {
              const targetCount = selectedIds.size > 0 
                ? folders.filter(f => selectedIds.has(f.id)).reduce((acc, f) => acc + f.videoCount, 0)
                : totalVideosCount;
              handleSendToDubbing(selectedIds.size > 0 ? `${selectedIds.size} thư mục chọn` : "Toàn bộ thư mục", targetCount);
            }}
            className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-200" />
            <span>Chuyển sang Dịch Lồng Tiếng AI</span>
          </button>

          {/* Xuất / Sao lưu Dropdown */}
          <div className="relative group">
            <button className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>Xuất Catalog</span>
            </button>

            <div className="absolute left-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-30">
              <button
                onClick={() => handleBackupCatalog("json")}
                className="w-full px-2.5 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sao lưu JSON</span>
              </button>
              <button
                onClick={() => handleBackupCatalog("csv")}
                className="w-full px-2.5 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xuất Excel CSV</span>
              </button>
              <button
                onClick={() => handleBackupCatalog("m3u")}
                className="w-full px-2.5 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Music className="w-3.5 h-3.5 text-purple-400" />
                <span>Xuất Playlist M3U</span>
              </button>
            </div>
          </div>

          {/* Xóa d/s */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              selectedIds.size > 0
                ? "bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50"
                : "bg-slate-800/30 border-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa đã chọn ({selectedIds.size})</span>
          </button>
        </div>

        {/* Right: Search, Platform Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter Buttons */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                platformFilter === "all" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setPlatformFilter("douyin")}
              className={`px-2 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                platformFilter === "douyin" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Douyin
            </button>
            <button
              onClick={() => setPlatformFilter("tiktok")}
              className={`px-2 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                platformFilter === "tiktok" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              TikTok
            </button>
            <button
              onClick={() => setPlatformFilter("youtube")}
              className={`px-2 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                platformFilter === "youtube" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              YouTube
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-rose-500 outline-none transition-all"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Chế độ thẻ (Grid Cards)"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "table" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Chế độ bảng (Table View)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("all-videos")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "all-videos" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Xem toàn bộ video clip (Gallery)"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Content Views */}

      {/* VIEW 1: GRID CARDS (Direct visual cards for folders) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {displayedFolders.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">Không tìm thấy thư mục video phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Hãy thử xóa bộ lọc tìm kiếm hoặc thêm thư mục mới.</p>
            </div>
          ) : (
            displayedFolders.map((folder) => {
              const isChecked = selectedIds.has(folder.id);
              const badge = getPlatformBadge(folder.platform);

              return (
                <div
                  key={folder.id}
                  className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col bg-gradient-to-b from-slate-900/95 to-slate-950 backdrop-blur-md ${
                    isChecked
                      ? "border-rose-500 ring-1 ring-rose-500/50 shadow-lg shadow-rose-950/40"
                      : "border-slate-800 hover:border-slate-700 hover:shadow-xl"
                  }`}
                >
                  {/* Top Cover Image & Video Stack Preview */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                    <img
                      src={folder.coverImage}
                      alt={folder.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />

                    {/* Checkbox */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectRow(folder.id);
                        }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/50"
                            : "bg-black/60 text-transparent hover:text-slate-400 border border-white/20"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* Platform Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${badge.bg}`}
                      >
                        {badge.icon} {badge.name}
                      </span>
                    </div>

                    {/* Hover Quick Play Button */}
                    <div
                      onClick={() => {
                        soundSynth.playSfx("pop");
                        setViewingFolder(folder);
                      }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Stats Overlay Bottom */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-md border border-white/10">
                        <Film className="w-3 h-3 text-cyan-400" /> {folder.videoCount} video
                      </span>
                      <span className="bg-black/70 px-2 py-0.5 rounded-md border border-white/10 text-emerald-400">
                        {folder.totalSize}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3
                        onClick={() => {
                          soundSynth.playSfx("pop");
                          setViewingFolder(folder);
                        }}
                        className="text-sm font-bold text-white hover:text-rose-400 transition-colors line-clamp-1 cursor-pointer"
                        title={folder.name}
                      >
                        {folder.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={folder.path}>
                        {folder.path}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => {
                          soundSynth.playSfx("pop");
                          setViewingFolder(folder);
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>

                      <button
                        onClick={() => handleSendToEditor(folder.name, folder.videoCount)}
                        className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                        title="Gửi sang Studio Edit Bán Content"
                      >
                        <Film className="w-3.5 h-3.5 text-rose-400" />
                      </button>

                      <button
                        onClick={() => handleSendToHighlight(folder.name, folder.videoCount)}
                        className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                        title="Bóc tách AI Highlight & Hook"
                      >
                        <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                      </button>

                      <button
                        onClick={() => handleSendToDubbing(folder.name, folder.videoCount)}
                        className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                        title="Chuyển sang Lồng Tiếng AI"
                      >
                        <Mic className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW (Data rich table) */}
      {viewMode === "table" && (
        <div className="bg-slate-900/90 rounded-xl shadow-xl border border-slate-800 overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[760px]">
              {/* Header */}
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-300">
                <tr className="text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">STT</th>
                  <th className="py-3 px-2 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        isAllSelected
                          ? "bg-rose-600 text-white"
                          : "border border-slate-600 bg-slate-800 text-transparent"
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Tên thư mục</th>
                  <th className="py-3 px-4">Nền tảng</th>
                  <th className="py-3 px-4 text-center">Số lượng</th>
                  <th className="py-3 px-4 text-center">Dung lượng</th>
                  <th className="py-3 px-4">Ngày quét</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {displayedFolders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-500 bg-slate-950/40">
                      <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-400">Không có thư mục nào</p>
                    </td>
                  </tr>
                ) : (
                  displayedFolders.map((folder) => {
                    const isChecked = selectedIds.has(folder.id);
                    const badge = getPlatformBadge(folder.platform);

                    return (
                      <tr
                        key={folder.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isChecked ? "bg-rose-950/20" : ""
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3 px-4 text-center font-mono text-slate-400">{folder.stt}</td>

                        {/* Checkbox */}
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleToggleSelectRow(folder.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-rose-600 text-white"
                                : "border border-slate-600 bg-slate-800 text-transparent hover:border-slate-400"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </td>

                        {/* Tên */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                              <img
                                src={folder.coverImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div
                                onClick={() => {
                                  soundSynth.playSfx("pop");
                                  setViewingFolder(folder);
                                }}
                                className="font-bold text-white hover:text-rose-400 transition-colors cursor-pointer truncate"
                              >
                                {folder.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                                {folder.path}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Nền tảng */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                          >
                            {badge.icon} {badge.name}
                          </span>
                        </td>

                        {/* Số lượng */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-cyan-300">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                            {folder.videoCount} video
                          </span>
                        </td>

                        {/* Dung lượng */}
                        <td className="py-3 px-4 text-center font-mono text-emerald-400">
                          {folder.totalSize}
                        </td>

                        {/* Ngày quét */}
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {folder.createdAt}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                soundSynth.playSfx("pop");
                                setViewingFolder(folder);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem</span>
                            </button>
                            <button
                              onClick={() => handleSendToEditor(folder.name, folder.videoCount)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                              title="Gửi sang Studio Edit"
                            >
                              <Film className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Summary */}
          <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                Tổng thư mục: <strong className="text-white">{folders.length}</strong>
              </span>
              <span>
                Đã chọn: <strong className="text-rose-400">{selectedIds.size}</strong>
              </span>
              <span>
                Tổng dung lượng: <strong className="text-emerald-400">{totalStorageSize}</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Đồng bộ dữ liệu thời gian thực với NVENC Cache & Timeline Editor
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ALL VIDEOS GALLERY VIEW */}
      {viewMode === "all-videos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedVideosGallery.length === 0 ? (
              <div className="col-span-full py-14 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
                <Video className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-xs">Không có video nào trong danh sách</p>
              </div>
            ) : (
              displayedVideosGallery.map((vid) => (
                <div
                  key={vid.id}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden flex flex-col hover:border-rose-500/50 transition-all shadow-md"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setActivePreviewVideo(vid)}
                    className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
                  >
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                      <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>

                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/10">
                      {vid.duration}
                    </span>
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/50">
                      {vid.resolution}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h4
                        className="text-xs font-bold text-white line-clamp-2 hover:text-rose-400 transition-colors"
                        title={vid.title}
                      >
                        {vid.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-1">
                        📁 {vid.folderName}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-mono">{vid.fileSize}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(vid.videoId);
                            soundSynth.playSfx("pop");
                            addToast(`Đã sao chép ID: ${vid.videoId}`, "info");
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Sao chép ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setActivePreviewVideo(vid)}
                          className="px-2 py-0.8 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 2: KHO ÂM THANH MP3 TRÍCH XUẤT */}
      {activeSubTab === "audio" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Kho Âm Thanh MP3 Trích Xuất (Audio Vault)</h3>
                <p className="text-xs text-slate-400">Các tệp nhạc nền, thoại gốc bóc tách từ video sẵn sàng cho Studio Lồng Tiếng AI</p>
              </div>
            </div>
            <button
              onClick={() => {
                soundSynth.playSfx("cash");
                addToast("Đã trích xuất MP3 hàng loạt cho 12 video trong Vault!", "success");
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Music className="w-3.5 h-3.5 text-purple-200" />
              <span>Trích Xuất All MP3</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "Douyin_Trending_BGM_320kbps.mp3", duration: "02:15", size: "5.2 MB", source: "Thư mục Douyin Hot" },
              { name: "Voice_Narrator_Chinese_Raw.mp3", duration: "01:45", size: "3.8 MB", source: "Thư mục Phim Ngắn" },
              { name: "TikTok_Viral_Sound_Effect.mp3", duration: "00:58", size: "1.9 MB", source: "Thư mục Remix" }
            ].map((audio, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono text-xs font-bold">
                    MP3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{audio.name}</h4>
                    <p className="text-[10px] text-slate-400">{audio.source} • {audio.duration} • {audio.size}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundSynth.playSfx("pop");
                    addToast(`Phát thử âm thanh: ${audio.name}`, "info");
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-xs font-bold cursor-pointer"
                >
                  Phát
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 3: TỆP LỖI & KHÔI PHỤC */}
      {activeSubTab === "recovery" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Trung Tâm Khôi Phục & Tải Lại Tệp Lỗi</h3>
              <p className="text-xs text-slate-400">Tự động khôi phục các tệp video tải dở dang do đứt mạng hoặc bị giới hạn IP</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-slate-200">Không có tệp nào bị hỏng. Toàn bộ 12 video trong Vault ở trạng thái nguyên vẹn 100%!</span>
            </div>
            <button
              onClick={() => {
                soundSynth.playSfx("success");
                addToast("Đã quét dọn và kiểm tra tính toàn vẹn Vault!", "success");
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Quét Lại Vault
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL / DRAWER: Xem danh sách video bên trong một thư mục */}
      {viewingFolder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {viewingFolder.name}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                      {viewingFolder.videoCount} video • {viewingFolder.totalSize}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{viewingFolder.path}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundSynth.playSfx("pop");
                    addToast(`Đã mở thư mục ${viewingFolder.name} trong File Explorer!`, "success");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mở Explorer</span>
                </button>
                <button
                  onClick={() => setViewingFolder(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white font-bold cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendToEditor(viewingFolder.name, viewingFolder.videoCount)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5 text-rose-400" />
                  <span>Gửi vào Edit Bán Content</span>
                </button>

                <button
                  onClick={() => handleSendToHighlight(viewingFolder.name, viewingFolder.videoCount)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-rose-600/30"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Gửi vào AI Highlight</span>
                </button>

                <button
                  onClick={() => handleSendToDubbing(viewingFolder.name, viewingFolder.videoCount)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Lồng tiếng AI ngay</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Ngày quét: {viewingFolder.createdAt}
              </div>
            </div>

            {/* Video List inside folder */}
            <div className="p-4 overflow-y-auto max-h-[550px] space-y-3 custom-scrollbar">
              {viewingFolder.videos.map((vid) => (
                <div
                  key={vid.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all gap-4 shadow-sm"
                >
                  {/* Left: Thumbnail & Duration */}
                  <div
                    onClick={() => setActivePreviewVideo(vid)}
                    className="relative w-full sm:w-36 h-20 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 cursor-pointer group shadow-sm"
                    title="Bấm để phát video"
                  >
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/15 flex items-center justify-center transition-all">
                      <Play className="w-6 h-6 fill-white text-white opacity-90 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.2 rounded bg-black/80 text-white border border-white/10">
                      {vid.duration}
                    </span>
                  </div>

                  {/* Center: Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-white line-clamp-1" title={vid.title}>
                      {vid.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 font-mono">
                      <span>ID: {vid.videoId}</span>
                      <span>•</span>
                      <span className="text-cyan-400">Độ phân giải: {vid.resolution}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{vid.fileSize}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{vid.filePath}</p>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(vid.videoId);
                        soundSynth.playSfx("pop");
                        addToast(`Đã sao chép ID: ${vid.videoId}`, "info");
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                      title="Sao chép ID video"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setActivePreviewVideo(vid)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/30"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Xem video</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>Đang hiển thị {viewingFolder.videos.length} video trong thư mục này</span>
              <button
                onClick={() => setViewingFolder(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: Thêm Thư Mục Mới */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tải lên / Thêm thư mục video</h3>
                  <p className="text-[11px] text-slate-400">Nhập đường dẫn thư mục lưu trữ trên ổ đĩa</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Tên thư mục / Nhóm quét:</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Vd: TikTok Trend Tháng 9, Douyin Phim Hay..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-rose-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Nền tảng:</label>
                <select
                  value={newFolderPlatform}
                  onChange={(e) => setNewFolderPlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-rose-500 outline-none"
                >
                  <option value="douyin">Douyin (TikTok Trung Quốc)</option>
                  <option value="tiktok">TikTok Quốc Tế</option>
                  <option value="youtube">YouTube Shorts</option>
                  <option value="facebook">Facebook Reels</option>
                  <option value="kuaishou">Kuaishou</option>
                  <option value="general">Thư mục tổng hợp khác</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Đường dẫn ổ đĩa cục bộ:</label>
                <input
                  type="text"
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  placeholder="D:\Downloads\CreatorOS\..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" /> Hệ thống tự động:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Tự động quét bóc tách và tạo chỉ mục metadata cho tất cả các file .MP4 có trong đường dẫn, sẵn sàng cho công cụ render Bán Content.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCreateNewFolder}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
              >
                Xác nhận thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Gộp Thư Mục */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gộp {selectedIds.size} thư mục đã chọn</h3>
                  <p className="text-[11px] text-slate-400">Hợp nhất tất cả video vào một thư mục chung</p>
                </div>
              </div>
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Tên thư mục hợp nhất mới:</label>
                <input
                  type="text"
                  value={mergeTargetName}
                  onChange={(e) => setMergeTargetName(e.target.value)}
                  placeholder="Merged_Videos_Collection"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-3 text-purple-200 text-xs">
                <p className="font-bold text-purple-300">Các thư mục sẽ được hợp nhất:</p>
                <ul className="list-disc list-inside mt-1.5 text-[11px] text-purple-200/80 space-y-0.5">
                  {folders
                    .filter((f) => selectedIds.has(f.id))
                    .map((f) => (
                      <li key={f.id}>
                        {f.name} ({f.videoCount} video)
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteMerge}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
              >
                Thực hiện gộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. VIDEO PLAYER PREVIEW MODAL */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{activePreviewVideo.title}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {activePreviewVideo.videoId}</p>
                </div>
              </div>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Video Stage Container */}
            <div className="p-4 space-y-3">
              <div className="w-full aspect-video rounded-xl bg-black overflow-hidden relative border border-slate-800 shadow-2xl flex items-center justify-center">
                <img
                  src={activePreviewVideo.thumbnail}
                  alt=""
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-3 p-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/60 cursor-pointer hover:scale-105 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white max-w-md line-clamp-1">
                      {activePreviewVideo.title}
                    </p>
                    <p className="text-[11px] text-slate-300 font-mono">
                      {activePreviewVideo.resolution} • {activePreviewVideo.duration} • {activePreviewVideo.fileSize}
                    </p>
                  </div>
                </div>

                {/* Video controls bar overlay */}
                <div className="absolute bottom-2 left-3 right-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        isLooping ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "text-slate-400 border-slate-700"
                      }`}
                    >
                      🔁 Lặp lại
                    </button>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <span>Tốc độ:</span>
                      {[1, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`px-1.5 py-0.5 rounded ${
                            playbackSpeed === s ? "bg-rose-600 text-white font-bold" : "hover:text-slate-200"
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-400">1080p HD NVENC</span>
                </div>
              </div>

              {/* Details table */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Vị trí tệp:</span>
                  <span className="font-mono text-slate-200 font-semibold truncate max-w-[340px]">
                    {activePreviewVideo.filePath}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Thời gian tải:</span>
                  <span className="font-semibold text-slate-200">{activePreviewVideo.downloadDate}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    soundSynth.playSfx("pop");
                    addToast(`Đã mở tệp video trong trình phát mặc định của hệ thống!`, "info");
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Phát trình ngoài (VLC/Windows)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleSendToDubbing(activePreviewVideo.title, 1);
                      setActivePreviewVideo(null);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Lồng tiếng AI ngay</span>
                  </button>
                  <button
                    onClick={() => setActivePreviewVideo(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer border border-slate-700"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Batch Action Bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-rose-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-300">
            <CheckSquare className="w-4 h-4 text-rose-400" />
            <span>Đã chọn: {selectedIds.size} mục</span>
          </div>

          <div className="h-5 w-px bg-slate-800" />

          {/* Action 1: Dubbing AI */}
          <button
            onClick={() => handleSendToDubbing("Đã chọn hàng loạt", selectedIds.size)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95 transition-all"
          >
            <Mic className="w-3.5 h-3.5 text-blue-200" />
            <span>🎙️ Lồng Tiếng AI ({selectedIds.size})</span>
          </button>

          {/* Action 2: Extract MP3 */}
          <button
            onClick={() => {
              soundSynth.playSfx("cash");
              addToast(`Đã xếp hàng trích xuất MP3 cho ${selectedIds.size} thư mục!`, "success");
            }}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <Music className="w-3.5 h-3.5 text-purple-200" />
            <span>🎵 Trích Xuất MP3</span>
          </button>

          {/* Action 3: Open OS Path */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              const firstSelected = folders.find(f => selectedIds.has(f.id));
              if (firstSelected) {
                addToast(`Đường dẫn OS: ${firstSelected.path}`, "info");
              }
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>📂 Thư Mục OS</span>
          </button>

          {/* Action 4: Delete */}
          <button
            onClick={handleDeleteSelected}
            className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>

          {/* Action 5: Deselect All */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Bỏ chọn tất cả"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
