import React, { useState } from "react";
import { HardDrive, AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";

interface DiskSpaceIndicatorProps {
  currentPath?: string;
}

export const DiskSpaceIndicator: React.FC<DiskSpaceIndicatorProps> = ({ currentPath = "D:\\Downloads\\CreatorOS" }) => {
  const { addToast } = useToast();

  // Simulated disk state (Total 512 GB)
  const [totalGb] = useState<number>(512.0);
  const [freeGb, setFreeGb] = useState<number>(284.5);
  const [isSimulatingLowSpace, setIsSimulatingLowSpace] = useState<boolean>(false);

  const usedGb = totalGb - freeGb;
  const percentFree = Math.round((freeGb / totalGb) * 100);

  // Status: Safe (> 20GB), Warning (5-20GB), Critical (< 5GB)
  const isCritical = freeGb < 5.0;
  const isWarning = freeGb >= 5.0 && freeGb < 20.0;

  const toggleLowSpaceTest = () => {
    soundSynth.playSfx("bell");
    if (!isSimulatingLowSpace) {
      setFreeGb(3.2); // Below 5GB
      setIsSimulatingLowSpace(true);
      addToast("⚠️ [Test Luồng] Đã kích hoạt giả lập dung lượng ổ cứng nguy cấp (< 5GB)!", "warning");
    } else {
      setFreeGb(284.5);
      setIsSimulatingLowSpace(false);
      addToast("Đã khôi phục dung lượng ổ cứng về mức an toàn (284.5 GB trống).", "success");
    }
  };

  const handleCleanTempCache = () => {
    soundSynth.playSfx("success");
    setFreeGb((prev) => Math.min(totalGb - 10, prev + 12.4));
    addToast("Đã dọn dẹp 12.4 GB tệp tạm, video render cache & file log cũ!", "success");
  };

  return (
    <div
      className={`rounded-xl p-2.5 border transition-all text-xs ${
        isCritical
          ? "bg-rose-950/40 border-rose-500/60 text-rose-200 animate-pulse shadow-lg shadow-rose-900/30"
          : isWarning
          ? "bg-amber-950/30 border-amber-500/40 text-amber-200 shadow-md shadow-amber-900/20"
          : "bg-[#07090f] border-white/10 text-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Drive Info */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isCritical
                ? "bg-rose-500/20 text-rose-400"
                : isWarning
                ? "bg-amber-500/20 text-amber-400"
                : "bg-cyan-500/20 text-cyan-300"
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="w-4 h-4 animate-bounce text-rose-400" />
            ) : (
              <HardDrive className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold">
              <span>Ổ Lưu Trữ ({currentPath.slice(0, 2)}):</span>
              <span
                className={
                  isCritical
                    ? "text-rose-400 font-extrabold"
                    : isWarning
                    ? "text-amber-300 font-extrabold"
                    : "text-white font-mono"
                }
              >
                {freeGb.toFixed(1)} GB trống / {totalGb} GB ({percentFree}%)
              </span>
              {isCritical && (
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9px] uppercase tracking-wider">
                  SẮP ĐẦY
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-mono">
              {isCritical
                ? "Nguy cơ lỗi ghi tệp hoặc văng tiến trình nếu tiếp tục tải batch!"
                : `Khả dụng: Có thể chứa thêm ~${Math.floor(freeGb * 22)} video 1080p`}
            </p>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-900 overflow-hidden border border-white/10 shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCritical
                  ? "bg-rose-500 shadow-sm shadow-rose-500"
                  : isWarning
                  ? "bg-amber-400"
                  : "bg-gradient-to-r from-cyan-400 to-emerald-400"
              }`}
              style={{ width: `${100 - percentFree}%` }}
            ></div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCleanTempCache}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Dọn dẹp cache giải phóng dung lượng"
            >
              <Trash2 className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Dọn Cache</span>
            </button>

            <button
              onClick={toggleLowSpaceTest}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                isSimulatingLowSpace
                  ? "bg-rose-500/30 text-rose-300 border-rose-500/50"
                  : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/10"
              }`}
              title="Nhấn để thử nghiệm phản ứng giao diện khi ổ cứng < 5GB"
            >
              {isSimulatingLowSpace ? "Khôi phục 284GB" : "Test < 5GB"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
