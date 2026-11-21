"use client";

import React from "react";
import { Shield, Database, Clock, Globe, Compass, ExternalLink, Cpu } from "lucide-react";
import { WeatherForecastResponse } from "@/types";

interface ProvenanceFooterProps {
  weather: WeatherForecastResponse | null;
}

export const ProvenanceFooter: React.FC<ProvenanceFooterProps> = ({ weather }) => {
  return (
    <footer className="mt-14 pt-8 pb-14 border-t border-white/[0.08] text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Provenance Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#080d1a]/85 border border-white/[0.08] shadow-lg backdrop-blur-xl">
          {/* Provider & Source Model */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                Provider &amp; NWP Model
              </span>
              <p className="text-white font-semibold">{weather?.provenance.provider || "Open-Meteo"}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                {weather?.provenance.source_model || "Seamless Multi-Model (ECMWF / GFS / ICON)"}
              </p>
            </div>
          </div>

          {/* Retrieved-at Timestamp */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                Retrieval Freshness
              </span>
              <p className="text-white font-semibold font-mono text-[11px]">
                {weather?.provenance.retrieved_at
                  ? new Date(weather.provenance.retrieved_at).toUTCString()
                  : "Live Feed"}
              </p>
              <p className="text-[11px] text-slate-400">UTC retrieval timestamp</p>
            </div>
          </div>

          {/* Coordinates: Requested vs Grid */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                Spatial Grid Precision
              </span>
              {weather ? (
                <>
                  <p className="text-white font-mono text-[11px]">
                    Req: {weather.requested_latitude.toFixed(3)}°, {weather.requested_longitude.toFixed(3)}°
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    Grid: {weather.latitude.toFixed(3)}°, {weather.longitude.toFixed(3)}°
                  </p>
                </>
              ) : (
                <p className="text-slate-400 font-mono text-[11px]">Target coordinate</p>
              )}
            </div>
          </div>

          {/* Timezone & UTC Offset */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                Timezone / UTC Offset
              </span>
              <p className="text-white font-semibold">{weather?.timezone || "Auto-detected"}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                {weather?.utc_offset_seconds !== undefined
                  ? `UTC ${weather.utc_offset_seconds >= 0 ? "+" : ""}${(weather.utc_offset_seconds / 3600).toFixed(1)} hours`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Legal, Scientific, and Official Alert Notice */}
        <div className="p-5 rounded-2xl bg-[#080d1a]/60 border border-white/[0.06] text-[11px] text-slate-400 leading-relaxed space-y-2">
          <p>
            <strong className="text-slate-300">Data Integrity Invariant:</strong> SkyGuard displays 100% genuine numerical model outputs from Open-Meteo. No placeholder temperatures, fake forecasts, or synthetic coordinates are rendered.
          </p>
          <p>
            <strong className="text-amber-300">Notice on Official Emergency Alerts:</strong> Open-Meteo provides numerical weather prediction model forecasts, NOT official national disaster warnings. In accordance with SkyGuard data integrity rules, no &quot;All Clear&quot; banner or emergency alert status is displayed because this milestone does not connect an official national disaster feed. For official emergency warnings in India, consult the{" "}
            <a
              href="https://mausam.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
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
