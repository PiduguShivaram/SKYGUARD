"use client";

import React from "react";
import { Shield, Sprout, Users, Radio, AlertTriangle } from "lucide-react";

interface HeaderProps {
  mode: "public" | "farmer";
  onModeChange: (mode: "public" | "farmer") => void;
  upstreamStatus: string;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange, upstreamStatus }) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
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
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Authoritative Weather & Climate Intelligence
            </p>
          </div>
        </div>

        {/* Operating Mode Selector & Health */}
        <div className="flex items-center gap-3">
          {/* Provider status badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                upstreamStatus === "REACHABLE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-[11px] font-medium">NWP: {upstreamStatus}</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-800/90 rounded-xl border border-slate-700">
            <button
              onClick={() => onModeChange("public")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "public"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-label="Switch to Public Mode"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Public Mode</span>
            </button>

            <button
              onClick={() => onModeChange("farmer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "farmer"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-label="Switch to Farmer Mode"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Farmer Mode</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
