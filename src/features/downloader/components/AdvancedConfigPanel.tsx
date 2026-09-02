import React, { useState } from "react";
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  Folder,
  Scissors,
  Music,
  FileText,
  Zap,
  HelpCircle,
  Check
} from "lucide-react";
import { DownloaderConfig } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";

interface AdvancedConfigPanelProps {
  config: DownloaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<DownloaderConfig>>;
}

export const AdvancedConfigPanel: React.FC<AdvancedConfigPanelProps> = ({
  config,
  setConfig
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { addToast } = useToast();

  const toggleOpen = () => {
    soundSynth.playSfx("pop");
    setIsOpen(!isOpen);
  };

  const handleBrowseFolder = () => {
    soundSynth.playSfx("pop");
    addToast("Đã chọn thư mục: D:\\Downloads\\CreatorOS\\BatchVault", "info");
  };

  return (
    <div className="obsidian-card rounded-2xl border border-white/[0.08] overflow-hidden transition-all shadow-2xl">
      {/* Header Toggle */}
      <div
        onClick={toggleOpen}
        className="px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between cursor-pointer transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30 shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Cấu hình nâng cao & Tăng tốc tải
            </span>
            <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
              (Cookie, Proxy, Tách MP3, Tăng tốc NVENC, Thư mục lưu)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
            {config.removeWatermark ? "Clean-WM" : "Original"} • {config.extractMp3 ? "+MP3" : ""}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-white/[0.06] space-y-4 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Thư mục lưu */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Thư mục lưu trữ video & audio:</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.saveDirectory}
                  onChange={(e) => setConfig((prev) => ({ ...prev, saveDirectory: e.target.value }))}
                  className="flex-1 bg-[#05070d] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500/50 outline-none"
                />
                <button
                  onClick={handleBrowseFolder}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 font-semibold cursor-pointer shrink-0 transition-colors shadow-sm"
                >
                  Duyệt thư mục
                </button>
              </div>
            </div>

            {/* Field 2: Cookie Authentication Bypass */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cookie tài khoản (Douyin / TikTok):</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Bypass 1080p/2K</span>
              </label>
              <input
                type="text"
                value={config.cookieHeader}
                onChange={(e) => setConfig((prev) => ({ ...prev, cookieHeader: e.target.value }))}
                placeholder="passport_csrf_token=...; sessionid=..."
                className="w-full bg-[#05070d] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500/50 outline-none"
              />
            </div>

            {/* Field 3: Proxy Server Routing */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Proxy mạng (HTTP / SOCKS5):</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Xoay IP chống chặn</span>
              </label>
              <input
                type="text"
                value={config.proxyServer}
                onChange={(e) => setConfig((prev) => ({ ...prev, proxyServer: e.target.value }))}
                placeholder="http://127.0.0.1:7890"
                className="w-full bg-[#05070d] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500/50 outline-none"
              />
            </div>
          </div>

          {/* Quick Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Toggle 1: Xóa Watermark */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, removeWatermark: !prev.removeWatermark }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.removeWatermark
                  ? "bg-gradient-to-r from-rose-500/15 to-pink-500/15 border-rose-500/40 text-white glow-rose"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Scissors className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="font-bold text-xs">Xóa Watermark</div>
                  <div className="text-[10px] text-slate-400">Bóc tách video gốc sạch</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.removeWatermark
                    ? "bg-rose-500 text-white border-rose-400"
                    : "border-white/20"
                }`}
              >
                {config.removeWatermark && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 2: Trích xuất MP3 */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, extractMp3: !prev.extractMp3 }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.extractMp3
                  ? "bg-gradient-to-r from-purple-500/15 to-violet-500/15 border-purple-500/40 text-white glow-purple"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Music className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-bold text-xs">Trích xuất MP3</div>
                  <div className="text-[10px] text-slate-400">Tự demux audio 320k</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.extractMp3
                    ? "bg-purple-500 text-white border-purple-400"
                    : "border-white/20"
                }`}
              >
                {config.extractMp3 && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 3: Trích xuất Subtitle SRT */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, extractSubtitles: !prev.extractSubtitles }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.extractSubtitles
                  ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-emerald-500/40 text-white glow-emerald"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-bold text-xs">Tải Subtitle SRT</div>
                  <div className="text-[10px] text-slate-400">Trích xuất phụ đề gốc</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.extractSubtitles
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "border-white/20"
                }`}
              >
                {config.extractSubtitles && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 4: GPU NVENC Acceleration */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, gpuAcceleration: !prev.gpuAcceleration }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.gpuAcceleration
                  ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border-cyan-500/40 text-white glow-cyan"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-xs">Tăng tốc NVENC</div>
                  <div className="text-[10px] text-slate-400">Tải & ghép tệp phần cứng</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.gpuAcceleration
                    ? "bg-cyan-500 text-white border-cyan-400"
                    : "border-white/20"
                }`}
              >
                {config.gpuAcceleration && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
