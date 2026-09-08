import React, { useState, useMemo } from "react";
import {
  Link2,
  Play,
  Trash2,
  Download,
  Clipboard,
  Sparkles,
  RefreshCw,
  Layers,
  FileText,
  Upload,
  Mic,
  Zap,
  FolderSearch,
  Filter,
  CheckCircle2,
  Sparkle
} from "lucide-react";
import { soundSynth } from "../../../utils/audioUtils";
import { detectPlatform, sanitizeAndCleanUrls } from "../services/downloaderService";
import { useToast } from "../../../context/ToastContext";

interface UrlInputCardProps {
  rawUrlInput: string;
  setRawUrlInput: (val: string) => void;
  detectedCount: number;
  isScanning: boolean;
  isDownloading: boolean;
  selectedCount: number;
  totalQueueCount: number;
  saveDirectory?: string;
  onOpenFolderPicker?: () => void;
  onStartScan: () => void;
  onDownloadSelected: () => void;
  onDownloadAndDubPipeline?: () => void;
  onClearQueue: () => void;
  onLoadMockTestData?: () => void;
}

export const UrlInputCard: React.FC<UrlInputCardProps> = ({
  rawUrlInput,
  setRawUrlInput,
  detectedCount,
  isScanning,
  isDownloading,
  selectedCount,
  totalQueueCount,
  saveDirectory,
  onOpenFolderPicker,
  onStartScan,
  onDownloadSelected,
  onDownloadAndDubPipeline,
  onClearQueue,
  onLoadMockTestData
}) => {
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const { addToast } = useToast();

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawUrlInput(rawUrlInput ? `${rawUrlInput}\n${text}` : text);
        soundSynth.playSfx("pop");
        addToast("Đã dán liên kết từ bộ nhớ tạm", "info");
      }
    } catch (e) {
      console.warn("Clipboard access denied", e);
    }
  };

  const handleCleanTrackingUrls = () => {
    soundSynth.playSfx("pop");
    const cleaned = sanitizeAndCleanUrls(rawUrlInput);
    if (cleaned.length > 0) {
      setRawUrlInput(cleaned.join("\n"));
      addToast(`Đã dọn sạch tracking params cho ${cleaned.length} liên kết`, "success");
    }
  };

  const handleDeduplicateUrls = () => {
    soundSynth.playSfx("pop");
    const lines = rawUrlInput.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const unique = Array.from(new Set(lines));
    const duplicatesRemoved = lines.length - unique.length;
    setRawUrlInput(unique.join("\n"));
    if (duplicatesRemoved > 0) {
      addToast(`Đã loại bỏ ${duplicatesRemoved} liên kết bị trùng lặp`, "success");
    } else {
      addToast("Không có liên kết nào bị trùng lặp", "info");
    }
  };

  const handleInsertDemoUrls = () => {
    const demo = [
      "https://www.tiktok.com/@creator/video/730372860995515653?utm_source=share",
      "https://www.douyin.com/video/7345678912345678901",
      "https://www.youtube.com/shorts/3fM4pU8qW4Y?si=tracking123",
      "https://www.facebook.com/reel/1423859201582910?fbclid=IwAR0",
      "https://www.instagram.com/reel/C123456789/?igsh=tracking",
      "https://www.xiaohongshu.com/explore/64f0123456789"
    ].join("\n");
    setRawUrlInput(demo);
    soundSynth.playSfx("pop");
    addToast("Đã nạp danh sách 6 nền tảng mẫu (TikTok, Douyin, YT, FB, Insta, XHS)", "info");
  };

  // Live breakdown of platforms in input text
  const platformBreakdown = useMemo(() => {
    if (!rawUrlInput.trim()) return [];
    const lines = rawUrlInput.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l.length > 5);
    const counts: Record<string, number> = {};
    for (const line of lines) {
      const p = detectPlatform(line);
      counts[p] = (counts[p] || 0) + 1;
    }
    return Object.entries(counts).map(([platform, count]) => ({ platform, count }));
  }, [rawUrlInput]);


  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".txt") || file.name.endsWith(".csv") || file.type.includes("text")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            setRawUrlInput(rawUrlInput ? `${rawUrlInput}\n${content}` : content);
            soundSynth.playSfx("success");
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawUrlInput(rawUrlInput ? `${rawUrlInput}\n${content}` : content);
          soundSynth.playSfx("success");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="obsidian-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3.5 shadow-2xl">
      {/* Save Folder Quick Access Banner */}
      {saveDirectory && (
        <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs text-cyan-200 gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] shrink-0">Thư Mục Lưu Tệp</span>
            <span className="font-mono text-cyan-100 truncate">{saveDirectory}</span>
          </div>
          {onOpenFolderPicker && (
            <button
              type="button"
              onClick={() => {
                soundSynth.playSfx("pop");
                onOpenFolderPicker();
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow transition-all active:scale-95"
            >
              <FolderSearch className="w-3.5 h-3.5 text-cyan-100" />
              <span>Đổi Thư Mục OS</span>
            </button>
          )}
        </div>
      )}

      {/* Header of Input Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30 shrink-0">
            <Link2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Danh sách URL video cần quét
            </h3>
            <p className="text-[11px] text-slate-400">
              Mỗi dòng một liên kết (Dán URL hoặc Kéo Thả File .TXT/.CSV vào khung bên dưới)
            </p>
          </div>
        </div>

        {/* Quick helper buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
            <Upload className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Nạp File</span>
            <input type="file" accept=".txt,.csv" onChange={handleFileInputChange} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handlePasteClipboard}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Dán từ bộ nhớ tạm"
          >
            <Clipboard className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Dán Clipboard</span>
          </button>

          <button
            type="button"
            onClick={handleCleanTrackingUrls}
            disabled={!rawUrlInput.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Dọn sạch tracking query strings (?utm_source, &fbclid, &si, &igsh...)"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Dọn Tracking</span>
          </button>

          <button
            type="button"
            onClick={handleDeduplicateUrls}
            disabled={!rawUrlInput.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Loại bỏ các link trùng lặp trong ô nhập"
          >
            <Filter className="w-3 h-3 text-blue-400" />
            <span>Lọc Trùng</span>
          </button>

          <button
            type="button"
            onClick={handleInsertDemoUrls}
            className="px-2.5 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Nạp liên kết mẫu 6 nền tảng"
          >
            <Sparkle className="w-3 h-3 text-violet-400" />
            <span className="hidden sm:inline">Mẫu link</span>
          </button>

          {onLoadMockTestData && (
            <button
              type="button"
              onClick={onLoadMockTestData}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Nạp dữ liệu mẫu 6 trạng thái để kiểm thử toàn diện luồng xử lý Frontend ↔ Backend"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>🧪 Test Luồng</span>
            </button>
          )}

          {rawUrlInput && (
            <button
              type="button"
              onClick={() => {
                setRawUrlInput("");
                soundSynth.playSfx("pop");
              }}
              className="px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Xóa ô nhập
            </button>
          )}
        </div>
      </div>

      {/* Live Platform Breakdown Pills */}
      {platformBreakdown.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] py-1 border-t border-b border-white/[0.04]">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            Phân loại phát hiện:
          </span>
          {platformBreakdown.map((item) => (
            <span
              key={item.platform}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-200 font-mono font-bold flex items-center gap-1"
            >
              <span className="capitalize">{item.platform}:</span>
              <strong className="text-cyan-300">{item.count}</strong>
            </span>
          ))}
        </div>
      )}


      {/* Multi-line URL Textarea with Drag & Drop */}
      <div 
        className="relative"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={handleFileDrop}
      >
        <textarea
          value={rawUrlInput}
          onChange={(e) => setRawUrlInput(e.target.value)}
          placeholder={`Dán danh sách liên kết vào đây (hoặc kéo thả tệp .TXT/.CSV trực tiếp vào đây)...
Ví dụ:
https://www.tiktok.com/@creator/video/730372860995515653
https://www.douyin.com/video/7345678912345678901
https://www.facebook.com/reel/1423859201582910
https://www.youtube.com/shorts/3fM4pU8qW4Y`}
          rows={4}
          className={`w-full bg-[#05070d]/95 border rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none transition-all resize-y min-h-[95px] shadow-inner ${
            isDraggingFile
              ? "border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-950/40"
              : "border-white/10 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
          }`}
        />

        {isDraggingFile && (
          <div className="absolute inset-0 bg-cyan-950/80 border-2 border-dashed border-cyan-400 rounded-xl flex items-center justify-center gap-2 text-cyan-200 font-bold text-xs pointer-events-none z-10">
            <Upload className="w-5 h-5 animate-bounce text-cyan-400" />
            <span>Thả tệp .TXT / .CSV vào đây để tự động nạp danh sách URL</span>
          </div>
        )}

        {/* Counter Badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-md bg-[#0a0d16]/95 border border-white/15 text-[10px] font-mono text-cyan-300 shadow-md">
          Đã nhận diện: <strong>{detectedCount}</strong> link
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Button 1: Bắt đầu quét */}
          <button
            onClick={onStartScan}
            disabled={isScanning || (detectedCount === 0 && !rawUrlInput.trim())}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isScanning || (detectedCount === 0 && !rawUrlInput.trim())
                ? "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border border-cyan-400/40 glow-cyan active:scale-95"
            }`}
          >
            {isScanning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current text-white" />
            )}
            <span>{isScanning ? "Đang bóc tách metadata..." : "Bắt đầu quét"}</span>
            {Math.max(detectedCount, rawUrlInput.trim() ? 1 : 0) > 0 && !isScanning && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono text-[10px]">
                {detectedCount || 1}
              </span>
            )}
          </button>

          {/* Button 2: Tải đã chọn */}
          <button
            onClick={onDownloadSelected}
            disabled={isDownloading || totalQueueCount === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isDownloading || totalQueueCount === 0
                ? "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 glow-emerald active:scale-95"
            }`}
          >
            {isDownloading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white" />
            )}
            <span>
              {isDownloading ? "Đang tải video..." : selectedCount > 0 ? `Tải đã chọn (${selectedCount})` : "Tải tất cả hàng đợi"}
            </span>
          </button>

          {/* Button 3: 1-Click Pipeline: Tải & Tự Động Nạp Sang Dịch Lồng Tiếng AI */}
          {onDownloadAndDubPipeline && (
            <button
              onClick={onDownloadAndDubPipeline}
              disabled={isDownloading || totalQueueCount === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isDownloading || totalQueueCount === 0
                  ? "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white border border-amber-400/40 glow-purple active:scale-95"
              }`}
              title="Tải video và nạp thẳng sang Studio Dịch Lồng Tiếng AI trong 1 bước"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>⚡ Tải & Nạp Sang Lồng Tiếng AI</span>
            </button>
          )}
        </div>

        {/* Button 4: Xóa hàng đợi */}
        <button
          onClick={onClearQueue}
          disabled={totalQueueCount === 0 || isDownloading}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            totalQueueCount === 0 || isDownloading
              ? "bg-transparent text-slate-600 border-transparent cursor-not-allowed"
              : "bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border-white/10 hover:border-rose-500/30"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa Hàng Đợi</span>
        </button>
      </div>
    </div>
  );
};

