import React, { useState } from "react";
import {
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Settings,
  PanelLeftClose,
  PanelLeftOpen
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    soundSynth.playSfx("pop");
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside 
      className={`${
        isCollapsed ? "w-[60px]" : "w-[240px]"
      } transition-all duration-200 bg-[#131722] border-r border-[#282F44] flex flex-col justify-between select-none overflow-hidden shrink-0 z-20`}
    >
      {/* Sidebar Control Bar */}
      <div className="h-9 px-3 border-b border-[#282F44] flex items-center justify-between text-xs">
        {!isCollapsed && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] font-mono">
            WORKSPACE MODULES
          </span>
        )}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? "Mở rộng sidebar (240px)" : "Thu gọn sidebar (60px)"}
          className="p-1 rounded hover:bg-[#1E2332] text-[#94A3B8] hover:text-white transition-colors cursor-pointer ml-auto"
        >
          {isCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5 text-[#06B6D4]" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 custom-scrollbar">
        {NAVIGATION_CATEGORIES.map((category, catIdx) => (
          <div key={catIdx} className="space-y-0.5">
            {/* Category Header */}
            {!isCollapsed ? (
              <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B] font-mono">
                  {category.title}
                </span>
                <span className="text-[9px] text-[#64748B] font-mono px-1 py-0.2 rounded bg-[#0B0D13]">
                  {category.items.length}
                </span>
              </div>
            ) : (
              <div className="h-2 border-b border-[#282F44]/50 my-1 mx-2" />
            )}

            {/* Menu Items */}
            <div className="space-y-0.5">
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
                    title={isCollapsed ? `${item.label} (${item.sublabel})` : undefined}
                    className={`w-full group relative flex items-center ${
                      isCollapsed ? "justify-center px-1" : "justify-between px-2.5"
                    } py-1.5 rounded-[6px] text-left transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-[#7C3AED]/20 text-white border border-[#7C3AED]/50 shadow-sm"
                        : "text-[#94A3B8] hover:text-white hover:bg-[#1E2332] border border-transparent"
                    }`}
                  >
                    {/* Left Active Glow Indicator Line */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#06B6D4] rounded-r-full shadow-sm shadow-[#06B6D4]/50"></div>
                    )}

                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-[#7C3AED]/30 text-[#06B6D4]"
                            : "bg-[#0B0D13] text-[#94A3B8] group-hover:text-white"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {!isCollapsed && (
                        <div className="min-w-0">
                          <span
                            className={`text-[11px] block font-semibold truncate tracking-tight ${
                              isActive ? "text-white font-bold" : "text-slate-300 group-hover:text-white"
                            }`}
                          >
                            {item.label}
                          </span>
                          <p className="text-[9px] text-[#64748B] truncate leading-tight group-hover:text-[#94A3B8]">
                            {item.sublabel}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Badge */}
                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded border shrink-0 ${
                          item.badgeColor || "bg-[#1E2332] text-[#94A3B8] border-[#282F44]"
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
      <div className="p-2 border-t border-[#282F44] bg-[#0B0D13]">
        {!isCollapsed ? (
          <div
            onClick={() => {
              soundSynth.playSfx("pop");
              if (onOpenLicenseModal) onOpenLicenseModal();
            }}
            className="p-2 rounded-[6px] bg-[#131722] border border-[#282F44] hover:border-[#7C3AED]/50 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-[4px] bg-[#1E2332] border border-[#282F44] flex items-center justify-center text-amber-300">
                  <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200 group-hover:text-white">
                    CreatorOS Pro
                  </h4>
                  <p className="text-[9px] text-[#7C3AED] font-mono font-semibold">
                    #PRO_V48 • Lifetime
                  </p>
                </div>
              </div>
              <span className="text-[8px] px-1 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-mono font-bold border border-[#10B981]/40">
                ACTIVE
              </span>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                soundSynth.playSfx("pop");
                onSelectTab("csharp-wpf");
              }}
              className="w-full flex items-center justify-between text-[9px] text-[#94A3B8] hover:text-white pt-1.5 border-t border-[#282F44]"
            >
              <span className="flex items-center gap-1">
                <Settings className="w-2.5 h-2.5" />
                Cài Đặt &amp; XAML Studio
              </span>
              <ChevronRight className="w-2.5 h-2.5 text-[#64748B]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                if (onOpenLicenseModal) onOpenLicenseModal();
              }}
              title="CreatorOS Pro (#PRO_V48 Lifetime)"
              className="w-7 h-7 rounded-[4px] bg-[#131722] border border-[#282F44] hover:border-[#10B981] flex items-center justify-center cursor-pointer text-[#10B981]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
