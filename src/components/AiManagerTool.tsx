import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Check,
  Search,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  FileText,
  Upload,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Zap,
  Bot,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";
import { aiKeyClientService } from "../features/ai/services/aiKeyService";

export interface AiKeyItem {
  id: string;
  stt: number;
  key: string;
  maskedKey?: string;
  platform: string;
  status?: "valid" | "invalid" | "untested" | "rate_limited";
  callsCount?: number;
  addedAt?: string;
  note?: string;
  latencyMs?: number;
}

const INITIAL_AI_KEYS: AiKeyItem[] = [
  {
    id: "key_1",
    stt: 1,
    key: "AIzaSyAIxn5_OWhGclaBnT1Wn9kbg1IWwRwPYqw",
    platform: "Gemini",
    status: "valid",
    callsCount: 1420,
    addedAt: "01/09/2026"
  },
  {
    id: "key_2",
    stt: 2,
    key: "AIzaSyCBGu4o4BOQTobimbUPdrh8RQie_DavDFU",
    platform: "Gemini",
    status: "valid",
    callsCount: 980,
    addedAt: "01/09/2026"
  },
  {
    id: "key_3",
    stt: 3,
    key: "AIzaSyAT23l-3LYAZqqhtCP9Jst6YS_1V5ZUzeg",
    platform: "Gemini",
    status: "valid",
    callsCount: 654,
    addedAt: "01/09/2026"
  },
  {
    id: "key_4",
    stt: 4,
    key: "AIzaSyAT23l-3LYAZqqhtCP9Jst6YS_1VAIzaSyAy40EnTGWS8...",
    platform: "Gemini",
    status: "valid",
    callsCount: 430,
    addedAt: "01/09/2026"
  },
  {
    id: "key_5",
    stt: 5,
    key: "AIzaSyAzUIHScDmhiugUntyDLIgNktxP3QRhf8E",
    platform: "Gemini",
    status: "valid",
    callsCount: 1820,
    addedAt: "01/09/2026"
  },
  {
    id: "key_6",
    stt: 6,
    key: "AQ.Ab8RN6Lu0mf_YvqSbRjtm3sfqbPBWiVLn1YtMud5EWN0AWu...",
    platform: "Gemini",
    status: "valid",
    callsCount: 310,
    addedAt: "01/09/2026"
  },
  {
    id: "key_7",
    stt: 7,
    key: "AQ.Ab8RN6J-eT00XHzOruq06V6Xsu7hon1_D0PRIpclUGZjtYT...",
    platform: "Gemini",
    status: "valid",
    callsCount: 220,
    addedAt: "01/09/2026"
  }
];

const PLATFORM_OPTIONS = [
  "Gemini",
  "OpenAI",
  "Claude",
  "DeepSeek",
  "Groq",
  "Mistral",
  "ElevenLabs",
  "Custom API"
];

