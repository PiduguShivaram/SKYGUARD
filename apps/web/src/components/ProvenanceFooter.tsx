"use client";

import React from "react";
import { ShieldCheck, Database, Clock, Globe } from "lucide-react";
import { Provenance } from "@/types";

interface ProvenanceFooterProps {
  provenance: Provenance | null;
  timezone?: string;
}

export const ProvenanceFooter: React.FC<ProvenanceFooterProps> = ({ provenance, timezone }) => {
  return (
    <footer className="mt-12 pt-8 pb-12 border-t border-slate-800 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Provenance Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">NWP Provider</span>
              <p className="text-white font-medium">{provenance?.provider || "Open-Meteo"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Official Warning Body</span>
              <p className="text-white font-medium">IMD / NDMA India</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Data Freshness</span>
              <p className="text-white font-medium">
                {provenance?.retrieved_at
                  ? new Date(provenance.retrieved_at).toLocaleString()
                  : "Live"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Local Timezone</span>
              <p className="text-white font-medium">{timezone || "Auto-detected"}</p>
            </div>
          </div>
        </div>

        {/* Legal & Scientific Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed space-y-2">
          <p>
            <strong className="text-slate-300">Data Integrity Policy:</strong> SkyGuard operates under strict zero-fabrication standards. Environmental metrics and hourly/daily curves are populated solely from real-time Numerical Weather Prediction model feeds (Open-Meteo) and authoritative government portals (IMD/NDMA). No placeholder values or synthetic weather models are rendered.
          </p>
          <p>
            <strong className="text-slate-300">Official Advisory Notice:</strong> Numerical model forecasts and experimental derived risk indicators do not replace official emergency directives. During severe weather events, always verify bulletins on{" "}
            <a
              href="https://mausam.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              mausam.imd.gov.in
            </a>{" "}
            or{" "}
            <a
              href="https://sachet.ndma.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              sachet.ndma.gov.in
            </a>.
          </p>
        </div>
      </div>
    </footer>
  );
};
