import React, { useState, useMemo } from "react";
import {
  Clock,
  Trash2,
  Copy,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit3,
  Eye,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  Sparkles,
  Share2,
  CalendarRange,
  X,
  Check
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";

export type ScheduleStatus = "pending" | "running" | "completed" | "failed" | "paused";

export interface ScheduleItem {
  id: string;
  stt: number;
  taskName: string;
  platform: "facebook" | "tiktok" | "youtube" | "instagram" | "twitter_x" | "zalo_video";
  accountName: string;
  videoTitle: string;
  scheduledTime: string;
  scheduledDate: string;
  status: ScheduleStatus;
  notes: string;
  retryCount?: number;
}

const INITIAL_SCHEDULES: ScheduleItem[] = [
  {
    id: "SCH_001",
    stt: 1,
    taskName: "Đăng Reels Viral - Tóm tắt phim Squid Game 2 Ep 1",
    platform: "facebook",
    accountName: "Thanh Đắc Lộc (Media Studio)",
    videoTitle: "squid_game_2_highlight_ep1_4k.mp4",
    scheduledTime: "11:30:00",
    scheduledDate: "2026-09-01",
    status: "completed",
    notes: "Khung giờ trưa vàng - Đã hoàn thành 100%",
    retryCount: 0
  },
  {
    id: "SCH_002",
    stt: 2,
    taskName: "Đăng TikTok - Top 5 AI tools sáng tạo video 2026",
    platform: "tiktok",
    accountName: "Viral Clips Studio Global",
    videoTitle: "ai_video_generator_top5.mp4",
    scheduledTime: "19:00:00",
    scheduledDate: "2026-09-01",
    status: "running",
    notes: "Khung giờ tối - Đang tải lên và render caption",
    retryCount: 0
  },
  {
    id: "SCH_003",
    stt: 3,
    taskName: "Đăng YouTube Shorts - Anime Fight 60FPS Recap",
    platform: "youtube",
    accountName: "Movie Recap & Anime 4K",
    videoTitle: "jujutsu_kaisen_s2_shorts.mp4",
    scheduledTime: "20:15:00",
    scheduledDate: "2026-09-01",
    status: "pending",
    notes: "Hẹn giờ tối nay - Kèm hashtag trending",
    retryCount: 0
  },
  {
    id: "SCH_004",
    stt: 4,
    taskName: "Đăng Instagram Reel - Travel Vlog Đà Lạt 4K",
    platform: "instagram",
    accountName: "Aesthetic Reels Official",
    videoTitle: "dalat_cinematic_travel_4k.mp4",
    scheduledTime: "07:30:00",
    scheduledDate: "2026-09-02",
    status: "pending",
    notes: "Đăng sáng sớm mai - Tag địa điểm",
    retryCount: 0
  },
  {
    id: "SCH_005",
    stt: 5,
    taskName: "Đăng Zalo Video - Review ẩm thực đường phố Sài Gòn",
    platform: "zalo_video",
    accountName: "Zalo Video Creator Pro",
    videoTitle: "saigon_street_food_part3.mp4",
    scheduledTime: "12:00:00",
    scheduledDate: "2026-09-02",
    status: "pending",
    notes: "Khung giờ ăn trưa ngày mai",
    retryCount: 0
  },
  {
    id: "SCH_006",
    stt: 6,
    taskName: "Đăng X (Twitter) Video - Bản tin Crypto & Tech AI",
    platform: "twitter_x",
    accountName: "Crypto & Tech Trends X",
    videoTitle: "crypto_market_update_morning.mp4",
    scheduledTime: "08:45:00",
    scheduledDate: "2026-08-31",
    status: "failed",
    notes: "Lỗi timeout mạng proxy US, đã thử lại 2 lần",
    retryCount: 2
  }
];

export const PostScheduleTool: React.FC = () => {
  const { addToast } = useToast();

  const [schedules, setSchedules] = useState<ScheduleItem[]>(INITIAL_SCHEDULES);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Range Select
  const [rangeFrom, setRangeFrom] = useState<number>(0);
  const [rangeTo, setRangeTo] = useState<number>(0);

  // Filters (Matching Screenshot Toolbar Row 2)
  const [searchDate, setSearchDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [noteSearch, setNoteSearch] = useState<string>("");

  // Modal: Sao chép lịch trình
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [targetCopyDate, setTargetCopyDate] = useState<string>("2026-09-03");
  const [targetCopyHourOffset, setTargetCopyHourOffset] = useState<number>(24);

  // Filtered List
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // Date filter
      if (searchDate && item.scheduledDate !== searchDate) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      // Note search
      if (
        noteSearch.trim() &&
        !item.notes.toLowerCase().includes(noteSearch.toLowerCase()) &&
        !item.taskName.toLowerCase().includes(noteSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [schedules, searchDate, statusFilter, noteSearch]);

  // Checkbox select all
  const isAllSelected =
    filteredSchedules.length > 0 &&
    filteredSchedules.every((s) => selectedIds.includes(s.id));

  const handleToggleSelectAll = () => {
    soundSynth.playSfx("pop");
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSchedules.map((s) => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Range Select
  const handleRangeSelect = () => {
    soundSynth.playSfx("pop");
    const from = Math.max(1, rangeFrom);
    const to = Math.max(from, rangeTo);

    const ids: string[] = [];
    filteredSchedules.forEach((item, idx) => {
      const order = idx + 1;
      if (order >= from && order <= to) {
        ids.push(item.id);
      }
    });

    setSelectedIds(ids);
    addToast(`Đã tích chọn ${ids.length} lịch trình từ số ${from} đến ${to}`, "info");
  };

  // Delete Selected
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 lịch trình để xoá!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const toDeleteSet = new Set(selectedIds);
    setSchedules((prev) => prev.filter((s) => !toDeleteSet.has(s.id)));
    setSelectedIds([]);
    addToast(`Đã xóa thành công ${toDeleteSet.size} lịch trình đã chọn!`, "success");
  };

  // Delete Single
  const handleDeleteSingle = (id: string) => {
    soundSynth.playSfx("pop");
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    addToast("Đã xóa lịch trình thành công!", "success");
  };

  // Execute Now
  const handleRunSingle = (id: string) => {
    soundSynth.playSfx("pop");
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "running" } : s))
    );
    addToast("Bắt đầu khởi chạy tác vụ đăng bài ngay...", "info");

    setTimeout(() => {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "completed", notes: "Đã đăng bài thành công ngay lập tức" }
            : s
        )
      );
      soundSynth.playSfx("success");
      addToast("Đăng bài hoàn tất thành công!", "success");
    }, 1500);
  };

  // Copy Schedule Confirm
  const handleConfirmCopySchedules = () => {
    if (selectedIds.length === 0) {
      addToast("Vui lòng tích chọn các lịch trình cần sao chép trước!", "warning");
      return;
    }
    soundSynth.playSfx("pop");

    const toCopy = schedules.filter((s) => selectedIds.includes(s.id));
    const newItems: ScheduleItem[] = toCopy.map((item, idx) => ({
      ...item,
      id: `SCH_CPY_${Date.now().toString().slice(-4)}_${idx + 1}`,
      stt: schedules.length + idx + 1,
      scheduledDate: targetCopyDate || item.scheduledDate,
      status: "pending",
      notes: `[Bản sao] ${item.notes}`
    }));

    setSchedules((prev) => [...prev, ...newItems]);
    setIsCopyModalOpen(false);
    soundSynth.playSfx("success");
    addToast(`Đã sao chép thành công ${newItems.length} lịch trình sang ngày ${targetCopyDate}!`, "success");
  };

  // Status Badge Helper
  const renderStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Thành công
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            Đang chạy
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
            <XCircle className="w-3 h-3 text-rose-400" />
            Thất bại
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[11px] font-bold">
            <Clock className="w-3 h-3 text-blue-400" />
            Đang chờ
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header (Matching Screenshot: 🕒 Lịch trình đăng bài) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <Clock className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-xs text-rose-400">🕒</span> Lịch trình đăng bài
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {schedules.length} Tác vụ
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Quản lý hàng đợi, thời gian biểu và trạng thái đăng bài tự động trên các nền tảng
            </p>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar (Matching Screenshot Row 1 & Row 2) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
        {/* Row 1: Chọn lịch đặt từ: [0] đến [0] [Chọn] [Xóa lịch trình đã chọn] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Chọn lịch đặt từ:</span>
            <input
              type="number"
              min={0}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(parseInt(e.target.value) || 0)}
              className="w-12 bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-center font-mono text-white outline-none focus:border-rose-500"
            />
            <span className="text-slate-400 font-medium">đến</span>
            <input
              type="number"
              min={0}
              value={rangeTo}
              onChange={(e) => setRangeTo(parseInt(e.target.value) || 0)}
              className="w-12 bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-center font-mono text-white outline-none focus:border-rose-500"
            />
            <button
              onClick={handleRangeSelect}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
            >
              Chọn
            </button>
          </div>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Xóa lịch trình đã chọn</span>
            {selectedIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-white font-mono text-[10px]">
                {selectedIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: [Chọn ngày cần tìm kiếm] [Tất cả ⌵] [Tìm kiếm theo ghi chú] [Sao chép lịch trình (#ff2b54)] */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Input chọn ngày */}
          <div className="relative">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500 cursor-pointer min-w-[160px]"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
                title="Bỏ lọc ngày"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dropdown Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500 cursor-pointer min-w-[120px]"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Đang chờ</option>
            <option value="running">Đang chạy</option>
            <option value="completed">Thành công</option>
            <option value="failed">Thất bại</option>
            <option value="paused">Tạm dừng</option>
          </select>

          {/* Tìm kiếm theo ghi chú */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm theo ghi chú"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            {noteSearch && (
              <button
                onClick={() => setNoteSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Nút Đỏ: Sao chép lịch trình (#ff2b54) */}
          <button
            onClick={() => {
              if (selectedIds.length === 0) {
                addToast("Vui lòng tích chọn các lịch trình cần sao chép!", "warning");
                return;
              }
              soundSynth.playSfx("pop");
              setIsCopyModalOpen(true);
            }}
            className="px-4 py-1.5 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao chép lịch trình</span>
          </button>
        </div>
      </div>

      {/* 3. Table with Solid Red Header (#ff2b54) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-[#ff2b54] text-white uppercase tracking-wider font-bold">
                <th className="py-3 px-4 w-16 text-center">STT</th>
                <th className="py-3 px-3 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-white/40 text-rose-700 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-white"
                  />
                </th>
                <th className="py-3 px-4 min-w-[220px]">Tên tác vụ</th>
                <th className="py-3 px-4 w-44">Thời gian</th>
                <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                <th className="py-3 px-4">Ghi chú</th>
                <th className="py-3 px-4 w-32 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    Không tìm thấy lịch trình đăng bài nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-white/[0.04] ${
                        isSelected ? "bg-rose-500/[0.08]" : ""
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="rounded border-white/20 text-rose-600 focus:ring-0 cursor-pointer w-3.5 h-3.5 accent-rose-500"
                        />
                      </td>

                      {/* Tên tác vụ */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.taskName}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-cyan-400">{item.accountName}</span>
                          <span>•</span>
                          <span className="text-slate-500 truncate max-w-[180px] font-mono">
                            {item.videoTitle}
                          </span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span className="font-bold">{item.scheduledTime}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <CalendarIcon className="w-3 h-3 text-slate-500" />
                          <span>{item.scheduledDate}</span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-center">{renderStatusBadge(item.status)}</td>

                      {/* Ghi chú */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="line-clamp-2">{item.notes}</span>
                      </td>

                      {/* Hành động */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status !== "completed" && (
                            <button
                              onClick={() => handleRunSingle(item.id)}
                              className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                              title="Chạy ngay lập tức"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSingle(item.id)}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Xóa lịch trình"
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
      </div>

      {/* MODAL: Sao chép lịch trình */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-rose-600/20 via-pink-600/10 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Copy className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Sao Chép Lịch Trình Đăng</h3>
                  <p className="text-[11px] text-slate-400">
                    Đang chọn {selectedIds.length} tác vụ để nhân bản
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Chọn ngày mới cần dán lịch trình:
                </label>
                <input
                  type="date"
                  value={targetCopyDate}
                  onChange={(e) => setTargetCopyDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 font-mono cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-900/60 border border-white/10 rounded-xl space-y-1.5 text-slate-400">
                <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  Quy tắc nhân bản thông minh:
                </div>
                <p>• Giữ nguyên thời gian (giờ:phút:giây) và chỉ thay đổi ngày đăng.</p>
                <p>• Trạng thái tác vụ tự động chuyển về [Đang chờ].</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmCopySchedules}
                  className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Xác nhận sao chép</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
