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
} from "lucide-react";
import { RiskEvaluationResponse, RiskSignal } from "@/types";

interface DerivedRiskCardProps {
  riskData: RiskEvaluationResponse | null;
  loading: boolean;
}

export const DerivedRiskCard: React.FC<DerivedRiskCardProps> = ({ riskData, loading }) => {
  if (loading) {
    return (
      <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/4 mb-3"></div>
        <div className="h-20 bg-slate-700/50 rounded-xl"></div>
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
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Derived Weather Risk Indicators
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              EXPERIMENTAL
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Computed from 7-day numerical forecast parameters using documented thresholds
          </p>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>WMO &amp; NDMA Reference Basis</span>
        </div>
      </div>

      {/* Disclaimers & Methodology */}
      <div className="my-3.5 p-3 rounded-xl bg-slate-900/70 border border-slate-700/60 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          <strong>Transparency Notice:</strong> These indicators are derived algorithmically from raw numerical model outputs. They are NOT certified official warnings, legal disaster directives, or probabilistic machine learning claims.
        </span>
      </div>

      {/* Signals List */}
      {riskData.signals.length > 0 ? (
        <div className="space-y-3 mt-4">
          {riskData.signals.map((signal, idx) => (
            <div
              key={`${signal.category}-${signal.date}-${idx}`}
              className={`p-4 rounded-xl border transition-all ${
                signal.severity === "High"
                  ? "bg-rose-950/20 border-rose-500/30"
                  : "bg-amber-950/20 border-amber-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      signal.severity === "High" ? "bg-rose-500/10" : "bg-amber-500/10"
                    }`}
                  >
                    {getRiskIcon(signal.category)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{signal.category}</h4>
                    <p className="text-xs text-slate-400">
                      Anticipated Date: <span className="text-slate-300 font-mono">{signal.date}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    signal.severity === "High"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {signal.severity}
                </span>
              </div>

              {/* Physical Evidence */}
              <div className="mt-3 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <p>
                  <strong className="text-slate-400">Physical Evidence:</strong> {signal.evidence}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  <strong className="text-slate-500">Threshold Basis:</strong> {signal.threshold_basis}
                </p>
              </div>

              {/* Precaution */}
              <div className="mt-2 text-xs text-slate-300 flex items-start gap-1.5">
                <span className="font-semibold text-blue-400 shrink-0">Safe Precaution:</span>
                <span>{signal.recommended_action}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/60 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">No Extreme Derived Thresholds Exceeded</p>
            <p className="text-xs text-slate-400">
              Projected rainfall, temperature, and wind gusts over the next 7 days remain below moderate/high hazard criteria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
