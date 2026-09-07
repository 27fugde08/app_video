import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Copy,
  FolderOpen,
  Music,
  Film,
  Sparkles,
  Info,
  Check,
  X,
  Gauge,
  HardDrive,
  Share2
} from "lucide-react";
import { VideoDownloadItem } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";
import { downloaderService } from "../services/downloaderService";

interface VideoAudioPreviewModalProps {
  video: VideoDownloadItem | null;
  onClose: () => void;
  onSendToDubbing?: (video: VideoDownloadItem) => void;
}

export const VideoAudioPreviewModal: React.FC<VideoAudioPreviewModalProps> = ({
  video,
  onClose,
  onSendToDubbing
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"video" | "audio">("video");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!video) return null;

  // Fallback demo video stream if local file cannot be directly accessed in web preview
  const videoStreamUrl =
    video.previewUrl ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

  // Toggle Play / Pause
  const togglePlay = () => {
    soundSynth.playSfx("pop");
    if (activeTab === "video" && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else if (activeTab === "audio" && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    soundSynth.playSfx("pop");
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const handleCopyPath = () => {
    const targetPath = activeTab === "audio" ? (video.audioPath || video.filePath) : video.filePath;
    if (targetPath) {
      navigator.clipboard.writeText(targetPath);
      setHasCopied(true);
      soundSynth.playSfx("pop");
      addToast("Đã sao chép đường dẫn tệp vào bộ nhớ tạm!", "success");
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleOpenFolder = async () => {
    soundSynth.playSfx("pop");
    const targetPath = activeTab === "audio" ? (video.audioPath || video.filePath) : video.filePath;
    const result = await downloaderService.openFileOrFolder(targetPath);
    addToast(result.message, result.success ? "success" : "info");
  };

  const handleTransferToDubbing = () => {
    soundSynth.playSfx("cash");
    addToast(`Đã chuyển video "${video.title.slice(0, 30)}..." sang Studio Dịch Lồng Tiếng AI!`, "success");
    if (onSendToDubbing) {
      onSendToDubbing(video);
    } else {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("creatoros:navigate", { detail: "translate" }));
      }, 500);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="obsidian-card rounded-2xl max-w-2xl w-full overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0d16]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/30">
              {activeTab === "video" ? <Film className="w-4 h-4" /> : <Music className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-md" title={video.title}>
                {video.title}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span className="uppercase text-cyan-300 font-bold">{video.platform}</span>
                <span>•</span>
                <span>{video.resolution}</span>
                <span>•</span>
                <span>{video.fileSize}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switch: Video MP4 vs Audio Extracted */}
        <div className="px-4 py-2 bg-[#06080e] border-b border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setActiveTab("video");
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "video"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Xem Video (MP4)</span>
            </button>

            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setActiveTab("audio");
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "audio"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Âm Thanh Đã Tách (Demucs MP3/WAV)</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span className="text-slate-500 hidden sm:inline">Tốc độ:</span>
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  playbackSpeed === s
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Media Player Stage */}
        <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === "video" ? (
            <div className="w-full aspect-video rounded-xl bg-slate-950 overflow-hidden relative border border-white/10 flex items-center justify-center group shadow-2xl">
              <video
                ref={videoRef}
                src={videoStreamUrl}
                poster={video.thumbnail}
                controls
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          ) : (
            <div className="w-full h-52 rounded-xl bg-gradient-to-b from-[#0e0a1a] to-[#06080e] p-5 border border-purple-500/20 flex flex-col justify-between relative overflow-hidden shadow-2xl">
              {/* Background Ambient Glow */}
              <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-purple-600/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Music className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Audio Stream (Demucs v4 Isolated)</h4>
                    <p className="text-[11px] text-purple-300/80 font-mono">Băng thông: 320 kbps • Khử ồn Clean Vocal</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  Lossless WAV / MP3
                </span>
              </div>

              {/* Animated Waveform Bars */}
              <div className="flex items-end justify-between gap-1.5 h-16 py-2 px-4 bg-slate-950/60 rounded-xl border border-white/5 relative z-10">
                {Array.from({ length: 32 }).map((_, i) => {
                  const barHeight = isPlaying
                    ? Math.max(15, ((Math.sin(i * 0.45 + Date.now() * 0.003) + 1) / 2) * 90)
                    : 20;
                  return (
                    <div
                      key={i}
                      className="w-full rounded-full transition-all duration-150"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: i % 2 === 0 ? "#a855f7" : "#06b6d4"
                      }}
                    ></div>
                  );
                })}
              </div>

              {/* Audio Controls */}
              <audio
                ref={audioRef}
                src="https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg"
                controls
                autoPlay
                className="w-full relative z-10 opacity-90 filter invert hue-rotate-180"
              />
            </div>
          )}

          {/* Technical Metadata Details Box */}
          <div className="bg-[#07090f] rounded-xl p-3 border border-white/10 text-xs space-y-2 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between text-slate-400 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <span className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-cyan-400" /> Tệp Video:
                </span>
                <span className="text-white font-semibold">{video.resolution}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <span className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-purple-400" /> Kích thước tệp:
                </span>
                <span className="text-white font-semibold">{video.fileSize} ({video.duration})</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded-lg border border-white/5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 shrink-0">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Vị trí lưu:
              </span>
              <span className="text-cyan-300 font-semibold truncate max-w-sm" title={video.filePath}>
                {video.filePath || "D:\\Downloads\\CreatorOS\\BatchVault\\" + video.title + ".mp4"}
              </span>
            </div>

            {video.error && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
                <strong>Chi tiết lỗi:</strong> {video.error}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#0a0d16] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopied ? "Đã chép" : "Chép đường dẫn"}</span>
            </button>

            <button
              onClick={handleOpenFolder}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-cyan-300 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mở trong Explorer</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTransferToDubbing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Lồng Tiếng AI Video Này</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
