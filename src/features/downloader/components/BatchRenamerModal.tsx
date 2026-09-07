import React, { useState, useMemo } from "react";
import {
  FileSignature,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Sliders,
  ArrowRight,
  Bookmark,
  FileText
} from "lucide-react";
import { VideoDownloadItem } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";

interface BatchRenamerModalProps {
  isOpen: boolean;
  selectedItems: VideoDownloadItem[];
  onClose: () => void;
  onApplyRename: (renamedItems: { id: string; newTitle: string; newFileName: string }[]) => void;
}

export const BatchRenamerModal: React.FC<BatchRenamerModalProps> = ({
  isOpen,
  selectedItems,
  onClose,
  onApplyRename
}) => {
  const { addToast } = useToast();

  const [pattern, setPattern] = useState<string>("{index}_{author}_{title}");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [startIndex, setStartIndex] = useState<number>(1);
  const [cleanSpecialChars, setCleanSpecialChars] = useState<boolean>(true);
  const [toLowercase, setToLowercase] = useState<boolean>(false);

  // Quick Preset Patterns
  const PRESET_PATTERNS = [
    { label: "STT + Tác Giả + Tiêu Đề", template: "{index}_{author}_{title}" },
    { label: "Nền Tảng + Kênh + STT", template: "{platform}_{author}_{index}" },
    { label: "Ngày Tải + Tiêu Đề", template: "{date}_{title}" },
    { label: "Tiêu Đề + Độ Phân Giải", template: "{title}_{resolution}" }
  ];

  // Token helper
  const addToken = (token: string) => {
    soundSynth.playSfx("pop");
    setPattern((prev) => `${prev}_${token}`);
  };

  // Compute live preview of renamed files
  const previews = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return selectedItems.map((item, idx) => {
      const idxNum = String(startIndex + idx).padStart(2, "0");
      let base = pattern
        .replace(/{index}/g, idxNum)
        .replace(/{author}/g, item.author.replace(/[@#]/g, ""))
        .replace(/{title}/g, item.title.slice(0, 45))
        .replace(/{platform}/g, item.platform.toUpperCase())
        .replace(/{date}/g, today)
        .replace(/{resolution}/g, item.resolution.split(" ")[0]);

      if (cleanSpecialChars) {
        // Clean non-alphanumeric except underscores and dashes
        base = base.replace(/[\/\\:*?"<>|#]/g, "").replace(/\s+/g, "_");
      }

      if (toLowercase) {
        base = base.toLowerCase();
      }

      const finalName = `${prefix ? prefix + "_" : ""}${base}${suffix ? "_" + suffix : ""}.mp4`;

      return {
        id: item.id,
        originalTitle: item.title,
        newTitle: base.replace(/_/g, " "),
        newFileName: finalName
      };
    });
  }, [selectedItems, pattern, prefix, suffix, startIndex, cleanSpecialChars, toLowercase]);

  const handleApply = () => {
    if (previews.length === 0) return;
    soundSynth.playSfx("cash");
    onApplyRename(previews);
    addToast(`Đã áp dụng quy tắc đổi tên thành công cho ${previews.length} video!`, "success");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="obsidian-card rounded-2xl max-w-2xl w-full overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0d16]/95">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shadow-md">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quy Tắc Đổi Tên Video Hàng Loạt</h3>
              <p className="text-xs text-slate-400">Áp dụng công thức đặt tên chuẩn cho {selectedItems.length} video đã chọn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Panel */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Mẫu Quy Tắc Phổ Biến:</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_PATTERNS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    soundSynth.playSfx("pop");
                    setPattern(preset.template);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    pattern === preset.template
                      ? "bg-violet-600/25 text-violet-300 border-violet-500/50 font-bold"
                      : "bg-[#07090f] text-slate-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern Input & Token Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Công thức tên (Pattern Tokens):</span>
              <span className="text-[11px] text-violet-400 font-mono">Bấm chip để chèn thêm</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="flex-1 bg-[#07090f] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 outline-none focus:border-violet-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { token: "{index}", desc: "Số thứ tự" },
                { token: "{author}", desc: "Tên Kênh" },
                { token: "{title}", desc: "Tiêu Đề Video" },
                { token: "{platform}", desc: "Nền Tảng" },
                { token: "{date}", desc: "Ngày Hiện Tại" },
                { token: "{resolution}", desc: "Độ Phân Giải" }
              ].map((t) => (
                <button
                  key={t.token}
                  onClick={() => addToken(t.token)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-violet-600/20 text-slate-300 hover:text-violet-300 border border-white/5 text-[11px] font-mono cursor-pointer transition-colors"
                  title={t.desc}
                >
                  +{t.token}
                </button>
              ))}
            </div>
          </div>

          {/* Options: Prefix, Suffix, Index, Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tiền tố (Prefix):</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ví dụ: REELS"
                className="w-full bg-[#07090f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Hậu tố (Suffix):</label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder="Ví dụ: 60FPS"
                className="w-full bg-[#07090f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Số bắt đầu:</label>
              <input
                type="number"
                min={1}
                value={startIndex}
                onChange={(e) => setStartIndex(parseInt(e.target.value) || 1)}
                className="w-full bg-[#07090f] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cleanSpecialChars}
                onChange={(e) => setCleanSpecialChars(e.target.checked)}
                className="rounded border-white/20 text-violet-500"
              />
              <span>Tự động khử ký tự đặc biệt & khoảng trắng thành dấu gạch dưới (_)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={toLowercase}
                onChange={(e) => setToLowercase(e.target.checked)}
                className="rounded border-white/20 text-violet-500"
              />
              <span>Chuyển tất cả sang chữ thường (lowercase slug)</span>
            </label>
          </div>

          {/* Live Preview List */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>Xem Trước Kết Quả Đổi Tên ({previews.length} video):</span>
              <span className="text-[11px] text-cyan-400 font-normal">Định dạng .mp4</span>
            </h4>

            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 bg-[#05070d] p-2.5 rounded-xl border border-white/5 text-xs font-mono">
              {previews.map((p, i) => (
                <div key={p.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-400 truncate max-w-[200px]" title={p.originalTitle}>
                    {i + 1}. {p.originalTitle}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-emerald-400 font-bold truncate max-w-[280px]" title={p.newFileName}>
                    {p.newFileName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#0a0d16] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-violet-600/30 transition-all active:scale-95"
          >
            Áp Dụng Đổi Tên Hàng Loạt
          </button>
        </div>
      </div>
    </div>
  );
};
