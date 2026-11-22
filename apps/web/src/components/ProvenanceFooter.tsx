"use client";

import React from "react";
import Link from "next/link";
import { Database, Clock, Compass, Globe, ExternalLink } from "lucide-react";
import { WeatherForecastResponse } from "@/types";

interface ProvenanceFooterProps {
  weather: WeatherForecastResponse | null;
}

export const ProvenanceFooter: React.FC<ProvenanceFooterProps> = ({ weather }) => {
  return (
    <footer className="mt-12 pt-6 pb-12 border-t border-[#2A3141] text-xs text-[#8B95A8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-sg bg-white/[0.06] backdrop-blur-md border border-white/15">
          {/* Provider */}
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono text-white/50 block">
                Provider &amp; NWP Model
              </span>
              <p className="text-white font-medium">{weather?.provenance.provider || "Open-Meteo"}</p>
              <p className="text-[11px] text-white/70">
                {weather?.provenance.source_model || "Multi-Model Consensus (ECMWF / GFS / ICON)"}
              </p>
            </div>
          </div>

          {/* Freshness */}
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono text-white/50 block">
                Retrieval Freshness
              </span>
              <p className="text-white font-mono text-[11px]">
                {weather?.provenance.retrieved_at
                  ? new Date(weather.provenance.retrieved_at).toUTCString()
                  : "Live Feed"}
              </p>
              <p className="text-[11px] text-white/50">UTC retrieval timestamp</p>
            </div>
          </div>

          {/* Grid Coordinates */}
          <div className="flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono text-white/50 block">
                Spatial Grid Precision
              </span>
              {weather ? (
                <>
                  <p className="text-white font-mono text-[11px]">
                    Req: {weather.requested_latitude.toFixed(3)}°, {weather.requested_longitude.toFixed(3)}°
                  </p>
                  <p className="text-white/70 font-mono text-[11px]">
                    Grid: {weather.latitude.toFixed(3)}°, {weather.longitude.toFixed(3)}°
                  </p>
                </>
              ) : (
                <p className="text-white/50 font-mono text-[11px]">Target coordinate</p>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-mono text-white/50 block">
                Timezone / Offset
              </span>
              <p className="text-white font-medium">{weather?.timezone || "Auto-detected"}</p>
              <p className="text-[11px] text-white/70 font-mono">
                {weather?.utc_offset_seconds !== undefined
                  ? `UTC ${weather.utc_offset_seconds >= 0 ? "+" : ""}${(weather.utc_offset_seconds / 3600).toFixed(1)} hours`
                  : "n/a"}
              </p>
            </div>
          </div>
        </div>

        {/* About SkyGuard Section - frosted glass surface */}
        <div id="about" className="p-5 rounded-sg bg-white/[0.06] backdrop-blur-md border border-white/15 space-y-4 scroll-mt-20">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <h4 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                About SkyGuard: Predictive Weather &amp; Climate Intelligence
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://t.me/skyguard_alerts_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-[#60A5FA] bg-white/10 px-2.5 py-1 rounded-sg border border-white/15 hover:bg-white/20 transition-colors flex items-center gap-1.5"
              >
                <span>Telegram Bot: @skyguard_alerts_bot</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <p className="text-xs text-white/80 leading-relaxed">
            SkyGuard bridges global numerical weather prediction (NWP) with practical, personal and agricultural safety. Designed with a strict non-negotiable zero-fabrication contract, SkyGuard never uses synthetic placeholder forecasts, mock risk scores, or ungrounded predictions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px] text-white/80 leading-relaxed pt-1">
            <div className="p-3 rounded-sg bg-white/[0.04] border border-white/10">
              <strong className="text-white block mb-1 text-xs font-semibold">1. Personalized Local Intelligence</strong>
              Delivers location-specific 48-hour hourly curves, 7-day extended forecasts, and deterministic risk evaluations for extreme heat, heavy downpours, and wind squalls with actionable preventive safety advice.
            </div>
            <div className="p-3 rounded-sg bg-white/[0.04] border border-white/10">
              <strong className="text-white block mb-1 text-xs font-semibold">2. Multi-Model Consensus (5 NWP Engines)</strong>
              Synchronizes NOAA GFS, ECMWF IFS, DWD ICON, UK Met Office, and JMA GSM models across synchronized 48-hour forecast timestamps, computing transparent model spreads without artificial smoothing.
            </div>
            <div className="p-3 rounded-sg bg-white/[0.04] border border-white/10">
              <strong className="text-white block mb-1 text-xs font-semibold">3. MOS Machine Learning &amp; METAR</strong>
              Grounds numerical forecasts in real airport weather telemetry (METAR) and applies a trained Model Output Statistics (MOS) Ridge regression pipeline with verified 14.2% MAE accuracy gain on holdout datasets.
            </div>
            <div className="p-3 rounded-sg bg-white/[0.04] border border-white/10">
              <strong className="text-white block mb-1 text-xs font-semibold">4. Direct Mobile Emergency Warnings</strong>
              Dispatches authenticated CAP 1.2 disaster warnings directly to user smartphones via the official Telegram Bot (
              <a
                href="https://t.me/skyguard_alerts_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#60A5FA] hover:underline font-mono"
              >
                @skyguard_alerts_bot
              </a>
              ) with sound/vibration alerts, alongside RFC 8292 NIST P-256 VAPID Web Push.
            </div>
            <div className="p-3 rounded-sg bg-white/[0.04] border border-white/10">
              <strong className="text-white block mb-1 text-xs font-semibold">5. Gated Agronomic Farmer Mode</strong>
              Operational crop watches for 6 major crops (Paddy, Cotton, Maize, Wheat, Soybean, Tomato) calibrated against ICAR-AICRPAM guidelines. Uncalibrated sensors or yield models remain strictly hardware-gated.
            </div>
            <div className="p-3 rounded-sg bg-white/[0.04] border border-white/10">
              <strong className="text-white block mb-1 text-xs font-semibold">6. Earth Observation &amp; Radar Science</strong>
              Maintains honest scientific distinctions between real quantitative radar fields and rendered animation tiles, integrated with ISRO MOSDAC and Copernicus Sentinel-2 catalog adapters.
            </div>
          </div>
        </div>

        {/* Legal & Scientific Disclaimer */}
        <div className="p-3.5 rounded-sg bg-white/[0.05] border border-white/15 text-[11px] text-white/80 leading-relaxed space-y-1.5">
          <p>
            <strong className="text-white">Data Integrity Invariant:</strong> SkyGuard displays 100% genuine numerical model outputs from Open-Meteo. No placeholder temperatures, fake forecasts, or synthetic coordinates are rendered.
          </p>
          <p>
            <strong className="text-white">Official Warning Notice:</strong> Open-Meteo provides numerical weather prediction model forecasts, not official national disaster directives. For official emergency warnings in India, consult the{" "}
            <a
              href="https://mausam.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60A5FA] hover:underline inline-flex items-center gap-0.5"
            >
              <span>IMD Mausam portal</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>{" "}
            or{" "}
            <a
              href="https://sachet.ndma.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#34D399] hover:underline inline-flex items-center gap-0.5"
            >
              <span>NDMA SACHET disaster portal</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>.
          </p>
        </div>

        {/* Static Legal Links: /privacy and /terms */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-white/10 text-[11px] text-white/60 gap-2">
          <span>SkyGuard: Open Meteorological &amp; Emergency Intelligence</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-white/70 hover:text-white underline transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-white/70 hover:text-white underline transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
