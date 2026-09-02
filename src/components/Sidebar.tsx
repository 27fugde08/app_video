import React from "react";
import {
  Scissors,
  Clapperboard,
  Languages,
  Film,
  Mic,
  Search,
  Download,
  BookOpen,
  Smartphone,
  Share2,
  LayoutDashboard,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Bot,
  ListOrdered,
  RefreshCw,
  Code2,
  GitBranch,
  Layers,
  Network,
  Activity,
  Cpu,
  FolderOpen
} from "lucide-react";
import { ActiveTab } from "../../shared/types";
import { soundSynth } from "../utils/audioUtils";
import { useQueue } from "../context/QueueContext";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
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
  const { stats, toggleQueue, isQueueOpen } = useQueue();

  const navGroups: NavGroup[] = [
    {
      groupTitle: "NATIVE & ORCHESTRATION",
      items: [
        {
          id: "csharp-wpf",
          label: "C# & WPF Studio",
          sublabel: "Kiến trúc .NET 9 & XAML",
          icon: Code2,
          badge: ".NET 9",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
        {
          id: "workflow",
          label: "Visual Workflow Builder",
          sublabel: "Kéo thả DAG & Topological",
          icon: GitBranch,
          badge: "PRO v5.0",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
        {
          id: "lan-cluster",
          label: "Cụm Render LAN Cluster",
          sublabel: "Master-Worker & Chunk Segments",
          icon: Network,
          badge: "v5.0 Next",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        },
        {
          id: "lipsync",
          label: "Local AI Lip-Sync Studio",
          sublabel: "TensorRT & ONNX Khẩu Hình",
          icon: Activity,
          badge: "GPU",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
        {
          id: "presets",
          label: "Quản Lý Blueprint & Presets",
          sublabel: "SQLite WAL .creatoros",
          icon: Layers,
          badge: "Offline",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        },
        {
          id: "orchestrator",
          label: "Unified Pipeline DAG",
          sublabel: "Master State Machine & NVMe",
          icon: GitBranch,
          badge: "NVENC",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
      ],
    },
    {
      groupTitle: "TÁC VỤ VIDEO",
      items: [
        {
          id: "highlight",
          label: "AI Highlight & Script",
          sublabel: "Tìm cảnh hay & tự viết lời",
          icon: Scissors,
          badge: "Viral 98%",
          badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        },
        {
          id: "review",
          label: "AI Review & Recap",
          sublabel: "Mọi chủ đề đa ngôn ngữ",
          icon: Clapperboard,
        },
        {
          id: "translate",
          label: "Dịch Thuật Video (1-Click)",
          sublabel: "Bỏ video vào là DONE",
          icon: Languages,
          badge: "Auto Dub",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
        {
          id: "semi-edit",
          label: "Edit Bán Content YTB",
          sublabel: "Split-screen, khử bản quyền",
          icon: Film,
          badge: "No-Strike",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        },
        {
          id: "voice-local",
          label: "Voice Local Không Tốn Phí",
          sublabel: "All ngôn ngữ chạy 0đ",
          icon: Mic,
          badge: "0đ",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
        {
          id: "ai-comic",
          label: "Truyện AI Đồng Bộ 100%",
          sublabel: "Giữ nguyên khuôn mặt nhân vật",
          icon: BookOpen,
          badge: "Consistent",
          badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        },
        {
          id: "seo-suite",
          label: "Viết Nội Dung & SEO, Thumbnail",
          sublabel: "Phân tích kênh chuyên sâu",
          icon: Search,
          badge: "CTR 18%",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
        {
          id: "batch-downloader",
          label: "Download Hàng Loạt",
          sublabel: "Tốc độ video/s đa nền tảng",
          icon: Download,
          badge: "Turbo",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        },
        {
          id: "downloaded-videos",
          label: "Danh Sách Video Đã Quét",
          sublabel: "Quản lý thư mục & video đã tải",
          icon: FolderOpen,
          badge: "Local",
          badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        },
      ],
    },
    {
      groupTitle: "AUTOMATION & QUẢN TRỊ",
      items: [
        {
          id: "phone-farm",
          label: "Điều Khiển Phone Beta",
          sublabel: "Nuôi nick, sync ADB, bypass",
          icon: Smartphone,
          badge: "BETA",
          badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        },
        {
          id: "fb-suite",
          label: "Bộ Tool Facebook Reels",
          sublabel: "Highlight, dịch, reup, đăng bài",
          icon: Share2,
        },
        {
          id: "dashboard",
          label: "Dash Quản Trị Đa Nền Tảng",
          sublabel: "Doanh thu, RPM, bot pipeline",
          icon: LayoutDashboard,
        },
        {
          id: "api-docs",
          label: "REST API & Webhooks",
          sublabel: "Swagger test, cURL, Python SDK",
          icon: Code2,
          badge: "REST 4.8",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
        {
          id: "user-guide",
          label: "Hướng Dẫn Sử Dụng",
          sublabel: "Sổ tay v5.0, FAQs & Tips",
          icon: BookOpen,
          badge: "DOCS",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col p-3 gap-3 h-[calc(100vh-3rem)] select-none shrink-0 overflow-y-auto z-10">
      <div className="space-y-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-1">
              {group.groupTitle}
            </p>
            <nav className="flex flex-col gap-0.5">
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-200 group cursor-pointer ${
                      isActive
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium"
                        : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? "text-blue-400 scale-110" : "text-white/50 group-hover:text-white group-hover:scale-105"}`} />
                      <div className="truncate">
                        <div className="text-xs font-medium truncate leading-tight">
                          {item.label}
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

      {/* Bottom Pro License card with Immersive Design theme styling */}
      <div className="mt-auto pt-2 space-y-2">
        <div className="p-3.5 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-white">Pro Enterprise License</p>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">LIFETIME</span>
          </div>
          <p className="text-[10px] text-white/50 mb-2.5 font-mono">ID: CR-PRO-V50-F89A</p>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 w-3/4 h-full shadow-[0_0_8px_#3b82f6]"></div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-white/40 mt-1.5 font-mono">
            <span>NVENC STREAMS: 2/2</span>
            <span className="text-emerald-400 font-semibold">OPTIMAL</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

