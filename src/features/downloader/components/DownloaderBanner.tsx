import React from "react";
import { Download, Sparkles, Zap, Globe2, ShieldCheck, Flame } from "lucide-react";
import { SUPPORTED_PLATFORMS } from "../../../constants/platforms";
import { soundSynth } from "../../../utils/audioUtils";

interface DownloaderBannerProps {
  selectedPlatform: string;
  onSelectPlatform: (platformId: string) => void;
}

export const DownloaderBanner: React.FC<DownloaderBannerProps> = ({
  selectedPlatform,
  onSelectPlatform
}) => {
  return (
    <div className="obsidian-card rounded-2xl p-4 sm:p-5 relative overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-violet-600/10 to-transparent blur-3xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
        {/* Title & Tagline */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 border border-white/20 shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                Batch Downloader Pro
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 glow-cyan">
                  TURBO V5.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Quét bóc tách & Tải video không watermark đa nền tảng với tăng tốc phần cứng Dual-NVENC
              </p>
            </div>
          </div>
        </div>

        {/* Feature quick badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-cyan-300 shadow-sm">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Lossless Zero-WM</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-purple-300 shadow-sm">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Auto MP3 320k</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-emerald-300 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Anti-Ban Tunnel</span>
          </div>
        </div>
      </div>

      {/* Platform Pill Bar */}
      <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => {
            soundSynth.playSfx("pop");
            onSelectPlatform("all");
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border ${
            selectedPlatform === "all"
              ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-cyan-400/40 shadow-md glow-cyan"
              : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
          }`}
        >
          Tất cả nền tảng ({SUPPORTED_PLATFORMS.length})
        </button>

        {SUPPORTED_PLATFORMS.map((plat) => {
          const isSelected = selectedPlatform === plat.id;
          return (
            <button
              key={plat.id}
              onClick={() => {
                soundSynth.playSfx("pop");
                onSelectPlatform(plat.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? "bg-violet-500/25 text-cyan-300 border-cyan-500/50 shadow-sm glow-purple"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200 border-white/[0.06]"
              }`}
            >
              <span className="font-semibold">{plat.name}</span>
              <span className="text-[10px] opacity-75 font-mono text-cyan-400/90 hidden sm:inline">
                ({plat.badge})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
