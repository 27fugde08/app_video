import React, { useState, useMemo } from "react";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Link2,
  Unlink,
  Copy,
  ChevronDown,
  Sparkles,
  Server,
  Zap,
  Layers,
  Facebook,
  Music2,
  Youtube,
  Instagram,
  Twitter,
  PlayCircle,
  ShieldCheck,
  Check,
  X
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";

export type ProxyProtocol = "http" | "https" | "socks5";
export type ProxyLiveStatus = "live" | "die" | "checking" | "unverified";

export interface ProxyItem {
  id: string;
  order: number;
  ip: string;
  port: string;
  username?: string;
  password?: string;
  protocol: ProxyProtocol;
  rawString: string;
  country?: string;
  countryCode?: string;
  pingMs?: number;
  liveStatus: ProxyLiveStatus;
  lastChecked?: string;
  assignedAccountIds: string[];
}

export interface ProxyAccountItem {
  id: string;
  stt: number;
  proxyId?: string;
  proxyRaw?: string;
  avatar: string;
  userId: string;
  name: string;
  platform: "facebook" | "tiktok" | "youtube" | "instagram" | "twitter_x" | "zalo_video";
  email: string;
}

const INITIAL_PROXIES: ProxyItem[] = [
  {
    id: "PRX_101",
    order: 1,
    ip: "103.149.28.12",
    port: "8080",
    username: "proxystudio_01",
    password: "secPass992",
    protocol: "http",
    rawString: "103.149.28.12:8080:proxystudio_01:secPass992",
    country: "Vietnam",
    countryCode: "VN",
    pingMs: 42,
    liveStatus: "live",
    lastChecked: "Vừa xong",
    assignedAccountIds: ["acc_1"]
  },
  {
    id: "PRX_102",
    order: 2,
    ip: "14.161.45.89",
    port: "3128",
    username: "agency_vn_88",
    password: "tokenPass12",
    protocol: "http",
    rawString: "14.161.45.89:3128:agency_vn_88:tokenPass12",
    country: "Vietnam",
    countryCode: "VN",
    pingMs: 58,
    liveStatus: "live",
    lastChecked: "2 phút trước",
    assignedAccountIds: ["acc_2"]
  },
  {
    id: "PRX_103",
    order: 3,
    ip: "172.105.112.44",
    port: "9050",
    username: "",
    password: "",
    protocol: "socks5",
    rawString: "172.105.112.44:9050",
    country: "Singapore",
    countryCode: "SG",
    pingMs: 76,
    liveStatus: "live",
    lastChecked: "5 phút trước",
    assignedAccountIds: []
  },
  {
    id: "PRX_104",
    order: 4,
    ip: "45.76.182.201",
    port: "1080",
    username: "usr_us_speed",
    password: "pass99120",
    protocol: "socks5",
    rawString: "45.76.182.201:1080:usr_us_speed:pass99120",
    country: "United States",
    countryCode: "US",
    pingMs: 168,
    liveStatus: "live",
    lastChecked: "10 phút trước",
    assignedAccountIds: []
  },
  {
    id: "PRX_105",
    order: 5,
    ip: "118.69.135.20",
    port: "8080",
    protocol: "http",
    rawString: "118.69.135.20:8080",
    country: "Vietnam",
    countryCode: "VN",
    pingMs: 0,
    liveStatus: "die",
    lastChecked: "Hôm qua",
    assignedAccountIds: []
  }
];

