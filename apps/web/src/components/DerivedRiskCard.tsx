"use client";

import React from "react";
import {
  Flame,
  CloudRain,
  Wind,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  BookOpen,
  ShieldAlert,
} from "lucide-react";
import { RiskEvaluationResponse, RiskSignal } from "@/types";

interface DerivedRiskCardProps {
  riskData: RiskEvaluationResponse | null;
  loading: boolean;
}

export const DerivedRiskCard: React.FC<DerivedRiskCardProps> = ({ riskData, loading }) => {
  if (loading) {
    return (
      <div className="p-6 bg-[#11141b] rounded-2xl border border-[#202532] animate-pulse">
        <div className="h-5 bg-[#1a1f2c] rounded w-1/4 mb-4"></div>
        <div className="h-24 bg-[#141822] rounded-xl"></div>
      </div>
    );
  }

  if (!riskData) return null;

  const getRiskIcon = (category: string) => {
    if (category.toLowerCase().includes("heat")) {
      return <Flame className="w-5 h-5 text-rose-400" />;
    }
    if (category.toLowerCase().includes("rain")) {
      return <CloudRain className="w-5 h-5 text-sky-400" />;
    }
    return <Wind className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="rounded-2xl bg-[#11141b] border border-[#202532] p-6 sm:p-7 shadow-2xl relative">
      {/* Geodetic Corner Ticks */}
      <div className="absolute top-2 left-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
      <div className="absolute top-2 right-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#1c212d]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-tight">
              Derived Weather Risk Indicators
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-wide uppercase">
              EXPERIMENTAL
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Computed from 7-day numerical forecast parameters using documented thresholds
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 bg-[#0c0e13] px-3 py-1.5 rounded-lg border border-[#202532] font-mono">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>WMO &amp; NDMA Reference Basis</span>
        </div>
      </div>

      {/* Disclaimers & Methodology */}
      <div className="my-4 p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330] text-xs text-zinc-400 leading-relaxed flex items-start gap-3 font-mono">
        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-zinc-200">Transparency Notice:</strong> These indicators are derived algorithmically from raw numerical model outputs. They are NOT certified official warnings, legal disaster directives, or probabilistic machine learning claims.
        </span>
      </div>

      {/* Signals List */}
      {riskData.signals.length > 0 ? (
        <div className="space-y-3 mt-4">
          {riskData.signals.map((signal, idx) => (
            <div
              key={`${signal.category}-${signal.date}-${idx}`}
              className={`p-4 rounded-xl border transition-all duration-150 ${
                signal.severity === "High"
                  ? "bg-[#181014] border-rose-500/40 hover:border-rose-500/60"
                  : "bg-[#16130d] border-amber-500/40 hover:border-amber-500/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${
                      signal.severity === "High"
                        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {getRiskIcon(signal.category)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{signal.category}</h4>
                    <p className="text-xs text-zinc-400 font-mono">
                      Anticipated Date: <span className="text-zinc-200 font-medium">{signal.date}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                    signal.severity === "High"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                  }`}
                >
                  {signal.severity}
                </span>
              </div>

              {/* Physical Evidence */}
              <div className="mt-3 text-xs text-zinc-300 bg-[#0c0e13] p-3 rounded-lg border border-[#1e2330] space-y-1 font-mono">
                <p>
                  <strong className="text-zinc-400">Physical Evidence:</strong> {signal.evidence}
                </p>
                <p className="text-[11px] text-zinc-400">
                  <strong className="text-zinc-500">Threshold Basis:</strong> {signal.threshold_basis}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 p-5 rounded-xl bg-[#0c0e13] border border-[#1e2330] text-center space-y-1 font-mono">
          <p className="text-xs font-semibold text-zinc-300">
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
