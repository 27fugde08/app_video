import React, { useState, useEffect } from "react";
import {
  Volume2,
  KeyRound,
  Sparkles,
  Minus,
  Square,
  X,
  Radio,
  Sliders,
  ShieldCheck
} from "lucide-react";
import { soundSynth } from "../../utils/audioUtils";
import { ipcClient } from "../../core/ipc/ipcClient";
import { GlobalSearchBar } from "../GlobalSearchBar";
import { TelemetryBar } from "../../features/telemetry/components/TelemetryBar";
import { DaemonStatusPill } from "./DaemonStatusPill";
import { useQueue } from "../../context/QueueContext";
import { APP_CONFIG } from "../../constants/appConfig";

interface WindowHeaderProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onOpenLicenseModal?: () => void;
  onOpenOtaModal?: () => void;
  licenseTier?: string;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenLicenseModal,
  onOpenOtaModal,
  licenseTier = APP_CONFIG.tier
}) => {
  const [isLiveSound, setIsLiveSound] = useState(true);
  const { toggleQueue } = useQueue();

  const toggleSound = () => {
    setIsLiveSound(!isLiveSound);
    if (!isLiveSound) {
      soundSynth.playSfx("pop");
    }
  };

  const handleWindowAction = (action: "minimize" | "maximize" | "close") => {
    soundSynth.playSfx("pop");
    ipcClient.sendWindowControl(action);
  };

  return (
    <header className="h-[44px] flex items-center justify-between px-3 sm:px-4 border-b border-[#282F44] bg-[#131722] sticky top-0 z-50 text-[#e0e0e0] select-none shadow-md">
      {/* Brand Identity & Global Search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl mr-3">
        {/* App Logo */}
        <div
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          onClick={() => {
            soundSynth.playSfx("pop");
            onSelectTab("dashboard");
          }}
          title="Về Dashboard Tổng Quan"
        >
          <div className="w-6 h-6 bg-gradient-to-tr from-[#06B6D4] to-[#7C3AED] rounded-[6px] shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform border border-white/15">
            <span className="text-white text-xs font-black">⚡</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-white group-hover:text-[#06B6D4] transition-colors font-mono">
              CREATOR<span className="text-[#06B6D4]">OS</span>
            </span>
            <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#1E2332] text-[#7C3AED] border border-[#7C3AED]/40 shadow-inner">
              #PRO_V48
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden sm:block">
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

      {/* Center Hardware Telemetry Bar */}
      <div className="hidden lg:flex items-center justify-center">
        <TelemetryBar activeTab={activeTab} onSelectTab={onSelectTab} />
      </div>

      {/* Right Controls & Window Caption */}
      <div className="flex items-center gap-2">
        {/* Core Daemon IPC Heartbeat Status Pill */}
        <DaemonStatusPill />

        {/* SFX Audio Toggle */}
        <button
          id="btn-toggle-sfx"
          onClick={toggleSound}
          title={isLiveSound ? "Tắt âm thanh tương tác" : "Bật âm thanh tương tác"}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
            isLiveSound
              ? "bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25"
              : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>

        {/* License DRM Trigger Badge */}
        {onOpenLicenseModal && (
          <button
            id="btn-nav-license-drm"
            onClick={() => {
              soundSynth.playSfx("pop");
              onOpenLicenseModal();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 via-violet-500/15 to-cyan-500/15 hover:from-amber-500/25 hover:to-cyan-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm cursor-pointer glow-amber"
            title="Quản lý bản quyền & Hardware Fingerprint"
          >
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span className="font-mono text-[11px]">{licenseTier}</span>
          </button>
        )}

        {/* Windows Caption Controls: Minimize, Maximize, Close */}
        <div className="flex items-center gap-0.5 ml-1.5 border-l border-white/10 pl-2">
          <button
            id="window-btn-minimize"
            onClick={() => handleWindowAction("minimize")}
            title="Thu nhỏ cửa sổ"
            className="w-8 h-7 flex items-center justify-center hover:bg-white/[0.08] rounded-md cursor-pointer transition-colors text-slate-400 hover:text-white"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            id="window-btn-maximize"
            onClick={() => handleWindowAction("maximize")}
            title="Phóng to cửa sổ"
            className="w-8 h-7 flex items-center justify-center hover:bg-white/[0.08] rounded-md cursor-pointer transition-colors text-slate-400 hover:text-white"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            id="window-btn-close"
            onClick={() => handleWindowAction("close")}
            title="Đóng ứng dụng"
            className="w-8 h-7 flex items-center justify-center hover:bg-[#e81123] rounded-md cursor-pointer transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
