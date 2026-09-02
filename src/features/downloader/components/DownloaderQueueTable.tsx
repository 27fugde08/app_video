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
  Download
} from "lucide-react";
import { VideoDownloadItem } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";
import { downloaderService } from "../services/downloaderService";

interface DownloaderQueueTableProps {
  items: VideoDownloadItem[];
  selectedIds: Set<string>;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onRemoveItem: (id: string) => void;
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
  onRemoveItem,
  platformFilter,
  setPlatformFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery
}) => {
  const { addToast } = useToast();
  const [activePreviewVideo, setActivePreviewVideo] = useState<VideoDownloadItem | null>(null);

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

  return (
    <div className="obsidian-card rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl space-y-0">
      {/* Table Filter & Search Top Bar */}
      <div className="p-3.5 sm:p-4 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Hàng đợi video
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono text-[10px] font-bold border border-violet-500/30">
              {items.length} mục
            </span>
          </div>

          {/* Quick Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-[#07090f] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="all">Tất cả nền tảng (4)</option>
            <option value="tiktok">TikTok</option>
            <option value="douyin">Douyin</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
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
          </select>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, tác giả..."
            className="w-full bg-[#07090f] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/40 outline-none transition-all"
          />
        </div>
      </div>

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
                      <div className="flex items-center justify-center gap-1.5">
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

      {/* Video Preview Player Modal */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="obsidian-card rounded-2xl max-w-lg w-full overflow-hidden border border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white truncate max-w-[320px]">
                    {activePreviewVideo.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {activePreviewVideo.platform.toUpperCase()} • {activePreviewVideo.resolution}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="w-full aspect-video rounded-xl bg-slate-950 overflow-hidden relative border border-white/10 flex items-center justify-center">
                <img
                  src={activePreviewVideo.thumbnail}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-2 p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/50 cursor-pointer hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                  <p className="text-xs font-bold">{activePreviewVideo.title}</p>
                </div>
              </div>

              <div className="bg-[#07090f] rounded-xl p-3 border border-white/10 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Vị trí tệp lưu:</span>
                  <span className="text-cyan-300 font-semibold truncate max-w-[260px]">
                    {activePreviewVideo.filePath}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Thời lượng / Kích thước:</span>
                  <span className="text-slate-200">
                    {activePreviewVideo.duration} • {activePreviewVideo.fileSize}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    handleOpenFolder(activePreviewVideo.filePath);
                    setActivePreviewVideo(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Mở tệp trong Explorer
                </button>
                <button
                  onClick={() => setActivePreviewVideo(null)}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
