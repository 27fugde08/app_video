import React, { useState } from "react";
import { HardDrive, Trash2, CheckCircle2 } from "lucide-react";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";

interface DiskSpaceIndicatorProps {
  currentPath?: string;
}

export const DiskSpaceIndicator: React.FC<DiskSpaceIndicatorProps> = ({ currentPath = "D:\\Downloads\\CreatorOS" }) => {
  const { addToast } = useToast();
  const [totalGb] = useState<number>(512.0);
  const [freeGb, setFreeGb] = useState<number>(284.5);
  const usedGb = totalGb - freeGb;
  const percentFree = Math.round((freeGb / totalGb) * 100);
  const usedPercent = 100 - percentFree;

  const handleCleanCache = () => {
    soundSynth.playSfx("success");
    setFreeGb((prev) => Math.min(totalGb - 10, prev + 12.4));
    addToast("🧹 Đã dọn sạch 12.4 GB tệp đệm tạm thời (Temp Cache) thành công!", "success");
  };

  return (
    <div className="h-7 bg-slate-900/90 border border-slate-800 rounded-lg px-3 flex items-center justify-between text-xs text-slate-300 select-none shadow-sm">
      <div className="flex items-center gap-2 truncate">
        <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="font-mono font-bold text-white">Ổ ({currentPath.slice(0, 2)}):</span>
        <span className="font-mono text-cyan-300 font-semibold">
          {freeGb.toFixed(1)} GB trống / {totalGb} GB
        </span>
        <div className="hidden sm:flex items-center gap-1.5 w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-700/60 mx-1">
          <div className="bg-cyan-500 h-full rounded-full transition-all duration-300" style={{ width: `${usedPercent}%` }}></div>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">{usedPercent}% đã dùng</span>
      </div>

      <button
        onClick={handleCleanCache}
        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        title="Dọn dẹp bộ nhớ đệm tạm"
      >
        <Trash2 className="w-3 h-3 text-rose-400" />
        <span>Dọn Cache</span>
      </button>
    </div>
  );
};
