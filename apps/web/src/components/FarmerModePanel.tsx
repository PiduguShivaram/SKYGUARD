"use client";

import React, { useState, useEffect } from "react";
import {
  Sprout,
  Calendar,
  AlertCircle,
  Cpu,
  Satellite,
  TrendingDown,
  Info,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { DailyForecastPoint, FarmerWatchResponse } from "@/types";
import { getFarmerWatches } from "@/lib/api";

interface FarmerModePanelProps {
  daily: DailyForecastPoint[];
}

const CROPS = [
  "Paddy (Rice)",
  "Cotton",
  "Maize",
  "Wheat",
  "Soybean",
  "Tomato",
  "General Field Crop",
];

export const FarmerModePanel: React.FC<FarmerModePanelProps> = ({ daily }) => {
  const [selectedCrop, setSelectedCrop] = useState("Paddy (Rice)");
  const [sowingDate, setSowingDate] = useState("");
  const [farmerData, setFarmerData] = useState<FarmerWatchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!daily || daily.length === 0) return;

    let isMounted = true;
    setLoading(true);

    getFarmerWatches(selectedCrop, daily, sowingDate)
      .then((data) => {
        if (isMounted) setFarmerData(data);
      })
      .catch((err) => {
        console.error("Failed to fetch farmer watches:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCrop, sowingDate, daily]);

  return (
    <div className="space-y-6">
      {/* Crop Setup Bar */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-850 to-slate-900 border border-emerald-500/30 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Farmer Mode — Agrometeorological Intelligence
              </h3>
              <p className="text-xs text-slate-400">
                Operational watches tailored to crop moisture thresholds and thermal vulnerability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://imdagrimet.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>IMD Agrimet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Standing Crop
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Approximate Sowing Date (Optional)
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {farmerData?.days_since_sowing !== null && farmerData?.days_since_sowing !== undefined && (
              <p className="text-[11px] text-emerald-400 mt-1">
                Estimated age: {farmerData.days_since_sowing} days since sowing
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Operational Weather Watches */}
      <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
        <h4 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <span>Field Agromet Watches for {selectedCrop}</span>
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Source: ICAR Agrometeorological Advisory Heuristics &amp; 7-Day Numerical Forecasts
        </p>

        {loading ? (
          <div className="p-4 bg-slate-900 rounded-xl animate-pulse text-xs text-slate-400">
            Evaluating crop weather watches...
          </div>
        ) : farmerData && farmerData.watches.length > 0 ? (
          <div className="space-y-3">
            {farmerData.watches.map((watch, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-slate-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {watch.category}
                  </span>
                  <span className="text-xs text-slate-400">Reference: {watch.date}</span>
                </div>
                <p className="text-xs text-slate-300 mt-2 font-medium">
                  <strong>Forecast Condition:</strong> {watch.observation}
                </p>
                <div className="mt-2 p-2.5 bg-slate-900/80 rounded-lg text-xs text-emerald-300 border border-slate-800">
                  <strong>Suggested Precaution:</strong> {watch.action}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  <strong>Agronomic Basis:</strong> {watch.scientific_rationale}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/60 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">No Critical Field Watches</p>
              <p className="text-xs text-slate-400">
                No extreme dry spells, excessive waterlogging, or severe crop thermal thresholds predicted over the 7-day forecast.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Telemetry & Satellite Gating Notice */}
      <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-bold text-white">
            Sensor Telemetry &amp; Satellite Gating (Data Integrity Guarantee)
          </h4>
        </div>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          In strict accordance with SkyGuard data integrity rules, advanced features requiring in-situ field telemetry or calibrated Earth Observation models remain <strong>disabled</strong> until genuine hardware or authentication is connected:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* Soil Moisture */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                DISCONNECTED
              </span>
            </div>
            <p className="text-xs font-bold text-white">In-Situ Soil Moisture</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Capacitive FDR/TDR soil sensors not detected. Root-zone water tension is unmeasured.
            </p>
          </div>

          {/* Satellite NDVI */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <Satellite className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                GATED
              </span>
            </div>
            <p className="text-xs font-bold text-white">Sentinel-2 Multi-Spectral</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Google Earth Engine service account is not provisioned. 10m NDVI anomaly map disabled.
            </p>
          </div>

          {/* Yield Loss Model */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                GATED
              </span>
            </div>
            <p className="text-xs font-bold text-white">Plot Yield Loss Predictor</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Calibrated crop growth models (APSIM/DSSAT) require on-field ground truth. No synthetic predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
