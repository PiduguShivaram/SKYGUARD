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
      <div className="surface-panel p-6 sm:p-7 shadow-card animate-pulse space-y-3">
        <div className="h-4 bg-[#1A1F2C] rounded-sg w-1/3"></div>
        <div className="h-20 bg-[#1A1F2C]/60 rounded-sg"></div>
      </div>
    );
  }

  if (!riskData) return null;

  const getRiskIcon = (category: string) => {
    if (category.toLowerCase().includes("heat")) {
      return <Flame className="w-4 h-4 text-[#F87171]" />;
    }
    if (category.toLowerCase().includes("rain")) {
      return <CloudRain className="w-4 h-4 text-[#60A5FA]" />;
    }
    return <Wind className="w-4 h-4 text-[#FCD34D]" />;
  };

  return (
    <div className="surface-panel p-6 sm:p-7 shadow-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2A3141]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#E8EDF4] tracking-tight">
              Derived Weather Risk Indicators
            </h3>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/30 uppercase">
              EXPERIMENTAL
            </span>
          </div>
          <p className="text-xs text-[#8B95A8] mt-0.5">
            Computed from 7-day numerical forecast parameters using documented thresholds
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/10 px-2.5 py-1 rounded-sg border border-white/15">
          <BookOpen className="w-3.5 h-3.5 text-white/70" />
          <span>WMO &amp; NDMA Reference Basis</span>
        </div>
      </div>

      {/* Disclaimers & Methodology */}
      <div className="my-3.5 p-3 rounded-sg bg-white/[0.05] border border-white/15 text-xs text-white/80 leading-relaxed flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
        <span>
          <strong className="text-white font-medium">Transparency Notice:</strong> These indicators are derived algorithmically from raw numerical model outputs. They are NOT certified official warnings, legal disaster directives, or probabilistic machine learning claims.
        </span>
      </div>

      {/* Signals List */}
      {riskData.signals.length > 0 ? (
        <div className="space-y-2.5 mt-3">
          {riskData.signals.map((signal, idx) => (
            <div
              key={`${signal.category}-${signal.date}-${idx}`}
              className={`p-3.5 rounded-sg border-l-4 border-y border-r transition-colors ${
                signal.severity === "High"
                  ? "bg-red-950/40 border-l-[#DC2626] border-red-500/30"
                  : "bg-amber-950/40 border-l-[#D97706] border-amber-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-sg ${
                      signal.severity === "High"
                        ? "bg-[#DC2626]/20 text-[#F87171]"
                        : "bg-[#D97706]/20 text-[#FCD34D]"
                    }`}
                  >
                    {getRiskIcon(signal.category)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">{signal.category}</h4>
                    <p className="text-[11px] text-white/70">
                      Anticipated Date: <span className="text-white font-mono">{signal.date}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-sg ${
                    signal.severity === "High"
                      ? "bg-[#DC2626]/20 text-[#F87171] border border-[#DC2626]/40"
                      : "bg-[#D97706]/20 text-[#FCD34D] border border-[#D97706]/40"
                  }`}
                >
                  {signal.severity}
                </span>
              </div>

              {/* Physical Evidence */}
              <div className="mt-2.5 text-xs text-white bg-black/20 p-2.5 rounded-sg border border-white/10 space-y-1">
                <p>
                  <strong className="text-white/70 font-medium">Physical Evidence:</strong> {signal.evidence}
                </p>
                <p className="text-[11px] text-white/70 font-mono">
                  <strong className="text-white/50">Threshold Basis:</strong> {signal.threshold_basis}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 p-4 rounded-sg bg-white/[0.04] border border-white/10 text-center space-y-1">
          <p className="text-xs font-medium text-white">
            No Forecast-Threshold Triggers Detected
          </p>
          <p className="text-[11px] text-white/60">
            Current 7-day model parameters do not exceed extreme heat, heavy precipitation, or severe wind thresholds.
          </p>
        </div>
      )}
    </div>
  );
};
