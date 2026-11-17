"use client";

import React from "react";
import { Shield, Sprout, User } from "lucide-react";

interface HeaderProps {
  upstreamStatus: string;
  currentMode: "public" | "farmer";
  onModeChange: (mode: "public" | "farmer") => void;
}

export const Header: React.FC<HeaderProps> = ({
  upstreamStatus,
  currentMode,
  onModeChange,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/90 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">SkyGuard</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                LIVE INTEL
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Global Weather &amp; Disaster Intelligence
            </p>
          </div>
        </div>

        {/* Center / Right Mode Selector & Status */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onModeChange("public")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentMode === "public"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Public Mode</span>
            </button>

            <button
              onClick={() => onModeChange("farmer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentMode === "farmer"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Farmer Mode</span>
            </button>
          </div>

          {/* Upstream Provider Pulse */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-800/90 border border-slate-700 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                upstreamStatus === "HEALTHY" || upstreamStatus === "REACHABLE"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-xs font-medium">Live Feeds: {upstreamStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
