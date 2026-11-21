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
  ShieldCheck,
  Radio,
  Layers,
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
      <div className="rounded-3xl bg-gradient-to-br from-[#0a1815] via-[#08121a] to-[#070b14] border border-emerald-500/30 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-500/20">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
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
              href="https://icar.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/30 text-xs font-mono font-medium text-emerald-300 hover:text-emerald-200 transition-colors"
              title="Indian Council of Agricultural Research - Agrometeorological Guidelines"
            >
              <span>ICAR-AICRPAM / FAO Framework</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-slate-300 mb-1.5">
              Select Standing Crop
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full bg-[#060a14] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60 transition-all font-medium"
            >
              {CROPS.map((crop) => (
                <option key={crop} value={crop} className="bg-slate-900 text-white">
                  {crop}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-slate-300 mb-1.5">
              Sowing Date (Optional Stage Tracking)
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full bg-[#060a14] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60 transition-all font-mono"
            />
          </div>
        </div>

        {/* Calculated Stage Output */}
        {farmerData?.days_since_sowing !== undefined && farmerData.days_since_sowing !== null && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
            <span className="text-emerald-300 font-medium">
              Calculated Growth Window: <strong>{farmerData.days_since_sowing} days since sowing</strong>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Active Monitoring
            </span>
          </div>
        )}
      </div>

      {/* Field Agromet Watches Section */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0a101d] to-[#070b14] border border-white/[0.08] p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              Field Agromet Watches for {selectedCrop}
            </h4>
            <p className="text-xs text-slate-400">
              Evaluated against 7-day numerical forecast parameters
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
            {farmerData?.watches?.length || 0} Advisories
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Evaluating field moisture balance and thermal stress thresholds...
          </div>
        ) : farmerData?.watches && farmerData.watches.length > 0 ? (
          <div className="space-y-3">
            {farmerData.watches.map((w, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  w.severity === "High"
                    ? "bg-rose-950/20 border-rose-500/30"
                    : "bg-amber-950/20 border-amber-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertCircle className={`w-4 h-4 ${w.severity === "High" ? "text-rose-400" : "text-amber-400"}`} />
                      {w.category}
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{w.observation}</p>
                    <p className="text-xs text-emerald-300 font-medium mt-1 leading-relaxed">{w.action}</p>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      w.severity === "High"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {w.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#060a14]/60 border border-white/[0.06] text-center space-y-1.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-200">
              No Forecast-Threshold Triggers Detected
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Rainfall, temperature, and wind extremes in the current 7-day model window do not violate {selectedCrop} physiological thresholds.
            </p>
          </div>
        )}
      </div>

      {/* Hardware Gating Invariant Cards */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0a101d] to-[#070b14] border border-white/[0.08] p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.08]">
          <Cpu className="w-5 h-5 text-amber-400" />
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              In-Situ Telemetry &amp; Satellite Index Status
            </h4>
            <p className="text-xs text-slate-400">
              Strict hardware gating invariant: uncalibrated sensors or simulated indices are never displayed as real
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Soil Moisture IoT Sensors */}
          <div className="p-4 rounded-2xl bg-[#060a14] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-slate-400" />
                Physical Soil Moisture Sensors
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                DISCONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              No calibrated field telemetry device connected. Root-zone soil moisture is gated to prevent fabricated agronomic advice.
            </p>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Hardware Link: Inactive</span>
              <span className="text-amber-400 font-bold">GATED</span>
            </div>
          </div>

          {/* Card 2: Sentinel-2 Multispectral Indices */}
          <div className="p-4 rounded-2xl bg-[#060a14] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Satellite className="w-4 h-4 text-slate-400" />
                Copernicus Sentinel-2 NDVI / EVI
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                GATED
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cloud-penetrating radar and multispectral satellite vegetative indices require field parcel boundary registration and cloud mask validation.
            </p>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>EO Orbit Sync: Uncalibrated</span>
              <span className="text-amber-400 font-bold">GATED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