const INITIAL_ACCOUNTS: ProxyAccountItem[] = [
  {
    id: "acc_1",
    stt: 1,
    proxyId: "PRX_101",
    proxyRaw: "103.149.28.12:8080",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    userId: "100084920194820",
    name: "Thanh Đắc Lộc (Media Studio)",
    platform: "facebook",
    email: "thanhdacloc.media@gmail.com"
  },
  {
    id: "acc_2",
    stt: 2,
    proxyId: "PRX_102",
    proxyRaw: "14.161.45.89:3128",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
    userId: "@viralclips.global",
    name: "Viral Clips Studio Global",
    platform: "tiktok",
    email: "tiktok.agency24@outlook.com"
  },
  {
    id: "acc_3",
    stt: 3,
    proxyId: "",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    userId: "UC_a89fB2c1D90eFgh",
    name: "Movie Recap & Anime 4K",
    platform: "youtube",
    email: "recapmovie.creator@gmail.com"
  },
  {
    id: "acc_4",
    stt: 4,
    proxyId: "",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop",
    userId: "aesthetic.reels.vn",
    name: "Aesthetic Reels Official",
    platform: "instagram",
    email: "instagram.aesthetic@yahoo.com"
  },
  {
    id: "acc_5",
    stt: 5,
    proxyId: "",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    userId: "cryptotrends_x",
    name: "Crypto & Tech Trends X",
    platform: "twitter_x",
    email: "x.cryptotrends@proton.me"
  },
  {
    id: "acc_6",
    stt: 6,
    proxyId: "",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
    userId: "zalovid_889201",
    name: "Zalo Video Creator Pro",
    platform: "zalo_video",
    email: "0988776655"
  }
];

