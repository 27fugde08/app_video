import React, { useState, useRef, useEffect } from "react";
import { Terminal, ChevronDown, ChevronUp, Trash2, Copy, Sparkles } from "lucide-react";
import { DownloaderLogEntry } from "../types";
import { soundSynth } from "../../../utils/audioUtils";
import { useToast } from "../../../context/ToastContext";

interface DownloaderTerminalProps {
  logs: DownloaderLogEntry[];
  onClearLogs?: () => void;
}

export const DownloaderTerminal: React.FC<DownloaderTerminalProps> = ({ logs, onClearLogs }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { addToast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    soundSynth.playSfx("pop");
    addToast("Đã sao chép toàn bộ nhật ký terminal!", "info");
  };

  return (
    <div className="obsidian-card rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Terminal Bar Toggle */}
      <div
        onClick={() => {
          soundSynth.playSfx("pop");
          setIsOpen(!isOpen);
        }}
        className="px-4 py-3 bg-[#070910]/95 hover:bg-[#0a0d16] flex items-center justify-between cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-white font-mono tracking-wide">
            FastCrawl Terminal Output
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/5">
            {logs.length} sự kiện
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Terminal Screen */}
      {isOpen && (
        <div className="p-3.5 bg-[#030408] border-t border-white/[0.06] text-xs font-mono max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 shadow-inner">
          {logs.map((log) => {
            let color = "text-slate-300";
            if (log.type === "success") color = "text-emerald-400 font-semibold";
            if (log.type === "error") color = "text-rose-400 font-bold";
            if (log.type === "nvenc") color = "text-violet-400 font-semibold";
            if (log.type === "info") color = "text-cyan-300";

            return (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-600 shrink-0 text-[11px]">[{log.timestamp}]</span>
                <span className="text-slate-500 font-bold uppercase shrink-0 text-[10px] px-1 rounded bg-white/[0.04]">[{log.type}]</span>
                <span className={`${color} flex-1 text-[11px]`}>{log.message}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />

          {/* Bottom helper */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
            <button
              onClick={handleCopyLogs}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-white/5"
            >
              <Copy className="w-3 h-3 text-cyan-400" />
              <span>Sao chép nhật ký</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
