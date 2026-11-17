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
    <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center max-w-xl mx-auto shadow-xl">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-300 leading-relaxed mb-6">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
