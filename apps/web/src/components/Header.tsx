"use client";

import React from "react";
import { Shield, Sprout, User, Bell, Radio } from "lucide-react";

interface HeaderProps {
  upstreamStatus: string;
  currentMode: "public" | "farmer";
  onModeChange: (mode: "public" | "farmer") => void;
  onOpenNotifications?: () => void;
  notificationsActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  upstreamStatus,
  currentMode,
  onModeChange,
  onOpenNotifications,
  notificationsActive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#080d1a]/85 border-b border-white/[0.08] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-transparent border border-sky-500/30 shadow-[0_0_15px_-3px_rgba(14,165,233,0.3)]">
            <Shield className="w-5 h-5 text-sky-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping opacity-60" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                SkyGuard
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/25 tracking-wide uppercase">
                LIVE INTEL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block tracking-normal font-medium">
              Global Weather &amp; Disaster Intelligence
            </p>
          </div>
        </div>

        {/* Center / Right Mode Selector, Push Button & Telemetry Status */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center bg-[#050811] p-1 rounded-xl border border-white/[0.08] shadow-inner">
            <button
              onClick={() => onModeChange("public")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                currentMode === "public"
                  ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-[0_2px_10px_rgba(14,165,233,0.35)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Public Mode</span>
            </button>

            <button
              onClick={() => onModeChange("farmer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                currentMode === "farmer"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Farmer Mode</span>
            </button>
          </div>

          {/* Web Push Alerts Bell */}
          <button
            onClick={onOpenNotifications}
            className={`relative p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              notificationsActive
                ? "bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.25)]"
                : "bg-[#0b1220] border-white/[0.08] text-slate-400 hover:text-white hover:border-slate-600"
            }`}
            title="Global Push Notification Settings"
            aria-label="Global Push Notification Settings"
          >
            <Bell className="w-4 h-4" />
            {notificationsActive && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981] animate-pulse" />
            )}
          </button>

          {/* Upstream Provider Pulse */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-[#0b1220] border border-white/[0.08] text-slate-300 shadow-sm font-mono">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  upstreamStatus === "HEALTHY"
                    ? "bg-emerald-400"
                    : upstreamStatus === "DEGRADED"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  upstreamStatus === "HEALTHY"
                    ? "bg-emerald-500"
                    : upstreamStatus === "DEGRADED"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
            </span>
            <span className="text-[11px] font-medium tracking-tight">
              {upstreamStatus === "HEALTHY"
                ? "Live Feeds: HEALTHY"
                : upstreamStatus === "DEGRADED"
                ? "Live Feeds: DEGRADED (Partial)"
                : "Live Feeds: UNAVAILABLE"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
