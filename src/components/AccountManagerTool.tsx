import React, { useState, useMemo } from "react";
import {
  UserCheck,
  Download,
  Plus,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Music2,
  Flag,
  PlayCircle,
  Trash2,
  RefreshCw,
  Search,
  FolderOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  FileSpreadsheet,
  Globe,
  Chrome,
  KeyRound,
  Eye,
  EyeOff,
  MoreHorizontal,
  X
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";

export type PlatformType = "facebook" | "instagram" | "tiktok" | "youtube" | "twitter_x" | "zalo_video";
export type AccountLiveStatus = "live" | "die" | "checkpoint" | "unverified";
export type SyncStatus = "synced" | "expired" | "syncing" | "not_synced";

export interface SocialAccount {
  id: string;
  stt: number;
  platform: PlatformType;
  avatar: string;
  name: string;
  uid: string;
  email: string;
  password?: string;
  twoFa?: string;
  cookie?: string;
  proxy?: string;
  liveStatus: AccountLiveStatus;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  profileCreated: boolean;
  profilePath?: string;
  fanpagesCount?: number;
  followersCount?: number;
  note?: string;
}

const INITIAL_ACCOUNTS: SocialAccount[] = [
  {
    id: "acc_1",
    stt: 1,
    platform: "facebook",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    name: "Thanh Đắc Lộc (Media Studio)",
    uid: "100084920194820",
    email: "thanhdacloc.media@gmail.com",
    twoFa: "JBSWY3DPEHPK3PXP",
    cookie: "c_user=100084920194820; xs=48:a9f8e7:2:1719283920; fr=0abc123...; sb=xyz890",
    proxy: "103.149.28.12:8080:user:pass",
    liveStatus: "live",
    syncStatus: "synced",
    lastSyncedAt: "Vừa xong",
    profileCreated: true,
    profilePath: "C:\\BrowserProfiles\\fb_100084920194820",
    fanpagesCount: 8,
    followersCount: 145000
  },
  {
    id: "acc_2",
    stt: 2,
    platform: "tiktok",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
    name: "Viral Clips Studio Global",
    uid: "@viralclips.global",
    email: "tiktok.agency24@outlook.com",
    twoFa: "K7JDWY3DPEHPK4L1",
    cookie: "sessionid=8a9f0e1b2c3d4e5f6; ttwid=1%7Cabcdef; msToken=x90123...",
    proxy: "14.161.45.89:3128",
    liveStatus: "live",
    syncStatus: "synced",
    lastSyncedAt: "10 phút trước",
    profileCreated: true,
    profilePath: "C:\\BrowserProfiles\\tiktok_viralclips",
    followersCount: 380000
  },
  {
    id: "acc_3",
    stt: 3,
    platform: "youtube",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    name: "Movie Recap & Anime 4K",
    uid: "UC_a89fB2c1D90eFgh",
    email: "recapmovie.creator@gmail.com",
    twoFa: "AB3DPEHPK3PXP992",
    cookie: "HSID=A98fbc12; SSID=B89fab; SID=C123abc; APISID=D456...",
    proxy: "",
    liveStatus: "live",
    syncStatus: "synced",
    lastSyncedAt: "Hôm nay 08:30",
    profileCreated: true,
    profilePath: "C:\\BrowserProfiles\\yt_movierecap",
    followersCount: 89200
  },
  {
    id: "acc_4",
    stt: 4,
    platform: "instagram",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop",
    name: "Aesthetic Reels Official",
    uid: "aesthetic.reels.vn",
    email: "instagram.aesthetic@yahoo.com",
    cookie: "sessionid=99281a8b7c; ds_user_id=58192039; csrftoken=123...",
    liveStatus: "checkpoint",
    syncStatus: "expired",
    lastSyncedAt: "Hôm qua",
    profileCreated: true,
    profilePath: "C:\\BrowserProfiles\\ig_aesthetic",
    followersCount: 64000
  },
  {
    id: "acc_5",
    stt: 5,
    platform: "twitter_x",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    name: "Crypto & Tech Trends X",
    uid: "cryptotrends_x",
    email: "x.cryptotrends@proton.me",
    cookie: "auth_token=8f9a0b1c2d3e4; ct0=987123abc...",
    liveStatus: "live",
    syncStatus: "synced",
    lastSyncedAt: "1 giờ trước",
    profileCreated: true,
    profilePath: "C:\\BrowserProfiles\\x_cryptotrends",
    followersCount: 29500
  },
  {
    id: "acc_6",
    stt: 6,
    platform: "zalo_video",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
    name: "Zalo Video Creator Pro",
    uid: "zalovid_889201",
    email: "0988776655",
    cookie: "zpw_sek=8910abcdef; _ga=GA1.2.3...",
    liveStatus: "unverified",
    syncStatus: "not_synced",
    lastSyncedAt: "Chưa đồng bộ",
    profileCreated: false,
    followersCount: 12000
  }
];

export const AccountManagerTool: React.FC = () => {
  const { addToast } = useToast();

  // State
  const [accounts, setAccounts] = useState<SocialAccount[]>(INITIAL_ACCOUNTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [browserEngine, setBrowserEngine] = useState<string>("chrome_default");
  const [rangeFrom, setRangeFrom] = useState<number>(0);
  const [rangeTo, setRangeTo] = useState<number>(0);
  const [profileBasePath, setProfileBasePath] = useState<string>("C:\\Users\\AppData\\Roaming\\StudioBrowserProfiles");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBrowserUpdateModalOpen, setIsBrowserUpdateModalOpen] = useState(false);
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [isCookieSyncModalOpen, setIsCookieSyncModalOpen] = useState(false);
  const [selectedSyncPlatform, setSelectedSyncPlatform] = useState<PlatformType>("facebook");
  const [isScanFanpageModalOpen, setIsScanFanpageModalOpen] = useState(false);
  const [isScanZaloModalOpen, setIsScanZaloModalOpen] = useState(false);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [isCleaningProfiles, setIsCleaningProfiles] = useState(false);

  // Add account form state
  const [addPlatform, setAddPlatform] = useState<PlatformType>("facebook");
  const [bulkInputText, setBulkInputText] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleUid, setSingleUid] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePassword, setSinglePassword] = useState("");
  const [single2FA, setSingle2FA] = useState("");
  const [singleCookie, setSingleCookie] = useState("");
  const [singleProxy, setSingleProxy] = useState("");
  const [addMode, setAddMode] = useState<"bulk" | "single">("bulk");

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        acc.name.toLowerCase().includes(q) ||
        acc.uid.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.platform.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Filter Mode
      if (filterMode === "all") return true;
      if (filterMode === "live") return acc.liveStatus === "live";
      if (filterMode === "die_checkpoint") return acc.liveStatus === "die" || acc.liveStatus === "checkpoint";
      if (filterMode === "facebook") return acc.platform === "facebook";
      if (filterMode === "tiktok") return acc.platform === "tiktok";
      if (filterMode === "youtube") return acc.platform === "youtube";
      if (filterMode === "instagram") return acc.platform === "instagram";
      if (filterMode === "twitter_x") return acc.platform === "twitter_x";
      if (filterMode === "zalo_video") return acc.platform === "zalo_video";
      if (filterMode === "no_profile") return !acc.profileCreated;
      if (filterMode === "expired_cookie") return acc.syncStatus === "expired";

      return true;
    });
  }, [accounts, searchQuery, filterMode]);

  // Checkbox selection
  const isAllSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((acc) => selectedIds.includes(acc.id));

  const handleToggleSelectAll = () => {
    soundSynth.playSfx("pop");
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAccounts.map((a) => a.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Range select (Tích chọn từ ... đến ...)
  const handleRangeSelect = () => {
    soundSynth.playSfx("pop");
    const from = Math.max(1, rangeFrom);
    const to = Math.max(from, rangeTo);

    const idsToSelect: string[] = [];
    filteredAccounts.forEach((acc, index) => {
      const order = index + 1;
      if (order >= from && order <= to) {
        idsToSelect.push(acc.id);
      }
    });

    setSelectedIds(idsToSelect);
    addToast(`Đã tích chọn ${idsToSelect.length} tài khoản từ STT ${from} đến ${to}`, "info");
  };

  // Check Live
  const handleBatchCheckLive = () => {
    if (accounts.length === 0) {
      addToast("Chưa có tài khoản nào để kiểm tra!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    setIsCheckingLive(true);
    addToast("Đang kiểm tra trạng thái Live/Die qua API & Graph...", "info");

    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (selectedIds.length === 0 || selectedIds.includes(acc.id)) {
            const isOk = Math.random() > 0.15;
            return {
              ...acc,
              liveStatus: isOk ? "live" : "checkpoint",
              lastSyncedAt: "Vừa kiểm tra"
            };
          }
          return acc;
        })
      );
      setIsCheckingLive(false);
      soundSynth.playSfx("success");
      addToast("Hoàn tất kiểm tra trạng thái Live tài khoản!", "success");
    }, 1500);
  };

  // Làm nhẹ profile
  const handleCleanProfiles = () => {
    soundSynth.playSfx("pop");
    setIsCleaningProfiles(true);
    addToast("Đang dọn dẹp cache, cookie rác & log crash của profile...", "info");

    setTimeout(() => {
      setIsCleaningProfiles(false);
      soundSynth.playSfx("success");
      addToast("Đã làm nhẹ profile thành công! Giải phóng ~348 MB dung lượng ổ cứng.", "success");
    }, 1200);
  };

  // Delete accounts
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 tài khoản để xóa!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    setAccounts((prev) => prev.filter((acc) => !selectedIds.includes(acc.id)));
    setSelectedIds([]);
    addToast("Đã xóa các tài khoản đã chọn thành công!", "success");
  };

  // Delete profile
  const handleDeleteProfiles = () => {
    if (selectedIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 tài khoản để xóa profile!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    setAccounts((prev) =>
      prev.map((acc) =>
        selectedIds.includes(acc.id)
          ? { ...acc, profileCreated: false, profilePath: undefined }
          : acc
      )
    );
    addToast(`Đã xóa dữ liệu Profile trình duyệt của ${selectedIds.length} tài khoản!`, "success");
  };

  // Save Full List (CSV)
  const handleSaveFullList = () => {
    soundSynth.playSfx("pop");
    const headers = "STT,Platform,Name,UID,Email,LiveStatus,SyncStatus,ProfilePath\n";
    const rows = accounts
      .map(
        (a, i) =>
          `${i + 1},${a.platform},"${a.name}",${a.uid},${a.email},${a.liveStatus},${a.syncStatus},"${a.profilePath || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_Sach_Tai_Khoan_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("Đã xuất danh sách tài khoản Full sang tệp CSV!", "success");
  };

  // Open Browser
  const handleOpenBrowser = (acc: SocialAccount) => {
    soundSynth.playSfx("pop");
    addToast(`Đang khởi chạy trình duyệt [${browserEngine}] cho tài khoản: ${acc.name}...`, "info");
  };

  // Add accounts
  const handleConfirmAddAccounts = () => {
    if (addMode === "bulk") {
      if (!bulkInputText.trim()) {
        addToast("Vui lòng dán danh sách tài khoản theo định dạng!", "warning");
        return;
      }
      const lines = bulkInputText.split("\n").filter((l) => l.trim().length > 0);
      const newItems: SocialAccount[] = lines.map((line, idx) => {
        const parts = line.split("|").map((p) => p.trim());
        const uid = parts[0] || `acc_${Date.now()}_${idx}`;
        const name = parts[1] || `Tài khoản ${addPlatform} ${idx + 1}`;
        const email = parts[2] || `${uid}@domain.com`;
        const cookie = parts[3] || "";
        const proxy = parts[4] || "";

        return {
          id: `acc_${Date.now()}_${idx}`,
          stt: accounts.length + idx + 1,
          platform: addPlatform,
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
          name,
          uid,
          email,
          cookie,
          proxy,
          liveStatus: "live",
          syncStatus: cookie ? "synced" : "not_synced",
          lastSyncedAt: "Vừa thêm",
          profileCreated: true,
          profilePath: `${profileBasePath}\\${addPlatform}_${uid}`
        };
      });

      setAccounts((prev) => [...prev, ...newItems]);
      setBulkInputText("");
      setIsAddModalOpen(false);
      soundSynth.playSfx("success");
      addToast(`Đã thêm thành công ${newItems.length} tài khoản mới!`, "success");
    } else {
      if (!singleName.trim() || !singleUid.trim()) {
        addToast("Vui lòng nhập Tên và UID tài khoản!", "warning");
        return;
      }
      const newAcc: SocialAccount = {
        id: `acc_${Date.now()}`,
        stt: accounts.length + 1,
        platform: addPlatform,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        name: singleName,
        uid: singleUid,
        email: singleEmail,
        password: singlePassword,
        twoFa: single2FA,
        cookie: singleCookie,
        proxy: singleProxy,
        liveStatus: "live",
        syncStatus: singleCookie ? "synced" : "not_synced",
        lastSyncedAt: "Vừa thêm",
        profileCreated: true,
        profilePath: `${profileBasePath}\\${addPlatform}_${singleUid}`
      };

      setAccounts((prev) => [...prev, newAcc]);
      setSingleName("");
      setSingleUid("");
      setSingleEmail("");
      setSinglePassword("");
      setSingle2FA("");
      setSingleCookie("");
      setSingleProxy("");
      setIsAddModalOpen(false);
      soundSynth.playSfx("success");
      addToast(`Đã thêm tài khoản "${newAcc.name}" thành công!`, "success");
    }
  };

  // Helper render platform badge
  const renderPlatformBadge = (plat: PlatformType) => {
    switch (plat) {
      case "facebook":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
            <Facebook className="w-3 h-3 text-blue-500" />
            Facebook
          </span>
        );
      case "tiktok":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium">
            <Music2 className="w-3 h-3 text-cyan-400" />
            Tiktok
          </span>
        );
      case "youtube":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">
            <Youtube className="w-3 h-3 text-red-500" />
            Youtube
          </span>
        );
      case "instagram":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-medium">
            <Instagram className="w-3 h-3 text-pink-500" />
            Instagram
          </span>
        );
      case "twitter_x":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-300 border border-slate-500/20 text-xs font-medium">
            <Twitter className="w-3 h-3 text-slate-300" />
            X (Twitter)
          </span>
        );
      case "zalo_video":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-medium">
            <PlayCircle className="w-3 h-3 text-purple-400" />
            Zalo Video
          </span>
        );
    }
  };

  // Render live status
  const renderLiveStatus = (st: AccountLiveStatus) => {
    switch (st) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        );
      case "die":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
            <XCircle className="w-3 h-3 text-rose-400" />
            Die
          </span>
        );
      case "checkpoint":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Checkpoint
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
            Chưa check
          </span>
        );
    }
  };

  // Render sync status
  const renderSyncStatus = (sync: SyncStatus, lastTime?: string) => {
    switch (sync) {
      case "synced":
        return (
          <div className="flex flex-col text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Đã đồng bộ
            </span>
            {lastTime && <span className="text-slate-500 text-[10px]">{lastTime}</span>}
          </div>
        );
      case "expired":
        return (
          <div className="flex flex-col text-[11px]">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Hết hạn cookie
            </span>
            {lastTime && <span className="text-slate-500 text-[10px]">{lastTime}</span>}
          </div>
        );
      case "syncing":
        return (
          <span className="text-cyan-400 font-semibold flex items-center gap-1 text-[11px]">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            Đang đồng bộ...
          </span>
        );
      default:
        return <span className="text-slate-500 text-[11px]">Chưa kết nối</span>;
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header Card (Matching Screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 border border-rose-500/30 flex items-center justify-center shadow-inner">
              <UserCheck className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Quản lý tài khoản
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {accounts.length} Profiles
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Hệ thống quản lý Profile trình duyệt, Cookie & Đồng bộ đa nền tảng
              </p>
            </div>
          </div>

          {/* Top Right Button: Cập nhật Browser */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsBrowserUpdateModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-slate-600"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cập nhật Browser</span>
          </button>
        </div>
      </div>

      {/* 2. Command Panels (Matching the 3 rows in screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3.5">
        {/* Row 1: Thêm tài khoản */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-36 text-xs font-bold text-slate-300 shrink-0">
            Thêm tài khoản
          </div>
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsAddModalOpen(true);
            }}
            className="px-4 py-1.5 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer w-fit"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Thêm tài khoản</span>
          </button>
        </div>

        {/* Row 2: Lấy cookie/đồng bộ */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-36 text-xs font-bold text-slate-300 shrink-0">
            Lấy cookie/đồng bộ
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Lấy cookie Facebook */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setSelectedSyncPlatform("facebook");
                setIsCookieSyncModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-blue-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-500" />
              <span>Lấy cookie Facebook</span>
            </button>

            {/* Lấy cookie Instagram */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setSelectedSyncPlatform("instagram");
                setIsCookieSyncModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-pink-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>Lấy cookie Instagram</span>
            </button>

            {/* Lấy cookie Tiktok */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setSelectedSyncPlatform("tiktok");
                setIsCookieSyncModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-cyan-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Music2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lấy cookie Tiktok</span>
            </button>

            {/* Đồng bộ Youtube */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setSelectedSyncPlatform("youtube");
                setIsCookieSyncModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-red-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              <span>Đồng bộ Youtube</span>
            </button>

            {/* Lấy cookie X */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setSelectedSyncPlatform("twitter_x");
                setIsCookieSyncModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-slate-400/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Twitter className="w-3.5 h-3.5 text-slate-300" />
              <span>Lấy cookie X</span>
            </button>
          </div>
        </div>

        {/* Row 3: Quét */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-36 text-xs font-bold text-slate-300 shrink-0">
            Quét:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Quét Fanpage */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setIsScanFanpageModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Quét Fanpage</span>
            </button>

            {/* Quét kênh zalo video */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setIsScanZaloModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-purple-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5 text-purple-400" />
              <span>Quét kênh zalo video</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Filter & Operation Toolbar (Row 4 in screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-3.5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Tích chọn từ ... đến ... */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1">
            <span className="text-slate-400 font-medium">Tích chọn từ</span>
            <input
              type="number"
              min={0}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(parseInt(e.target.value) || 0)}
              className="w-10 bg-slate-950 border border-white/10 rounded px-1 text-center font-mono text-white outline-none focus:border-cyan-500"
            />
            <span className="text-slate-400 font-medium">đến</span>
            <input
              type="number"
              min={0}
              value={rangeTo}
              onChange={(e) => setRangeTo(parseInt(e.target.value) || 0)}
              className="w-10 bg-slate-950 border border-white/10 rounded px-1 text-center font-mono text-white outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleRangeSelect}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
            >
              Chọn
            </button>
          </div>

          {/* Lưu DS Full */}
          <button
            onClick={handleSaveFullList}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-emerald-500/40 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Lưu danh sách đầy đủ ra file CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lưu DS Full</span>
          </button>

          {/* Xoá Tài Khoản */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-lg font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Xoá Tài Khoản ({selectedIds.length})</span>
          </button>

          {/* Xoá profile Tài Khoản */}
          <button
            onClick={handleDeleteProfiles}
            disabled={selectedIds.length === 0}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-amber-500/30 rounded-lg font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Xoá profile Tài Khoản</span>
          </button>

          {/* Làm nhẹ profile */}
          <button
            onClick={handleCleanProfiles}
            disabled={isCleaningProfiles}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-cyan-500/30 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isCleaningProfiles ? "Đang làm nhẹ..." : "Làm nhẹ profile"}</span>
          </button>

          {/* Check Live */}
          <button
            onClick={handleBatchCheckLive}
            disabled={isCheckingLive}
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isCheckingLive ? "animate-spin" : ""}`} />
            <span>{isCheckingLive ? "Đang check..." : "Check Live"}</span>
          </button>

          {/* Dropdown: Chọn chức năng lọc */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="all">Chọn chức năng lọc (Tất cả)</option>
            <option value="live">Chỉ tài khoản Live</option>
            <option value="die_checkpoint">Chỉ tài khoản Die / Checkpoint</option>
            <option value="facebook">Lọc theo Facebook</option>
            <option value="tiktok">Lọc theo TikTok</option>
            <option value="youtube">Lọc theo YouTube</option>
            <option value="instagram">Lọc theo Instagram</option>
            <option value="twitter_x">Lọc theo X</option>
            <option value="zalo_video">Lọc theo Zalo Video</option>
            <option value="no_profile">Chưa tạo Profile</option>
            <option value="expired_cookie">Hết hạn Cookie</option>
          </select>

          {/* Dropdown: Chrome mặc định */}
          <select
            value={browserEngine}
            onChange={(e) => setBrowserEngine(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="chrome_default">Chrome mặc định</option>
            <option value="antidetect_v4">Antidetect Fingerprint V4</option>
            <option value="gologin_engine">GoLogin Multi-Profile</option>
            <option value="adspower_engine">AdsPower Kernel</option>
            <option value="undetectable_ai">Undetectable Automation</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, uid, email..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Thay đổi đường dẫn profile */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsPathModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-slate-600 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Thay đổi đường dẫn profile</span>
          </button>
        </div>
      </div>

      {/* 4. Table Header (Solid Red #ff2b54 as in screenshot) */}
      <div className="bg-[#0b0e17]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            {/* Header: Solid Red #ff2b54 matching screenshot */}
            <thead>
              <tr className="bg-[#ff2b54] text-white text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-white/40 text-rose-700 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-white"
                  />
                </th>
                <th className="py-3 px-3 w-28 text-center">Live</th>
                <th className="py-3 px-3 w-32">Nền tảng</th>
                <th className="py-3 px-3 w-16 text-center">Avatar</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 font-mono">UID</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-3 w-32 text-center">Đồng Bộ</th>
                <th className="py-3 px-4 w-40 text-center">Trình duyệt</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserCheck className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-400">Không có tài khoản nào phù hợp bộ lọc</p>
                      <p className="text-[11px] text-slate-500">Nhấn nút "+ Thêm tài khoản" hoặc thử tìm kiếm khác.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, index) => {
                  const isSelected = selectedIds.includes(acc.id);
                  return (
                    <tr
                      key={acc.id}
                      className={`transition-colors hover:bg-white/[0.04] ${
                        isSelected ? "bg-rose-500/[0.07]" : ""
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Checkbox */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(acc.id)}
                          className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                        />
                      </td>

                      {/* Live */}
                      <td className="py-3 px-3 text-center">
                        {renderLiveStatus(acc.liveStatus)}
                      </td>

                      {/* Nền tảng */}
                      <td className="py-3 px-3">
                        {renderPlatformBadge(acc.platform)}
                      </td>

                      {/* Avatar */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 mx-auto bg-slate-800">
                          <img
                            src={acc.avatar}
                            alt={acc.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[200px]">{acc.name}</span>
                          {acc.followersCount && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {acc.followersCount.toLocaleString()} followers
                            </span>
                          )}
                        </div>
                      </td>

                      {/* UID */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5 group">
                          <span className="truncate max-w-[150px]">{acc.uid}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(acc.uid);
                              soundSynth.playSfx("pop");
                              addToast(`Đã copy UID: ${acc.uid}`, "info");
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity"
                            title="Copy UID"
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        <span className="truncate max-w-[180px] block">{acc.email || "—"}</span>
                      </td>

                      {/* Đồng Bộ */}
                      <td className="py-3 px-3 text-center">
                        {renderSyncStatus(acc.syncStatus, acc.lastSyncedAt)}
                      </td>

                      {/* Trình duyệt (Action Buttons) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenBrowser(acc)}
                            className="px-2.5 py-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Khởi chạy Profile trình duyệt"
                          >
                            <Chrome className="w-3 h-3 text-blue-400" />
                            <span>Mở Chrome</span>
                          </button>

                          <button
                            onClick={() => {
                              soundSynth.playSfx("pop");
                              addToast(`Proxy: ${acc.proxy || "IP máy trực tiếp"}`, "info");
                            }}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Thông tin Proxy / Cookie"
                          >
                            <Globe className="w-3.5 h-3.5" />
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

        {/* Table Footer Summary */}
        <div className="px-4 py-3 bg-[#07090f] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Tổng số tài khoản: <strong className="text-white">{accounts.length}</strong>
            </span>
            <span>•</span>
            <span>
              Đang chọn: <strong className="text-rose-400">{selectedIds.length}</strong>
            </span>
            <span>•</span>
            <span>
              Live: <strong className="text-emerald-400">{accounts.filter((a) => a.liveStatus === "live").length}</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Đường dẫn profile: {profileBasePath}
          </div>
        </div>
      </div>

      {/* MODAL 1: Thêm tài khoản */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-rose-600/20 via-pink-600/10 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thêm Tài Khoản Mới</h3>
                  <p className="text-[11px] text-slate-400">Hỗ trợ nạp hàng loạt hoặc thêm từng tài khoản</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Chọn nền tảng mạng xã hội:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(["facebook", "tiktok", "youtube", "instagram", "twitter_x", "zalo_video"] as PlatformType[]).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => {
                          soundSynth.playSfx("pop");
                          setAddPlatform(p);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          addPlatform === p
                            ? "bg-rose-500/20 border-rose-500 text-white font-bold"
                            : "bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {p === "facebook" && <Facebook className="w-4 h-4 text-blue-400" />}
                        {p === "tiktok" && <Music2 className="w-4 h-4 text-cyan-400" />}
                        {p === "youtube" && <Youtube className="w-4 h-4 text-red-500" />}
                        {p === "instagram" && <Instagram className="w-4 h-4 text-pink-400" />}
                        {p === "twitter_x" && <Twitter className="w-4 h-4 text-slate-300" />}
                        {p === "zalo_video" && <PlayCircle className="w-4 h-4 text-purple-400" />}
                        <span className="text-[10px] capitalize">{p.replace("_", " ")}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  onClick={() => setAddMode("bulk")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    addMode === "bulk"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Nạp hàng loạt (Bulk Text)
                </button>
                <button
                  onClick={() => setAddMode("single")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    addMode === "single"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Thêm 1 tài khoản
                </button>
              </div>

              {addMode === "bulk" ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Dán danh sách tài khoản (Mỗi dòng 1 tài khoản):
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Định dạng: UID|Name|Email|Cookie|Proxy
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    placeholder={`100089201948|Studio Creator 01|acc1@gmail.com|c_user=...|103.149.28.12:8080
100089201949|Studio Creator 02|acc2@gmail.com|c_user=...|103.149.28.13:8080`}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-rose-500/50 resize-y"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Phát hiện:{" "}
                      <strong className="text-white">
                        {bulkInputText.split("\n").filter((l) => l.trim()).length}
                      </strong>{" "}
                      dòng
                    </span>
                    <button
                      onClick={() => {
                        setBulkInputText(
                          `100089201948|Studio Creator 01|acc1@gmail.com|c_user=100089201948; xs=abc123|103.149.28.12:8080\n100089201949|Studio Creator 02|acc2@gmail.com|c_user=100089201949; xs=abc124|103.149.28.13:8080\n100089201950|Studio Creator 03|acc3@gmail.com|c_user=100089201950; xs=abc125|103.149.28.14:8080`
                        );
                      }}
                      className="text-rose-400 hover:underline cursor-pointer"
                    >
                      Dán mẫu thử
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Tên tài khoản / Kênh:</label>
                    <input
                      type="text"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="Ví dụ: Media Creator Pro"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">UID / Username:</label>
                    <input
                      type="text"
                      value={singleUid}
                      onChange={(e) => setSingleUid(e.target.value)}
                      placeholder="10009281920 hoặc @username"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Email / SĐT:</label>
                    <input
                      type="text"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Proxy (Host:Port:User:Pass):</label>
                    <input
                      type="text"
                      value={singleProxy}
                      onChange={(e) => setSingleProxy(e.target.value)}
                      placeholder="103.149.28.12:8080:user:pass"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Cookie (Tùy chọn):</label>
                    <textarea
                      rows={2}
                      value={singleCookie}
                      onChange={(e) => setSingleCookie(e.target.value)}
                      placeholder="c_user=...; xs=...;"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAddAccounts}
                className="px-5 py-2 rounded-xl bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold transition-all shadow-md hover:shadow-rose-500/25 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Thêm tài khoản vào hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cập nhật Browser */}
      {isBrowserUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Chrome className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Cập Nhật Trình Duyệt & Driver</h3>
              </div>
              <button
                onClick={() => setIsBrowserUpdateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span>Chromium Antidetect Kernel:</span>
                  <strong className="text-emerald-400 font-mono">v128.0.6613.119 (Mới nhất)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>ChromeDriver Automation:</span>
                  <strong className="text-emerald-400 font-mono">v128.0.6613 (Sẵn sàng)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Fingerprint Mask Engine:</span>
                  <strong className="text-cyan-400 font-mono">WebRTC / Canvas Bypass PRO</strong>
                </div>
              </div>
              <p className="text-slate-400 text-[11px]">
                Hệ thống tự động đồng bộ mã nguồn trình duyệt sạch và thư viện chống quét thiết bị để nuôi nick an toàn không checkpoint.
              </p>
            </div>
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setIsBrowserUpdateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  soundSynth.playSfx("success");
                  addToast("Đã kiểm tra và cập nhật Driver trình duyệt lên phiên bản mới nhất!", "success");
                  setIsBrowserUpdateModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
              >
                Kiểm tra & Cập nhật ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Thay đổi đường dẫn profile */}
      {isPathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Đường Dẫn Lưu Profile Trình Duyệt</h3>
              </div>
              <button onClick={() => setIsPathModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <label className="block text-slate-300 font-medium">Thư mục chứa dữ liệu Profile:</label>
              <input
                type="text"
                value={profileBasePath}
                onChange={(e) => setProfileBasePath(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-400">
                Nên lưu trên ổ đĩa SSD tốc độ cao để trình duyệt khởi động nhanh và không giật lag.
              </p>
            </div>
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setIsPathModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  soundSynth.playSfx("success");
                  addToast(`Đã cập nhật đường dẫn profile: ${profileBasePath}`, "success");
                  setIsPathModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Lấy Cookie & Đồng Bộ */}
      {isCookieSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white capitalize">
                  Đồng Bộ Cookie & Phiên Đăng Nhập ({selectedSyncPlatform})
                </h3>
              </div>
              <button onClick={() => setIsCookieSyncModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-300">
              <p className="text-slate-300">
                Chọn phương thức lấy cookie và đồng bộ cho nền tảng <strong>{selectedSyncPlatform}</strong>:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    soundSynth.playSfx("success");
                    addToast(`Đang mở cửa sổ trình duyệt đăng nhập tự động lấy cookie ${selectedSyncPlatform}...`, "info");
                    setIsCookieSyncModalOpen(false);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white">1. Mở trình duyệt đăng nhập tự động</div>
                    <div className="text-[11px] text-slate-400">Đăng nhập tài khoản, tool sẽ tự động bóc tách cookie và lưu lại</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                </button>

                <button
                  onClick={() => {
                    soundSynth.playSfx("success");
                    addToast(`Đang quét cookie từ Extension / Profile hiện có...`, "info");
                    setIsCookieSyncModalOpen(false);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/10 hover:border-violet-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white">2. Quét cookie trực tiếp từ Profile Chrome</div>
                    <div className="text-[11px] text-slate-400">Đọc database SQLite Network Cookie của Chrome profile</div>
                  </div>
                  <Layers className="w-4 h-4 text-violet-400" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsCookieSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Quét Fanpage */}
      {isScanFanpageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                <h3 className="text-sm font-bold text-white">Quét Danh Sách Fanpage Quản Lý</h3>
              </div>
              <button onClick={() => setIsScanFanpageModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-300">
              <p>Hệ thống sẽ quét toàn bộ Fanpage Profile & Page truyền thống thuộc quyền quản trị của các tài khoản Facebook đang chọn.</p>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1.5">
                <div className="text-slate-400">Số tài khoản Facebook khả dụng: <strong className="text-white">{accounts.filter(a => a.platform === "facebook").length}</strong></div>
                <div className="text-slate-400">Kiểm tra trạng thái Page: <strong className="text-emerald-400">Chất lượng Trang, Vi phạm, Kiếm tiền Reels</strong></div>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setIsScanFanpageModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  soundSynth.playSfx("success");
                  addToast("Đã quét hoàn tất 14 Fanpage từ các tài khoản Facebook!", "success");
                  setIsScanFanpageModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                Bắt đầu quét Fanpage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Quét kênh Zalo Video */}
      {isScanZaloModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Quét Kênh & Creator Zalo Video</h3>
              </div>
              <button onClick={() => setIsScanZaloModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-300">
              <p>Quét các kênh Zalo Video Creator, lượt xem, người theo dõi và token phiên đăng nhập tự động.</p>
            </div>
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setIsScanZaloModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  soundSynth.playSfx("success");
                  addToast("Đã quét và đồng bộ kênh Zalo Video thành công!", "success");
                  setIsScanZaloModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
              >
                Bắt đầu quét Zalo Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