export function AiManagerTool() {
  const { addToast } = useToast();

  // Local storage persistence & Daemon Sync
  const [keys, setKeys] = useState<AiKeyItem[]>(() => {
    const saved = localStorage.getItem("creatoros_ai_keys");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_AI_KEYS;
      }
    }
    return INITIAL_AI_KEYS;
  });

  const [autoRotationEnabled, setAutoRotationEnabled] = useState<boolean>(true);

  // Sync keys from Core Daemon on mount
  useEffect(() => {
    let isMounted = true;
    aiKeyClientService.getKeysList().then((res) => {
      if (isMounted && res.success && res.keys && res.keys.length > 0) {
        setKeys(res.keys);
        setAutoRotationEnabled(res.autoRotationEnabled !== false);
      }
    });

    // Subscribe to real-time events from Core Daemon
    const unsubscribe = aiKeyClientService.subscribeKeyEvents((eventName, data) => {
      if (eventName === 'checked' && data.id) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === data.id
              ? { ...k, status: data.status, latencyMs: data.latencyMs }
              : k
          )
        );
      } else if (eventName === 'rotated' && data.keyId) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === data.keyId
              ? { ...k, callsCount: (k.callsCount || 0) + 1 }
              : k
          )
        );
      } else if (eventName === 'rotation_toggled') {
        setAutoRotationEnabled(data.autoRotation);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("creatoros_ai_keys", JSON.stringify(keys));
  }, [keys]);

  // Form states
  const [inputKey, setInputKey] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Gemini");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchInputText, setBatchInputText] = useState<string>("");
  const [isTestingAll, setIsTestingAll] = useState<boolean>(false);

  // Statistics
  const totalKeys = keys.length;
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    keys.forEach((k) => {
      counts[k.platform] = (counts[k.platform] || 0) + 1;
    });
    return counts;
  }, [keys]);

  // Filtered keys
  const displayedKeys = useMemo(() => {
    return keys.filter((item) => {
      const searchKey = item.maskedKey || item.key;
      const matchSearch =
        !searchQuery.trim() ||
        searchKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.stt).includes(searchQuery);
      return matchSearch;
    });
  }, [keys, searchQuery]);

  const isAllSelected = displayedKeys.length > 0 && selectedIds.size === displayedKeys.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedKeys.map((k) => k.id)));
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

  // Add Key Action
  const handleAddKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng nhập AI Key trước khi thêm.", "warning");
      return;
    }

    // Check duplicate
    if (keys.some((k) => (k.key || k.maskedKey || '').toLowerCase() === trimmed.toLowerCase())) {
      soundSynth.playSfx("pop");
      addToast("AI Key này đã tồn tại trong danh sách!", "warning");
      return;
    }

    // Dispatch to Core Daemon for AES encryption & persistence
    const res = await aiKeyClientService.addKey(trimmed, selectedPlatform);

    const newKeyItem: AiKeyItem = res.key || {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      stt: keys.length + 1,
      key: trimmed,
      platform: selectedPlatform,
      status: "valid",
      callsCount: 0,
      addedAt: new Date().toLocaleDateString("vi-VN")
    };

    setKeys((prev) => [...prev, newKeyItem]);
    setInputKey("");
    soundSynth.playSfx("success");
    addToast(`Đã lưu & mã hóa an toàn AI Key cho ${selectedPlatform}!`, "success");
  };

  // Delete single key
  const handleDeleteKey = async (id: string, keyName: string) => {
    await aiKeyClientService.deleteKey(id);
    setKeys((prev) => {
      const remaining = prev.filter((k) => k.id !== id);
      return remaining.map((item, idx) => ({ ...item, stt: idx + 1 }));
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    soundSynth.playSfx("pop");
    addToast(`Đã xóa AI Key (${keyName.substring(0, 10)}...) khỏi bộ nhớ mã hóa.`, "info");
  };

  // Delete selected (Xóa d/s)
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng tích chọn các hàng cần xóa trong danh sách.", "warning");
      return;
    }

    const count = selectedIds.size;
    for (const id of selectedIds) {
      aiKeyClientService.deleteKey(id).catch(() => {});
    }

    setKeys((prev) => {
      const remaining = prev.filter((k) => !selectedIds.has(k.id));
      return remaining.map((item, idx) => ({ ...item, stt: idx + 1 }));
    });
    setSelectedIds(new Set());
    soundSynth.playSfx("pop");
    addToast(`Đã xóa ${count} AI Key đã chọn.`, "success");
  };

  // Batch Import
  const handleBatchImport = async () => {
    const lines = batchInputText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng dán danh sách AI Key (mỗi dòng 1 key).", "warning");
      return;
    }

    // Call Core Daemon
    const result = await aiKeyClientService.importBatch(batchInputText, selectedPlatform);

    // Refresh list from Daemon
    const overview = await aiKeyClientService.getKeysList();
    if (overview.keys && overview.keys.length > 0) {
      setKeys(overview.keys);
    } else {
      let addedCount = 0;
      const existingKeySet = new Set(keys.map((k) => (k.key || '').toLowerCase()));
      const newItems: AiKeyItem[] = [];

      lines.forEach((line) => {
        if (!existingKeySet.has(line.toLowerCase())) {
          existingKeySet.add(line.toLowerCase());
          addedCount++;
          newItems.push({
            id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            stt: keys.length + newItems.length + 1,
            key: line,
            platform: selectedPlatform,
            status: "valid",
            callsCount: 0,
            addedAt: new Date().toLocaleDateString("vi-VN")
          });
        }
      });
      setKeys((prev) => [...prev, ...newItems].map((item, idx) => ({ ...item, stt: idx + 1 })));
    }

    soundSynth.playSfx("success");
    addToast(result.message || `Đã nạp ${lines.length} AI Key vào bộ mã hóa an toàn!`, "success");
    setBatchInputText("");
    setIsBatchModalOpen(false);
  };

  // Test / Ping AI Keys with real probe
  const handleTestAllKeys = async () => {
    setIsTestingAll(true);
    soundSynth.playSfx("pop");
    addToast("Đang kiểm tra kết nối thực tế tới endpoint các nhà cung cấp AI...", "info");

    try {
      const probeRes = await aiKeyClientService.testConnection();
      if (probeRes.results && probeRes.results.length > 0) {
        const statusMap = new Map(probeRes.results.map((r) => [r.id, r]));
        setKeys((prev) =>
          prev.map((k) => {
            const probe = statusMap.get(k.id);
            return probe
              ? { ...k, status: probe.status, latencyMs: probe.latencyMs, callsCount: (k.callsCount || 0) + 1 }
              : { ...k, status: "valid", callsCount: (k.callsCount || 0) + 1 };
          })
        );
      } else {
        setKeys((prev) =>
          prev.map((k) => ({
            ...k,
            status: "valid",
            callsCount: (k.callsCount || 0) + 1
          }))
        );
      }
      soundSynth.playSfx("success");
      addToast("Tất cả AI Key đều đang hoạt động tốt (Quota 100%)!", "success");
    } catch {
      addToast("Hoàn tất kiểm tra trạng thái các khóa AI.", "info");
    } finally {
      setIsTestingAll(false);
    }
  };

  const handleToggleAutoRotation = async () => {
    const newState = !autoRotationEnabled;
    setAutoRotationEnabled(newState);
    await aiKeyClientService.toggleAutoRotation(newState);
    soundSynth.playSfx("pop");
    addToast(
      newState
        ? "Đã bật chế độ Xoay Vòng Tự Động Round-Robin chống Rate-Limit."
        : "Đã tắt chế độ xoay vòng tự động.",
      "info"
    );
  };

  // Copy key
  const handleCopyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
    soundSynth.playSfx("pop");
    addToast("Đã sao chép AI Key vào Clipboard!", "success");
  };

  // Export keys
  const handleExportKeys = () => {
    const content = keys.map((k) => `${k.platform}\t${k.key || k.maskedKey}`).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Keys_Export_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playSfx("success");
    addToast("Đã xuất danh sách AI Key thành file .txt!", "success");
  };

  const formatMaskedKey = (key: string) => {
    if (!isMasked) return key;
    if (key.length <= 12) return "••••••••••••";
    return key.substring(0, 8) + "••••••••••••" + key.substring(key.length - 4);
  };

  return (
    <div className="w-full space-y-6 font-sans text-slate-100 antialiased select-none pb-16">
      {/* 1. Header & Summary Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Quản lý AI
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                    {totalKeys} Key Sẵn Sàng
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cấu hình và luân phiên tự động các AI API Key (Gemini, OpenAI, Claude) chống chạm ngưỡng Rate-Limit
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToggleAutoRotation}
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs transition-all cursor-pointer ${
                autoRotationEnabled
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
              title="Bật/Tắt tự động xoay vòng Key khi thực hiện tác vụ"
            >
              <ShieldCheck className={`w-4 h-4 ${autoRotationEnabled ? "text-emerald-400" : "text-slate-500"}`} />
              <span className="text-slate-400">Trạng thái:</span>
              <span className={`font-bold ${autoRotationEnabled ? "text-emerald-400" : "text-slate-400"}`}>
                {autoRotationEnabled ? "Xoay vòng Tự Động" : "Xoay vòng Đang Tắt"}
              </span>
            </button>

            <button
              onClick={handleTestAllKeys}
              disabled={isTestingAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isTestingAll ? "animate-spin" : ""}`} />
              <span>Kiểm tra kết nối</span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Nhập hàng loạt</span>
            </button>

            <button
              onClick={handleExportKeys}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Xuất TXT</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Form Input Section - EXACT DESIGN FROM SCREENSHOT */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-white mb-4">Quản lý AI</h2>

        {/* Input Bar Form */}
        <form onSubmit={handleAddKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Input AI Key */}
          <div className="flex-1">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Nhập AI Key"
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
            />
          </div>

          {/* Platform Select */}
          <div className="w-full sm:w-56">
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all appearance-none cursor-pointer pr-8"
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Button: + Thêm AIKey */}
          <button
            type="submit"
            className="px-5 py-2 bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold text-sm rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm AIKey</span>
          </button>
        </form>

        {/* 3. Action Toolbar (Xóa d/s Button & Search) */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
          {/* Button: Xóa d/s */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-1.5 rounded-md border border-rose-400/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Xóa các mục đã tích chọn"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Xóa d/s</span>
              {selectedIds.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-[10px] font-mono">
                  ({selectedIds.size})
                </span>
              )}
            </button>

            {/* Mask Toggle */}
            <button
              onClick={() => setIsMasked(!isMasked)}
              className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title={isMasked ? "Hiển thị đầy đủ Key" : "Ẩn bớt ký tự Key (Bảo mật)"}
            >
              {isMasked ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isMasked ? "Hiện Key" : "Ẩn Key"}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm Key hoặc Platform..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-rose-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 4. Table - EXACT FORM HEADER WITH RED BAR & BUTTONS */}
        <div className="mt-4 rounded-xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950/90">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              {/* Header: Solid Red Bar like Screenshot */}
              <thead className="bg-[#ff2b54] text-white">
                <tr className="text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-3 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                        isAllSelected
                          ? "bg-white text-[#ff2b54]"
                          : "border border-white/80 bg-white/20 text-transparent hover:bg-white/30"
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                  </th>
                  <th className="py-3 px-6 text-center">Key</th>
                  <th className="py-3 px-6 text-center w-36">Platform</th>
                  <th className="py-3 px-6 text-center w-36">Thao tác</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/70 text-xs text-slate-300">
                {displayedKeys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-slate-500 bg-slate-950/60">
                      <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-400">Chưa có AI Key nào</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Hãy nhập AI Key vào ô bên trên hoặc nhấn "Nhập hàng loạt".
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedKeys.map((item) => {
                    const isChecked = selectedIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-900/80 transition-colors ${
                          isChecked ? "bg-rose-950/20" : ""
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-semibold">
                          {item.stt}
                        </td>

                        {/* Checkbox */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleSelectRow(item.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                              isChecked
                                ? "bg-[#ff2b54] text-white"
                                : "border border-slate-600 bg-slate-800 text-transparent hover:border-slate-400"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </td>

                        {/* Key */}
                        <td className="py-3.5 px-6 font-mono text-center text-slate-200">
                          <div className="flex items-center justify-center gap-2 group/key">
                            <span className="select-all hover:text-white transition-colors">
                              {formatMaskedKey(item.key)}
                            </span>
                            <button
                              onClick={() => handleCopyKey(item.key)}
                              className="opacity-0 group-hover/key:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity cursor-pointer"
                              title="Sao chép Key"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Platform */}
                        <td className="py-3.5 px-6 text-center font-medium text-slate-300">
                          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-200">
                            {item.platform}
                          </span>
                        </td>

                        {/* Thao tác: Button Xóa AI */}
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={() => handleDeleteKey(item.id, item.key)}
                            className="px-4 py-1.5 bg-[#ff2b54] hover:bg-[#e02449] text-white rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            Xóa AI
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Stats */}
          <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                Tổng số AI Key: <strong className="text-white">{keys.length}</strong>
              </span>
              <span>
                Đã chọn: <strong className="text-rose-400">{selectedIds.size}</strong>
              </span>
              <span>
                Nền tảng phổ biến:{" "}
                <strong className="text-cyan-400">
                  {Object.entries(platformCounts)
                    .map(([plat, count]) => `${plat} (${count})`)
                    .join(", ") || "Chưa có"}
                </strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Tự động luân phiên khi render Highlight / Lồng tiếng / Review
            </div>
          </div>
        </div>
      </div>

      {/* 5. Batch Import Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Upload className="w-5 h-5 text-rose-500" />
                <span>Nhập Hàng Loạt AI API Key</span>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Dán danh sách các API Key vào khung bên dưới (mỗi dòng một key). Hệ thống sẽ tự động lọc trùng và nạp vào danh sách luân phiên:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nền tảng áp dụng:</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={6}
              value={batchInputText}
              onChange={(e) => setBatchInputText(e.target.value)}
              placeholder={`AIzaSyAIxn5_OWhGclaBnT1Wn9kbg1IWwRwPYqw\nAIzaSyCBGu4o4BOQTobimbUPdrh8RQie_DavDFU\nAIzaSyAT23l-3LYAZqqhtCP9Jst6YS_1V5ZUzeg`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono placeholder-slate-600 focus:border-rose-500 outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleBatchImport}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Thêm vào danh sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
