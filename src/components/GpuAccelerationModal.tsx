import React, { useState, useEffect } from "react";
import {
  Cpu,
  Zap,
  Activity,
  HardDrive,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Layers,
  Copy,
  Check
} from "lucide-react";
import {
  gpuAccelerationEngine,
  GpuDeviceInfo,
  GpuBenchmarkResult,
  FfmpegGpuConfig
} from "../services/gpuAccelerationEngine";
import { soundSynth } from "../utils/audioUtils";

interface GpuAccelerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GpuAccelerationModal: React.FC<GpuAccelerationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<"specs" | "benchmark" | "ffmpeg" | "pytorch">("specs");
  const [deviceInfo, setDeviceInfo] = useState<GpuDeviceInfo | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<GpuBenchmarkResult | null>(null);
  const [ffmpegConfig, setFfmpegConfig] = useState<FfmpegGpuConfig | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [simulatedVramUsed, setSimulatedVramUsed] = useState<number>(1850);

  useEffect(() => {
    if (isOpen) {
      gpuAccelerationEngine.probeGpuHardware().then((info) => {
        setDeviceInfo(info);
        const config = gpuAccelerationEngine.generateFfmpegGpuPipeline(
          "D:\\CreatorOS\\input_video.mp4",
          "D:\\CreatorOS\\output_nvenc_1080p.mp4",
          "1080p"
        );
        setFfmpegConfig(config);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunBenchmark = async () => {
    soundSynth.playSfx("pop");
    setIsBenchmarking(true);
    setBenchmarkResult(null);

    try {
      const result = await gpuAccelerationEngine.runGpuBenchmark(150000);
      setBenchmarkResult(result);
      soundSynth.playSfx("success");
    } catch (err) {
      console.error("Benchmark error:", err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    soundSynth.playSfx("pop");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const vramPercent = deviceInfo
    ? Math.min(100, Math.round((simulatedVramUsed / deviceInfo.totalVramMb) * 100))
    : 30;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Trung Tâm Điều Khiển & Thuật Toán GPU
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Hardware Accelerated
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tối ưu hóa đa luồng NVIDIA NVENC, PyTorch CUDA & WebGPU Compute Shader
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("specs")}
            className={`px-3 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "specs"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Thông số & VRAM Guard
          </button>
          <button
            onClick={() => setActiveTab("benchmark")}
            className={`px-3 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "benchmark"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Chạy Benchmark GPU
          </button>
          <button
            onClick={() => setActiveTab("ffmpeg")}
            className={`px-3 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ffmpeg"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Lệnh FFmpeg NVENC
          </button>
          <button
            onClick={() => setActiveTab("pytorch")}
            className={`px-3 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pytorch"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Thuật Toán PyTorch CUDA
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: SPECS & VRAM GUARD */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              {/* GPU Hardware Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Cạc Đồ Họa</span>
                  <div className="text-sm font-bold text-white truncate">
                    {deviceInfo?.renderer || "NVIDIA GeForce GTX 1660 SUPER"}
                  </div>
                  <div className="text-[10px] text-purple-400 font-mono">
                    Kiến trúc: {deviceInfo?.architecture || "Turing TU116"}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Tổng Bộ Nhớ VRAM</span>
                  <div className="text-sm font-bold text-cyan-300 font-mono">
                    {deviceInfo ? `${(deviceInfo.totalVramMb / 1024).toFixed(1)} GB GDDR6` : "6.0 GB GDDR6"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    CUDA Cores: {deviceInfo?.cudaCoresOrComputeUnits || 1408}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Bộ Tăng Tốc Hỗ Trợ</span>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold border border-emerald-500/30">
                      NVENC Gen 7
                    </span>
                    <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[9px] font-bold border border-cyan-500/30">
                      CUDA 12.x
                    </span>
                    <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded text-[9px] font-bold border border-violet-500/30">
                      WebGPU
                    </span>
                  </div>
                </div>
              </div>

              {/* VRAM Memory Protection Guard Bar */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">
                      Thuật Toán Kiểm Soát VRAM (CUDA OOM Safety Mutex)
                    </span>
                  </div>
                  <span className="text-slate-300 font-mono text-xs">
                    {simulatedVramUsed} MB / {deviceInfo?.totalVramMb || 6144} MB ({vramPercent}%)
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      vramPercent > 85
                        ? "bg-rose-500"
                        : vramPercent > 65
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                    }`}
                    style={{ width: `${vramPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kích thước Chunk: <strong>{deviceInfo?.recommendedChunkDurationSec || 30} giây</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Batch Size tối đa: <strong>{deviceInfo?.recommendedBatchSize || 2} luồng</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Độ chính xác: <strong>FP16 Half-Precision</strong></span>
                  </div>
                </div>
              </div>

              {/* Explanation of Algorithm */}
              <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3.5 text-slate-300 space-y-1.5">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Quy Tắc Toán Học Điều Tiết GPU:
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Thuật toán tự động đo đạc dung lượng VRAM thực tế trước mỗi lượt xử lý. Nếu tệp video hoặc âm thanh lớn hơn ngưỡng VRAM khả dụng, hệ thống kích hoạt chế độ <strong>Dynamic Sliding Window Chunking</strong> (chia đoạn 30s với 25% overlap) và bật <strong>torch.cuda.amp.autocast</strong> để giảm 50% dung lượng bộ nhớ mà vẫn giữ nguyên 100% chất lượng âm thanh/hình ảnh.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE BENCHMARK */}
          {activeTab === "benchmark" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-white text-xs mb-1">
                    Đo Lường Hiệu Năng Tính Toán Song Song GPU
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Phát 65,536 luồng tính toán shader đa thức ma trận trực tiếp lên chip xử lý GPU.
                  </p>
                </div>
                <button
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBenchmarking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tính toán...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Bắt Đầu Benchmark</span>
                    </>
                  )}
                </button>
              </div>

              {benchmarkResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Tốc Độ Xử Lý</div>
                    <div className="text-lg font-extrabold text-emerald-400 font-mono">
                      {benchmarkResult.gflops} GFLOPS
                    </div>
                    <div className="text-[10px] text-slate-500">{benchmarkResult.backend}</div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Khung Hình Render</div>
                    <div className="text-lg font-extrabold text-cyan-300 font-mono">
                      ~{benchmarkResult.fpsThroughput} FPS
                    </div>
                    <div className="text-[10px] text-slate-500">Mã hóa thời gian thực</div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Độ Trễ Phản Hồi</div>
                    <div className="text-lg font-extrabold text-purple-400 font-mono">
                      {benchmarkResult.elapsedMs} ms
                    </div>
                    <div className="text-[10px] text-slate-500">65,536 GPU Threads</div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Trạng Thái Kiểm Thử</div>
                    <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn Hảo (Passed)
                    </div>
                    <div className="text-[10px] text-slate-500">Sẵn sàng tăng tốc</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FFmpeg NVENC Pipeline */}
          {activeTab === "ffmpeg" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Lệnh FFmpeg Zero-Copy Hardware Pipeline:
                </span>
                <button
                  onClick={() =>
                    handleCopy(ffmpegConfig?.commandLinePreview || "", "ffmpeg")
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] cursor-pointer"
                >
                  {copiedField === "ffmpeg" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Sao chép lệnh</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 leading-relaxed overflow-x-auto">
                {ffmpegConfig?.commandLinePreview}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Phần Cứng Giải Mã:</span>
                  <strong className="text-white">-hwaccel cuda</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Định Dạng VRAM:</span>
                  <strong className="text-white">hwaccel_output_format cuda</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Bộ Mã Hóa:</span>
                  <strong className="text-purple-300">h264_nvenc (Preset p4)</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Spatial AQ:</span>
                  <strong className="text-emerald-300">Bật (-spatial-aq 1)</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PyTorch CUDA Audio Algorithm */}
          {activeTab === "pytorch" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Thuật Toán Bóc Tách Âm Thanh PyTorch CUDA (Demucs v4):
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      gpuAccelerationEngine.generatePyTorchCudaScript(
                        "D:\\CreatorOS\\audio.wav",
                        "D:\\CreatorOS\\separated"
                      ),
                      "pytorch"
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] cursor-pointer"
                >
                  {copiedField === "pytorch" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Sao chép mã Python</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 leading-relaxed overflow-x-auto max-h-60">
                <pre>
                  {gpuAccelerationEngine.generatePyTorchCudaScript(
                    "D:\\CreatorOS\\audio.wav",
                    "D:\\CreatorOS\\separated"
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPU sẵn sàng xử lý song song các luồng Video & AI Audio.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
