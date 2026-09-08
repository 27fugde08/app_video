import React, { useState } from "react";
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  Folder,
  Scissors,
  Music,
  FileText,
  Zap,
  HelpCircle,
  Check,
  Cpu,
  Gauge,
  Tag,
  Image as ImageIcon,
  Shield,
  Layers,
  Sparkles
} from "lucide-react";
import { DownloaderConfig } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";
import { FolderPickerModal } from "../../../components/FolderPickerModal";

interface AdvancedConfigPanelProps {
  config: DownloaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<DownloaderConfig>>;
}

export const AdvancedConfigPanel: React.FC<AdvancedConfigPanelProps> = ({
  config,
  setConfig
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState<boolean>(false);
  const { addToast } = useToast();

  const toggleOpen = () => {
    soundSynth.playSfx("pop");
    setIsOpen(!isOpen);
  };

  const handleBrowseFolder = () => {
    soundSynth.playSfx("pop");
    setIsFolderPickerOpen(true);
  };

  const insertNamingTag = (tag: string) => {
    soundSynth.playSfx("pop");
    setConfig((prev) => ({
      ...prev,
      namingPattern: prev.namingPattern ? `${prev.namingPattern}_${tag}` : tag
    }));
  };

  return (
    <div className="obsidian-card rounded-2xl border border-white/[0.08] overflow-hidden transition-all shadow-2xl">
      {/* Header Toggle */}
      <div
        onClick={toggleOpen}
        className="px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between cursor-pointer transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30 shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Cấu hình Tăng tốc Tải & Đa phân đoạn (Multi-Segment Turbo)
            </span>
            <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
              ({config.chunksPerFile || 8} Chunks/file • {config.speedLimitMbps ? `${config.speedLimitMbps}MB/s Limit` : "Không giới hạn"} • {config.removeWatermark ? "No-WM" : ""})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
            {config.chunksPerFile || 8} Chunks • {config.removeWatermark ? "Clean-WM" : "Original"} • {config.extractMp3 ? "+MP3" : ""}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-white/[0.06] space-y-4 text-xs animate-in fade-in duration-200">
          {/* TOP ROW: Storage Directory & Turbo Multi-Segment Engine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Thư mục lưu */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Thư mục lưu trữ video & audio Vault:</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.saveDirectory}
                  onChange={(e) => setConfig((prev) => ({ ...prev, saveDirectory: e.target.value }))}
                  className="flex-1 bg-[#05070d] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500/50 outline-none"
                />
                <button
                  onClick={handleBrowseFolder}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 font-semibold cursor-pointer shrink-0 transition-colors shadow-sm"
                >
                  Duyệt thư mục
                </button>
              </div>
            </div>

            {/* Field 2: Multi-Segment Chunks Per File */}
            <div className="space-y-1.5 bg-[#05070d]/60 border border-white/[0.07] p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Số phân đoạn tải song song / video:</span>
                </label>
                <span className="text-[11px] font-mono text-cyan-300 font-bold">
                  {config.chunksPerFile || 8} chunks (HTTP Range)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: "1x Đơn luồng", val: 1 },
                  { label: "4x Tiêu chuẩn", val: 4 },
                  { label: "8x Turbo", val: 8 },
                  { label: "16x Cực hạn", val: 16 }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      soundSynth.playSfx("pop");
                      setConfig((prev) => ({ ...prev, chunksPerFile: opt.val }));
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                      (config.chunksPerFile || 8) === opt.val
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                        : "bg-white/[0.02] text-slate-400 hover:text-slate-200 border-white/[0.06]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Speed Limiter (Bandwidth Governor) */}
            <div className="space-y-1.5 bg-[#05070d]/60 border border-white/[0.07] p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Giới hạn băng thông (Speed Governor):</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-300 font-bold">
                  {config.speedLimitMbps ? `${config.speedLimitMbps} MB/s` : "Cực đại (Unlimited)"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[
                  { label: "Tối đa", val: 0 },
                  { label: "50 MB/s", val: 50 },
                  { label: "25 MB/s", val: 25 },
                  { label: "10 MB/s", val: 10 },
                  { label: "5 MB/s", val: 5 }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      soundSynth.playSfx("pop");
                      setConfig((prev) => ({ ...prev, speedLimitMbps: opt.val }));
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold text-center border transition-all cursor-pointer ${
                      (config.speedLimitMbps || 0) === opt.val
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-white/[0.02] text-slate-400 hover:text-slate-200 border-white/[0.06]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE ROW: Smart Naming Rule Builder */}
          <div className="space-y-2 bg-[#05070d]/70 border border-white/[0.07] p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-violet-400" />
                <span>Quy tắc đặt tên tệp tự động (Smart Batch Naming Pattern):</span>
              </label>
              <span className="text-[10px] text-slate-400">Click tag để chèn vào mẫu</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.namingPattern || "{index}_{title}_{platform}"}
                onChange={(e) => setConfig((prev) => ({ ...prev, namingPattern: e.target.value }))}
                placeholder="{index}_{title}_{platform}"
                className="flex-1 bg-[#07090f] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:border-violet-500/50 outline-none"
              />
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, namingPattern: "{index}_{title}_{platform}" }))}
                className="px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] font-semibold border border-white/10 cursor-pointer"
              >
                Mặc định
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { tag: "{index}", desc: "01, 02..." },
                { tag: "{title}", desc: "Tiêu đề video" },
                { tag: "{platform}", desc: "tiktok, douyin..." },
                { tag: "{author}", desc: "Kênh tác giả" },
                { tag: "{resolution}", desc: "1080p, 4k" },
                { tag: "{date}", desc: "YYYY-MM-DD" }
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertNamingTag(item.tag)}
                  className="px-2 py-0.5 rounded-md bg-violet-500/10 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-[10px] font-mono cursor-pointer transition-colors"
                  title={item.desc}
                >
                  +{item.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Proxy & Cookie Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cookie Authentication Bypass */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cookie tài khoản VIP (Douyin / TikTok / Bilibili):</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Bypass 4K/VIP</span>
              </label>
              <input
                type="text"
                value={config.cookieHeader}
                onChange={(e) => setConfig((prev) => ({ ...prev, cookieHeader: e.target.value }))}
                placeholder="passport_csrf_token=...; sessionid=...; SESSDATA=..."
                className="w-full bg-[#05070d] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500/50 outline-none"
              />
            </div>

            {/* Proxy Server Routing */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Proxy mạng (HTTP / HTTPS / SOCKS5):</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Xoay IP chống chặn</span>
              </label>
              <input
                type="text"
                value={config.proxyServer}
                onChange={(e) => setConfig((prev) => ({ ...prev, proxyServer: e.target.value }))}
                placeholder="http://127.0.0.1:7890 hoặc socks5://user:pass@127.0.0.1:1080"
                className="w-full bg-[#05070d] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500/50 outline-none"
              />
            </div>
          </div>

          {/* Quick Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Toggle 1: Xóa Watermark */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, removeWatermark: !prev.removeWatermark }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.removeWatermark
                  ? "bg-gradient-to-r from-rose-500/15 to-pink-500/15 border-rose-500/40 text-white glow-rose"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Scissors className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="font-bold text-xs">Xóa Watermark</div>
                  <div className="text-[10px] text-slate-400">Bóc tách video gốc sạch</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.removeWatermark
                    ? "bg-rose-500 text-white border-rose-400"
                    : "border-white/20"
                }`}
              >
                {config.removeWatermark && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 2: Trích xuất MP3 */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, extractMp3: !prev.extractMp3 }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.extractMp3
                  ? "bg-gradient-to-r from-purple-500/15 to-violet-500/15 border-purple-500/40 text-white glow-purple"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Music className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-bold text-xs">Trích xuất MP3</div>
                  <div className="text-[10px] text-slate-400">Tự demux audio 320k</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.extractMp3
                    ? "bg-purple-500 text-white border-purple-400"
                    : "border-white/20"
                }`}
              >
                {config.extractMp3 && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 3: Trích xuất Subtitle SRT */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, extractSubtitles: !prev.extractSubtitles }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.extractSubtitles
                  ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-emerald-500/40 text-white glow-emerald"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-bold text-xs">Tải Subtitle SRT</div>
                  <div className="text-[10px] text-slate-400">Trích xuất phụ đề gốc</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.extractSubtitles
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "border-white/20"
                }`}
              >
                {config.extractSubtitles && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 4: GPU NVENC Acceleration */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, gpuAcceleration: !prev.gpuAcceleration }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.gpuAcceleration
                  ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border-cyan-500/40 text-white glow-cyan"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-xs">Tăng tốc NVENC</div>
                  <div className="text-[10px] text-slate-400">Tải & ghép tệp phần cứng</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.gpuAcceleration
                    ? "bg-cyan-500 text-white border-cyan-400"
                    : "border-white/20"
                }`}
              >
                {config.gpuAcceleration && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 5: Bỏ qua video đã tồn tại */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, skipExisting: !prev.skipExisting }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.skipExisting
                  ? "bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border-blue-500/40 text-white glow-cyan"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-bold text-xs">Bỏ qua file đã có</div>
                  <div className="text-[10px] text-slate-400">Không tải trùng lặp</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.skipExisting
                    ? "bg-blue-500 text-white border-blue-400"
                    : "border-white/20"
                }`}
              >
                {config.skipExisting && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 6: Tải kèm Ảnh Bìa Cover Thumbnail */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, downloadThumbnail: !prev.downloadThumbnail }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.downloadThumbnail
                  ? "bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border-amber-500/40 text-white"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-bold text-xs">Tải Cover Art HD</div>
                  <div className="text-[10px] text-slate-400">Lưu ảnh thumbnail gốc</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.downloadThumbnail
                    ? "bg-amber-500 text-white border-amber-400"
                    : "border-white/20"
                }`}
              >
                {config.downloadThumbnail && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 7: Chống chặn Anti-ban Jitter */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, antiBanJitter: !prev.antiBanJitter }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.antiBanJitter
                  ? "bg-gradient-to-r from-teal-500/15 to-emerald-500/15 border-teal-500/40 text-white"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-teal-400" />
                <div>
                  <div className="font-bold text-xs">Anti-Ban Jitter</div>
                  <div className="text-[10px] text-slate-400">Delay ngẫu nhiên lách IP</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.antiBanJitter
                    ? "bg-teal-500 text-white border-teal-400"
                    : "border-white/20"
                }`}
              >
                {config.antiBanJitter && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Toggle 8: Tự động gom nhóm theo tác giả */}
            <div
              onClick={() => {
                soundSynth.playSfx("pop");
                setConfig((prev) => ({ ...prev, autoOrganizeByAuthor: !prev.autoOrganizeByAuthor }));
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                config.autoOrganizeByAuthor
                  ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/15 border-indigo-500/40 text-white"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-bold text-xs">Gom Thư Mục Kênh</div>
                  <div className="text-[10px] text-slate-400">Tạo folder riêng từng tác giả</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  config.autoOrganizeByAuthor
                    ? "bg-indigo-500 text-white border-indigo-400"
                    : "border-white/20"
                }`}
              >
                {config.autoOrganizeByAuthor && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Visual Folder Picker Modal */}
      <FolderPickerModal
        isOpen={isFolderPickerOpen}
        currentPath={config.saveDirectory}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelectFolder={(selectedPath) => {
          setConfig((prev) => ({ ...prev, saveDirectory: selectedPath }));
          addToast(`Đã chọn thư mục lưu trữ: ${selectedPath}`, "success");
        }}
      />
    </div>
  );
};

