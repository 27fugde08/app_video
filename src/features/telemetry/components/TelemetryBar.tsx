import React, { useState } from "react";
import { Cpu, Activity, Zap, RefreshCw, ListOrdered, Trash2 } from "lucide-react";
import { useTelemetry } from "../hooks/useTelemetry";
import { useQueue } from "../../../context/QueueContext";
import { soundSynth } from "../../../utils/audioUtils";

interface TelemetryBarProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({ activeTab, onSelectTab }) => {
  const { metrics } = useTelemetry();
  const { stats, toggleQueue } = useQueue();
  const [isPurging, setIsPurging] = useState(false);

  const gpu = metrics.gpus[0];
  const isVramAlert = (gpu && gpu.vramPercent >= 92) || metrics.vramAlert?.triggered;

  const handlePurgeRam = () => {
    if (isPurging) return;
    setIsPurging(true);
    soundSynth.playSfx("pop");

    setTimeout(() => {
      setIsPurging(false);
      soundSynth.playSfx("pop");
    }, 600);
  };

  return (
    <div className="hidden lg:flex items-center gap-1.5">
      {/* CPU Gauge with Mini Progress Bar */}
      <div 
        className="flex items-center gap-1.5 px-2 py-1 bg-[#1E2332] border border-[#282F44] rounded-[6px] text-xs font-mono text-slate-300 hover:border-[#06B6D4]/50 transition-colors shadow-inner"
        title={`CPU Load: ${metrics.cpu}% across ${metrics.activeThreads} Threads`}
      >
        <Cpu className="w-3.5 h-3.5 text-[#06B6D4]" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#94A3B8]">CPU</span>
          <strong className="text-white font-bold text-[11px]">{metrics.cpu}%</strong>
          <div className="w-7 h-1.5 bg-[#0B0D13] rounded-full overflow-hidden hidden xl:block">
            <div 
              className="h-full bg-[#06B6D4] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.cpu)}%` }}
            />
          </div>
        </div>
      </div>

      {/* RAM Gauge with Mini Progress Bar */}
      <div 
        className="flex items-center gap-1.5 px-2 py-1 bg-[#1E2332] border border-[#282F44] rounded-[6px] text-xs font-mono text-slate-300 hover:border-[#7C3AED]/50 transition-colors shadow-inner"
        title={`RAM Allocation: ${metrics.ram.used} GB / ${metrics.ram.total} GB (${metrics.ram.percent}%)`}
      >
        <Activity className="w-3.5 h-3.5 text-[#7C3AED]" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#94A3B8]">RAM</span>
          <strong className="text-white font-bold text-[11px]">{Math.round(metrics.ram.used * 1024)} MB</strong>
          <div className="w-7 h-1.5 bg-[#0B0D13] rounded-full overflow-hidden hidden xl:block">
            <div 
              className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.ram.percent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* GPU / VRAM Telemetry */}
      {gpu && (
        <div 
          onClick={() => {
            soundSynth.playSfx("pop");
            window.dispatchEvent(new CustomEvent("creatoros:open_gpu_modal"));
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-mono border transition-all shadow-inner cursor-pointer hover:scale-[1.02] active:scale-95 ${
            isVramAlert 
              ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] animate-pulse" 
              : "bg-[#1E2332] border-[#282F44] text-slate-300 hover:border-[#10B981]/60 hover:text-emerald-300"
          }`}
          title={`${gpu.name}: ${gpu.vramUsed}MB / ${gpu.vramTotal}MB (${gpu.utilization}% Engine Load). Nhấp để mở Benchmark GPU.`}
        >
          <Zap className={`w-3.5 h-3.5 ${isVramAlert ? "text-[#EF4444]" : "text-[#10B981]"}`} />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#94A3B8]">VRAM</span>
            <strong className={isVramAlert ? "text-[#EF4444] font-bold text-[11px]" : "text-white font-bold text-[11px]"}>{gpu.vramPercent}%</strong>
            <div className="w-7 h-1.5 bg-[#0B0D13] rounded-full overflow-hidden hidden xl:block">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${isVramAlert ? "bg-[#EF4444]" : gpu.vramPercent > 80 ? "bg-[#F59E0B]" : "bg-[#10B981]"}`}
                style={{ width: `${Math.min(100, gpu.vramPercent)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active NVENC Workers Indicator */}
      <div 
        className="hidden xl:flex items-center gap-1 px-2 py-1 bg-[#1E2332] border border-[#282F44] rounded-[6px] text-xs font-mono text-[#F59E0B]"
        title="Active NVENC Sessions: 2 / 3 Workers allocated (Preset p6 HQ)"
      >
        <span className="text-[10px] text-[#94A3B8]">NVENC:</span>
        <strong className="text-[#F59E0B] font-bold text-[11px]">2/3 Active</strong>
      </div>

      {/* Purge RAM Button */}
      <button
        id="btn-purge-ram"
        onClick={handlePurgeRam}
        disabled={isPurging}
        className={`flex items-center gap-1 px-2 py-1 rounded-[6px] border text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm ${
          isPurging 
            ? "bg-[#7C3AED]/30 border-[#7C3AED] text-[#7C3AED] animate-pulse"
            : "bg-[#1E2332] border-[#282F44] text-[#7C3AED] hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/60"
        }`}
        title="Dọn dẹp rác L2 GC Compacting & EmptyWorkingSet tức thì"
      >
        <Trash2 className={`w-3 h-3 ${isPurging ? "animate-spin" : ""}`} />
        <span className="hidden 2xl:inline">{isPurging ? "Compacting..." : "Purge RAM"}</span>
      </button>

      {/* Global Task Queue Status Quick Badge */}
      <button
        id="btn-queue-header-status"
        onClick={() => {
          soundSynth.playSfx("pop");
          toggleQueue();
        }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-[6px] border transition-all cursor-pointer shadow-sm ${
          stats.processing > 0
            ? "bg-[#06B6D4]/20 border-[#06B6D4]/50 text-[#06B6D4]"
            : "bg-[#1E2332] border-[#282F44] text-slate-400 hover:text-slate-200"
        }`}
        title="Xem hàng đợi tác vụ nền"
      >
        {stats.processing > 0 ? (
          <RefreshCw className="w-3 h-3 text-[#06B6D4] animate-spin" />
        ) : (
          <ListOrdered className="w-3 h-3 text-slate-400" />
        )}
        <span className="text-[11px] font-medium font-mono">
          Queue: <strong className={stats.processing > 0 ? "text-[#06B6D4] font-bold" : "text-slate-300"}>{stats.processing}</strong>
        </span>
      </button>
    </div>
  );
};
