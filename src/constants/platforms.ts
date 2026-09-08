export interface PlatformConfig {
  id: string;
  name: string;
  domain: string;
  badge: string;
  color: string;
  bgGlow: string;
  supportedFormats: string[];
  maxQuality: string;
  iconType: "tiktok" | "douyin" | "facebook" | "youtube" | "instagram" | "kuaishou" | "xiaohongshu" | "threads" | "twitter" | "bilibili";
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
    name: "Douyin 抖音",
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
    id: "instagram",
    name: "Instagram",
    domain: "instagram.com",
    badge: "Reels & Stories 1080p",
    color: "from-pink-500 to-amber-500",
    bgGlow: "rgba(236, 72, 153, 0.2)",
    supportedFormats: ["MP4 (1080p)", "High-Res Carousel", "Audio MP3"],
    maxQuality: "1080x1920 60FPS",
    iconType: "instagram",
    features: ["Reels Zero-Watermark", "Carousel Auto-Zip", "Audio Track Extract", "Profile Crawler"]
  },
  {
    id: "xiaohongshu",
    name: "Xiaohongshu 小红书",
    domain: "xiaohongshu.com",
    badge: "Live-Photos & Video",
    color: "from-red-500 to-rose-600",
    bgGlow: "rgba(244, 63, 94, 0.2)",
    supportedFormats: ["MP4 1080p Original", "LivePhotos MOV", "Lossless PNG"],
    maxQuality: "1080p HD",
    iconType: "xiaohongshu",
    features: ["Clean Note Extraction", "No-Watermark LivePhotos", "Bilingual Title/Tag", "User Feed Batch"]
  },
  {
    id: "kuaishou",
    name: "Kuaishou 快手",
    domain: "kuaishou.com",
    badge: "Origin No-WM",
    color: "from-orange-500 to-amber-600",
    bgGlow: "rgba(249, 115, 22, 0.2)",
    supportedFormats: ["MP4 HD (1080p)", "Audio Track AAC"],
    maxQuality: "1080p 60FPS",
    iconType: "kuaishou",
    features: ["High-Speed Direct CDN", "Auto Bypass Token", "Author Feed Crawler"]
  },
  {
    id: "bilibili",
    name: "Bilibili 哔哩哔哩",
    domain: "bilibili.com",
    badge: "4K 60FPS Danmaku",
    color: "from-sky-400 to-blue-500",
    bgGlow: "rgba(14, 165, 233, 0.2)",
    supportedFormats: ["MP4 4K HDR", "Flac Lossless Audio", "XML Danmaku"],
    maxQuality: "3840x2160 60FPS",
    iconType: "bilibili",
    features: ["Multi-P Batch Crawler", "Danmaku Subtitle", "Audio Bitrate 320k", "SESSDATA Cookie Bypass"]
  },
  {
    id: "twitter",
    name: "X / Twitter",
    domain: "x.com",
    badge: "Direct MP4 Stream",
    color: "from-slate-300 to-slate-500",
    bgGlow: "rgba(148, 163, 184, 0.2)",
    supportedFormats: ["MP4 1080p", "MP4 720p"],
    maxQuality: "1080p 60FPS",
    iconType: "twitter",
    features: ["Highest Bitrate Select", "Thread Video Scraping", "Instant Parsing"]
  },
  {
    id: "threads",
    name: "Threads",
    domain: "threads.net",
    badge: "Clean Video Stream",
    color: "from-violet-500 to-indigo-600",
    bgGlow: "rgba(139, 92, 246, 0.2)",
    supportedFormats: ["MP4 1080p", "Audio AAC"],
    maxQuality: "1080p",
    iconType: "threads",
    features: ["Zero-Compression Stream", "Post Carousel Video Batch", "Auto Audio Demux"]
  }
];

