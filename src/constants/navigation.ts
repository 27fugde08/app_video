import {
  Film,
  Scissors,
  Clapperboard,
  Sparkles,
  Layers,
  Server,
  Mic2,
  Volume2,
  TrendingUp,
  Download,
  FolderOpen,
  BookOpen,
  Smartphone,
  Share2,
  Cpu,
  Radio,
  FileCode,
  Sliders,
  Terminal,
  Activity,
  Code2,
  Key,
  UserCheck,
  Globe,
  Clock,
  Calendar,
  Flag,
  Music2
} from "lucide-react";
import { ActiveTab } from "../../shared/types";

export interface NavSubItem {
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  isNew?: boolean;
}

export interface NavCategory {
  title: string;
  description: string;
  items: NavSubItem[];
}

export const NAVIGATION_CATEGORIES: NavCategory[] = [
  {
    title: "Video & Editing AI",
    description: "Công cụ cắt ghép & AI thông minh",
    items: [
      {
        id: "batch-downloader",
        label: "Batch Downloader Pro",
        sublabel: "Quét & tải video đa nền tảng tốc độ cao",
        icon: Download,
        badge: "Turbo V5",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        isNew: true
      },
      {
        id: "downloaded-videos",
        label: "Danh Sách Video Đã Quét",
        sublabel: "Quản lý thư mục & video cục bộ",
        icon: FolderOpen,
        badge: "Local",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30"
      },
      {
        id: "semi-edit",
        label: "Studio Edit Bán Content",
        sublabel: "Timeline 3 lớp & Chống bản quyền",
        icon: Scissors,
        badge: "Pro Core",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30"
      },
      {
        id: "highlight",
        label: "AI Highlight & Hook Script",
        sublabel: "Trích xuất đoạn cao trào & Viral",
        icon: Sparkles,
        badge: "AI 2.5",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30"
      },
      {
        id: "translate",
        label: "Dịch & Lồng Tiếng Video",
        sublabel: "Đồng bộ khẩu hình Lip-Sync",
        icon: Clapperboard,
        badge: "Global",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      },
      {
        id: "review",
        label: "Tóm Tắt Phim & Review 3 Hồi",
        sublabel: "Kịch bản tự động kèm B-Roll",
        icon: Film,
        badge: "Cinema",
        badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30"
      },
      {
        id: "ai-comic",
        label: "AI Video Truyện Tranh",
        sublabel: "Tạo ảnh & Video motion manga",
        icon: BookOpen,
        badge: "Gen AI",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
      }
    ]
  },
  {
    title: "Audio & Sáng Tạo",
    description: "Xử lý âm thanh & Giọng nói AI",
    items: [
      {
        id: "voice-local",
        label: "Giọng Đọc AI & Clone Offline",
        sublabel: "Kokoro TTS & F5-TTS Lossless",
        icon: Mic2,
        badge: "0ms GPU",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
      },
      {
        id: "lipsync",
        label: "Lip-Sync Wav2Lip Studio",
        sublabel: "Đồng bộ môi độ trễ thấp",
        icon: Volume2,
        badge: "RTX NVENC",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30"
      }
    ]
  },
  {
    title: "SEO & Kênh Chuyên Sâu",
    description: "Tối ưu hóa tìm kiếm & Viral",
    items: [
      {
        id: "seo-suite",
        label: "Bộ Công Cụ SEO & Meta Viral",
        sublabel: "Tiêu đề, Hashtag, Thumbnail prompt",
        icon: TrendingUp,
        badge: "Rank 1",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      },
      {
        id: "dashboard",
        label: "Dashboard Tổng Quan Studio",
        sublabel: "Chỉ số doanh thu & Kênh nội dung",
        icon: Activity,
        badge: "Analytics",
        badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30"
      }
    ]
  },
  {
    title: "Automation & Quản Trị",
    description: "Tự động hóa & Cụm máy trạm",
    items: [
      {
        id: "account-manager",
        label: "Quản lý tài khoản",
        sublabel: "Profile Browser, Cookie & Đồng bộ đa nền tảng",
        icon: UserCheck,
        badge: "Multi Profile",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        isNew: true
      },
      {
        id: "proxy-manager",
        label: "Quản lý Proxy",
        sublabel: "Gán Proxy, Check Live & Phân phối tài khoản",
        icon: Globe,
        badge: "Network Pool",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        isNew: true
      },
      {
        id: "post-schedule",
        label: "Lịch trình đăng bài",
        sublabel: "Theo dõi, sao chép & quản lý hàng đợi đăng bài",
        icon: Clock,
        badge: "Schedule",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        isNew: true
      },
      {
        id: "bulk-scheduler",
        label: "Lên lịch hàng loạt",
        sublabel: "Phân bổ theo chu kỳ, gán video & hẹn giờ đa kênh",
        icon: Calendar,
        badge: "Batch Planner",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        isNew: true
      },
      {
        id: "fanpage-reels",
        label: "Đăng reels Fanpage",
        sublabel: "Auto đăng Reels, phân phối video, AI caption & lịch",
        icon: Flag,
        badge: "Reels Auto",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        isNew: true
      },
      {
        id: "tiktok-post",
        label: "Đăng Tiktok",
        sublabel: "Auto đăng TikTok, bypass bản quyền, Chrome & AI",
        icon: Music2,
        badge: "TikTok Auto",
        badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        isNew: true
      },
      {
        id: "ai-manager",
        label: "Quản lý AI",
        sublabel: "Quản lý API Key & Phân tải đa nền tảng",
        icon: Key,
        badge: "API Key",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        isNew: true
      },
      {
        id: "workflow-builder",
        label: "Quy Trình Tự Động Hóa (DAG)",
        sublabel: "Workflow visual kéo thả",
        icon: Layers,
        badge: "Engine",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30"
      },
      {
        id: "decoupled-queue",
        label: "Kiến Trúc Web & Render Worker",
        sublabel: "Tách rời API & Hàng đợi Redis BullMQ",
        icon: Server,
        badge: "Decoupled",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        isNew: true
      },
      {
        id: "lan-cluster",
        label: "Cụm Render Mạng LAN (Worker)",
        sublabel: "Phân tán tải qua mạng nội bộ",
        icon: Radio,
        badge: "Multi-Node",
        badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30"
      },
      {
        id: "phone-farm",
        label: "Phone Farm ADB & Kênh Reels",
        sublabel: "Điều khiển hàng loạt thiết bị",
        icon: Smartphone,
        badge: "ADB Pro",
        badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30"
      },
      {
        id: "fb-suite",
        label: "Bộ Công Cụ Facebook Automation",
        sublabel: "Quản lý Fanpage & Auto Reels",
        icon: Share2,
        badge: "Meta V2",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30"
      },
      {
        id: "csharp-wpf",
        label: "C# .NET 9 WPF Studio Exporter",
        sublabel: "Mã nguồn XAML/MVVM máy trạm",
        icon: Code2,
        badge: "Native C#",
        badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30"
      }
    ]
  }
];
