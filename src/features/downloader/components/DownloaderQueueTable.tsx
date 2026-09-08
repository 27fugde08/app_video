import React, { useState } from "react";
import {
  Play,
  Copy,
  ExternalLink,
  FolderOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowUpDown,
  Filter,
  Eye,
  Film,
  Music,
  Download,
  FileSignature,
  Sparkles,
  CheckSquare,
  X,
  FileSpreadsheet,
  FileJson,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import { VideoDownloadItem } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";
import { downloaderService } from "../services/downloaderService";
import { VideoAudioPreviewModal } from "./VideoAudioPreviewModal";
import { BatchRenamerModal } from "./BatchRenamerModal";

interface DownloaderQueueTableProps {
  items: VideoDownloadItem[];
  selectedIds: Set<string>;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onSelectSpecificIds?: (ids: string[]) => void;
  onRemoveItem: (id: string) => void;
  onRetryFailedTasks?: () => void;
  onDeleteSelected?: () => void;
  onClearSelection?: () => void;
  onBatchRename?: (renamedList: { id: string; newTitle: string; newFileName: string }[]) => void;
  onBatchTransferToDubbing?: (item?: VideoDownloadItem) => void;
  platformFilter: string;
  setPlatformFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const DownloaderQueueTable: React.FC<DownloaderQueueTableProps> = ({
  items,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  onSelectSpecificIds,
  onRemoveItem,
  onRetryFailedTasks,
  onDeleteSelected,
  onClearSelection,
  onBatchRename,
  onBatchTransferToDubbing,
  platformFilter,
  setPlatformFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery
}) => {
  const { addToast } = useToast();
  const [activePreviewVideo, setActivePreviewVideo] = useState<VideoDownloadItem | null>(null);
  const [isBatchRenamerOpen, setIsBatchRenamerOpen] = useState<boolean>(false);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    soundSynth.playSfx("pop");
    addToast("Đã sao chép liên kết vào bộ nhớ tạm!", "info");
  };

  const handleOpenFolder = async (path?: string) => {
    soundSynth.playSfx("pop");
    const result = await downloaderService.openFileOrFolder(path);
    addToast(result.message, result.success ? "success" : "info");
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;
    soundSynth.playSfx("pop");
    downloaderService.exportCatalog(items, "csv");
    addToast("Đã xuất danh mục video sang tệp Excel (.CSV) kèm UTF-8 BOM!", "success");
  };

  const handleExportJson = () => {
    if (items.length === 0) return;
    soundSynth.playSfx("pop");
    downloaderService.exportCatalog(items, "json");
    addToast("Đã xuất danh mục video sang tệp .JSON!", "success");
  };

  // Smart selection helpers
  const handleSelectOnlyCompleted = () => {
    soundSynth.playSfx("pop");
    const completedIds = items.filter((i) => i.status === "completed").map((i) => i.id);
    onSelectSpecificIds?.(completedIds);
    addToast(`Đã chọn ${completedIds.length} video đã hoàn tất`, "info");
  };

  const handleSelectOnlyFailed = () => {
    soundSynth.playSfx("pop");
    const failedIds = items.filter((i) => i.status === "failed" || i.status === "error").map((i) => i.id);
    onSelectSpecificIds?.(failedIds);
    addToast(`Đã chọn ${failedIds.length} video lỗi để xử lý`, "info");
  };

  const handleSelectTopViral = () => {
    soundSynth.playSfx("pop");
    const sorted = [...items].sort((a, b) => (b.views || 0) - (a.views || 0));
    const topIds = sorted.slice(0, 10).map((i) => i.id);
    onSelectSpecificIds?.(topIds);
    addToast(`Đã chọn Top 10 video có lượt xem cao nhất`, "success");
  };

  const selectedItemsList = items.filter((i) => selectedIds.has(i.id));

  return (
    <div className="obsidian-card rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl space-y-0">
      {/* Table Filter & Search Top Bar */}
      <div className="p-3.5 sm:p-4 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Hàng đợi video
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono text-[10px] font-bold border border-violet-500/30">
              {items.length} mục
            </span>
          </div>

          {/* Quick Platform Filter - Expanded to 10 platforms */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-[#07090f] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="all">Tất cả nền tảng</option>
            <option value="tiktok">TikTok</option>
            <option value="douyin">Douyin 抖音</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="xiaohongshu">Xiaohongshu 小红书</option>
            <option value="kuaishou">Kuaishou 快手</option>
            <option value="bilibili">Bilibili 哔哩哔哩</option>
            <option value="twitter">X / Twitter</option>
            <option value="threads">Threads</option>
          </select>

          {/* Quick Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#07090f] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Đã hoàn tất</option>
            <option value="queued">Chờ tải</option>
            <option value="downloading">Đang tải</option>
            <option value="failed">Thất bại / Lỗi</option>
          </select>

          {/* Smart Selection Preset Chips */}
          <div className="hidden lg:flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={handleSelectTopViral}
              className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer"
              title="Chọn Top 10 video nhiều views nhất"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Top Views</span>
            </button>
            <button
              type="button"
              onClick={handleSelectOnlyCompleted}
              className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
            >
              <span>Đã Xong</span>
            </button>
            <button
              type="button"
              onClick={handleSelectOnlyFailed}
              className="px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 cursor-pointer"
            >
              <span>Lỗi</span>
            </button>
          </div>

          {/* Export Catalog Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={items.length === 0}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Xuất bảng thống kê video ra file Excel (.CSV UTF-8)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Xuất Excel CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={items.length === 0}
              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer border border-white/10"
              title="Xuất danh sách JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>

          {/* Retry Failed Tasks Button */}
          {onRetryFailedTasks && items.some((i) => i.status === 'failed' || i.status === 'error') && (
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                onRetryFailedTasks();
                addToast("Đã đưa các tác vụ lỗi trở lại hàng đợi!", "info");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 cursor-pointer transition-colors shadow-sm"
              title="Thử lại tất cả các video bị hỏng/lỗi kết nối"
            >
              <RefreshCw className="w-3 h-3" />
              Thử lại tác vụ lỗi
            </button>
          )}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, kênh..."
            className="w-full bg-[#07090f] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/40 outline-none transition-all"
          />
        </div>
      </div>


      {/* Floating Sticky Batch Actions Toolbar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-950/80 via-indigo-950/80 to-purple-950/80 border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-cyan-200 font-bold">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <span>
              Đã chọn <strong className="text-white font-mono">{selectedIds.size}</strong> / {items.length} video
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch Renamer Button */}
            <button
              onClick={() => {
                soundSynth.playSfx("pop");
                setIsBatchRenamerOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-violet-600/30 cursor-pointer transition-all active:scale-95"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Đổi tên hàng loạt ({selectedIds.size})</span>
            </button>

            {/* Batch Transfer to AI Dubbing */}
            {onBatchTransferToDubbing && (
              <button
                onClick={onBatchTransferToDubbing}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>⚡ Lồng tiếng AI</span>
              </button>
            )}

            {/* Batch Delete */}
            {onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className="px-3 py-1.5 rounded-lg bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa đã chọn</span>
              </button>
            )}

            {/* Clear Selection */}
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Bỏ chọn tất cả"
              >
                <X className="w-3.5 h-3.5" />
                <span>Bỏ chọn</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[760px]">
          {/* Table Header */}
          <thead className="bg-[#080b14] text-slate-400 border-b border-white/[0.08] sticky top-0 z-10">
            <tr className="text-[10px] font-mono font-extrabold uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer bg-slate-900"
                />
              </th>
              <th className="py-3 px-3 w-12 text-center">STT</th>
              <th className="py-3 px-3 w-28">Xem trước</th>
              <th className="py-3 px-4">Thông tin video & Tác giả</th>
              <th className="py-3 px-3 w-32">Định dạng & Size</th>
              <th className="py-3 px-4 w-44">Tiến độ & Tốc độ</th>
              <th className="py-3 px-4 w-32 text-center">Thao tác</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/[0.04] text-xs text-slate-300">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Film className="w-8 h-8 text-slate-600" />
                    <p className="font-semibold text-slate-400 text-sm">Hàng đợi đang trống</p>
                    <p className="text-xs text-slate-600">
                      Dán danh sách liên kết vào ô nhập liệu ở trên và nhấn <strong>Bắt đầu quét</strong>.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-violet-950/25 hover:bg-violet-950/35"
                        : "hover:bg-white/[0.025]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="w-3.5 h-3.5 rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer bg-slate-900"
                      />
                    </td>

                    {/* STT */}
                    <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Thumbnail Preview */}
                    <td className="py-3 px-3">
                      <div
                        onClick={() => {
                          soundSynth.playSfx("pop");
                          setActivePreviewVideo(item);
                        }}
                        className="relative w-24 h-14 rounded-lg overflow-hidden bg-slate-950 border border-white/10 group cursor-pointer shrink-0 shadow-sm"
                        title="Bấm để xem video"
                      >
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-all">
                          <Play className="w-4 h-4 fill-white text-white opacity-90 group-hover:scale-110" />
                        </div>
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.2 rounded bg-black/80 text-white">
                          {item.duration}
                        </span>
                      </div>
                    </td>

                    {/* Info */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-cyan-300">
                            {item.platform}
                          </span>
                          <h4 className="font-semibold text-white truncate text-xs hover:text-cyan-300 cursor-pointer" title={item.title}>
                            {item.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>Kênh: <strong className="text-slate-300">{item.author}</strong></span>
                          <span>•</span>
                          <span className="truncate text-[10px] text-slate-500 max-w-[140px]" title={item.url}>
                            {item.url}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Resolution & Size */}
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div className="text-slate-200 font-semibold">{item.resolution}</div>
                      <div className="text-slate-400">{item.fileSize}</div>
                    </td>

                    {/* Progress & Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="flex items-center gap-1">
                            {item.status === "completed" && (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Hoàn tất
                              </span>
                            )}
                            {item.status === "downloading" && (
                              <span className="text-cyan-400 flex items-center gap-1 font-bold animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" /> {item.speed}
                              </span>
                            )}
                            {item.status === "extracting_audio" && (
                              <span className="text-purple-400 flex items-center gap-1 font-bold animate-pulse">
                                <Music className="w-3 h-3" /> Tách Audio
                              </span>
                            )}
                            {item.status === "queued" && (
                              <span className="text-slate-400">Sẵn sàng tải</span>
                            )}
                          </span>
                          <span className="font-bold text-slate-300">{item.progress}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.status === "completed"
                                ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                                : item.status === "downloading"
                                ? "bg-gradient-to-r from-cyan-400 to-blue-500"
                                : item.status === "extracting_audio"
                                ? "bg-purple-500"
                                : "bg-slate-700"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onBatchTransferToDubbing && item.status === "completed" && (
                          <button
                            onClick={() => onBatchTransferToDubbing(item)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                            title="Nạp video này vào Studio Lồng Tiếng AI"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyLink(item.url)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Sao chép link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenFolder(item.filePath)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                          title="Mở thư mục tệp"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Xóa khỏi danh sách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Video & Audio Preview Modal with Player and Demucs Waveform */}
      {activePreviewVideo && (
        <VideoAudioPreviewModal
          video={activePreviewVideo}
          onClose={() => setActivePreviewVideo(null)}
          onSendToDubbing={(v) => {
            if (onBatchTransferToDubbing) onBatchTransferToDubbing();
          }}
        />
      )}

      {/* Batch Renamer Rules Modal */}
      <BatchRenamerModal
        isOpen={isBatchRenamerOpen}
        selectedItems={selectedItemsList}
        onClose={() => setIsBatchRenamerOpen(false)}
        onApplyRename={(renamedList) => {
          if (onBatchRename) onBatchRename(renamedList);
        }}
      />
    </div>
  );
};
