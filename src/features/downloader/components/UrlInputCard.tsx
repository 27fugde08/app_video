import React from "react";
import {
  Link2,
  Play,
  Trash2,
  Download,
  Clipboard,
  Sparkles,
  RefreshCw,
  Layers,
  FileText
} from "lucide-react";
import { soundSynth } from "../../../utils/audioUtils";

interface UrlInputCardProps {
  rawUrlInput: string;
  setRawUrlInput: (val: string) => void;
  detectedCount: number;
  isScanning: boolean;
  isDownloading: boolean;
  selectedCount: number;
  totalQueueCount: number;
  onStartScan: () => void;
  onDownloadSelected: () => void;
  onClearQueue: () => void;
}

export const UrlInputCard: React.FC<UrlInputCardProps> = ({
  rawUrlInput,
  setRawUrlInput,
  detectedCount,
  isScanning,
  isDownloading,
  selectedCount,
  totalQueueCount,
  onStartScan,
  onDownloadSelected,
  onClearQueue
}) => {
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawUrlInput(rawUrlInput ? `${rawUrlInput}\n${text}` : text);
        soundSynth.playSfx("pop");
      }
    } catch (e) {
      console.warn("Clipboard access denied", e);
    }
  };

  const handleInsertDemoUrls = () => {
    const demo = [
      "https://www.tiktok.com/@creator/video/730372860995515653",
      "https://www.douyin.com/video/7345678912345678901",
      "https://www.facebook.com/reel/1423859201582910",
      "https://www.youtube.com/shorts/3fM4pU8qW4Y"
    ].join("\n");
    setRawUrlInput(demo);
    soundSynth.playSfx("pop");
  };

  return (
    <div className="obsidian-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3.5 shadow-2xl">
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
              Mỗi dòng một liên kết (Hỗ trợ TikTok, Douyin, Facebook Reels, YouTube Shorts/Videos)
            </p>
          </div>
        </div>

        {/* Quick helper buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePasteClipboard}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Dán từ bộ nhớ tạm"
          >
            <Clipboard className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Dán Clipboard</span>
          </button>

          <button
            onClick={handleInsertDemoUrls}
            className="px-2.5 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Nạp liên kết mẫu 4 nền tảng"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="hidden sm:inline">Mẫu thử</span>
          </button>

          {rawUrlInput && (
            <button
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

      {/* Multi-line URL Textarea */}
      <div className="relative">
        <textarea
          value={rawUrlInput}
          onChange={(e) => setRawUrlInput(e.target.value)}
          placeholder={`Dán danh sách liên kết vào đây (mỗi link 1 dòng)...
Ví dụ:
https://www.tiktok.com/@creator/video/730372860995515653
https://www.douyin.com/video/7345678912345678901
https://www.facebook.com/reel/1423859201582910
https://www.youtube.com/shorts/3fM4pU8qW4Y`}
          rows={4}
          className="w-full bg-[#05070d]/95 border border-white/10 rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all resize-y min-h-[95px] shadow-inner"
        />

        {/* Counter Badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-md bg-[#0a0d16]/95 border border-white/15 text-[10px] font-mono text-cyan-300 shadow-md">
          Đã nhận diện: <strong>{detectedCount}</strong> link
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Button 1: Bắt đầu quét */}
          <button
            onClick={onStartScan}
            disabled={isScanning || detectedCount === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isScanning || detectedCount === 0
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
            {detectedCount > 0 && !isScanning && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono text-[10px]">
                {detectedCount}
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
        </div>

        {/* Button 3: Xóa hàng đợi */}
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
