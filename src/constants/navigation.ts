import {
  Download,
  Clapperboard,
  Sliders,
  Key
} from "lucide-react";
import { ActiveTab } from "../contracts/system.types";

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
    title: "Sản Xuất Nội Dung",
    description: "Core Pipeline: Quét, tải & Lồng tiếng AI",
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
        id: "translate",
        label: "Dịch & Lồng Tiếng AI",
        sublabel: "Đồng bộ môi, Voice Clone, Shorts 60s & SEO Meta",
        icon: Clapperboard,
        badge: "Global",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      }
    ]
  },
  {
    title: "Hệ Thống",
    description: "Cấu hình ứng dụng & Bảo mật API Key",
    items: [
      {
        id: "settings",
        label: "Cài Đặt & API Key",
        sublabel: "Quản lý Gemini API Key, Endpoint & GPU NVENC",
        icon: Key,
        badge: "Secure Vault",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30"
      }
    ]
  }
];
