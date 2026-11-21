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
    <div className="p-6 rounded-lg bg-[#161b22] border border-rose-500/30 text-center max-w-lg mx-auto shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-zinc-300 leading-relaxed mb-4 max-w-sm mx-auto">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1f242c] hover:bg-[#28303d] border border-[#2d3441] text-xs font-medium text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
