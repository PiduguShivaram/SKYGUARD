"use client";

import React from "react";
import {
  Flame,
  CloudRain,
  Wind,
  CheckCircle,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { RiskEvaluationResponse } from "@/types";

interface DerivedRiskCardProps {
  riskData: RiskEvaluationResponse | null;
  loading: boolean;
}

export const DerivedRiskCard: React.FC<DerivedRiskCardProps> = ({ riskData, loading }) => {
  if (loading) {
    return (
      <div className="surface-panel p-6 sm:p-7 shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-[#212630] rounded w-1/3"></div>
        <div className="h-20 bg-[#1a1f29] rounded"></div>
      </div>
    );
  }

  if (!riskData) return null;

  const getRiskIcon = (category: string) => {
    if (category.toLowerCase().includes("heat")) {
      return <Flame className="w-4 h-4 text-rose-400" />;
    }
    if (category.toLowerCase().includes("rain")) {
      return <CloudRain className="w-4 h-4 text-blue-400" />;
    }
    return <Wind className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="surface-panel p-6 sm:p-7 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262c36]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Derived Weather Risk Indicators
            </h3>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 uppercase">
              EXPERIMENTAL
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Computed from 7-day numerical forecast parameters using documented thresholds
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-[#11141a] px-2.5 py-1 rounded border border-[#212630]">
          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span>WMO &amp; NDMA Reference Basis</span>
        </div>
      </div>

      {/* Disclaimers & Methodology */}
      <div className="my-3.5 p-3 rounded-lg bg-[#11141a] border border-[#212630] text-xs text-zinc-400 leading-relaxed flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-zinc-200 font-medium">Transparency Notice:</strong> These indicators are derived algorithmically from raw numerical model outputs. They are NOT certified official warnings, legal disaster directives, or probabilistic machine learning claims.
        </span>
      </div>

      {/* Signals List */}
      {riskData.signals.length > 0 ? (
        <div className="space-y-2.5 mt-3">
          {riskData.signals.map((signal, idx) => (
            <div
              key={`${signal.category}-${signal.date}-${idx}`}
              className={`p-3.5 rounded-lg border transition-colors ${
                signal.severity === "High"
                  ? "bg-rose-950/15 border-rose-500/30"
                  : "bg-amber-950/15 border-amber-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded ${
                      signal.severity === "High"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {getRiskIcon(signal.category)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">{signal.category}</h4>
                    <p className="text-[11px] text-zinc-400">
                      Anticipated Date: <span className="text-zinc-300 font-mono">{signal.date}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                    signal.severity === "High"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {signal.severity}
                </span>
              </div>

              {/* Physical Evidence */}
              <div className="mt-2.5 text-xs text-zinc-300 bg-[#11141a] p-2.5 rounded border border-[#212630] space-y-1">
                <p>
                  <strong className="text-zinc-400 font-medium">Physical Evidence:</strong> {signal.evidence}
                </p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  <strong className="text-zinc-500">Threshold Basis:</strong> {signal.threshold_basis}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 p-4 rounded-lg bg-[#11141a] border border-[#212630] text-center space-y-1">
          <p className="text-xs font-medium text-zinc-300">
            No Forecast-Threshold Triggers Detected
          </p>
          <p className="text-[11px] text-zinc-500">
            Current 7-day model parameters do not exceed extreme heat, heavy precipitation, or severe wind thresholds.
          </p>
        </div>
      )}
    </div>
  );
};
