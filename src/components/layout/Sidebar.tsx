import React from "react";
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  ChevronRight,
  HardDrive,
  RefreshCw
} from "lucide-react";
import { ActiveTab } from "../../../shared/types";
import { NAVIGATION_CATEGORIES } from "../../constants/navigation";
import { soundSynth } from "../../utils/audioUtils";
import { APP_CONFIG } from "../../constants/appConfig";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenLicenseModal?: () => void;
  onOpenOtaModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenLicenseModal,
  onOpenOtaModal
}) => {
  return (
    <aside className="w-72 bg-[#060810]/98 border-r border-white/[0.08] flex flex-col justify-between select-none overflow-hidden shrink-0 shadow-2xl backdrop-blur-xl z-20">
      {/* Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
        {NAVIGATION_CATEGORIES.map((category, catIdx) => (
          <div key={catIdx} className="space-y-1">
            {/* Category Header */}
            <div className="px-2.5 pt-2 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                {category.title}
              </span>
              <span className="text-[10px] text-slate-600 font-mono px-1.5 py-0.2 rounded bg-white/[0.03]">
                {category.items.length}
              </span>
            </div>

            {/* Menu Items */}
            <div className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-item-${item.id}`}
                    onClick={() => {
                      soundSynth.playSfx("pop");
                      onSelectTab(item.id);
                    }}
                    className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-violet-600/25 via-indigo-600/20 to-transparent text-white border border-violet-500/45 shadow-sm glow-purple"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    {/* Left Active Glow Indicator Line */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-cyan-400 to-violet-500 rounded-r-full shadow-sm shadow-cyan-400/50"></div>
                    )}

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-cyan-300 shadow-inner border border-violet-500/30"
                            : "bg-white/[0.04] text-slate-400 group-hover:text-slate-200 group-hover:bg-white/[0.08]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate tracking-tight ${
                              isActive ? "text-white font-bold" : "text-slate-300 group-hover:text-white"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate leading-tight group-hover:text-slate-400">
                          {item.sublabel}
                        </p>
                      </div>
                    </div>

                    {/* Right Badge */}
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${
                          item.badgeColor || "bg-white/5 text-slate-400 border-white/10"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Enterprise DRM License Card at Bottom */}
      <div className="p-3 border-t border-white/[0.08] bg-[#05060b]/90">
        <div
          onClick={() => {
            soundSynth.playSfx("pop");
            if (onOpenLicenseModal) onOpenLicenseModal();
          }}
          className="p-3 rounded-xl bg-gradient-to-br from-violet-950/30 via-slate-900/90 to-[#0c0f18] border border-violet-500/30 hover:border-violet-500/60 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500/20 to-violet-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white">
                  CreatorOS Enterprise
                </h4>
                <p className="text-[10px] text-amber-400 font-mono font-semibold">
                  {APP_CONFIG.tier} • Lifetime
                </p>
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
              ACTIVE
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-mono space-y-0.5 border-t border-white/5 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Chủ sở hữu:</span>
              <span className="text-slate-200 truncate max-w-[130px] font-medium">Thanh Đắc Lộc</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hardware ID:</span>
              <span className="text-cyan-400 font-bold">CR-F89A-4B21</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GPU Engine:</span>
              <span className="text-slate-300">Dual-NVENC RTX</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
