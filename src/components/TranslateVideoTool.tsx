import React, { useState, useMemo, useEffect } from "react";
import {
  Volume2,
  Play,
  RotateCw,
  Folder,
  FolderOpen,
  Sparkles,
  Zap,
  Check,
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Star,
  Heart,
  Download,
  CloudDownload,
  Cpu,
  Tv,
  CheckCircle2,
  Trash2,
  Copy,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Video,
  Mic,
  ShieldCheck,
  Pause,
  RefreshCw,
  X
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";
import { useQueue } from "../context/QueueContext";

interface FolderVideoItem {
  id: string;
  stt: number;
  folderName: string;
  count: number;
  isSelected?: boolean;
  videos: {
    id: string;
    title: string;
    duration: string;
    size: string;
    filePath: string;
    status: "idle" | "queued" | "processing" | "completed";
  }[];
}

interface DubbingQueueItem {
  id: string;
  stt: number;
  videoTitle: string;
  folderName: string;
  startTime: string;
  status: "processing" | "completed" | "queued" | "failed";
  progress: number;
  targetLang: string;
  voice: string;
}

interface VoiceItem {
  id: string;
  name: string;
  gender: "Nam" | "Nữ";
  isDownloaded: boolean;
  isFavorite: boolean;
  sampleAudio?: string;
  badge?: string;
}

const INITIAL_FOLDERS: FolderVideoItem[] = [
  {
    id: "f_1",
    stt: 1,
    folderName: "深空拾光",
    count: 10,
    isSelected: true,
    videos: [
      { id: "v1_1", title: "【科幻震撼】深空拾光：探索未知星系与虫洞穿梭之谜.mp4", duration: "00:48", size: "48.2 MB", filePath: "D:\\Downloads\\CreatorOS\\深空拾光\\7345678912345678901.mp4", status: "completed" },
      { id: "v1_2", title: "深空拾光第2集：星际流浪者的孤独独白 #科幻.mp4", duration: "01:12", size: "62.4 MB", filePath: "D:\\Downloads\\CreatorOS\\深空拾光\\7345678912345678902.mp4", status: "idle" },
      { id: "v1_3", title: "黑洞边缘的时间膨胀效应实景模拟.mp4", duration: "00:35", size: "36.8 MB", filePath: "D:\\Downloads\\CreatorOS\\深空拾光\\7345678912345678903.mp4", status: "idle" }
    ]
  },
  {
    id: "f_2",
    stt: 2,
    folderName: "dubbing",
    count: 10,
    isSelected: false,
    videos: [
      { id: "v2_1", title: "Voice acting trends in animation movie 2026.mp4", duration: "00:54", size: "41.5 MB", filePath: "D:\\Downloads\\CreatorOS\\dubbing\\tiktok_01.mp4", status: "idle" },
      { id: "v2_2", title: "Cách lồng tiếng AI khớp khẩu hình 100%.mp4", duration: "01:05", size: "53.2 MB", filePath: "D:\\Downloads\\CreatorOS\\dubbing\\tiktok_02.mp4", status: "idle" }
    ]
  },
  {
    id: "f_3",
    stt: 3,
    folderName: "dubbing",
    count: 1,
    isSelected: false,
    videos: [
      { id: "v3_1", title: "Viral Hook 3s Reels Facebook.mp4", duration: "00:42", size: "39.5 MB", filePath: "D:\\Downloads\\CreatorOS\\dubbing\\fb_reels_01.mp4", status: "idle" }
    ]
  },
  {
    id: "f_4",
    stt: 4,
    folderName: "深空拾光",
    count: 16,
    isSelected: false,
    videos: [
      { id: "v4_1", title: "Trailer phim khoa học viễn tưởng tập 4.mp4", duration: "02:15", size: "112.0 MB", filePath: "D:\\Downloads\\CreatorOS\\深空拾光\\sci_fi_04.mp4", status: "idle" }
    ]
  }
];

const VOICES_LIST: VoiceItem[] = [
  { id: "manh_dung", name: "Mạnh Dũng", gender: "Nam", isDownloaded: true, isFavorite: true, badge: "Khuyên Dùng" },
  { id: "ban_mai", name: "Ban Mai", gender: "Nữ", isDownloaded: false, isFavorite: false },
  { id: "calm_woman", name: "Calm Woman", gender: "Nữ", isDownloaded: false, isFavorite: false },
  { id: "chieu_thanh", name: "Chiêu Thanh", gender: "Nam", isDownloaded: false, isFavorite: false },
  { id: "lac_phi", name: "Lạc Phi", gender: "Nữ", isDownloaded: false, isFavorite: false },
  { id: "mai_phuong", name: "Mai Phương", gender: "Nữ", isDownloaded: false, isFavorite: false },
  { id: "my_tam", name: "Mỹ Tâm", gender: "Nữ", isDownloaded: false, isFavorite: false },
  { id: "ngoc_huyen", name: "Ngọc Huyền", gender: "Nữ", isDownloaded: false, isFavorite: false }
];

export const DEFAULT_DUBBING_PROMPT = `Write the dubbing script in natural spoken {{ TARGET_LANGUAGE }}.

Priorities:
- Preserve the real meaning, facts, names, numbers, relationships, emotion, and cause/effect.
- Localize idioms, jokes, slang, and cultural references instead of translating word by word.
- Make each line sound like something a real person would say aloud.
- Keep one consistent pronoun/register style for each video.
- For short time slots, keep the core idea clear and concise. Do not cut important facts just to make the line short.
- Avoid stiff textbook wording, filler, ellipses, markdown, and special symbols that TTS reads poorly.
- Use simple punctuation for rhythm: comma for a small breath, period for a complete thought, question mark for real questions.`;

export const VIETNAMESE_DUBBING_PROMPT = `Hãy viết kịch bản lồng tiếng bằng {{ TARGET_LANGUAGE }} với văn phong nói tự nhiên nhất.

Nguyên tắc ưu tiên:
- Văn phong đời thực: Câu từ tự nhiên như người bản xứ nói chuyện ngoài đời, tránh dịch thô cứng hoặc văn viết sách giáo khoa.
- Bản địa hóa linh hoạt: Dịch thoát ý các câu thành ngữ, tiếng lóng, lối nói hài hước và ngữ cảnh văn hóa.
- Nhất quán đại từ xưng hô: Giữ nguyên một cặp xưng hô xuyên suốt toàn bộ video phù hợp với bối cảnh.
- Chuẩn nhịp thời gian: Câu dịch cô đọng, vừa vặn độ dài khung hình nhân vật, không cắt bỏ số liệu, tên riêng hay cảm xúc.
- Tối ưu cho Text-to-Speech (TTS): Không dùng markdown, không dùng dấu ba chấm (...), chỉ dùng dấu phẩy (,) ngắt nhịp và dấu chấm (.) kết thúc câu.`;

export const TranslateVideoTool: React.FC = () => {
  const { addToast } = useToast();
  const { addTask } = useQueue();

  // Top Bar Options
  const [skipCompleted, setSkipCompleted] = useState<boolean>(true);
  const [savePath, setSavePath] = useState<string>("Mặc định (AppData)");

  // Folder & Video selection
  const [folders, setFolders] = useState<FolderVideoItem[]>(INITIAL_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("f_1");
  const [selectedVideoModalOpen, setSelectedVideoModalOpen] = useState<boolean>(false);
  const [activeFolderToPick, setActiveFolderToPick] = useState<FolderVideoItem | null>(null);

  // Queue & History Tabs
  const [activeBottomTab, setActiveBottomTab] = useState<"queue" | "history">("queue");
  const [queueList, setQueueList] = useState<DubbingQueueItem[]>([]);
  const [historyList, setHistoryList] = useState<DubbingQueueItem[]>([
    {
      id: "hist_1",
      stt: 1,
      videoTitle: "【科幻震撼】深空拾光：探索未知星系.mp4",
      folderName: "深空拾光",
      startTime: "01/09/2026 14:15",
      status: "completed",
      progress: 100,
      targetLang: "Tiếng Việt",
      voice: "Mạnh Dũng"
    },
    {
      id: "hist_2",
      stt: 2,
      videoTitle: "Voice acting trends in animation 2026.mp4",
      folderName: "dubbing",
      startTime: "01/09/2026 13:40",
      status: "completed",
      progress: 100,
      targetLang: "Tiếng Việt",
      voice: "Mạnh Dũng"
    }
  ]);

  // Right Side Accordions State
  const [isAiConfigOpen, setIsAiConfigOpen] = useState<boolean>(true);
  const [isAtpVoiceOpen, setIsAtpVoiceOpen] = useState<boolean>(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(true);

  // AI & Model Settings
  const [speechModel, setSpeechModel] = useState<string>("turbo");
  const [deviceType, setDeviceType] = useState<"cpu" | "gpu">("gpu");
  const [selectedAiKey, setSelectedAiKey] = useState<string>("AIzaSyAIxn5_OWhGclaBnT1Wn9kbg1IWwRwPYqw");
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_DUBBING_PROMPT);

  // ATP Voice Keys
  const [atpToken, setAtpToken] = useState<string>("atp_live_token_77894a82b9c0");
  const [atpServerRegion, setAtpServerRegion] = useState<string>("hanoi-sgp1");

  // Voice Settings
  const [targetLanguage, setTargetLanguage] = useState<string>("vi");
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<"all" | "Nam" | "Nữ">("all");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("manh_dung");
  const [voiceVolume, setVoiceVolume] = useState<number>(100);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Load API Keys from AI Manager / LocalStorage if available
  const availableAiKeys = useMemo(() => {
    try {
      const saved = localStorage.getItem("creatoros_ai_keys");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => item.key);
        }
      }
    } catch {}
    return [
      "AIzaSyAIxn5_OWhGclaBnT1Wn9kbg1IWwRwPYqw",
      "AIzaSyCBGu4o4BOQTobimbUPdrh8RQie_DavDFU",
      "AIzaSyAT23l-3LYAZqqhtCP9Jst6YS_1V5ZUzeg",
      "AIzaSyAzUIHScDmhiugUntyDLIgNktxP3QRhf8E"
    ];
  }, []);

  // Filtered Voices
  const displayedVoices = useMemo(() => {
    return VOICES_LIST.filter((v) => {
      const matchSearch =
        !voiceSearchQuery.trim() ||
        v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase());
      const matchGender = genderFilter === "all" || v.gender === genderFilter;
      return matchSearch && matchGender;
    });
  }, [voiceSearchQuery, genderFilter]);

  // Selected Count Display
  const selectedVideosCount = useMemo(() => {
    const active = folders.find((f) => f.id === selectedFolderId);
    return active ? 1 : 0;
  }, [folders, selectedFolderId]);

  // Actions
  const handleSelectFolder = (folder: FolderVideoItem) => {
    setSelectedFolderId(folder.id);
    setActiveFolderToPick(folder);
    soundSynth.playSfx("pop");
    addToast(`Đã chọn thư mục: "${folder.folderName}" (${folder.count} video)`, "info");
  };

  const handleOpenVideoPickerModal = (folder: FolderVideoItem) => {
    setActiveFolderToPick(folder);
    setSelectedVideoModalOpen(true);
    soundSynth.playSfx("pop");
  };

  const handleStartProcessing = () => {
    const currentFolder = folders.find((f) => f.id === selectedFolderId);
    if (!currentFolder) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng chọn thư mục video trước khi bắt đầu.", "warning");
      return;
    }

    const firstVid = currentFolder.videos[0] || {
      id: `vid_${Date.now()}`,
      title: `${currentFolder.folderName}_Clip_01.mp4`,
      duration: "00:48"
    };

    const newItem: DubbingQueueItem = {
      id: `queue_${Date.now()}`,
      stt: queueList.length + 1,
      videoTitle: firstVid.title,
      folderName: currentFolder.folderName,
      startTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      status: "processing",
      progress: 15,
      targetLang: targetLanguage === "vi" ? "Tiếng Việt" : targetLanguage,
      voice: VOICES_LIST.find((v) => v.id === selectedVoiceId)?.name || "Mạnh Dũng"
    };

    setQueueList((prev) => [newItem, ...prev]);
    soundSynth.playSfx("success");
    addToast(`Đã thêm "${newItem.videoTitle}" vào hàng đợi lồng tiếng AI!`, "success");

    addTask({
      title: `Lồng tiếng AI: ${newItem.videoTitle}`,
      type: "render",
      status: "running",
      progress: 25
    });

    // Simulate progress
    const interval = setInterval(() => {
      setQueueList((prev) =>
        prev.map((item) => {
          if (item.id === newItem.id) {
            const nextProg = item.progress + 25;
            if (nextProg >= 100) {
              clearInterval(interval);
              setHistoryList((h) => [
                { ...item, progress: 100, status: "completed" },
                ...h
              ]);
              soundSynth.playSfx("success");
              addToast(`Lồng tiếng hoàn tất cho video "${item.videoTitle}"!`, "success");
              return { ...item, progress: 100, status: "completed" };
            }
            return { ...item, progress: nextProg };
          }
          return item;
        })
      );
    }, 2000);
  };

  const handleTestVoiceSample = (voiceId: string) => {
    soundSynth.playSfx("pop");
    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(voiceId);
      setTimeout(() => {
        setPlayingVoiceId(null);
      }, 2500);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 antialiased select-none pb-16">
      {/* 1. Header Bar with Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title on Left */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Mic className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Lồng tiếng video AI
            </h1>
          </div>

          {/* Top-Right Controls: Toggle Skip Completed, Save Path, and Process Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle: Bỏ qua video đã hoàn thành */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setSkipCompleted(!skipCompleted);
              }}
              className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg cursor-pointer hover:border-slate-700 transition-colors"
            >
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ${
                  skipCompleted ? "bg-[#3b5998]" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                    skipCompleted ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="font-medium">Bỏ qua video đã hoàn thành</span>
            </div>

            {/* Save Location Button */}
            <div className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/40 px-3 py-1.5 rounded-lg">
              <Folder className="w-3.5 h-3.5 text-rose-400" />
              <span>Lưu tại: <strong className="font-mono text-white">{savePath}</strong></span>
            </div>

            {/* Action Button: + Bắt đầu xử lý nha */}
            <button
              onClick={handleStartProcessing}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ Bắt đầu xử lý nha</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-6 space-y-5">
          {/* Section 1: Danh sách Video (Folders Table) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-rose-500" />
                Danh sách Video
              </h2>
              <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50">
                Đã chọn {selectedVideosCount} video
              </span>
            </div>

            {/* Folders Table with Solid Red Header */}
            <div className="rounded-lg border border-slate-800 overflow-hidden shadow-md bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#ff2b54] text-white">
                  <tr className="text-xs font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-16 text-center">STT</th>
                    <th className="py-2.5 px-4">Tên thư mục</th>
                    <th className="py-2.5 px-4 text-center w-28">Số lượng</th>
                    <th className="py-2.5 px-4 text-center w-32">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70 text-xs text-slate-300">
                  {folders.map((folder) => {
                    const isCurrent = selectedFolderId === folder.id;

                    return (
                      <tr
                        key={folder.id}
                        onClick={() => handleSelectFolder(folder)}
                        className={`hover:bg-slate-900/80 transition-colors cursor-pointer ${
                          isCurrent ? "bg-rose-950/25" : ""
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {folder.stt}
                        </td>

                        {/* Tên thư mục */}
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          <FolderOpen className={`w-4 h-4 ${isCurrent ? "text-rose-400" : "text-slate-500"}`} />
                          <span className={isCurrent ? "text-rose-300 font-bold" : "text-slate-200"}>
                            {folder.folderName}
                          </span>
                        </td>

                        {/* Số lượng */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-cyan-300">
                          {folder.count}
                        </td>

                        {/* Thao tác: Nút Chọn video */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenVideoPickerModal(folder);
                            }}
                            className="px-3 py-1 bg-[#ff2b54] hover:bg-[#e02449] text-white rounded text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            Chọn video
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Hàng đợi xử lý | Lịch sử */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-3 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveBottomTab("queue")}
                className={`text-xs font-bold pb-1 cursor-pointer transition-colors ${
                  activeBottomTab === "queue"
                    ? "text-rose-400 border-b-2 border-rose-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Hàng đợi xử lý {queueList.length > 0 && `(${queueList.length})`}
              </button>
              <button
                onClick={() => setActiveBottomTab("history")}
                className={`text-xs font-bold pb-1 cursor-pointer transition-colors ${
                  activeBottomTab === "history"
                    ? "text-rose-400 border-b-2 border-rose-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Lịch sử {historyList.length > 0 && `(${historyList.length})`}
              </button>
            </div>

            {/* Queue / History Table with Solid Red Header */}
            <div className="rounded-lg border border-slate-800 overflow-hidden shadow-md bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#ff2b54] text-white">
                  <tr className="text-xs font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Tên video</th>
                    <th className="py-2.5 px-3 text-center w-24">Bắt đầu lúc</th>
                    <th className="py-2.5 px-3 text-center w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 text-center w-24">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70 text-xs text-slate-300">
                  {activeBottomTab === "queue" ? (
                    queueList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500 bg-slate-950/60">
                          <p className="text-xs">
                            Hàng đợi đang trống. Hãy chọn video -&gt; Bắt đầu xử lý để thêm vào hàng đợi.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      queueList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{item.stt}</td>
                          <td className="py-3 px-3 font-medium text-white truncate max-w-xs" title={item.videoTitle}>
                            {item.videoTitle}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">{item.startTime}</td>
                          <td className="py-3 px-3 text-center">
                            {item.status === "processing" ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" /> Đang dịch ({item.progress}%)
                                </span>
                                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-cyan-400" style={{ width: `${item.progress}%` }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-400 font-bold text-[11px]">Hoàn tất</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setQueueList((prev) => prev.filter((q) => q.id !== item.id));
                                soundSynth.playSfx("pop");
                              }}
                              className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                              title="Hủy khỏi hàng đợi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">{item.stt}</td>
                        <td className="py-3 px-3 font-medium text-white truncate max-w-xs" title={item.videoTitle}>
                          {item.videoTitle}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">{item.startTime}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                            ✓ Đã lồng tiếng
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              soundSynth.playSfx("pop");
                              addToast(`Mở tệp lồng tiếng: ${item.videoTitle}`, "info");
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-bold"
                          >
                            Xem Video
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (CONFIG ACCORDIONS) ================= */}
        <div className="lg:col-span-6 space-y-4">
          {/* Panel 1: API, Lệnh Kỹ Sư AI & Models */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
            <div
              onClick={() => setIsAiConfigOpen(!isAiConfigOpen)}
              className="p-3.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>API, Lệnh Kỹ Sư AI & Models</span>
              </div>
              {isAiConfigOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {isAiConfigOpen && (
              <div className="p-4 space-y-4 text-xs">
                {/* Model Nhận Diện Giọng */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                    Model Nhận Diện Giọng
                  </label>
                  <div className="relative">
                    <select
                      value={speechModel}
                      onChange={(e) => setSpeechModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 outline-none appearance-none cursor-pointer pr-8"
                    >
                      <option value="turbo">🚀 Turbo (nhanh + chính xác cao, đề xuất)</option>
                      <option value="large-v3">⚡ Large-v3 (Độ chính xác tối đa, hỗ trợ 99 ngôn ngữ)</option>
                      <option value="whisper-medium">Whisper Medium (Cân bằng tốc độ)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Thiết bị xử lý (CPU / GPU) */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 text-[11px]">
                    Thiết bị xử lý
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeviceType("cpu")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        deviceType === "cpu"
                          ? "bg-slate-700 text-white border border-slate-600"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      CPU (Mặc định)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceType("gpu")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        deviceType === "gpu"
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      GPU
                    </button>
                  </div>
                  <p className="text-[10px] text-purple-300/80 mt-1.5 leading-relaxed font-sans">
                    Phát hiện GPU: <strong className="text-purple-200">NVIDIA GeForce GTX 1660 SUPER</strong> (Đang chọn GPU) - GPU nhanh hơn ~5-10x. Nếu GPU lỗi, hệ thống tự fallback về CPU.
                  </p>
                </div>

                {/* API Key (Gemini) từ Quản lý AI */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                    API Key (Gemini) từ Quản lý AI
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAiKey}
                      onChange={(e) => setSelectedAiKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-rose-500 outline-none appearance-none cursor-pointer pr-8"
                    >
                      {availableAiKeys.map((k, idx) => (
                        <option key={idx} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Hướng dẫn bổ sung cho AI dịch (tùy chọn) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-semibold text-[11px]">
                      Hướng dẫn bổ sung cho AI dịch (tùy chọn)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPrompt(DEFAULT_DUBBING_PROMPT);
                          soundSynth.playSfx("pop");
                          addToast("Đã khôi phục prompt mặc định tiếng Anh (Tối ưu TTS)", "success");
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                      >
                        Mặc định
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPrompt(VIETNAMESE_DUBBING_PROMPT);
                          soundSynth.playSfx("pop");
                          addToast("Đã áp dụng mẫu prompt Tiếng Việt tự nhiên", "info");
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                      >
                        Bản Tiếng Việt
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPrompt("");
                          soundSynth.playSfx("pop");
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Nhập prompt hướng dẫn phong cách dịch hoặc bấm Mặc định bên trên..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:border-rose-500 outline-none resize-y leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <span>💡</span> Nội dung này sẽ được gắn vào prompt AI dịch với ưu tiên cao nhất để kịch bản lồng tiếng tự nhiên và khớp nhịp TTS.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: API ATP Voice */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
            <div
              onClick={() => setIsAtpVoiceOpen(!isAtpVoiceOpen)}
              className="p-3.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <span className="text-purple-400 font-mono">&lt;-&gt;</span>
                <span>API ATP Voice</span>
              </div>
              {isAtpVoiceOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {isAtpVoiceOpen && (
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">ATP Token Secret</label>
                  <input
                    type="password"
                    value={atpToken}
                    onChange={(e) => setAtpToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Khu vực máy chủ ATP</label>
                  <select
                    value={atpServerRegion}
                    onChange={(e) => setAtpServerRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="hanoi-sgp1">Hà Nội (Việt Nam Direct Route - Độ trễ 12ms)</option>
                    <option value="sg-ap-southeast">Singapore Cluster (High Bandwidth)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Panel 3: Thiết lập Ngôn ngữ & Giọng đọc */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
            <div
              onClick={() => setIsVoiceSettingsOpen(!isVoiceSettingsOpen)}
              className="p-3.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Volume2 className="w-4 h-4 text-rose-500" />
                <span>Thiết lập Ngôn ngữ & Giọng đọc</span>
              </div>
              {isVoiceSettingsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {isVoiceSettingsOpen && (
              <div className="p-4 space-y-4 text-xs">
                {/* Ngôn ngữ dịch */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                    Ngôn ngữ dịch
                  </label>
                  <div className="relative">
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 outline-none appearance-none cursor-pointer pr-8"
                    >
                      <option value="vi">VN Tiếng Việt</option>
                      <option value="en">US Tiếng Anh (English)</option>
                      <option value="zh">CN Tiếng Trung (Mandarin)</option>
                      <option value="ja">JP Tiếng Nhật (Japanese)</option>
                      <option value="ko">KR Tiếng Hàn (Korean)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Ngôn ngữ mà video sẽ được lồng tiếng</p>
                </div>

                {/* Voice Search & Gender Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={voiceSearchQuery}
                      onChange={(e) => setVoiceSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm giọng..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-rose-500"
                    />
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>

                  <div className="w-32 relative">
                    <select
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none appearance-none cursor-pointer pr-6"
                    >
                      <option value="all">Tất cả</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* 2-Column Voice Cards Grid */}
                <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {displayedVoices.map((voice) => {
                    const isSelected = selectedVoiceId === voice.id;
                    const isPlaying = playingVoiceId === voice.id;

                    return (
                      <div
                        key={voice.id}
                        onClick={() => {
                          setSelectedVoiceId(voice.id);
                          soundSynth.playSfx("pop");
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestVoiceSample(voice.id);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                              isPlaying
                                ? "bg-rose-500 text-white scale-105"
                                : isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                            title="Nghe thử giọng mẫu"
                          >
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-white text-xs truncate">
                                {voice.name}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>{voice.gender}</span>
                              {voice.isDownloaded && (
                                <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                  • ✔️ Đã tải
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Icons */}
                        <div className="flex items-center gap-1 text-slate-400">
                          {isSelected ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                              <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-500/20" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 hover:text-yellow-400 transition-colors" />
                              <CloudDownload className="w-3.5 h-3.5 hover:text-cyan-400 transition-colors" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Âm lượng giọng đọc Slider */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">
                      Âm lượng giọng đọc (Mặc định: 100%)
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">{voiceVolume}%</span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />

                  <p className="text-[10px] text-slate-500 leading-tight">
                    Nếu nhạc nền quá to át tiếng, hãy kéo tăng Âm lượng giọng đọc! (Khuyến nghị: 100% - 200%)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Picker Modal when user clicks "Chọn video" */}
      {selectedVideoModalOpen && activeFolderToPick && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-white text-base">
                  Danh sách Video trong thư mục: {activeFolderToPick.folderName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVideoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {activeFolderToPick.videos.map((vid, idx) => (
                <div
                  key={vid.id}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-rose-500/50 rounded-xl flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-slate-500 w-5">{idx + 1}</span>
                    <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate" title={vid.title}>
                        {vid.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Thời lượng: {vid.duration} • Kích thước: {vid.size}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFolderId(activeFolderToPick.id);
                      setSelectedVideoModalOpen(false);
                      soundSynth.playSfx("success");
                      addToast(`Đã chọn video: ${vid.title}`, "success");
                    }}
                    className="px-3 py-1.5 bg-[#ff2b54] hover:bg-[#e02449] text-white rounded text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Chọn video này
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                Tổng cộng: {activeFolderToPick.videos.length} video sẵn sàng
              </span>
              <button
                onClick={() => setSelectedVideoModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold cursor-pointer"
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
