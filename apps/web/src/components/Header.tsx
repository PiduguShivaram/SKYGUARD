"use client";

import React from "react";
import { Shield, Radio } from "lucide-react";

interface HeaderProps {
  upstreamStatus: string;
}

export const Header: React.FC<HeaderProps> = ({ upstreamStatus }) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/90 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">SkyGuard</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PHASE 1 · LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Public Weather Forecast &amp; Real Open-Meteo Integration
            </p>
          </div>
        </div>

        {/* Upstream Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-800/90 border border-slate-700 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                upstreamStatus === "HEALTHY" || upstreamStatus === "REACHABLE"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-xs font-medium">Provider: Open-Meteo NWP ({upstreamStatus})</span>
          </div>
        </div>
      </div>
    </header>
  );
};
