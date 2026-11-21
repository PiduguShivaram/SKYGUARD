"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Environmental Data Unavailable",
  message,
  onRetry,
}) => {
  return (
    <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-rose-950/30 to-[#0c0d14] border border-rose-500/30 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-xl">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)]">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-300 leading-relaxed mb-6 max-w-md mx-auto">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