export const ProxyManagerTool: React.FC = () => {
  const { addToast } = useToast();

  // State: Proxies & Accounts
  const [proxies, setProxies] = useState<ProxyItem[]>(INITIAL_PROXIES);
  const [accounts, setAccounts] = useState<ProxyAccountItem[]>(INITIAL_ACCOUNTS);

  // Selections
  const [selectedProxyIds, setSelectedProxyIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Range Select States (Left: Proxy, Right: Accounts)
  const [proxyRangeFrom, setProxyRangeFrom] = useState<number>(0);
  const [proxyRangeTo, setProxyRangeTo] = useState<number>(0);
  const [accountRangeFrom, setAccountRangeFrom] = useState<number>(0);
  const [accountRangeTo, setAccountRangeTo] = useState<number>(0);

  // Filters
  const [proxyFilter, setProxyFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  // Assignment Mechanism State (Bottom Section)
  // Mode 1: Auto distribute selected proxies among selected accounts
  // Mode 2: Each selected proxy is shared among N accounts
  const [assignMechanism, setAssignMechanism] = useState<"mode1" | "mode2">("mode1");
  const [mode2AccountsPerProxy, setMode2AccountsPerProxy] = useState<number>(1);

  // Check live progress
  const [isCheckingLive, setIsCheckingLive] = useState<boolean>(false);

  // Modal: Add Proxy
  const [isAddProxyModalOpen, setIsAddProxyModalOpen] = useState<boolean>(false);
  const [rawProxyInput, setRawProxyInput] = useState<string>("");
  const [addProtocol, setAddProtocol] = useState<ProxyProtocol>("http");

  // ================= FILTERED DATA =================
  const filteredProxies = useMemo(() => {
    return proxies.filter((p) => {
      if (proxyFilter === "all") return true;
      if (proxyFilter === "live") return p.liveStatus === "live";
      if (proxyFilter === "die") return p.liveStatus === "die";
      if (proxyFilter === "assigned") return p.assignedAccountIds.length > 0;
      if (proxyFilter === "unassigned") return p.assignedAccountIds.length === 0;
      if (proxyFilter === "http") return p.protocol === "http" || p.protocol === "https";
      if (proxyFilter === "socks5") return p.protocol === "socks5";
      return true;
    });
  }, [proxies, proxyFilter]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (accountFilter === "all") return true;
      if (accountFilter === "has_proxy") return Boolean(acc.proxyId);
      if (accountFilter === "no_proxy") return !acc.proxyId;
      if (accountFilter === "facebook") return acc.platform === "facebook";
      if (accountFilter === "tiktok") return acc.platform === "tiktok";
      if (accountFilter === "youtube") return acc.platform === "youtube";
      if (accountFilter === "instagram") return acc.platform === "instagram";
      if (accountFilter === "twitter_x") return acc.platform === "twitter_x";
      if (accountFilter === "zalo_video") return acc.platform === "zalo_video";
      return true;
    });
  }, [accounts, accountFilter]);

  // ================= PROXY ACTIONS =================

  // Checkbox: Select All Proxies
  const isAllProxiesSelected =
    filteredProxies.length > 0 &&
    filteredProxies.every((p) => selectedProxyIds.includes(p.id));

  const handleToggleSelectAllProxies = () => {
    soundSynth.playSfx("pop");
    if (isAllProxiesSelected) {
      setSelectedProxyIds([]);
    } else {
      setSelectedProxyIds(filteredProxies.map((p) => p.id));
    }
  };

  const handleToggleSelectOneProxy = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedProxyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Range Select Proxies
  const handleSelectProxyRange = () => {
    soundSynth.playSfx("pop");
    const from = Math.max(1, proxyRangeFrom);
    const to = Math.max(from, proxyRangeTo);

    const ids: string[] = [];
    filteredProxies.forEach((p, index) => {
      const order = index + 1;
      if (order >= from && order <= to) {
        ids.push(p.id);
      }
    });

    setSelectedProxyIds(ids);
    addToast(`Đã tích chọn ${ids.length} proxy từ số thứ tự ${from} đến ${to}`, "info");
  };

  // Check live Proxy
  const handleCheckLiveProxies = () => {
    if (proxies.length === 0) {
      addToast("Chưa có Proxy nào trong danh sách để kiểm tra!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    setIsCheckingLive(true);
    addToast("Đang kiểm tra kết nối & tốc độ phản hồi (Ping / Latency)...", "info");

    setTimeout(() => {
      setProxies((prev) =>
        prev.map((p) => {
          if (selectedProxyIds.length === 0 || selectedProxyIds.includes(p.id)) {
            const isLive = Math.random() > 0.15;
            const ping = isLive ? Math.floor(Math.random() * 80) + 25 : 0;
            return {
              ...p,
              liveStatus: isLive ? "live" : "die",
              pingMs: ping,
              lastChecked: "Vừa kiểm tra"
            };
          }
          return p;
        })
      );
      setIsCheckingLive(false);
      soundSynth.playSfx("success");
      addToast("Hoàn tất kiểm tra trạng thái toàn bộ Proxy!", "success");
    }, 1400);
  };

  // Delete selected Proxies
  const handleDeleteSelectedProxies = () => {
    if (selectedProxyIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 Proxy để xoá!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const toDeleteIds = new Set(selectedProxyIds);

    // Also unassign from accounts
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.proxyId && toDeleteIds.has(acc.proxyId)
          ? { ...acc, proxyId: undefined, proxyRaw: undefined }
          : acc
      )
    );

    setProxies((prev) => prev.filter((p) => !toDeleteIds.has(p.id)));
    setSelectedProxyIds([]);
    addToast(`Đã xoá thành công ${toDeleteIds.size} Proxy khỏi hệ thống!`, "success");
  };

  // Delete Single Proxy
  const handleDeleteSingleProxy = (proxyId: string) => {
    soundSynth.playSfx("pop");
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.proxyId === proxyId
          ? { ...acc, proxyId: undefined, proxyRaw: undefined }
          : acc
      )
    );
    setProxies((prev) => prev.filter((p) => p.id !== proxyId));
    setSelectedProxyIds((prev) => prev.filter((id) => id !== proxyId));
    addToast("Đã xoá Proxy thành công!", "success");
  };

  // Export TXT
  const handleExportTxt = () => {
    soundSynth.playSfx("pop");
    const content = proxies.map((p) => p.rawString).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_Sach_Proxy_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addToast(`Đã xuất ${proxies.length} Proxy ra tệp TXT!`, "success");
  };

  // Export Excel / CSV
  const handleExportExcel = () => {
    soundSynth.playSfx("pop");
    const header = "ID,IP,Port,Username,Password,Protocol,LiveStatus,PingMs,AssignedAccounts\n";
    const rows = proxies
      .map(
        (p) =>
          `${p.id},${p.ip},${p.port},"${p.username || ""}",${p.password || ""},${p.protocol},${p.liveStatus},${p.pingMs || 0},"${p.assignedAccountIds.join(";")}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_Sach_Proxy_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast(`Đã xuất ${proxies.length} Proxy ra tệp Excel (CSV)!`, "success");
  };

  // Add Proxies Confirm
  const handleConfirmAddProxies = () => {
    if (!rawProxyInput.trim()) {
      addToast("Vui lòng nhập hoặc dán danh sách Proxy!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const lines = rawProxyInput.split("\n").filter((l) => l.trim().length > 0);
    const newItems: ProxyItem[] = lines.map((line, idx) => {
      const parts = line.trim().split(":");
      const ip = parts[0] || "127.0.0.1";
      const port = parts[1] || "8080";
      const username = parts[2] || "";
      const password = parts[3] || "";

      return {
        id: `PRX_${Date.now().toString().slice(-4)}_${idx + 1}`,
        order: proxies.length + idx + 1,
        ip,
        port,
        username,
        password,
        protocol: addProtocol,
        rawString: line.trim(),
        country: "Vietnam",
        countryCode: "VN",
        pingMs: Math.floor(Math.random() * 60) + 30,
        liveStatus: "live",
        lastChecked: "Vừa thêm",
        assignedAccountIds: []
      };
    });

    setProxies((prev) => [...prev, ...newItems]);
    setRawProxyInput("");
    setIsAddProxyModalOpen(false);
    soundSynth.playSfx("success");
    addToast(`Đã thêm thành công ${newItems.length} Proxy vào danh sách!`, "success");
  };

  // Insert Sample Proxies
  const handleInsertSampleProxies = () => {
    soundSynth.playSfx("pop");
    setRawProxyInput(
      `103.149.28.50:8080:user_pro_01:pass9921\n14.161.88.99:3128:vn_speed_02:tok12345\n172.105.120.30:9050\n45.76.190.15:1080:us_proxy_fast:secure99`
    );
    addToast("Đã nạp 4 Proxy mẫu!", "info");
  };

  // ================= ACCOUNT ACTIONS =================

  // Checkbox: Select All Accounts
  const isAllAccountsSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((a) => selectedAccountIds.includes(a.id));

  const handleToggleSelectAllAccounts = () => {
    soundSynth.playSfx("pop");
    if (isAllAccountsSelected) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(filteredAccounts.map((a) => a.id));
    }
  };

  const handleToggleSelectOneAccount = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Range Select Accounts
  const handleSelectAccountRange = () => {
    soundSynth.playSfx("pop");
    const from = Math.max(1, accountRangeFrom);
    const to = Math.max(from, accountRangeTo);

    const ids: string[] = [];
    filteredAccounts.forEach((a, index) => {
      const order = index + 1;
      if (order >= from && order <= to) {
        ids.push(a.id);
      }
    });

    setSelectedAccountIds(ids);
    addToast(`Đã tích chọn ${ids.length} tài khoản từ số thứ tự ${from} đến ${to}`, "info");
  };

  // Remove Proxy from Selected Accounts (Gỡ Proxy khỏi tài khoản)
  const handleUnlinkProxyFromAccounts = () => {
    if (selectedAccountIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 tài khoản để gỡ Proxy!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const selectedSet = new Set(selectedAccountIds);

    // Update accounts
    setAccounts((prev) =>
      prev.map((acc) =>
        selectedSet.has(acc.id)
          ? { ...acc, proxyId: undefined, proxyRaw: undefined }
          : acc
      )
    );

    // Update proxies assigned array
    setProxies((prev) =>
      prev.map((p) => ({
        ...p,
        assignedAccountIds: p.assignedAccountIds.filter((accId) => !selectedSet.has(accId))
      }))
    );

    addToast(`Đã gỡ Proxy khỏi ${selectedAccountIds.length} tài khoản thành công!`, "success");
  };

  // ================= ASSIGNMENT MECHANISM (BOTTOM BAR) =================
  const handleApplyProxyAssignment = () => {
    if (selectedProxyIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 Proxy ở cột trái!", "warning");
      return;
    }
    if (selectedAccountIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 Tài khoản ở cột phải!", "warning");
      return;
    }

    soundSynth.playSfx("pop");
    const targetProxies = proxies.filter((p) => selectedProxyIds.includes(p.id));
    const targetAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));

    const updatedAccounts = [...accounts];
    const proxyMapAssignments: Record<string, string[]> = {};
    targetProxies.forEach((p) => {
      proxyMapAssignments[p.id] = [];
    });

    if (assignMechanism === "mode1") {
      // Cơ chế 1: Tự động chia Proxy được chọn cho các tài khoản được chọn (Round-robin)
      targetAccounts.forEach((acc, index) => {
        const assignedProxy = targetProxies[index % targetProxies.length];
        const accIdx = updatedAccounts.findIndex((a) => a.id === acc.id);
        if (accIdx !== -1) {
          updatedAccounts[accIdx] = {
            ...updatedAccounts[accIdx],
            proxyId: assignedProxy.id,
            proxyRaw: `${assignedProxy.ip}:${assignedProxy.port}`
          };
        }
        proxyMapAssignments[assignedProxy.id].push(acc.id);
      });
    } else {
      // Cơ chế 2: Mỗi Proxy được chọn sẽ chia cho N tài khoản được chọn
      const nPerProxy = Math.max(1, mode2AccountsPerProxy);
      let accPointer = 0;

      targetProxies.forEach((prx) => {
        for (let i = 0; i < nPerProxy && accPointer < targetAccounts.length; i++) {
          const acc = targetAccounts[accPointer];
          const accIdx = updatedAccounts.findIndex((a) => a.id === acc.id);
          if (accIdx !== -1) {
            updatedAccounts[accIdx] = {
              ...updatedAccounts[accIdx],
              proxyId: prx.id,
              proxyRaw: `${prx.ip}:${prx.port}`
            };
          }
          proxyMapAssignments[prx.id].push(acc.id);
          accPointer++;
        }
      });
    }

    // Update state
    setAccounts(updatedAccounts);
    setProxies((prev) =>
      prev.map((p) => {
        if (proxyMapAssignments[p.id]) {
          return {
            ...p,
            assignedAccountIds: Array.from(
              new Set([...p.assignedAccountIds, ...proxyMapAssignments[p.id]])
            )
          };
        }
        return p;
      })
    );

    soundSynth.playSfx("success");
    addToast(
      `Đã áp dụng gán ${targetProxies.length} Proxy cho ${targetAccounts.length} tài khoản thành công!`,
      "success"
    );
  };

  // Helper render platform icon
  const renderPlatformIcon = (plat: ProxyAccountItem["platform"]) => {
    switch (plat) {
      case "facebook":
        return <Facebook className="w-3.5 h-3.5 text-blue-500" />;
      case "tiktok":
        return <Music2 className="w-3.5 h-3.5 text-cyan-400" />;
      case "youtube":
        return <Youtube className="w-3.5 h-3.5 text-red-500" />;
      case "instagram":
        return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
      case "twitter_x":
        return <Twitter className="w-3.5 h-3.5 text-slate-300" />;
      case "zalo_video":
        return <PlayCircle className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header Title */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <Globe className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-xs text-rose-400">▼</span> Quản lý Proxy
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {proxies.length} Proxies Pool
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Hệ thống quản lý, kiểm tra Live và tự động phân phối Proxy cho Profile tài khoản
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout (Matching Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ================= LEFT COLUMN: Danh sách Proxy ================= */}
        <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between space-y-3">
          <div>
            {/* Header Title */}
            <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
              <span>
                Danh sách Proxy (số lượng <strong className="text-rose-400">{filteredProxies.length}</strong>)
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Đang chọn: <strong className="text-white">{selectedProxyIds.length}</strong>
              </span>
            </div>

            {/* Row 1: Thêm Proxy, Check live Proxy, Dropdown Tất cả Proxy */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <button
                onClick={() => {
                  soundSynth.playSfx("pop");
                  setIsAddProxyModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Thêm Proxy</span>
              </button>

              <button
                onClick={handleCheckLiveProxies}
                disabled={isCheckingLive}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isCheckingLive ? "animate-spin" : ""}`} />
                <span>{isCheckingLive ? "Đang check..." : "Check live Proxy"}</span>
              </button>

              {/* Filter Dropdown */}
              <select
                value={proxyFilter}
                onChange={(e) => setProxyFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/40 cursor-pointer flex-1 min-w-[120px]"
              >
                <option value="all">Tất cả Proxy</option>
                <option value="live">Chỉ Proxy Live</option>
                <option value="die">Chỉ Proxy Die</option>
                <option value="assigned">Đã gán tài khoản</option>
                <option value="unassigned">Chưa gán tài khoản</option>
                <option value="http">HTTP / HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>

            {/* Row 2: Tích chọn từ [0] đến [0] + Chọn + Xoá */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1 text-xs">
                <span className="text-slate-400 font-medium">Tích chọn từ</span>
                <input
                  type="number"
                  min={0}
                  value={proxyRangeFrom}
                  onChange={(e) => setProxyRangeFrom(parseInt(e.target.value) || 0)}
                  className="w-10 bg-slate-950 border border-white/10 rounded px-1 text-center font-mono text-white outline-none focus:border-cyan-500"
                />
                <span className="text-slate-400 font-medium">đến</span>
                <input
                  type="number"
                  min={0}
                  value={proxyRangeTo}
                  onChange={(e) => setProxyRangeTo(parseInt(e.target.value) || 0)}
                  className="w-10 bg-slate-950 border border-white/10 rounded px-1 text-center font-mono text-white outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSelectProxyRange}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
                >
                  Chọn
                </button>
              </div>

              <button
                onClick={handleDeleteSelectedProxies}
                disabled={selectedProxyIds.length === 0}
                className="px-3 py-1.5 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Xoá</span>
              </button>
            </div>

            {/* Row 3: Xuất TXT + Xuất Excel */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleExportTxt}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-slate-500 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Xuất TXT</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-emerald-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xuất Excel</span>
              </button>
            </div>

            {/* Left Table (Solid Red Header #ff2b54) */}
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto max-h-[420px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[400px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#ff2b54] text-white uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3 w-16 text-center">ID</th>
                      <th className="py-2.5 px-2 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllProxiesSelected}
                          onChange={handleToggleSelectAllProxies}
                          className="rounded border-white/40 text-rose-700 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-white"
                        />
                      </th>
                      <th className="py-2.5 px-4">Proxy</th>
                      <th className="py-2.5 px-3 w-20 text-center">Live</th>
                      <th className="py-2.5 px-3 w-24 text-center">Xóa Proxy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredProxies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          Chưa có Proxy nào trong danh sách
                        </td>
                      </tr>
                    ) : (
                      filteredProxies.map((p, idx) => {
                        const isSelected = selectedProxyIds.includes(p.id);
                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors hover:bg-white/[0.04] ${
                              isSelected ? "bg-rose-500/[0.08]" : ""
                            }`}
                          >
                            {/* ID */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Checkbox */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOneProxy(p.id)}
                                className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                              />
                            </td>

                            {/* Proxy String */}
                            <td className="py-2.5 px-4 font-mono text-slate-200">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 group">
                                  <span className="font-semibold text-white">
                                    {p.ip}:{p.port}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(p.rawString);
                                      soundSynth.playSfx("pop");
                                      addToast(`Đã copy: ${p.rawString}`, "info");
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                                    title="Copy Proxy"
                                  >
                                    <Copy className="w-3 h-3 text-slate-400" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="uppercase text-cyan-400 font-bold">{p.protocol}</span>
                                  {p.countryCode && <span>• {p.countryCode}</span>}
                                  {p.pingMs ? (
                                    <span className="text-emerald-400 font-mono">{p.pingMs}ms</span>
                                  ) : null}
                                  {p.assignedAccountIds.length > 0 && (
                                    <span className="text-rose-400">
                                      • {p.assignedAccountIds.length} Accs
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Live */}
                            <td className="py-2.5 px-3 text-center">
                              {p.liveStatus === "live" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Live
                                </span>
                              ) : p.liveStatus === "die" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                                  <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                  Die
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">Chưa check</span>
                              )}
                            </td>

                            {/* Delete Proxy Button */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteSingleProxy(p.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Xóa Proxy này"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Danh sách tài khoản ================= */}
        <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between space-y-3">
          <div>
            {/* Header Title */}
            <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
              <span>
                Danh sách tài khoản (số lượng <strong className="text-rose-400">{filteredAccounts.length}</strong>)
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Đang chọn: <strong className="text-white">{selectedAccountIds.length}</strong>
              </span>
            </div>

            {/* Row 1: Gỡ Proxy khỏi tài khoản + Dropdown Tất cả tài khoản */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <button
                onClick={handleUnlinkProxyFromAccounts}
                disabled={selectedAccountIds.length === 0}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5 text-amber-400" />
                <span>Gỡ Proxy khỏi tài khoản</span>
              </button>

              {/* Filter Dropdown */}
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/40 cursor-pointer flex-1 min-w-[140px]"
              >
                <option value="all">Tất cả tài khoản</option>
                <option value="no_proxy">Chưa có Proxy</option>
                <option value="has_proxy">Đã có Proxy</option>
                <option value="facebook">Tài khoản Facebook</option>
                <option value="tiktok">Tài khoản TikTok</option>
                <option value="youtube">Tài khoản YouTube</option>
                <option value="instagram">Tài khoản Instagram</option>
                <option value="twitter_x">Tài khoản X</option>
                <option value="zalo_video">Tài khoản Zalo Video</option>
              </select>
            </div>

            {/* Row 2: Tích chọn từ [0] đến [0] + Chọn */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1 text-xs">
                <span className="text-slate-400 font-medium">Tích chọn từ</span>
                <input
                  type="number"
                  min={0}
                  value={accountRangeFrom}
                  onChange={(e) => setAccountRangeFrom(parseInt(e.target.value) || 0)}
                  className="w-10 bg-slate-950 border border-white/10 rounded px-1 text-center font-mono text-white outline-none focus:border-cyan-500"
                />
                <span className="text-slate-400 font-medium">đến</span>
                <input
                  type="number"
                  min={0}
                  value={accountRangeTo}
                  onChange={(e) => setAccountRangeTo(parseInt(e.target.value) || 0)}
                  className="w-10 bg-slate-950 border border-white/10 rounded px-1 text-center font-mono text-white outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSelectAccountRange}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
                >
                  Chọn
                </button>
              </div>
            </div>

            {/* Right Table (Solid Red Header #ff2b54) */}
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto max-h-[420px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[480px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#ff2b54] text-white uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3 w-14 text-center">STT</th>
                      <th className="py-2.5 px-2 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllAccountsSelected}
                          onChange={handleToggleSelectAllAccounts}
                          className="rounded border-white/40 text-rose-700 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-white"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-28">Proxy id</th>
                      <th className="py-2.5 px-3 w-16 text-center">Avatar</th>
                      <th className="py-2.5 px-3 font-mono">User id</th>
                      <th className="py-2.5 px-4">Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Chưa có tài khoản nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((acc, idx) => {
                        const isSelected = selectedAccountIds.includes(acc.id);
                        return (
                          <tr
                            key={acc.id}
                            className={`transition-colors hover:bg-white/[0.04] ${
                              isSelected ? "bg-rose-500/[0.08]" : ""
                            }`}
                          >
                            {/* STT */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Checkbox */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOneAccount(acc.id)}
                                className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                              />
                            </td>

                            {/* Proxy ID */}
                            <td className="py-2.5 px-3 font-mono">
                              {acc.proxyId ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[11px] font-bold">
                                  <Link2 className="w-2.5 h-2.5" />
                                  {acc.proxyId}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">Chưa gán</span>
                              )}
                            </td>

                            {/* Avatar */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 mx-auto bg-slate-800">
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

                            {/* User ID */}
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              <span className="truncate max-w-[130px] block">{acc.userId}</span>
                            </td>

                            {/* Name */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                {renderPlatformIcon(acc.platform)}
                                <span className="font-semibold text-slate-100 truncate max-w-[160px]">
                                  {acc.name}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Assignment Mechanism Section (Matching Screenshot) */}
      <div className="bg-[#0b0e17]/95 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto text-xs">
          {/* Radio Options */}
          <div className="space-y-2.5 w-full">
            {/* Option 1 */}
            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer select-none">
              <input
                type="radio"
                name="proxy_mechanism"
                checked={assignMechanism === "mode1"}
                onChange={() => {
                  soundSynth.playSfx("pop");
                  setAssignMechanism("mode1");
                }}
                className="w-4 h-4 text-rose-600 accent-rose-500 cursor-pointer"
              />
              <span className="font-medium">
                Cơ chế 1: Tự động chia Proxy được chọn cho các tài khoản được chọn
              </span>
            </label>

            {/* Option 2 */}
            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer select-none">
              <input
                type="radio"
                name="proxy_mechanism"
                checked={assignMechanism === "mode2"}
                onChange={() => {
                  soundSynth.playSfx("pop");
                  setAssignMechanism("mode2");
                }}
                className="w-4 h-4 text-rose-600 accent-rose-500 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium">Cơ chế 2: Mỗi Proxy được chọn sẽ chia cho</span>
                <input
                  type="number"
                  min={1}
                  value={mode2AccountsPerProxy}
                  onChange={(e) => setMode2AccountsPerProxy(parseInt(e.target.value) || 1)}
                  disabled={assignMechanism !== "mode2"}
                  className="w-12 bg-slate-950 border border-white/15 rounded px-1.5 py-0.5 text-center font-mono text-white outline-none focus:border-rose-500 disabled:opacity-40"
                />
                <span className="font-medium">tài khoản được chọn</span>
              </div>
            </label>
          </div>

          {/* Red Apply Button (#ff2b54) */}
          <button
            onClick={handleApplyProxyAssignment}
            className="px-8 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold tracking-wide transition-all shadow-lg hover:shadow-rose-500/25 cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Áp Dụng</span>
          </button>
        </div>
      </div>

      {/* MODAL: Thêm Proxy */}
      {isAddProxyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-600/20 via-pink-600/10 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thêm Danh Sách Proxy</h3>
                  <p className="text-[11px] text-slate-400">Nạp Proxy HTTP/HTTPS hoặc SOCKS5 vào hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProxyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Protocol selection */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-300">Giao thức:</label>
                {(["http", "socks5"] as ProxyProtocol[]).map((proto) => (
                  <button
                    key={proto}
                    onClick={() => {
                      soundSynth.playSfx("pop");
                      setAddProtocol(proto);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      addProtocol === proto
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-900 text-slate-400 border border-white/10"
                    }`}
                  >
                    {proto}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Dán danh sách Proxy (Mỗi dòng 1 Proxy):
                  </label>
                  <button
                    onClick={handleInsertSampleProxies}
                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Nạp Proxy mẫu</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={rawProxyInput}
                  onChange={(e) => setRawProxyInput(e.target.value)}
                  placeholder={`IP:PORT
hoặc
IP:PORT:USER:PASS
Ví dụ:
103.149.28.12:8080:user01:pass123
14.161.45.89:3128`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-rose-500/50 outline-none resize-none shadow-inner"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <p>• Hỗ trợ định dạng: <code className="text-rose-300 font-mono">IP:PORT</code> hoặc <code className="text-rose-300 font-mono">IP:PORT:USER:PASS</code></p>
                <p>• Hệ thống sẽ tự động phân tách địa chỉ và kiểm tra trạng thái Live ngay khi áp dụng.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddProxyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAddProxies}
                className="px-5 py-2 rounded-xl bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Thêm Proxy Vào Danh Sách</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
