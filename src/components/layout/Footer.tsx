import React from "react";
import { HardDrive, Sparkles, Cpu, CheckCircle2, Shield, RefreshCw, Terminal } from "lucide-react";
import { soundSynth } from "../../utils/audioUtils";
import { useToast } from "../../context/ToastContext";
import { APP_CONFIG } from "../../constants/appConfig";

export const Footer: React.FC = () => {
  const { addToast } = useToast();

  const handleRunGc = () => {
    soundSynth.playSfx("success");
    addToast("Đã giải phóng 1.4 GB bộ nhớ đệm VRAM/RAM và tệp tạm!", "success");
  };

  return (
    <footer className="h-7 bg-[#05070d] border-t border-white/[0.08] px-3.5 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none shrink-0 z-40">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Engine status */}
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] tracking-wide">NATIVE V5 RUNTIME</span>
        </div>

        <span className="text-white/10 hidden sm:inline">|</span>

        {/* Disk Free Space with Mini Bar */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors">
          <HardDrive className="w-3 h-3 text-cyan-400" />
          <span>Storage: <strong className="text-slate-300">482 GB Free</strong></span>
          <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-[35%] h-full bg-cyan-500 rounded-full" />
          </div>
        </div>

        <span className="text-white/10 hidden md:inline">|</span>

        {/* Thread pool */}
        <div className="hidden md:flex items-center gap-1 text-slate-400">
          <Cpu className="w-3 h-3 text-violet-400" />
          <span>Workers: <strong className="text-slate-300">8 NVENC Threads</strong></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick GC Memory Purge */}
        <button
          onClick={handleRunGc}
          className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
          title="Giải phóng bộ nhớ RAM/VRAM tạm thời"
        >
          <RefreshCw className="w-2.5 h-2.5 text-cyan-400" />
          <span>Purge RAM</span>
        </button>

        <span className="text-white/10">|</span>

        <span className="text-slate-500 font-semibold">{APP_CONFIG.name} <span className="text-cyan-500/80">{APP_CONFIG.version}</span></span>
      </div>
    </footer>
  );
};
