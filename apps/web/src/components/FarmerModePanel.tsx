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
      <div className="rounded-2xl bg-[#0f1713] border border-[#1d3527] p-6 sm:p-7 shadow-2xl relative">
        {/* Geodetic Corner Ticks */}
        <div className="absolute top-2 left-2 text-[#244231] font-mono text-[9px] select-none pointer-events-none">+</div>
        <div className="absolute top-2 right-2 text-[#244231] font-mono text-[9px] select-none pointer-events-none">+</div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1b3124]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-[#14261c] text-emerald-400 border border-[#234532] shadow-inner">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Farmer Mode — Agrometeorological Intelligence
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Operational watches tailored to crop moisture thresholds and thermal vulnerability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://icar.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a120e] hover:bg-[#14261c] border border-[#213c2c] text-xs font-mono font-medium text-emerald-300 hover:text-emerald-200 transition-colors"
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
            <label className="block text-xs font-mono font-bold tracking-wider uppercase text-zinc-300 mb-1.5">
              Select Standing Crop
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full bg-[#0a100c] border border-[#20392b] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/70 transition-all font-mono"
            >
              {CROPS.map((crop) => (
                <option key={crop} value={crop} className="bg-[#0b100d] text-white">
                  {crop}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold tracking-wider uppercase text-zinc-300 mb-1.5">
              Sowing Date (Optional Stage Tracking)
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full bg-[#0a100c] border border-[#20392b] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/70 transition-all font-mono"
            />
          </div>
        </div>

        {/* Calculated Stage Output */}
        {farmerData?.days_since_sowing !== undefined && farmerData.days_since_sowing !== null && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#0a140f] border border-[#234532] flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-300 font-medium">
              Calculated Growth Window: <strong>{farmerData.days_since_sowing} days since sowing</strong>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
              Active Monitoring
            </span>
          </div>
        )}
      </div>

      {/* Field Agromet Watches Section */}
      <div className="rounded-2xl bg-[#11141b] border border-[#202532] p-6 sm:p-7 shadow-2xl space-y-4 relative">
        {/* Geodetic Corner Ticks */}
        <div className="absolute top-2 left-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
        <div className="absolute top-2 right-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1c212d]">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              Field Agromet Watches for {selectedCrop}
            </h4>
            <p className="text-xs text-zinc-400 font-mono">
              Evaluated against 7-day numerical forecast parameters
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-[#0c0e13] px-2.5 py-1 rounded border border-[#202532]">
            {farmerData?.watches?.length || 0} Advisories
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400 animate-pulse font-mono">
            Evaluating field moisture balance and thermal stress thresholds...
          </div>
        ) : farmerData?.watches && farmerData.watches.length > 0 ? (
          <div className="space-y-3">
            {farmerData.watches.map((w, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  w.severity === "High"
                    ? "bg-[#181014] border-rose-500/40"
                    : "bg-[#16130d] border-amber-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertCircle className={`w-4 h-4 ${w.severity === "High" ? "text-rose-400" : "text-amber-400"}`} />
                      {w.category}
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono">{w.observation}</p>
                    <p className="text-xs text-emerald-300 font-medium mt-1 leading-relaxed font-mono">{w.action}</p>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                      w.severity === "High"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {w.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-[#0c0e13] border border-[#1e2330] text-center space-y-1.5 font-mono">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-zinc-200">
              No Forecast-Threshold Triggers Detected
            </p>
            <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
              Rainfall, temperature, and wind extremes in the current 7-day model window do not violate {selectedCrop} physiological thresholds.
            </p>
          </div>
        )}
      </div>

      {/* Hardware Gating Invariant Cards */}
      <div className="rounded-2xl bg-[#11141b] border border-[#202532] p-6 sm:p-7 shadow-2xl space-y-4 relative">
        {/* Geodetic Corner Ticks */}
        <div className="absolute top-2 left-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
        <div className="absolute top-2 right-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>

        <div className="flex items-center gap-2.5 pb-4 border-b border-[#1c212d]">
          <Cpu className="w-5 h-5 text-amber-400" />
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              In-Situ Telemetry &amp; Satellite Index Status
            </h4>
            <p className="text-xs text-zinc-400 font-mono">
              Strict hardware gating invariant: uncalibrated sensors or simulated indices are never displayed as real
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Soil Moisture IoT Sensors */}
          <div className="p-4 rounded-xl bg-[#0c0e13] border border-[#1e2330] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-zinc-400" />
                Physical Soil Moisture Sensors
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#171b24] text-zinc-400 border border-[#262c3a]">
                DISCONNECTED
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              No calibrated field telemetry device connected. Root-zone soil moisture is gated to prevent fabricated agronomic advice.
            </p>
            <div className="pt-2 border-t border-[#1a1f2b] flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Hardware Link: Inactive</span>
              <span className="text-amber-400 font-bold">GATED</span>
            </div>
          </div>

          {/* Card 2: Sentinel-2 Multispectral Indices */}
          <div className="p-4 rounded-xl bg-[#0c0e13] border border-[#1e2330] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Satellite className="w-4 h-4 text-zinc-400" />
                Copernicus Sentinel-2 NDVI / EVI
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#171b24] text-zinc-400 border border-[#262c3a]">
                GATED
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              Cloud-penetrating radar and multispectral satellite vegetative indices require field parcel boundary registration and cloud mask validation.
            </p>
            <div className="pt-2 border-t border-[#1a1f2b] flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>EO Orbit Sync: Uncalibrated</span>
              <span className="text-amber-400 font-bold">GATED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
