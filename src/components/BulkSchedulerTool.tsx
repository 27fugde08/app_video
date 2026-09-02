import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  HelpCircle,
  Video,
  Plus,
  Trash2,
  Edit3,
  Clock,
  UserCheck,
  CheckCircle2,
  Film,
  Sparkles,
  Layers,
  Zap,
  Facebook,
  Music2,
  Youtube,
  Instagram,
  Twitter,
  PlayCircle,
  X,
  Check,
  ChevronDown,
  Timer,
  Sliders,
  UploadCloud
} from "lucide-react";
import { soundSynth } from "../utils/audioUtils";
import { useToast } from "../context/ToastContext";

export interface BulkScheduleItem {
  id: string;
  stt: number;
  accountId: string;
  accountName: string;
  accountAvatar: string;
  platform: "facebook" | "tiktok" | "youtube" | "instagram" | "twitter_x" | "zalo_video";
  videoTitle: string;
  videoThumb: string;
  videoDuration: string;
  scheduledDateTime: string;
  status: "ready" | "scheduled" | "processing" | "done";
}

export interface AvailableVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  size: string;
  selected?: boolean;
}

const SAMPLE_VIDEOS: AvailableVideo[] = [
  {
    id: "vid_1",
    title: "10_bi_mat_cong_nghe_ai_nam_2026.mp4",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=120&fit=crop",
    duration: "00:58",
    size: "24.5 MB"
  },
  {
    id: "vid_2",
    title: "review_phim_anime_sat_thu_ep03.mp4",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=120&fit=crop",
    duration: "01:24",
    size: "38.2 MB"
  },
  {
    id: "vid_3",
    title: "meo_nau_an_nhanh_trong_5_phut.mp4",
    thumbnail: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=120&fit=crop",
    duration: "00:45",
    size: "18.9 MB"
  },
  {
    id: "vid_4",
    title: "du_lich_kham_pha_hang_son_doong_4k.mp4",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=120&fit=crop",
    duration: "01:10",
    size: "42.1 MB"
  },
  {
    id: "vid_5",
    title: "top_co_phieu_tiem_nang_quy_3.mp4",
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop",
    duration: "00:52",
    size: "21.0 MB"
  }
];

const INITIAL_BULK_ITEMS: BulkScheduleItem[] = [
  {
    id: "BSCH_1",
    stt: 1,
    accountId: "acc_1",
    accountName: "Thanh Đắc Lộc (Media Studio)",
    accountAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    platform: "facebook",
    videoTitle: "10_bi_mat_cong_nghe_ai_nam_2026.mp4",
    videoThumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=120&fit=crop",
    videoDuration: "00:58",
    scheduledDateTime: "2026-09-01 11:30:00",
    status: "scheduled"
  },
  {
    id: "BSCH_2",
    stt: 2,
    accountId: "acc_2",
    accountName: "Viral Clips Studio Global",
    accountAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
    platform: "tiktok",
    videoTitle: "review_phim_anime_sat_thu_ep03.mp4",
    videoThumb: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=120&fit=crop",
    videoDuration: "01:24",
    scheduledDateTime: "2026-09-01 19:15:00",
    status: "scheduled"
  },
  {
    id: "BSCH_3",
    stt: 3,
    accountId: "acc_3",
    accountName: "Movie Recap & Anime 4K",
    accountAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    platform: "youtube",
    videoTitle: "du_lich_kham_pha_hang_son_doong_4k.mp4",
    videoThumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=120&fit=crop",
    videoDuration: "01:10",
    scheduledDateTime: "2026-09-02 08:00:00",
    status: "ready"
  }
];

