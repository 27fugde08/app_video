import React, { useEffect, useState } from "react";
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, WifiOff } from "lucide-react";
import { ipcBridge, BridgeHealthStatus, HeartbeatTelemetry } from "../../core/ipc/ipcBridge";
import { soundSynth } from "../../utils/audioUtils";

export const DaemonStatusPill: React.FC = () => {
  const [telemetry, setTelemetry] = useState<HeartbeatTelemetry>(() => ipcBridge.getTelemetry());
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const unsubscribe = ipcBridge.onStatusChange((newTelemetry) => {
      setTelemetry(newTelemetry);
    });
    return () => unsubscribe();
  }, []);

  const handleManualHeal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    soundSynth.playSfx("pop");
    await ipcBridge.manualReconnect();
  };

  const getStatusBadge = (status: BridgeHealthStatus) => {
    switch (status) {
      case "ONLINE":
        return {
          label: "ONLINE",
          colorClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          dotClass: "bg-emerald-400 animate-pulse",
          icon: ShieldCheck
        };
      case "DEGRADED":
        return {
          label: `DEGRADED (${telemetry.missedPings}/3)`,
          colorClass: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          dotClass: "bg-amber-400 animate-ping",
          icon: AlertTriangle
        };
      case "HEALING":
        return {
          label: `HEALING #${telemetry.healingAttempts}`,
          colorClass: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
          dotClass: "bg-cyan-400 animate-spin",
          icon: RefreshCw
        };
      case "OFFLINE":
      default:
        return {
          label: "OFFLINE",
          colorClass: "bg-rose-500/20 border-rose-500/40 text-rose-300",
          dotClass: "bg-rose-400",
          icon: WifiOff
        };
    }
  };

  const config = getStatusBadge(telemetry.status);
  const IconComponent = config.icon;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        id="btn-daemon-status-pill"
        onClick={handleManualHeal}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all shadow-sm cursor-pointer ${config.colorClass}`}
        title="Trạng thái nhịp tim Core Daemon (Click để kích hoạt Self-healing / Tái kết nối)"
      >
        <span className="relative flex h-2 w-2">
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`}></span>
        </span>
        <IconComponent className={`w-3.5 h-3.5 ${telemetry.status === 'HEALING' ? 'animate-spin' : ''}`} />
        <span className="text-[11px] tracking-wide font-extrabold">{config.label}</span>
        {telemetry.status === "ONLINE" && (
          <span className="text-[10px] text-slate-400 font-mono font-normal">
            {telemetry.lastPingMs}ms
          </span>
        )}
      </button>

      {/* Hover Telemetry Card */}
      {isHovered && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#0d111d] border border-white/15 rounded-xl shadow-2xl z-50 text-xs text-slate-300 font-sans backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Core Daemon IPC Bridge</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${config.colorClass}`}>
              {telemetry.status}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Độ trễ Ping:</span>
              <span className="text-emerald-400 font-bold">{telemetry.lastPingMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lần mất tín hiệu:</span>
              <span className={telemetry.missedPings > 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
                {telemetry.missedPings} / 3
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Thời gian chạy (Uptime):</span>
              <span className="text-cyan-300">{Math.floor(telemetry.uptimeSeconds / 60)}m {telemetry.uptimeSeconds % 60}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Số lần Tự Phục Hồi:</span>
              <span className="text-violet-300">{telemetry.healingAttempts}</span>
            </div>
            {telemetry.errorReason && (
              <div className="mt-2 p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px]">
                Lỗi: {telemetry.errorReason}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
            <button
              onClick={handleManualHeal}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 transition-colors font-sans"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Khởi chạy lại Daemon (Auto-Spawn)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
