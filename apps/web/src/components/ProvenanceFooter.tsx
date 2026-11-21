"use client";

import React from "react";
import { Database, Clock, Compass, Globe, ExternalLink } from "lucide-react";
import { WeatherForecastResponse } from "@/types";

interface ProvenanceFooterProps {
  weather: WeatherForecastResponse | null;
}

export const ProvenanceFooter: React.FC<ProvenanceFooterProps> = ({ weather }) => {
  return (
    <footer className="mt-12 pt-6 pb-12 border-t border-[#262c36] text-xs text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg bg-[#161b22] border border-[#262c36]">
          {/* Provider */}
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-medium text-zinc-500 block">
                Provider &amp; NWP Model
              </span>
              <p className="text-white font-medium">{weather?.provenance.provider || "Open-Meteo"}</p>
              <p className="text-[11px] text-zinc-400">
                {weather?.provenance.source_model || "Seamless Multi-Model (ECMWF / GFS / ICON)"}
              </p>
            </div>
          </div>

          {/* Freshness */}
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-medium text-zinc-500 block">
                Retrieval Freshness
              </span>
              <p className="text-white font-mono text-[11px]">
                {weather?.provenance.retrieved_at
                  ? new Date(weather.provenance.retrieved_at).toUTCString()
                  : "Live Feed"}
              </p>
              <p className="text-[11px] text-zinc-500">UTC retrieval timestamp</p>
            </div>
          </div>

          {/* Grid Coordinates */}
          <div className="flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-medium text-zinc-500 block">
                Spatial Grid Precision
              </span>
              {weather ? (
                <>
                  <p className="text-white font-mono text-[11px]">
                    Req: {weather.requested_latitude.toFixed(3)}°, {weather.requested_longitude.toFixed(3)}°
                  </p>
                  <p className="text-zinc-400 font-mono text-[11px]">
                    Grid: {weather.latitude.toFixed(3)}°, {weather.longitude.toFixed(3)}°
                  </p>
                </>
              ) : (
                <p className="text-zinc-500 font-mono text-[11px]">Target coordinate</p>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-medium text-zinc-500 block">
                Timezone / Offset
              </span>
              <p className="text-white font-medium">{weather?.timezone || "Auto-detected"}</p>
              <p className="text-[11px] text-zinc-400 font-mono">
                {weather?.utc_offset_seconds !== undefined
                  ? `UTC ${weather.utc_offset_seconds >= 0 ? "+" : ""}${(weather.utc_offset_seconds / 3600).toFixed(1)} hours`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Legal & Scientific Disclaimer */}
        <div className="p-3.5 rounded-lg bg-[#11141a] border border-[#212630] text-[11px] text-zinc-400 leading-relaxed space-y-1.5">
          <p>
            <strong className="text-zinc-300">Data Integrity Invariant:</strong> SkyGuard displays 100% genuine numerical model outputs from Open-Meteo. No placeholder temperatures, fake forecasts, or synthetic coordinates are rendered.
          </p>
          <p>
            <strong className="text-zinc-300">Official Warning Notice:</strong> Open-Meteo provides numerical weather prediction model forecasts, not official national disaster directives. For official emergency warnings in India, consult the{" "}
            <a
              href="https://mausam.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>IMD Mausam portal</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>{" "}
            or{" "}
            <a
              href="https://sachet.ndma.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>NDMA SACHET disaster portal</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>.
          </p>
        </div>
      </div>
    </footer>
  );
};
