"use client";

import React, { useState } from "react";
import {
  MultiModelResponse,
  NearbyObservationResponse,
  RadarNowcastResponse,
} from "@/types";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Radio,
  Building2,
  TrendingDown,
  TrendingUp,
  Info,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface MultiModelComparisonProps {
  multiModelData: MultiModelResponse | null;
  observationData: NearbyObservationResponse | null;
  nowcastData: RadarNowcastResponse | null;
  loading: boolean;
}

export function MultiModelComparison({
  multiModelData,
  observationData,
  nowcastData,
  loading,
}: MultiModelComparisonProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("all");
  const [showRawMetar, setShowRawMetar] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="surface-panel p-5 w-full animate-pulse space-y-3">
        <div className="h-4 bg-[#1A1F2C] rounded-sg w-1/3" />
        <div className="h-16 bg-[#1A1F2C]/60 rounded-sg" />
      </div>
    );
  }

  if (!multiModelData && !observationData && !nowcastData) return null;

  const currentStep = multiModelData?.consensus_hourly?.[0] ?? null;
  const spreadStd = currentStep ? currentStep.temperature_std_dev : 0;
  const disagreement = currentStep ? currentStep.disagreement_level : "LOW";
  const obs = observationData?.observation ?? null;
  const comparison = observationData?.model_comparison ?? null;

  return (
    <div className="surface-panel p-5 w-full transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2A3141]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-sg bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#60A5FA]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#E8EDF4] tracking-tight">
                Multi-Model Consensus &amp; Observation Grounding
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-sg uppercase tracking-wider font-semibold ${
                  disagreement === "LOW"
                    ? "bg-[#0A1710] text-[#34D399] border border-[#059669]/40"
                    : disagreement === "MODERATE"
                    ? "bg-[#1C1507] text-[#FCD34D] border border-[#D97706]/40"
                    : disagreement === "HIGH"
                    ? "bg-[#1F0E0E] text-[#F87171] border border-[#DC2626]/40"
                    : "bg-[#1A1F2C] text-[#8B95A8] border border-[#2A3141]"
                }`}
              >
                {disagreement === "INSUFFICIENT_MODELS"
                  ? "Single Model (Spread Unavailable)"
                  : `Spread: ±${spreadStd.toFixed(1)}°C (${disagreement})`}
              </span>
            </div>
            <p className="text-xs text-[#8B95A8] mt-0.5">
              ECMWF IFS, NOAA GFS, DWD ICON, UKMO, and JMA numerical weather model physics forecasts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sg bg-[#1A1F2C] hover:bg-[#222838] border border-[#2A3141] text-xs font-mono text-[#60A5FA] hover:text-[#E8EDF4] transition-colors self-start sm:self-auto min-h-[36px]"
        >
          <span>{isExpanded ? "Collapse Scientific Details" : "Inspect Models & Stations"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Ground-Truth Station Observation & Radar Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {/* Physical Station Observation Card */}
        <div className="p-3.5 rounded-sg bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/70 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>Physical Ground Station</span>
              </span>
              {obs ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-sg bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40">
                  {obs.station_id} ({obs.distance_km} km)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-white/50">Pure NWP Mode</span>
              )}
            </div>

            {obs ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light text-white tabular-nums font-mono">
                    {obs.temperature_c !== null && obs.temperature_c !== undefined
                      ? `${Math.round(obs.temperature_c)}°C`
                      : "n/a"}
                  </span>
                  <span className="text-xs text-white/70 truncate">{obs.station_name}</span>
                </div>
                {comparison && (
                  <div className="text-[11px] font-mono text-white/70 flex items-center gap-1.5 pt-1">
                    <span>Model Estimate: {comparison.model_temp_c}°C</span>
                    <span>·</span>
                    <span
                      className={
                        Math.abs(comparison.temp_bias_c) < 1.0
                          ? "text-[#34D399]"
                          : comparison.temp_bias_c > 0
                          ? "text-[#FCD34D]"
                          : "text-[#60A5FA]"
                      }
                    >
                      NWP Bias: {comparison.temp_bias_c > 0 ? `+${comparison.temp_bias_c}` : comparison.temp_bias_c}°C
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/70 mt-1">
                No WMO station reporting within 200 km. Relying strictly on multi-model numerical physics forecasts.
              </p>
            )}
          </div>

          {obs && (
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50">
              <span>Observed: {new Date(obs.observation_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <button
                type="button"
                onClick={() => setShowRawMetar(!showRawMetar)}
                className="text-[#60A5FA] hover:underline"
              >
                {showRawMetar ? "Hide METAR" : "View Raw METAR"}
              </button>
            </div>
          )}
        </div>

        {/* 0-120min Doppler Radar Nowcast Timeline */}
        <div className="p-3.5 rounded-sg bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/70 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>0-2h Doppler Precipitation Nowcast</span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-sg ${
                  nowcastData?.radar_status === "ACTIVE" || nowcastData?.radar_status === "ACTIVE_HISTORICAL_MOSAIC_ONLY"
                    ? "bg-[#0A1710] text-[#34D399] border border-[#059669]/40"
                    : nowcastData?.radar_status === "OUTSIDE_GROUND_RADAR_COVERAGE"
                    ? "bg-[#1C1507] text-[#FCD34D] border border-[#D97706]/40"
                    : "bg-white/10 text-white/70 border border-white/15"
                }`}
              >
                {nowcastData?.radar_status === "ACTIVE" || nowcastData?.radar_status === "ACTIVE_HISTORICAL_MOSAIC_ONLY"
                  ? "Historical Mosaic Active"
                  : nowcastData?.radar_status === "OUTSIDE_GROUND_RADAR_COVERAGE"
                  ? "Outside Radar Footprint"
                  : "Degraded to NWP"}
              </span>
            </div>

            {/* Intervals Bar */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mt-2">
              {nowcastData?.nowcast_intervals?.map((iv) => (
                <div
                  key={iv.lead_minutes}
                  className="p-1.5 rounded-sg bg-white/[0.06] border border-white/10 text-center"
                >
                  <span className="text-[10px] font-mono text-white/50 block">+{iv.lead_minutes}m</span>
                  <span
                    className={`text-xs font-mono font-medium block mt-0.5 ${
                      iv.estimated_precipitation_rate_mmh != null && iv.estimated_precipitation_rate_mmh > 0
                        ? "text-[#60A5FA]"
                        : "text-white/70"
                    }`}
                  >
                    {iv.estimated_precipitation_rate_mmh != null
                      ? `${iv.estimated_precipitation_rate_mmh.toFixed(1)} mm`
                      : "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-2 text-[10px] font-mono text-white/50 truncate">
            {nowcastData?.coverage_note || "Kinematic radar extrapolation for short-term precipitation trajectories."}
          </p>
        </div>
      </div>

      {/* Raw METAR Expandable Callout */}
      {showRawMetar && obs && (
        <div className="mt-3 p-3 rounded-sg bg-black/25 border border-white/15 font-mono text-xs text-[#60A5FA]">
          <span className="text-[10px] text-white/70 block mb-1">Authentic WMO Station Bulletin:</span>
          <code>{obs.raw_metar}</code>
        </div>
      )}

      {/* Deep Model Breakdown (Expandable View) */}
      {isExpanded && multiModelData && (
        <div className="mt-5 pt-4 border-t border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/70">
              Reporting Numerical Weather Prediction Models
            </h4>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-white/70 mr-1">Highlight:</span>
              <button
                type="button"
                onClick={() => setSelectedModelFilter("all")}
                className={`px-2.5 py-1 rounded-sg border transition-colors ${
                  selectedModelFilter === "all"
                    ? "bg-[#2563EB]/25 text-[#60A5FA] border-[#2563EB]/50"
                    : "bg-white/10 text-white/70 border-white/15 hover:text-white"
                }`}
              >
                All Models
              </button>
              {multiModelData.models_available.map((m) => (
                <button
                  key={m.model_id}
                  type="button"
                  onClick={() => setSelectedModelFilter(m.model_id)}
                  className={`px-2.5 py-1 rounded-sg border transition-colors ${
                    selectedModelFilter === m.model_id
                      ? "bg-[#2563EB]/25 text-[#60A5FA] border-[#2563EB]/50"
                      : "bg-white/10 text-white/70 border-white/15 hover:text-white"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Registry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {multiModelData.models_available.map((meta) => {
              const latestPt = multiModelData.models_series[meta.model_id]?.[0];
              const isSelected = selectedModelFilter === "all" || selectedModelFilter === meta.model_id;
              return (
                <div
                  key={meta.model_id}
                  className={`p-3 rounded-sg border transition-colors ${
                    isSelected
                      ? "bg-white/[0.05] border-white/15"
                      : "bg-white/[0.02] border-white/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E8EDF4]">{meta.name}</span>
                    <span className="text-[10px] font-mono text-[#60A5FA]">{meta.native_resolution_km} km grid</span>
                  </div>
                  <span className="text-[11px] text-[#8B95A8] block truncate">{meta.agency}</span>

                  {latestPt && (
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1E2432] text-xs font-mono">
                      <span className="text-[#E8EDF4]">{Math.round(latestPt.temperature_2m)}°C</span>
                      <span className="text-[#8B95A8]">
                        {latestPt.precipitation !== null && latestPt.precipitation !== undefined
                          ? `${latestPt.precipitation} mm`
                          : "n/a"}
                      </span>
                      <span className="text-[#8B95A8]">
                        {latestPt.wind_speed_10m !== null && latestPt.wind_speed_10m !== undefined
                          ? `${latestPt.wind_speed_10m} km/h`
                          : "n/a"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-sg bg-[#0C0F14] border border-[#2A3141] text-[11px] font-mono text-[#8B95A8] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#60A5FA] flex-shrink-0 mt-0.5" />
            <span>
              Multi-model consensus represents an unweighted ensemble mean and standard deviation across ECMWF, GFS, ICON, UKMO, and JMA. Model spread indicates meteorological sensitivity to initial condition uncertainty and should not be used as an official emergency warning.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
