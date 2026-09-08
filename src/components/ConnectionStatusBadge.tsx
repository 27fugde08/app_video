import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";

interface ConnectionStatusBadgeProps {
  wsUrl?: string;
  className?: string;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-mono text-emerald-300 select-none shadow-sm ${className}`}>
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span className="font-bold">Native In-Process (0.4ms)</span>
    </div>
  );
};
