"use client";

import React, { useState, useEffect } from "react";
import { Shield, Sprout, User, Bell, Radio, Compass, Clock, Activity } from "lucide-react";

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
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d1015]/90 border-b border-[#1f2532] shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand / Observatory Identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#141822] border border-[#2b3344] shadow-inner">
            <Compass className="w-5 h-5 text-amber-400 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-60" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                SkyGuard
              </h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-widest uppercase">
                OBSERVATORY 2.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block font-mono tracking-tight">
              Global Geodetic Weather &amp; Disaster Intelligence
            </p>
          </div>
        </div>

        {/* Tactical Controls & Telemetry Deck */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Live UTC Synchronized Chronometer */}
          {utcTime && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0c10] border border-[#1e2330] text-zinc-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-400/80" />
              <span>{utcTime}</span>
            </div>
          )}

          {/* Segmented Mode Selector (Tactile Instrument Switch) */}
          <div className="flex items-center bg-[#090b0e] p-1 rounded-lg border border-[#202532] shadow-inner">
            <button
              onClick={() => onModeChange("public")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                currentMode === "public"
                  ? "bg-[#181d28] text-amber-300 border border-amber-500/30 shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Public Mode</span>
            </button>

            <button
              onClick={() => onModeChange("farmer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                currentMode === "farmer"
                  ? "bg-[#11231a] text-emerald-300 border border-emerald-500/30 shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
              }`}
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              <span>Farmer Mode</span>
            </button>
          </div>

          {/* Web Push Alerts Bell */}
          <button
            onClick={onOpenNotifications}
            className={`relative p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              notificationsActive
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-[#11141b] border-[#202532] text-zinc-400 hover:text-white hover:border-[#333a4c]"
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
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#090b0e] border border-[#1e2330] text-zinc-300 font-mono text-xs">
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
