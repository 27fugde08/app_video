import React, { useState, useMemo, useEffect } from "react";
import { FolderPickerModal } from "./FolderPickerModal";
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
  Globe,
  X,
  Split,
  FolderSearch,
  VolumeX,
  Maximize2,
  FileText
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";
import { useQueue } from "../context/QueueContext";
import { dubbingService } from "../features/dubbing/services/dubbingService";
import { ipcClient } from "../core/ipc/ipcClient";

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

  // Sub-Module Tabs State
  const [activeSubTab, setActiveSubTab] = useState<"queue" | "dual" | "subtitles">("queue");

  // Top Bar Options
  const [skipCompleted, setSkipCompleted] = useState<boolean>(true);
  const [savePath, setSavePath] = useState<string>("D:\\Downloads\\CreatorOS\\Dubbed_Output");
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState<boolean>(false);

  // Dual Preview Side-by-Side Modal State
  const [isDualPreviewOpen, setIsDualPreviewOpen] = useState<boolean>(false);
  const [activeDualVideo, setActiveDualVideo] = useState<{ title: string; folderName: string; duration: string; origPath: string } | null>(null);
  const [isDualPlaying, setIsDualPlaying] = useState<boolean>(false);
  const [dualPlaybackSpeed, setDualPlaybackSpeed] = useState<number>(1);
  const [origVolume, setOrigVolume] = useState<number>(20);
  const [dubbedVolume, setDubbedVolume] = useState<number>(100);

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
  const [isMultiLangMode, setIsMultiLangMode] = useState<boolean>(false);
  const [multiTargetLangs, setMultiTargetLangs] = useState<string[]>(["vi", "en"]);
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

  // SSE Real-time Dubbing Progress Listener
  useEffect(() => {
    const unsubProgress = ipcClient.on("dubbing_progress", (data: any) => {
      if (data && data.id) {
        setQueueList((prev) =>
          prev.map((item) => {
            if (item.id === data.id || item.id === `queue_${data.id}`) {
              return {
                ...item,
                progress: Math.min(100, Math.round(data.progress || item.progress)),
                status: data.progress >= 100 ? "completed" : "processing"
              };
            }
            return item;
          })
        );
      }
    });

    const unsubCompleted = ipcClient.on("dubbing_completed", (data: any) => {
      if (data && data.id) {
        setQueueList((prev) => {
          const target = prev.find((i) => i.id === data.id || i.id === `queue_${data.id}`);
          if (target) {
            setHistoryList((h) => [{ ...target, progress: 100, status: "completed" }, ...h]);
          }
          return prev.filter((i) => i.id !== data.id && i.id !== `queue_${data.id}`);
        });
        soundSynth.playSfx("success");
        addToast(`Lồng tiếng AI hoàn tất: "${data.title || 'Video'}"`, "success");
      }
    });

    return () => {
      unsubProgress();
      unsubCompleted();
    };
  }, [addToast]);

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

  const handleStartProcessing = async () => {
    const currentFolder = folders.find((f) => f.id === selectedFolderId);
    if (!currentFolder) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng chọn thư mục video trước khi bắt đầu.", "warning");
      return;
    }

    const firstVid = currentFolder.videos[0] || {
      id: `vid_${Date.now()}`,
      title: `${currentFolder.folderName}_Clip_01.mp4`,
      duration: "00:48",
      filePath: ""
    };

    const targetLangsToProcess = isMultiLangMode ? multiTargetLangs : [targetLanguage];

    const getLangLabel = (code: string) => {
      switch (code) {
        case "vi": return "Tiếng Việt";
        case "en": return "Tiếng Anh (US)";
        case "zh": return "Tiếng Trung (CN)";
        case "ja": return "Tiếng Nhật (JP)";
        case "ko": return "Tiếng Hàn (KR)";
        default: return code;
      }
    };

    const getMatchingVoice = (code: string) => {
      if (code === targetLanguage) {
        const voiceObj = VOICES_LIST.find((v) => v.id === selectedVoiceId);
        if (voiceObj) return voiceObj.name;
      }
      switch (code) {
        case "en": return "Guy Neural (US English)";
        case "zh": return "Xiaoxiao Neural (CN Chinese)";
        case "ja": return "Nanami Neural (JP Japanese)";
        case "ko": return "Sun-Hi Neural (KR Korean)";
        default: return "Mạnh Dũng";
      }
    };

    for (let i = 0; i < targetLangsToProcess.length; i++) {
      const langCode = targetLangsToProcess[i];
      const langLabel = getLangLabel(langCode);
      const voiceName = getMatchingVoice(langCode);

      const newItem: DubbingQueueItem = {
        id: `queue_${Date.now()}_${langCode}`,
        stt: queueList.length + i + 1,
        videoTitle: `[${langCode.toUpperCase()}] ${firstVid.title}`,
        folderName: currentFolder.folderName,
        startTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        status: "processing",
        progress: 15,
        targetLang: langLabel,
        voice: voiceName
      };

      setQueueList((prev) => [newItem, ...prev]);

      addTask({
        title: `Lồng tiếng AI [${langCode.toUpperCase()}]: ${firstVid.title}`,
        type: "render",
        status: "running",
        progress: 20
      });

      // Simulation interval per lang item
      const interval = setInterval(() => {
        setQueueList((prev) =>
          prev.map((item) => {
            if (item.id === newItem.id) {
              const nextProg = item.progress + 20;
              if (nextProg >= 100) {
                clearInterval(interval);
                setHistoryList((h) => [
                  { ...item, progress: 100, status: "completed" },
                  ...h
                ]);
                soundSynth.playSfx("success");
                addToast(`Lồng tiếng hoàn tất [${langLabel}] cho video "${firstVid.title}"!`, "success");
                return { ...item, progress: 100, status: "completed" };
              }
              return { ...item, progress: nextProg };
            }
            return item;
          })
        );
      }, 2000 + i * 500);
    }

    soundSynth.playSfx("success");
    addToast(
      isMultiLangMode
        ? `Đã nạp thành công ${targetLangsToProcess.length} tác vụ lồng tiếng Đa Ngôn Ngữ!`
        : `Đã nạp "${firstVid.title}" vào hàng đợi lồng tiếng AI!`,
      "success"
    );
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

            {/* Save Location Button with OS Picker */}
            <button
              type="button"
              onClick={() => {
                soundSynth.playSfx("pop");
                setIsFolderPickerOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              title="Click để đổi thư mục xuất video trực tiếp trên máy tính"
            >
              <FolderSearch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đường dẫn xuất OS: <strong className="font-mono text-white">{savePath}</strong></span>
            </button>

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

      {/* Sub-Tabs Navigation for Dubbing Studio */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            setActiveSubTab("queue");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "queue"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>1. Hàng Đợi & Lồng Tiếng AI</span>
        </button>

        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            setActiveDualVideo({
              title: "Demo_Video_Dubbed_01.mp4",
              folderName: "Douyin_Viral_Hot",
              duration: "02:15",
              origPath: "D:\\Downloads\\CreatorOS\\Douyin_Viral_Hot\\Demo_Video_Dubbed_01.mp4"
            });
            setIsDualPreviewOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Split className="w-4 h-4 text-cyan-400" />
          <span>2. Dual Preview So Sánh Song Song</span>
        </button>

        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            setActiveSubTab("subtitles");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "subtitles"
              ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Trình Chỉnh Sửa Phụ Đề & Script SRT</span>
        </button>
      </div>

      {activeSubTab === "subtitles" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Subtitle Studio & AI Script Re-writer</h3>
                <p className="text-xs text-slate-400">Chỉnh sửa trực tiếp từng mốc thời gian Timeline & lời dịch trước khi Render ghép vào video</p>
              </div>
            </div>
            <button
              onClick={() => {
                soundSynth.playSfx("success");
                addToast("Đã xuất tệp phụ đè tiếng Việt (Vi.srt) thành công!", "success");
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Tệp SRT</span>
            </button>
          </div>

          {/* Subtitle Editor Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-32">Mốc Thời Gian</th>
                  <th className="py-2.5 px-3">Lời Thoại Gốc (Tiếng Trung)</th>
                  <th className="py-2.5 px-3">Lời Dịch AI Lồng Tiếng (Tiếng Việt)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {[
                  { stt: 1, time: "00:00 - 00:04", orig: "探索未知星系，感受宇宙浩瀚...", trans: "Khám phá các thiên hà chưa biết, cảm nhận sự bao la..." },
                  { stt: 2, time: "00:05 - 00:09", orig: "每一次突破, 都是人类智慧的飞跃。", trans: "Mỗi một bước đột phá đều là sự vọt tiến của trí tuệ loài người." },
                  { stt: 3, time: "00:10 - 00:15", orig: "欢迎来到 AI Creator OS 时代！", trans: "Chào mừng bạn đến với kỷ nguyên AI Creator OS!" }
                ].map((row) => (
                  <tr key={row.stt} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 text-center text-slate-500">{row.stt}</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{row.time}</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.orig}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        defaultValue={row.trans}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:border-rose-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                soundSynth.playSfx("pop");
                                addToast(`Mở tệp lồng tiếng: ${item.videoTitle}`, "info");
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Xem Video
                            </button>
                            <button
                              onClick={() => {
                                soundSynth.playSfx("cash");
                                setActiveDualVideo({
                                  title: item.videoTitle,
                                  folderName: item.folderName,
                                  duration: "02:15",
                                  origPath: `D:\\Downloads\\CreatorOS\\${item.folderName}\\${item.videoTitle}`
                                });
                                setIsDualPreviewOpen(true);
                              }}
                              className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow"
                              title="Trình phát so sánh song song Video Gốc & Video AI Dubbed"
                            >
                              <Split className="w-3 h-3 text-indigo-200" />
                              <span>Dual View</span>
                            </button>
                          </div>
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
                {/* Mode Toggle: Single Language vs Multi-Language Batch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="font-bold text-white text-[11px]">Lồng Tiếng Đa Ngôn Ngữ Hàng Loạt</div>
                      <div className="text-[10px] text-slate-400">Xuất đồng thời video sang nhiều tiếng</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiLangMode(!isMultiLangMode);
                      soundSynth.playSfx("pop");
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isMultiLangMode
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {isMultiLangMode ? "BẬT Multi-Lang" : "TẮT (Đơn ngữ)"}
                  </button>
                </div>

                {/* 1-Click Flag Language & Voice Presets */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold text-[11px]">
                    ⚡ Chọn Nhanh Ngôn Ngữ & Giọng Đọc Mẫu (1-Click Preset)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { code: "vi", flag: "🇻🇳", name: "Việt", voiceId: "manh_dung", voiceName: "Mạnh Dũng" },
                      { code: "en", flag: "🇺🇸", name: "Anh", voiceId: "calm_woman", voiceName: "Guy US" },
                      { code: "zh", flag: "🇨🇳", name: "Trung", voiceId: "chieu_thanh", voiceName: "Xiaoxiao" },
                      { code: "ja", flag: "🇯🇵", name: "Nhật", voiceId: "lac_phi", voiceName: "Nanami" },
                      { code: "ko", flag: "🇰🇷", name: "Hàn", voiceId: "ngoc_huyen", voiceName: "SunHi" }
                    ].map((preset) => {
                      const isActive = targetLanguage === preset.code;
                      return (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => {
                            setTargetLanguage(preset.code);
                            setSelectedVoiceId(preset.voiceId);
                            soundSynth.playSfx("pop");
                            addToast(`Đã nạp 1-Click Preset: ${preset.flag} ${preset.name} (${preset.voiceName})`, "success");
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer text-center ${
                            isActive
                              ? "bg-rose-950/60 border-rose-500 text-white ring-2 ring-rose-500/30 shadow-md scale-[1.02]"
                              : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          <span className="text-lg">{preset.flag}</span>
                          <span className="text-[10px] font-bold mt-0.5">{preset.name}</span>
                          <span className="text-[9px] text-slate-400 truncate w-full">{preset.voiceName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ngôn ngữ dịch */}
                {isMultiLangMode ? (
                  <div className="space-y-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <label className="block text-slate-300 font-bold text-[11px]">
                      Chọn các ngôn ngữ xuất ra đồng thời:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "vi", label: "VN Tiếng Việt" },
                        { id: "en", label: "US Tiếng Anh" },
                        { id: "zh", label: "CN Tiếng Trung" },
                        { id: "ja", label: "JP Tiếng Nhật" },
                        { id: "ko", label: "KR Tiếng Hàn" }
                      ].map((lang) => {
                        const checked = multiTargetLangs.includes(lang.id);
                        return (
                          <label
                            key={lang.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? "bg-indigo-950/40 border-indigo-500/60 text-white font-semibold"
                                : "bg-slate-900 border-slate-800 text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                soundSynth.playSfx("pop");
                                if (checked) {
                                  if (multiTargetLangs.length > 1) {
                                    setMultiTargetLangs(multiTargetLangs.filter((l) => l !== lang.id));
                                  }
                                } else {
                                  setMultiTargetLangs([...multiTargetLangs, lang.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-500 focus:ring-0"
                            />
                            <span className="text-[11px]">{lang.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-indigo-300/80 mt-1">
                      💡 Khi ấn "Bắt đầu xử lý", hệ thống sẽ tự nạp {multiTargetLangs.length} công việc lồng tiếng tương ứng với từng ngôn ngữ.
                    </p>
                  </div>
                ) : (
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
                )}

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

      {/* Side-by-Side Dual Preview Modal (Original vs AI Dubbed Video) */}
      {isDualPreviewOpen && activeDualVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                  <Split className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Trình Phát So Sánh Song Song Dual Preview</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                      SYNC 60FPS
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-xl">
                    {activeDualVideo.title} • Thư mục: {activeDualVideo.folderName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundSynth.playSfx("pop");
                    addToast(`Đã xuất video lồng tiếng sang: ${savePath}`, "success");
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Tệp Đã Lồng Tiếng</span>
                </button>
                <button
                  onClick={() => setIsDualPreviewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dual Video Grid Body */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
              {/* Left Screen: Original Video */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col space-y-2">
                <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Video Gốc (Gốc SRT Subtitles)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Âm thanh gốc: {origVolume}%</span>
                </div>

                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&h=450&fit=crop"
                    alt="Original Video"
                    className="w-full h-full object-cover opacity-80"
                  />
                  {/* Simulated Subtitle Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <span className="bg-black/80 text-yellow-300 px-3 py-1 rounded text-xs font-medium border border-yellow-500/30">
                      [Gốc SRT] 探索未知星系，感受宇宙浩瀚与神祕...
                    </span>
                  </div>

                  {!isDualPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Original Audio Volume Control */}
                <div className="p-3 bg-slate-900/50 flex items-center gap-3 text-xs">
                  <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 shrink-0">Nhạc nền gốc:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={origVolume}
                    onChange={(e) => setOrigVolume(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-8">{origVolume}%</span>
                </div>
              </div>

              {/* Right Screen: AI Dubbed Video */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col space-y-2">
                <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Video Lồng Tiếng AI (Đã Dịch Vi-Sub)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Giọng đọc AI: {dubbedVolume}%</span>
                </div>

                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&h=450&fit=crop"
                    alt="AI Dubbed Video"
                    className="w-full h-full object-cover"
                  />
                  {/* Translated Subtitle Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <span className="bg-[#ff2b54]/90 text-white px-3 py-1 rounded text-xs font-bold border border-rose-400/40 shadow-lg">
                      [AI Dịch] Khám phá các thiên hà chưa biết, cảm nhận sự bao la của vũ trụ...
                    </span>
                  </div>

                  {!isDualPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Dubbed Audio Volume Control */}
                <div className="p-3 bg-slate-900/50 flex items-center gap-3 text-xs">
                  <Mic className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 shrink-0">Giọng lồng tiếng AI:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dubbedVolume}
                    onChange={(e) => setDubbedVolume(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-8">{dubbedVolume}%</span>
                </div>
              </div>
            </div>

            {/* Synchronized Playback Control Toolbar */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsDualPlaying(!isDualPlaying);
                    soundSynth.playSfx("pop");
                  }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                >
                  {isDualPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-300 font-bold">00:42</span>
                  <span className="text-xs text-slate-600">/</span>
                  <span className="text-xs font-mono text-slate-400">{activeDualVideo.duration}</span>
                </div>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Tốc độ phát:</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                  {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setDualPlaybackSpeed(speed)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        dualPlaybackSpeed === speed
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct OS Folder Picker Modal */}
      <FolderPickerModal
        isOpen={isFolderPickerOpen}
        currentPath={savePath}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelectFolder={(selectedPath) => {
          setSavePath(selectedPath);
          addToast(`Đã thiết lập đường dẫn xuất video: ${selectedPath}`, "success");
        }}
      />
    </div>
  );
};
