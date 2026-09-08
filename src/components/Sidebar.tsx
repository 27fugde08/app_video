import React from "react";
import {
  Download,
  Clapperboard,
  Key
} from "lucide-react";
import { ActiveTab } from "../contracts/system.types";
import { soundSynth } from "../utils/audioUtils";
import { useQueue } from "../context/QueueContext";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  licenseTier?: string;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navGroups: NavGroup[] = [
    {
      groupTitle: "SẢN XUẤT NỘI DUNG",
      items: [
        {
          id: "batch-downloader",
          label: "Batch Downloader Pro",
          sublabel: "Quét & tải video đa nền tảng tốc độ cao",
          icon: Download,
          badge: "Turbo V5",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        },
        {
          id: "translate",
          label: "Dịch & Lồng Tiếng AI",
          sublabel: "Đồng bộ môi, Voice Clone & SEO Meta",
          icon: Clapperboard,
          badge: "Global",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
      ],
    },
    {
      groupTitle: "HỆ THỐNG",
      items: [
        {
          id: "settings",
          label: "Cài Đặt & API Key",
          sublabel: "Gemini API Key, Endpoint & NVENC",
          icon: Key,
          badge: "Vault",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col p-3 gap-3 h-[calc(100vh-3rem)] select-none shrink-0 overflow-y-auto z-10">
      <div className="space-y-5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-1">
              {group.groupTitle}
            </p>
            <nav className="flex flex-col gap-1">
              {group.items.map((item) => {
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                      isActive
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium shadow-lg shadow-blue-500/10"
                        : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? "text-blue-400 scale-110" : "text-white/50 group-hover:text-white group-hover:scale-105"}`} />
                      <div className="truncate">
                        <div className="text-xs font-medium truncate leading-tight">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-white/40 truncate mt-0.5">
                          {item.sublabel}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                          item.badgeColor || "bg-white/5 text-white/60 border-white/10"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Pro License card */}
      <div className="mt-auto pt-2 space-y-2">
        <div className="p-3.5 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-white">CreatorOS Studio Pro</p>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">LIFETIME</span>
          </div>
          <p className="text-[10px] text-white/50 mb-2.5 font-mono">NVENC 4K Hardware Active</p>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 w-full h-full shadow-[0_0_8px_#34d399]"></div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-white/40 mt-1.5 font-mono">
            <span>PIPELINE: OPTIMAL</span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
