import React from "react";
import { Cpu, Activity, Zap, RefreshCw, ListOrdered, Radio, Code2 } from "lucide-react";
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

  const gpu = metrics.gpus[0];
  const isVramAlert = (gpu && gpu.vramPercent >= 92) || metrics.vramAlert?.triggered;

  return (
    <div className="hidden lg:flex items-center gap-2">
      {/* WS Core Connection Status */}
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs font-mono text-emerald-300 shadow-sm"
        title="Python IPC FastEngine Connected (127.0.0.1:8765)"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-bold text-[10px] tracking-wider">CORE: ONLINE</span>
      </div>

      {/* CPU Gauge with Mini Progress Bar */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1 bg-[#090c15] border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:border-cyan-500/40 transition-colors shadow-inner"
        title={`CPU Load: ${metrics.cpu}% across ${metrics.activeThreads} Threads`}
      >
        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">CPU</span>
          <strong className="text-white font-bold">{metrics.cpu}%</strong>
          <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden xl:block">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.cpu)}%` }}
            />
          </div>
        </div>
      </div>

      {/* RAM Gauge with Mini Progress Bar */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1 bg-[#090c15] border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:border-purple-500/40 transition-colors shadow-inner"
        title={`RAM Allocation: ${metrics.ram.used} GB / ${metrics.ram.total} GB (${metrics.ram.percent}%)`}
      >
        <Activity className="w-3.5 h-3.5 text-purple-400" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">RAM</span>
          <strong className="text-white font-bold">{metrics.ram.percent}%</strong>
          <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden xl:block">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-300"
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
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all shadow-inner cursor-pointer hover:scale-105 active:scale-95 ${
            isVramAlert 
              ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse glow-rose" 
              : "bg-[#090c15] border-white/10 text-slate-300 hover:border-purple-500/60 hover:text-purple-300"
          }`}
          title={`${gpu.name}: ${gpu.vramUsed}MB / ${gpu.vramTotal}MB (${gpu.utilization}% Engine Load, ${gpu.temperature}°C). Nhấp để mở Trung tâm Thuật toán & Benchmark GPU.`}
        >
          <Zap className={`w-3.5 h-3.5 ${isVramAlert ? "text-rose-400" : "text-amber-400"}`} />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">VRAM</span>
            <strong className={isVramAlert ? "text-rose-300 font-bold" : "text-white font-bold"}>{gpu.vramPercent}%</strong>
            <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden xl:block">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${isVramAlert ? "bg-rose-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`}
                style={{ width: `${Math.min(100, gpu.vramPercent)}%` }}
              />
            </div>
          </div>
          {isVramAlert && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-600 text-white font-extrabold uppercase ml-1 animate-pulse">
              ALERT
            </span>
          )}
        </div>
      )}

      {/* C# WPF Studio Navigation Quick Badge */}
      <button
        id="btn-nav-csharp-wpf"
        onClick={() => {
          soundSynth.playSfx("pop");
          onSelectTab("csharp-wpf");
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
          activeTab === "csharp-wpf"
            ? "bg-gradient-to-r from-violet-600/30 to-blue-600/30 text-violet-200 border-violet-500/50 shadow-sm glow-purple"
            : "bg-[#090c15] hover:bg-slate-800 text-slate-300 border-white/10 hover:border-violet-500/30"
        }`}
        title="Kiến trúc & mã nguồn C# .NET 9 WPF"
      >
        <Code2 className="w-3.5 h-3.5 text-violet-400" />
        <span className="hidden xl:inline">C# Studio</span>
      </button>

      {/* Global Task Queue Status Quick Badge */}
      <button
        id="btn-queue-header-status"
        onClick={() => {
          soundSynth.playSfx("pop");
          toggleQueue();
        }}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-sm ${
          stats.processing > 0
            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 glow-cyan"
            : "bg-[#090c15] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
        }`}
        title="Xem hàng đợi tác vụ nền"
      >
        {stats.processing > 0 ? (
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
        ) : (
          <ListOrdered className="w-3 h-3 text-slate-400" />
        )}
        <span className="text-xs font-medium font-mono">
          Queue: <strong className={stats.processing > 0 ? "text-cyan-300 font-bold" : "text-slate-300"}>{stats.processing}</strong>
        </span>
      </button>
    </div>
  );
};
