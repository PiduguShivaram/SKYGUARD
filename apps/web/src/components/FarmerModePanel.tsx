"use client";

import React, { useState, useEffect } from "react";
import {
  Sprout,
  AlertCircle,
  Cpu,
  Satellite,
  CheckCircle,
  ExternalLink,
  Radio,
  Info,
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
    <div className="space-y-5">
      {/* Crop Setup Bar */}
      <div className="surface-panel p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262c36]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Farmer Mode — Agrometeorological Intelligence
              </h3>
              <p className="text-xs text-zinc-400">
                Operational watches tailored to crop moisture thresholds and thermal vulnerability
              </p>
            </div>
          </div>

          <a
            href="https://icar.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#11141a] hover:bg-[#1f242c] border border-[#212630] text-xs text-emerald-300 font-mono transition-colors self-start sm:self-auto"
            title="Indian Council of Agricultural Research - Agrometeorological Guidelines"
          >
            <span>ICAR-AICRPAM / FAO Framework</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Select Standing Crop
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full bg-[#11141a] border border-[#212630] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              {CROPS.map((crop) => (
                <option key={crop} value={crop} className="bg-[#161b22] text-white">
                  {crop}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Sowing Date (Optional Stage Tracking)
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full bg-[#11141a] border border-[#212630] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
            />
          </div>
        </div>

        {farmerData?.days_since_sowing !== undefined && farmerData.days_since_sowing !== null && (
          <div className="mt-3.5 p-3 rounded-lg bg-[#11141a] border border-[#212630] flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-300">
              Calculated Growth Window: <strong>{farmerData.days_since_sowing} days since sowing</strong>
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Active Monitoring
            </span>
          </div>
        )}
      </div>

      {/* Field Agromet Watches Section */}
      <div className="surface-panel p-6 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#262c36]">
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight">
              Field Agromet Watches for {selectedCrop}
            </h4>
            <p className="text-xs text-zinc-400">
              Evaluated against 7-day numerical forecast parameters
            </p>
          </div>
          <span className="text-xs text-zinc-400 bg-[#11141a] px-2.5 py-0.5 rounded border border-[#212630] self-start sm:self-auto font-mono">
            {farmerData?.watches?.length || 0} Advisories
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-zinc-400 animate-pulse">
            Evaluating field moisture balance and thermal stress thresholds...
          </div>
        ) : farmerData?.watches && farmerData.watches.length > 0 ? (
          <div className="space-y-2.5">
            {farmerData.watches.map((w, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border transition-colors ${
                  w.severity === "High"
                    ? "bg-rose-950/15 border-rose-500/30"
                    : "bg-amber-950/15 border-amber-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <AlertCircle className={`w-3.5 h-3.5 ${w.severity === "High" ? "text-rose-400" : "text-amber-400"}`} />
                      {w.category}
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed">{w.observation}</p>
                    <p className="text-xs text-emerald-400 font-medium mt-1 leading-relaxed">{w.action}</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded shrink-0 ${
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
          <div className="p-5 rounded-lg bg-[#11141a] border border-[#212630] text-center space-y-1">
            <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
            <p className="text-xs font-medium text-zinc-300">
              No Forecast-Threshold Triggers Detected
            </p>
            <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
              Rainfall, temperature, and wind extremes in the current 7-day model window do not violate {selectedCrop} physiological thresholds.
            </p>
          </div>
        )}
      </div>

      {/* Hardware Gating Invariant Cards (Concise secondary section) */}
      <div className="surface-panel p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-[#262c36]">
          <Cpu className="w-4 h-4 text-zinc-400" />
          <div>
            <h4 className="text-xs font-semibold text-zinc-300">
              In-Situ Telemetry &amp; Satellite Index Status
            </h4>
            <p className="text-[11px] text-zinc-500">
              Strict hardware gating invariant: uncalibrated sensors or simulated indices are never displayed as real
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Card 1: Soil Moisture IoT Sensors */}
          <div className="p-3 rounded-lg bg-[#11141a] border border-[#212630] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-zinc-500" />
                Physical Soil Moisture Sensors
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f242c] text-zinc-400 border border-[#2d3441]">
                DISCONNECTED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              No calibrated field telemetry device connected. Root-zone soil moisture is gated to prevent fabricated agronomic advice.
            </p>
            <div className="pt-1.5 border-t border-[#1a1f29] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Hardware Link: Inactive</span>
              <span className="text-amber-400 font-semibold">GATED</span>
            </div>
          </div>

          {/* Card 2: Sentinel-2 Multispectral Indices */}
          <div className="p-3 rounded-lg bg-[#11141a] border border-[#212630] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-zinc-500" />
                Copernicus Sentinel-2 NDVI / EVI
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f242c] text-zinc-400 border border-[#2d3441]">
                GATED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Multispectral satellite vegetative indices require field parcel boundary registration and cloud mask validation.
            </p>
            <div className="pt-1.5 border-t border-[#1a1f29] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>EO Orbit Sync: Uncalibrated</span>
              <span className="text-amber-400 font-semibold">GATED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
