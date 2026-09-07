import React, { useState, useEffect } from "react";
import {
  Server,
  Layers,
  Cpu,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity,
  Terminal,
  Database,
  Radio,
  RotateCcw,
  XCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HardDrive
} from "lucide-react";
import {
  decoupledQueueService,
  DecoupledJob,
  WorkerNodeInfo,
  QueueStatistics
} from "../services/decoupledQueueService";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";

export function DecoupledArchitectureTool() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<QueueStatistics | null>(null);
  const [jobs, setJobs] = useState<DecoupledJob[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedLogJobId, setExpandedLogJobId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"monitor" | "topology" | "dispatch" | "comparison">("monitor");

  // Form State for Dispatching
  const [inputUrl, setInputUrl] = useState("https://youtube.com/watch?v=ai_agent_breakthrough_2026.mp4");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("vi");
  const [voiceId, setVoiceId] = useState("vi-VN-HoaiMyNeural");
  const [priority, setPriority] = useState<"high" | "normal">("high");
  const [resolution, setResolution] = useState("1080p");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastApiResponseTime, setLastApiResponseTime] = useState<number | null>(14);

  useEffect(() => {
    loadData();

    // Subscribe to live events
    const unsubscribe = decoupledQueueService.on((event, data) => {
      loadData();
      if (event === "job:completed") {
        soundSynth.playSfx("success");
      } else if (event === "job:enqueued") {
        soundSynth.playSfx("pop");
      }
    });

    const interval = setInterval(loadData, 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [filterStatus]);

  const loadData = async () => {
    const s = await decoupledQueueService.getQueueStats();
    setStats(s);
    const j = await decoupledQueueService.listJobs(filterStatus);
    setJobs(j);
  };

  const handleDispatchJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsSubmitting(true);
    soundSynth.playSfx("pop");

    try {
      const result = await decoupledQueueService.submitJob({
        videoUrl: inputUrl,
        sourceLang,
        targetLang,
        voiceId,
        resolution,
        priority
      });

      setLastApiResponseTime(result.apiProcessingTimeMs);
      addToast(
        `API phản hồi tức thì trong ${result.apiProcessingTimeMs}ms (HTTP 202 Accepted). Đã nạp vào Redis BullMQ & GPU Worker.`,
        "success"
      );

      setSelectedJobId(result.job.id);
      setExpandedLogJobId(result.job.id);
      setActiveViewTab("monitor");
    } catch (err: any) {
      addToast(`Lỗi submit job: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    soundSynth.playSfx("pop");
    await decoupledQueueService.retryJob(jobId);
    addToast(`Job ${jobId} đã được đưa lại vào hàng đợi ưu tiên.`, "info");
    loadData();
  };

  const handleCancel = async (jobId: string) => {
    soundSynth.playSfx("pop");
    await decoupledQueueService.cancelJob(jobId);
    addToast("Tác vụ đã được hủy an toàn và hoàn lại credits.", "warning");
    loadData();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b12] text-slate-200 overflow-y-auto custom-scrollbar">
      {/* Top Banner & Header */}
      <div className="border-b border-white/10 bg-[#0d121f]/90 backdrop-blur-md px-6 py-5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0d121f] rounded-[10px] flex items-center justify-center">
                <Layers className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Tách Rời Luồng UI & Worker Render (100% Standalone Desktop)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Local Offline
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  In-Memory Channel
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  SemaphoreSlim(2) NVENC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kiến trúc Desktop cục bộ: In-Memory Channel điều phối bất đồng bộ • SemaphoreSlim giới hạn 2 GPU job đồng thời • Lưu trực tiếp vào Videos/CreatorOS
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#141b2d] border border-white/10 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">UI Thread Latency</div>
                <div className="text-xs font-mono font-bold text-white">
                  {lastApiResponseTime ? `${lastApiResponseTime}ms (Non-Blocking)` : "< 10ms"}
                </div>
              </div>
            </div>

            <div className="bg-[#141b2d] border border-white/10 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Queue Engine</div>
                <div className="text-xs font-mono font-bold text-cyan-300">
                  In-Memory Channel (0 Cloud)
                </div>
              </div>
            </div>

            <div className="bg-[#141b2d] border border-white/10 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Lưu Trữ Cục Bộ</div>
                <div className="text-xs font-mono font-bold text-indigo-300">
                  Videos/CreatorOS
                </div>
              </div>
            </div>

            <div className="bg-[#141b2d] border border-white/10 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">License Status</div>
                <div className="text-xs font-mono font-bold text-emerald-300">
                  Local Pro (Unlimited)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-5 border-t border-white/5 pt-3">
          <button
            onClick={() => setActiveViewTab("monitor")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeViewTab === "monitor"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Giám Sát Hàng Đợi & Workers
            {stats && (
              <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] font-bold">
                {stats.active + stats.waiting}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveViewTab("topology")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeViewTab === "topology"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Sơ Đồ Kiến Trúc Decoupled
          </button>

          <button
            onClick={() => setActiveViewTab("dispatch")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeViewTab === "dispatch"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Bắn Thử Job (Test Non-Blocking API)
          </button>

          <button
            onClick={() => setActiveViewTab("comparison")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeViewTab === "comparison"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            So Sánh Kiến Trúc Cũ vs Mới
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-6 w-full space-y-6">
        {/* VIEW 1: MONITOR (QUEUE & WORKERS) */}
        {activeViewTab === "monitor" && (
          <div className="space-y-6">
            {/* Stat Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0f1527] border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Hàng Đợi Chờ (Waiting)</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {stats?.waiting ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">FIFO & Ưu tiên High Priority</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>

              <div className="bg-[#0f1527] border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Đang Render (Active)</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {stats?.active ?? 0}
                  </div>
                  <div className="text-[11px] text-cyan-500/80 mt-0.5">Khóa GPU VRAM Mutex</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>

              <div className="bg-[#0f1527] border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Đã Hoàn Tất (Completed)</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {stats?.completed ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">NVENC Zero-Copy xuất Vault</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-[#0f1527] border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Tự Động Thử Lại (Retries)</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    {stats?.failed ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Exponential Backoff (x3)</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-rose-400" />
                </div>
              </div>
            </div>

            {/* GPU Worker Nodes Live Cluster */}
            <div className="bg-[#0f1527] border border-white/10 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Cụm Render Worker Chạy Riêng Biệt (Dedicated VPS & GPU Nodes)
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    ({stats?.workersCount || 0} nodes sẵn sàng)
                  </span>
                </div>
                <button
                  onClick={loadData}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Làm mới
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats?.workers.map((worker) => {
                  const vramPct = Math.round((worker.vramUsedMb / worker.vramTotalMb) * 100);
                  const isBusy = worker.status === "busy";

                  return (
                    <div
                      key={worker.id}
                      className={`rounded-lg p-4 border transition-all ${
                        isBusy
                          ? "bg-[#141b2f] border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                          : "bg-[#0c101c] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isBusy ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                            }`}
                          />
                          <span className="text-xs font-bold text-white truncate">{worker.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            isBusy
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {isBusy ? "PROCESSING" : "IDLE (WAITING)"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Phần cứng:</span>
                          <span className="text-slate-200 font-mono truncate max-w-[170px]">{worker.gpu}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Địa chỉ IP:</span>
                          <span className="text-slate-300 font-mono">{worker.ip}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Nhiệt độ GPU:</span>
                          <span className="text-amber-300 font-mono">{worker.temperatureC}°C</span>
                        </div>

                        {/* VRAM Bar */}
                        <div className="pt-1">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">VRAM Load:</span>
                            <span className="font-mono text-cyan-300">
                              {worker.vramUsedMb}MB / {worker.vramTotalMb}MB ({vramPct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                vramPct > 80 ? "bg-rose-500" : vramPct > 50 ? "bg-amber-500" : "bg-cyan-500"
                              }`}
                              style={{ width: `${vramPct}%` }}
                            />
                          </div>
                        </div>

                        {worker.currentJobId && (
                          <div className="pt-2 border-t border-white/5 text-[11px] text-cyan-300 flex items-center gap-1.5 font-mono">
                            <Activity className="w-3 h-3 animate-spin" />
                            Đang xử lý: {worker.currentJobId}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jobs Queue Table & Filter */}
            <div className="bg-[#0f1527] border border-white/10 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Danh Sách Job Trong Message Queue</h3>
                  <span className="text-xs text-slate-400">({jobs.length} jobs)</span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-lg border border-white/5 text-xs">
                  {["all", "active", "waiting", "completed", "failed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded capitalize transition-colors ${
                        filterStatus === st
                          ? "bg-indigo-600 text-white font-medium"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jobs List */}
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Không có job nào trong trạng thái "{filterStatus}".
                  </div>
                ) : (
                  jobs.map((job) => {
                    const isExpanded = expandedLogJobId === job.id;
                    const isActive = job.status === "active";
                    const isCompleted = job.status === "completed";
                    const isFailed = job.status === "failed";
                    const isWaiting = job.status === "waiting";

                    return (
                      <div
                        key={job.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isActive
                            ? "bg-[#131b2e] border-cyan-500/50 shadow-md shadow-cyan-500/5"
                            : "bg-[#0b0e1a] border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isActive
                                  ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
                                  : isCompleted
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : isFailed
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {isActive ? (
                                <Activity className="w-4 h-4" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isFailed ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-white">{job.id}</span>
                                <span
                                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                                    isActive
                                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                      : isCompleted
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : isFailed
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  }`}
                                >
                                  {job.status}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Priority: {job.opts.priority}
                                </span>
                                <span className="text-[11px] text-emerald-400 font-mono">
                                  -{job.opts.creditsDeducted} credits
                                </span>
                              </div>

                              <div className="text-xs text-slate-300 mt-1 truncate max-w-xl">
                                {job.payload.videoUrl}
                              </div>

                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                <span>Worker: {job.workerName || "Chưa gán"}</span>
                                <span>•</span>
                                <span>Lần thử: {job.attemptsMade}/{job.opts.maxRetries}</span>
                                <span>•</span>
                                <span>Thời gian: {new Date(job.createdAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar & Actions */}
                          <div className="flex items-center gap-4 lg:w-80">
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] font-mono mb-1">
                                <span className="text-slate-400">{job.stageMessage}</span>
                                <span className="text-cyan-300 font-bold">{job.progress}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isCompleted
                                      ? "bg-emerald-500"
                                      : isFailed
                                      ? "bg-rose-500"
                                      : "bg-gradient-to-r from-indigo-500 to-cyan-400"
                                  }`}
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isFailed && (
                                <button
                                  onClick={() => handleRetry(job.id)}
                                  title="Thử lại Job"
                                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-amber-300 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {(isWaiting || isActive) && (
                                <button
                                  onClick={() => handleCancel(job.id)}
                                  title="Hủy tác vụ"
                                  className="p-1.5 rounded bg-white/5 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setExpandedLogJobId(isExpanded ? null : job.id)}
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                                title="Xem log chi tiết"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Log Terminal */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <div className="bg-[#05070e] rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto space-y-1">
                              <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                                <Terminal className="w-3 h-3" />
                                Nhật ký thực thi theo thời gian thực (Worker Telemetry & SSE Logs):
                              </div>
                              {job.logs.map((lg, idx) => (
                                <div key={idx} className="leading-relaxed">
                                  {lg}
                                </div>
                              ))}
                              {job.result && (
                                <div className="text-emerald-400 font-semibold pt-1 border-t border-white/10">
                                  ✅ Kết quả: {job.result.outputVideoUrl} | Tốc độ: {job.result.averageFps} FPS | Thời gian: {job.result.renderDurationSec}s
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: TOPOLOGY DIAGRAM */}
        {activeViewTab === "topology" && (
          <div className="bg-[#0f1527] border border-white/10 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                Kiến Trúc Tách Rời (Decoupled Architecture Flowchart)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Giải quyết triệt để vấn đề nghẽn 100% CPU/GPU của Web Server khi nhiều người dùng gửi tác vụ đồng thời.
              </p>
            </div>

            {/* Architecture Pipeline Flow Visual */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1: Web / API Server */}
              <div className="bg-[#141b30] border border-blue-500/30 rounded-xl p-5 relative shadow-lg shadow-blue-500/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <Server className="w-4 h-4" />
                </div>
                <div className="text-xs uppercase font-mono tracking-wider text-blue-400 font-semibold">Tầng 1</div>
                <h3 className="text-sm font-bold text-white mt-0.5">API Web Server (Express)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  • Xác thực người dùng và API Key.<br />
                  • Kiểm tra & trừ credit tài khoản.<br />
                  • Nạp payload vào hàng đợi Message Queue.<br />
                  • <strong className="text-emerald-300">Trả ngay HTTP 202 Accepted (&lt;15ms)</strong>. Tuyệt đối không giữ luồng hay chờ FFmpeg!
                </p>
                <div className="mt-3 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-300">
                  Latency: 10 - 20ms
                </div>
              </div>

              {/* Step 2: Message Queue */}
              <div className="bg-[#141b30] border border-cyan-500/30 rounded-xl p-5 relative shadow-lg shadow-cyan-500/5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-xs uppercase font-mono tracking-wider text-cyan-400 font-semibold">Tầng 2</div>
                <h3 className="text-sm font-bold text-white mt-0.5">In-Memory Channel (C# Channel&lt;RenderJob&gt;)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  • Hoạt động hoàn toàn in-process, không cần cài đặt Redis hay dịch vụ ngoài.<br />
                  • Điều phối hàng đợi FIFO đa luồng an toàn (Thread-safe Async Channel).<br />
                  • SemaphoreSlim(2) giới hạn tối đa 2 tác vụ render phần cứng chạy cùng lúc.<br />
                  • Bảo vệ GPU VRAM không bị tràn bộ nhớ (Out-Of-Memory).
                </p>
                <div className="mt-3 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-300">
                  Engine: System.Threading.Channels.Channel + SemaphoreSlim
                </div>
              </div>

              {/* Step 3: Render Worker */}
              <div className="bg-[#141b30] border border-emerald-500/30 rounded-xl p-5 relative shadow-lg shadow-emerald-500/5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">Tầng 3</div>
                <h3 className="text-sm font-bold text-white mt-0.5">Render Worker (Local GPU NVENC)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  • Chạy trên card đồ họa rời NVIDIA của máy tính người dùng.<br />
                  • Nhận job từ Channel.Reader và chiếm 1 slot trong SemaphoreSlim.<br />
                  • Kích hoạt CUDA FP16 & NVENC Hardware Acceleration (h264_nvenc).<br />
                  • Tốc độ mã hóa đạt 150+ FPS với Zero-Copy VRAM.
                </p>
                <div className="mt-3 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300">
                  Engine: FFmpeg NVENC (Zero-Copy VRAM)
                </div>
              </div>

              {/* Step 4: Real-time Feedback & Local Storage */}
              <div className="bg-[#141b30] border border-purple-500/30 rounded-xl p-5 relative shadow-lg shadow-purple-500/5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="text-xs uppercase font-mono tracking-wider text-purple-400 font-semibold">Tầng 4</div>
                <h3 className="text-sm font-bold text-white mt-0.5">Lưu Trữ Cục Bộ & Auto Explorer</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  • Ghi video thành phẩm trực tiếp vào ổ cứng: Videos/CreatorOS.<br />
                  • Không upload lên Cloud R2, bảo mật 100% video trên máy cá nhân.<br />
                  • Tự động kích hoạt Windows Explorer mở và chọn sẵn file video.<br />
                  • Tự động dọn dẹp thư mục tạm (Scratchpad) ngay sau khi render.
                </p>
                <div className="mt-3 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-300">
                  Thư mục: Environment.GetFolderPath(SpecialFolder.MyVideos)/CreatorOS
                </div>
              </div>
            </div>

            {/* Code Snippets & Architecture Pattern */}
            <div className="bg-[#090d18] border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Cơ Chế In-Memory Channel & Semaphore Trong C# .NET 9 (Karpathy Guidelines)
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="text-slate-400 mb-1">Khởi tạo Channel và SemaphoreSlim khống chế VRAM:</div>
                  <div className="bg-black/50 p-3 rounded border border-white/5 text-cyan-300 select-all">
                    private readonly Channel&lt;RenderJob&gt; _channel = Channel.CreateUnbounded&lt;RenderJob&gt;();
                    private readonly SemaphoreSlim _nvencSemaphore = new SemaphoreSlim(2, 2);
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-1">Producer nạp tác vụ tức thì (Non-blocking UI Thread):</div>
                  <div className="bg-black/50 p-3 rounded border border-white/5 text-emerald-300 select-all">
                    _channel.Writer.TryWrite(new RenderJob &#123; VideoPath = path, Nvenc = true &#125;);
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-1">Consumer vòng lặp nền & Tự động mở Windows Explorer khi hoàn tất:</div>
                  <div className="bg-black/50 p-3 rounded border border-white/5 text-amber-300 select-all">
                    Process.Start("explorer.exe", $"/select,\"&#123;outPath&#125;\"");
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DISPATCH TEST FORM */}
        {activeViewTab === "dispatch" && (
          <div className="bg-[#0f1527] border border-white/10 rounded-xl p-6 max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-400" />
                Thử Nghiệm Bắn Tác Vụ Vào Hàng Đợi (Test Non-Blocking Submission)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Gửi tác vụ nặng (Crawl, Demucs, Whisper, Neural TTS, NVENC) và kiểm chứng Web Server phản hồi trong 15ms mà không hề bị nghẽn luồng.
              </p>
            </div>

            <form onSubmit={handleDispatchJob} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">URL Video Nguồn (Crawl đa nền tảng)</label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-[#090d18] border border-white/10 rounded-lg px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Ngôn Ngữ Nguồn</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-[#090d18] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="auto">Tự động nhận diện (Whisper AI)</option>
                    <option value="en">Tiếng Anh (English)</option>
                    <option value="zh">Tiếng Trung (Chinese)</option>
                    <option value="ja">Tiếng Nhật (Japanese)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Ngôn Ngữ Đích (Dịch Thuật)</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-[#090d18] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                    <option value="en">Tiếng Anh (English)</option>
                    <option value="th">Tiếng Thái (Thai)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Giọng Đọc AI Neural</label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full bg-[#090d18] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="vi-VN-HoaiMyNeural">Hoài My (Nữ Truyền Cảm)</option>
                    <option value="vi-VN-NamMinhNeural">Nam Minh (Nam Trầm Ấm)</option>
                    <option value="vi-VN-CustomVoice">Voice Clone (CosyVoice / Bark)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Độ Phân Giải Xuất</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#090d18] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1080p">1080p Full HD (Local NVENC - Miễn Phí)</option>
                    <option value="4k">4K UHD 60FPS (Local NVENC - Miễn Phí)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Độ Ưu Tiên (In-Memory Channel)</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#090d18] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="high">High Priority (Xếp đầu hàng Channel)</option>
                    <option value="normal">Normal (FIFO In-Memory)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Đang nạp vào Channel...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Bắn Tác Vụ (Nạp Channel Trong &lt;10ms - Không Khóa UI)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 4: COMPARISON */}
        {activeViewTab === "comparison" && (
          <div className="bg-[#0f1527] border border-white/10 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                So Sánh: Đồng Bộ Block UI (Chưa Tối Ưu) vs In-Memory Channel & Semaphore (Karpathy Pattern)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Lý do vì sao ứng dụng Desktop Multimedia xử lý video nặng bắt buộc phải điều phối qua In-Memory Channel và Semaphore.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Monolithic */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle className="w-5 h-5" />
                  Xử Lý Đồng Bộ Cũ (Chạy trực tiếp trên UI Dispatcher Thread)
                </div>

                <div className="space-y-2 text-slate-300">
                  <div className="p-2.5 bg-rose-500/10 rounded border border-rose-500/20">
                    <strong className="text-rose-300">Đơ cứng giao diện (UI Freeze):</strong> Khi FFmpeg hay Whisper chạy, toàn bộ giao diện WPF/Desktop bị treo, con trỏ chuột quay tròn không bấm được gì.
                  </div>
                  <div className="p-2.5 bg-rose-500/10 rounded border border-rose-500/20">
                    <strong className="text-rose-300">Tràn VRAM card đồ họa (CUDA OOM):</strong> Người dùng bấm render liên tiếp nhiều video khiến FFmpeg mở cùng lúc, làm tràn bộ nhớ VRAM card NVIDIA và crash toàn bộ app.
                  </div>
                  <div className="p-2.5 bg-rose-500/10 rounded border border-rose-500/20">
                    <strong className="text-rose-300">Mất dữ liệu khi crash:</strong> Không có hàng đợi cách ly, nếu 1 sub-process lỗi là toàn bộ tác vụ đang dở dang bị hủy sạch.
                  </div>
                  <div className="p-2.5 bg-rose-500/10 rounded border border-rose-500/20">
                    <strong className="text-rose-300">Rác ổ đĩa tích tụ:</strong> Không có cơ chế RAII scratchpad tự động dọn dẹp, các file tạm .wav, .srt, .mp4 đệm ngốn hàng chục GB ổ cứng.
                  </div>
                </div>
              </div>

              {/* Decoupled */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  In-Memory Channel & Semaphore (Kiến Trúc Chuẩn Desktop Mới)
                </div>

                <div className="space-y-2 text-slate-300">
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <strong className="text-emerald-300">Giao diện 100% mượt mà:</strong> `Channel.Writer.TryWrite` nạp việc trong &lt;1ms. UI Thread hoàn toàn rảnh rỗi để cuộn, xem trước, tương tác 60fps.
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <strong className="text-emerald-300">Khống chế VRAM tuyệt đối (SemaphoreSlim):</strong> Giới hạn nghiêm ngặt tối đa 2 tác vụ NVENC chạy đồng thời; các job sau xếp hàng chờ tự động.
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <strong className="text-emerald-300">100% Offline & Bảo Mật:</strong> Không cần Redis, không phụ thuộc Cloudflare R2, lưu thẳng vào `Videos/CreatorOS` và tự động mở Windows Explorer.
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <strong className="text-emerald-300">RAII Clean-up tức thì:</strong> Khối `withJobWorkspace` / `try-finally` tự động xóa toàn bộ file tạm ngay sau khi video được chuyển vào thư mục đích.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
