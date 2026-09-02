import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Radio,
  Cpu,
  Globe,
  Bell,
  Layers,
  Terminal,
  Activity,
  Flame,
  Volume2,
  ShieldCheck,
  UserCheck,
  ListOrdered,
  RefreshCw,
  Code2,
  KeyRound,
  Download,
  Minus,
  Square,
  X
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useQueue } from "../context/QueueContext";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface HardwareMetrics {
  cpu: number;
  ram: {
    total: number;
    used: number;
    percent: number;
  };
  gpus: Array<{
    name: string;
    vramTotal: number;
    vramUsed: number;
    vramPercent: number;
    utilization: number;
  }>;
  vramAlert?: {
    triggered: boolean;
    gpuName: string;
    percent: number;
    threshold: number;
  } | null;
}

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onOpenLicenseModal?: () => void;
  onOpenOtaModal?: () => void;
  licenseTier?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenLicenseModal,
  onOpenOtaModal,
  licenseTier = "PRO_V48"
}) => {
  const [isLiveSound, setIsLiveSound] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [hwMetrics, setHwMetrics] = useState<HardwareMetrics | null>(null);
  const { stats, toggleQueue, isQueueOpen, backendStatus } = useQueue();

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.onHardwareMetrics) {
      const unsubscribe = electronAPI.onHardwareMetrics((data: HardwareMetrics) => {
        setHwMetrics(data);
      });
      return () => {
        unsubscribe();
      };
    } else {
      // Browser fallback simulation loop
      const interval = setInterval(() => {
        const simCpu = Math.floor(Math.random() * 12) + 18; // 18-30%
        const simRamPercent = 38;
        const simVramPercent = Math.floor(Math.random() * 8) + 32;
        setHwMetrics({
          cpu: simCpu,
          ram: {
            total: 16,
            used: 6.1,
            percent: simRamPercent
          },
          gpus: [
            {
              name: "NVIDIA GeForce RTX 4070 (Native NVENC)",
              vramTotal: 12288,
              vramUsed: Math.round(12288 * (simVramPercent / 100)),
              vramPercent: simVramPercent,
              utilization: Math.floor(Math.random() * 20) + 12
            }
          ]
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    setIsLiveSound(!isLiveSound);
    if (!isLiveSound) {
      soundSynth.playSfx("pop");
    }
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-50 text-[#e0e0e0] select-none">
      {/* Brand Identity & Global Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl mr-4">
        <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => onSelectTab("dashboard")}>
          <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-md shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide uppercase opacity-90 text-white">
              Creator<span className="text-blue-400">OS</span>
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              PRO v5.0
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md">
          <GlobalSearchBar
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            onOpenQueue={toggleQueue}
            onOpenOtaModal={onOpenOtaModal}
            onOpenLicenseModal={onOpenLicenseModal}
            onToggleSound={toggleSound}
          />
        </div>
      </div>

      {/* Center Status Badges */}
      <div className="hidden lg:flex items-center gap-2.5">
        {/* Python Core WebSocket Real-time Connection Health Badge */}
        <ConnectionStatusBadge wsUrl="ws://127.0.0.1:8765" />

        {/* Real-time Hardware telemetry (CPU) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>CPU: {hwMetrics?.cpu || 24}%</span>
        </div>

        {/* Real-time Hardware telemetry (RAM) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-slate-300">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span>RAM: {hwMetrics?.ram?.percent || 38}%</span>
        </div>

        {/* Real-time Hardware telemetry (GPU / VRAM) */}
        {hwMetrics?.gpus && hwMetrics.gpus.map((gpu, idx) => {
          const isAlert = gpu.vramPercent >= 92 || hwMetrics?.vramAlert?.triggered;
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                isAlert 
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse" 
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
              title={`${gpu.name}: ${gpu.vramUsed}MB / ${gpu.vramTotal}MB (${gpu.utilization}% Load)`}
            >
              <Zap className={`w-3.5 h-3.5 ${isAlert ? "text-rose-400 animate-bounce" : "text-amber-400"}`} />
              <span>VRAM: {gpu.vramPercent}%</span>
              {isAlert && <span className="text-[9px] px-1 py-0.2 rounded bg-rose-600 text-white font-extrabold uppercase ml-1 animate-pulse">OVERLOAD</span>}
            </div>
          );
        })}

        {/* C# WPF Studio Navigation Button */}
        <button
          id="btn-nav-csharp-wpf"
          onClick={() => {
            soundSynth.playSfx("pop");
            onSelectTab("csharp-wpf");
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            activeTab === "csharp-wpf"
              ? "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
          }`}
          title="Kiến trúc & mã nguồn C# .NET 9 WPF"
        >
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden xl:inline">C# WPF Studio</span>
        </button>

        {/* Global Task Queue Status Quick Badge */}
        <button
          id="btn-queue-header-status"
          onClick={toggleQueue}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            stats.processing > 0
              ? "bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
          }`}
          title="Xem hàng đợi tác vụ nền"
        >
          {stats.processing > 0 ? (
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
          ) : (
            <ListOrdered className="w-3 h-3 text-slate-400" />
          )}
          <span className="text-xs font-medium">
            Queue: <strong className={stats.processing > 0 ? "text-blue-300" : "text-slate-300"}>{stats.processing} running</strong>
          </span>
        </button>
      </div>

      {/* Right Controls & Windows Window Buttons */}
      <div className="flex items-center gap-2">
        {/* SFX Toggle */}
        <button
          id="btn-toggle-sfx"
          onClick={toggleSound}
          title={isLiveSound ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
          className={`w-7 h-7 flex items-center justify-center rounded border transition-all cursor-pointer ${
            isLiveSound
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>

        {/* License DRM Trigger Badge */}
        {onOpenLicenseModal && (
          <button
            id="btn-nav-license-drm"
            onClick={onOpenLicenseModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-blue-500/20 hover:from-amber-500/30 hover:to-blue-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Quản lý bản quyền & Hardware Fingerprint"
          >
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span>{licenseTier || "PRO v5.0"}</span>
          </button>
        )}

        {/* Windows Caption Controls: Minimize, Maximize, Close */}
        <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
          <div
            id="window-btn-minimize"
            onClick={() => soundSynth.playSfx("pop")}
            title="Minimize"
            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded cursor-pointer transition-colors text-slate-400 hover:text-white"
          >
            <span className="text-base leading-none">−</span>
          </div>
          <div
            id="window-btn-maximize"
            onClick={() => soundSynth.playSfx("pop")}
            title="Maximize"
            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded cursor-pointer transition-colors text-slate-400 hover:text-white"
          >
            <span className="text-[10px] leading-none">▢</span>
          </div>
          <div
            id="window-btn-close"
            onClick={() => soundSynth.playSfx("pop")}
            title="Close"
            className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/80 rounded cursor-pointer transition-colors text-slate-400 hover:text-white"
          >
            <span className="text-sm leading-none">×</span>
          </div>
        </div>
      </div>
    </header>
  );
};

