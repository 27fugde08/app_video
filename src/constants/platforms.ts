export interface PlatformConfig {
  id: string;
  name: string;
  domain: string;
  badge: string;
  color: string;
  bgGlow: string;
  supportedFormats: string[];
  maxQuality: string;
  iconType: "tiktok" | "douyin" | "facebook" | "youtube";
  features: string[];
}

export const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  {
    id: "tiktok",
    name: "TikTok",
    domain: "tiktok.com",
    badge: "Multi-Region Turbo",
    color: "from-cyan-400 to-blue-600",
    bgGlow: "rgba(6, 182, 212, 0.2)",
    supportedFormats: ["MP4 Clean", "Original Audio", "Dynamic Cover"],
    maxQuality: "1080p Full HD",
    iconType: "tiktok",
    features: ["Global Proxy Routing", "HD Zero-Loss", "Batch User Profiles", "Tags & Music Meta"]
  },
  {
    id: "douyin",
    name: "Douyin",
    domain: "douyin.com",
    badge: "No Watermark HD",
    color: "from-rose-500 to-pink-600",
    bgGlow: "rgba(244, 63, 94, 0.2)",
    supportedFormats: ["MP4 (1080p)", "MP4 (2K/4K)", "MP3 (320kbps)", "Cover JPG"],
    maxQuality: "1080x1920 60FPS",
    iconType: "douyin",
    features: ["No-Watermark", "Auto-Cookie Bypass", "Live-Stream Extract", "Subtitles SRT"]
  },
  {
    id: "facebook",
    name: "Facebook",
    domain: "facebook.com",
    badge: "HD Clean Stream",
    color: "from-blue-600 to-indigo-700",
    bgGlow: "rgba(37, 99, 235, 0.2)",
    supportedFormats: ["MP4 HD (1080p)", "MP4 SD", "Audio MP3"],
    maxQuality: "1080p 60FPS",
    iconType: "facebook",
    features: ["Reels Single & Batch", "Post Text Auto-Copy", "Proxy Rotation"]
  },
  {
    id: "youtube",
    name: "YouTube",
    domain: "youtube.com",
    badge: "4K UHD Ready",
    color: "from-red-500 to-rose-700",
    bgGlow: "rgba(239, 68, 68, 0.2)",
    supportedFormats: ["MP4 (2160p 4K)", "MP4 (1080p)", "Opus Audio", "MP3 Hi-Res"],
    maxQuality: "3840x2160 60FPS",
    iconType: "youtube",
    features: ["Shorts & VOD", "SRT/VTT Subtitles", "Playlist Batching", "Auto-Thumbnail 4K"]
  }
];