export const BulkSchedulerTool: React.FC = () => {
  const { addToast } = useToast();

  const [bulkItems, setBulkItems] = useState<BulkScheduleItem[]>(INITIAL_BULK_ITEMS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isCycleModalOpen, setIsCycleModalOpen] = useState<boolean>(false);
  const [isVideoPickerModalOpen, setIsVideoPickerModalOpen] = useState<boolean>(false);
  const [isAddNewScheduleModalOpen, setIsAddNewScheduleModalOpen] = useState<boolean>(false);

  // Cycle Distribution Settings
  const [cycleStartDate, setCycleStartDate] = useState<string>("2026-09-01");
  const [cycleStartTime, setCycleStartTime] = useState<string>("11:00");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(90);
  const [postsPerDay, setPostsPerDay] = useState<number>(3);
  const [goldenHoursOnly, setGoldenHoursOnly] = useState<boolean>(true);

  // Video Picker State
  const [availableVideos, setAvailableVideos] = useState<AvailableVideo[]>(SAMPLE_VIDEOS);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(["vid_1", "vid_2"]);

  // Add New Single/Multi Schedule Form
  const [newAccName, setNewAccName] = useState<string>("Thanh Đắc Lộc (Media Studio)");
  const [newPlatform, setNewPlatform] = useState<BulkScheduleItem["platform"]>("facebook");
  const [newDateTime, setNewDateTime] = useState<string>("2026-09-02T14:30");
  const [newVideoTitle, setNewVideoTitle] = useState<string>("10_bi_mat_cong_nghe_ai_nam_2026.mp4");

  // Select all checkbox
  const isAllSelected =
    bulkItems.length > 0 && bulkItems.every((item) => selectedIds.includes(item.id));

  const handleToggleSelectAll = () => {
    soundSynth.playSfx("pop");
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bulkItems.map((b) => b.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    soundSynth.playSfx("pop");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Delete Single
  const handleDeleteItem = (id: string) => {
    soundSynth.playSfx("pop");
    setBulkItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    addToast("Đã xóa mục lên lịch!", "success");
  };

  // Delete Selected
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      addToast("Vui lòng tích chọn ít nhất 1 dòng để xóa!", "warning");
      return;
    }
    soundSynth.playSfx("pop");
    const toDeleteSet = new Set(selectedIds);
    setBulkItems((prev) => prev.filter((item) => !toDeleteSet.has(item.id)));
    setSelectedIds([]);
    addToast(`Đã xóa ${toDeleteSet.size} lịch trình đã chọn!`, "success");
  };

  // Apply Cycle Distribution
  const handleApplyCycleDistribution = () => {
    soundSynth.playSfx("pop");
    let currentHour = 11;
    let currentMinute = 30;
    let dayOffset = 0;

    const goldenHours = ["08:00:00", "11:30:00", "19:00:00", "20:30:00"];

    const updated = bulkItems.map((item, index) => {
      let timeStr = "";
      if (goldenHoursOnly) {
        const slotIdx = index % goldenHours.length;
        if (index > 0 && slotIdx === 0) {
          dayOffset += 1;
        }
        const dateObj = new Date(cycleStartDate || "2026-09-01");
        dateObj.setDate(dateObj.getDate() + dayOffset);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        timeStr = `${y}-${m}-${d} ${goldenHours[slotIdx]}`;
      } else {
        const totalMinutes = index * intervalMinutes;
        const totalHours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        timeStr = `${cycleStartDate} ${String((currentHour + totalHours) % 24).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
      }

      return {
        ...item,
        scheduledDateTime: timeStr,
        status: "scheduled" as const
      };
    });

    setBulkItems(updated);
    setIsCycleModalOpen(false);
    soundSynth.playSfx("success");
    addToast(`Đã phân bổ chu kỳ thời gian cho ${updated.length} lịch đăng!`, "success");
  };

  // Confirm Video Picker
  const handleConfirmVideoPicker = () => {
    soundSynth.playSfx("pop");
    const chosen = availableVideos.filter((v) => selectedVideoIds.includes(v.id));
    if (chosen.length === 0) {
      addToast("Vui lòng chọn ít nhất 1 video!", "warning");
      return;
    }

    // Auto-create or map schedule items with chosen videos
    const newItems: BulkScheduleItem[] = chosen.map((vid, idx) => {
      const existing = bulkItems[idx];
      return {
        id: `BSCH_${Date.now().toString().slice(-4)}_${idx + 1}`,
        stt: bulkItems.length + idx + 1,
        accountId: existing ? existing.accountId : "acc_1",
        accountName: existing ? existing.accountName : "Thanh Đắc Lộc (Media Studio)",
        accountAvatar: existing
          ? existing.accountAvatar
          : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
        platform: existing ? existing.platform : "facebook",
        videoTitle: vid.title,
        videoThumb: vid.thumbnail,
        videoDuration: vid.duration,
        scheduledDateTime: `2026-09-02 ${String(10 + idx * 2).padStart(2, "0")}:00:00`,
        status: "ready"
      };
    });

    setBulkItems((prev) => [...prev, ...newItems]);
    setIsVideoPickerModalOpen(false);
    soundSynth.playSfx("success");
    addToast(`Đã gán ${chosen.length} video vào danh sách lên lịch hàng loạt!`, "success");
  };

  // Confirm Add Single Schedule
  const handleConfirmAddSingle = () => {
    soundSynth.playSfx("pop");
    const newItem: BulkScheduleItem = {
      id: `BSCH_${Date.now().toString().slice(-4)}`,
      stt: bulkItems.length + 1,
      accountId: "acc_custom",
      accountName: newAccName,
      accountAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      platform: newPlatform,
      videoTitle: newVideoTitle,
      videoThumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=120&fit=crop",
      videoDuration: "00:45",
      scheduledDateTime: newDateTime.replace("T", " ") + ":00",
      status: "scheduled"
    };

    setBulkItems((prev) => [...prev, newItem]);
    setIsAddNewScheduleModalOpen(false);
    soundSynth.playSfx("success");
    addToast("Đã thêm lịch trình đăng mới thành công!", "success");
  };

  // Platform icon helper
  const renderPlatformIcon = (plat: BulkScheduleItem["platform"]) => {
    switch (plat) {
      case "facebook":
        return <Facebook className="w-3.5 h-3.5 text-blue-500" />;
      case "tiktok":
        return <Music2 className="w-3.5 h-3.5 text-cyan-400" />;
      case "youtube":
        return <Youtube className="w-3.5 h-3.5 text-red-500" />;
      case "instagram":
        return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
      case "twitter_x":
        return <Twitter className="w-3.5 h-3.5 text-slate-300" />;
      case "zalo_video":
        return <PlayCircle className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header with Top-Right Action Buttons (Matching Screenshot) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 border border-rose-500/30 flex items-center justify-center shadow-inner">
            <CalendarIcon className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-xs text-rose-400">📅</span> Lên lịch hàng loạt
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {bulkItems.length} Lịch trình
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Phân bổ chu kỳ đăng video tự động, gán video cho nhiều tài khoản và hẹn giờ thông minh
            </p>
          </div>
        </div>

        {/* Top-Right Action Buttons (Matching Screenshot: [❓ Phân bổ theo chu kỳ] & [Chọn videos]) */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {/* Teal/Cyan Button: Phân bổ theo chu kỳ */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsCycleModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#00a8a8] hover:bg-[#008f8f] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Phân bổ theo chu kỳ</span>
          </button>

          {/* Red Button: Chọn videos (#ff2b54) */}
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsVideoPickerModalOpen(true);
            }}
            className="px-4 py-1.5 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Chọn videos</span>
          </button>
        </div>
      </div>

      {/* 2. Main Table with Solid Red Header (#ff2b54) */}
      <div className="bg-[#0b0e17]/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {/* Sub-action bar above or inside table: [+ Thêm lịch trình đăng mới] */}
        <div className="p-3 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsAddNewScheduleModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
            <span>Thêm lịch trình đăng mới</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Xóa {selectedIds.length} mục đã chọn</span>
            </button>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs min-w-[750px]">
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
                <th className="py-3 px-4 min-w-[220px]">Tài khoản</th>
                <th className="py-3 px-4 min-w-[240px]">Videos</th>
                <th className="py-3 px-4 w-52">Thời gian</th>
                <th className="py-3 px-4 w-32 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {bulkItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    Chưa có lịch trình đăng hàng loạt nào. Nhấn <strong>Thêm lịch trình đăng mới</strong> hoặc <strong>Chọn videos</strong> để bắt đầu.
                  </td>
                </tr>
              ) : (
                bulkItems.map((item, idx) => {
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

                      {/* Tài khoản */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 bg-slate-800 shrink-0">
                            <img
                              src={item.accountAvatar}
                              alt={item.accountName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-white">
                              {renderPlatformIcon(item.platform)}
                              <span className="truncate max-w-[170px]">{item.accountName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {item.accountId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Videos */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-6 rounded overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                            <img
                              src={item.videoThumb}
                              alt={item.videoTitle}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 font-mono truncate max-w-[200px]">
                              {item.videoTitle}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              Thời lượng: {item.videoDuration}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-white font-bold">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span>{item.scheduledDateTime}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Trạng thái: <span className="text-cyan-400 font-semibold uppercase">{item.status}</span>
                        </div>
                      </td>

                      {/* Hành động */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Xóa dòng lịch này"
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

      {/* MODAL 1: Phân bổ theo chu kỳ (Teal Dialog) */}
      {isCycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-[#00a8a8]/25 via-cyan-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00a8a8]/20 border border-[#00a8a8]/40 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Phân Bổ Lịch Theo Chu Kỳ</h3>
                  <p className="text-[11px] text-slate-400">Tự động tính toán và dải đều mốc thời gian đăng bài</p>
                </div>
              </div>
              <button
                onClick={() => setIsCycleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Start Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Ngày bắt đầu:</label>
                  <input
                    type="date"
                    value={cycleStartDate}
                    onChange={(e) => setCycleStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Giờ bắt đầu:</label>
                  <input
                    type="time"
                    value={cycleStartTime}
                    onChange={(e) => setCycleStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Golden Hours Checkbox */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={goldenHoursOnly}
                    onChange={(e) => setGoldenHoursOnly(e.target.checked)}
                    className="rounded text-cyan-500 accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Ưu tiên rơi vào khung giờ vàng (Golden Peak Hours)</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">
                  Tự động dải các video vào các khung giờ nhiều tương tác: <strong>08:00</strong> (Sáng), <strong>11:30</strong> (Trưa), <strong>19:00</strong> & <strong>20:30</strong> (Tối).
                </p>
              </div>

              {!goldenHoursOnly && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Khoảng cách giữa các bài đăng (phút):
                  </label>
                  <input
                    type="number"
                    min={15}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 60)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsCycleModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApplyCycleDistribution}
                  className="px-5 py-2 rounded-lg bg-[#00a8a8] hover:bg-[#008f8f] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Áp dụng chu kỳ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Chọn videos (Red Dialog) */}
      {isVideoPickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-rose-600/25 via-pink-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Video className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Kho Video Sẵn Sàng Đăng</h3>
                  <p className="text-[11px] text-slate-400">Chọn video để gán vào hàng đợi đăng bài</p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoPickerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar p-1">
                {availableVideos.map((vid) => {
                  const isChecked = selectedVideoIds.includes(vid.id);
                  return (
                    <div
                      key={vid.id}
                      onClick={() => {
                        soundSynth.playSfx("pop");
                        setSelectedVideoIds((prev) =>
                          prev.includes(vid.id)
                            ? prev.filter((id) => id !== vid.id)
                            : [...prev, vid.id]
                        );
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-center ${
                        isChecked
                          ? "bg-rose-500/15 border-rose-500/40 shadow-inner"
                          : "bg-slate-900/80 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative">
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-white">
                          {vid.duration}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate font-mono">
                          {vid.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{vid.size}</div>
                      </div>
                      <div className="shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-rose-600 accent-rose-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-slate-400">
                  Đã chọn: <strong className="text-white">{selectedVideoIds.length}</strong> videos
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsVideoPickerModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmVideoPicker}
                    className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác nhận chọn</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Thêm lịch trình đăng mới */}
      {isAddNewScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e121e] border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-rose-600/25 via-pink-600/15 to-transparent border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thêm Lịch Trình Đăng Mới</h3>
                  <p className="text-[11px] text-slate-400">Tùy chỉnh tài khoản, video và thời gian đăng</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddNewScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Tên tài khoản / Page:</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nền tảng:</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="facebook">Facebook (Reels / Fanpage)</option>
                  <option value="tiktok">TikTok Video</option>
                  <option value="youtube">YouTube Shorts</option>
                  <option value="instagram">Instagram Reels</option>
                  <option value="twitter_x">Twitter (X)</option>
                  <option value="zalo_video">Zalo Video Creator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Tên tệp Video:</label>
                <input
                  type="text"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Thời gian đăng:</label>
                <input
                  type="datetime-local"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsAddNewScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmAddSingle}
                  className="px-5 py-2 rounded-lg bg-[#ff2b54] hover:bg-[#e02047] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo lịch đăng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
