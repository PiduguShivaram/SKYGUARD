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
    <div className="p-6 rounded-sg surface-panel border border-rose-500/30 text-center max-w-lg mx-auto shadow-sm">
      <div className="w-10 h-10 rounded-sg bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed mb-4 max-w-sm mx-auto">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-sg bg-surface-elevated hover:bg-surface-base border border-border-subtle text-xs font-medium text-white transition-colors min-h-[44px]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand-text" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
