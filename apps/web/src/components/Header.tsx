"use client";

import React from "react";
import { CloudSun, Sprout, User, Bell, AlertTriangle } from "lucide-react";

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
    <header className="sticky top-0 z-40 w-full bg-[#161b22]/95 border-b border-[#262c36] shadow-sm backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/25">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                SkyGuard
              </h1>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block tracking-tight font-medium">
              Weather &amp; Public Warnings
            </p>
          </div>
        </div>

        {/* Center Mode Navigation */}
        <nav aria-label="Application Mode" className="flex items-center bg-[#0e1117] p-1 rounded-lg border border-[#262c36]">
          <button
            onClick={() => onModeChange("public")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentMode === "public"
                ? "bg-[#212734] text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Public Mode</span>
          </button>

          <button
            onClick={() => onModeChange("farmer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentMode === "farmer"
                ? "bg-[#14291f] text-emerald-300 shadow-sm font-semibold border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]"
            }`}
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            <span>Farmer Mode</span>
          </button>
        </nav>

        {/* Right Status & Push Settings */}
        <div className="flex items-center gap-2.5">
          {/* Push Notification Toggle Button */}
          <button
            onClick={onOpenNotifications}
            className={`relative p-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center ${
              notificationsActive
                ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                : "bg-[#0e1117] border-[#262c36] text-zinc-400 hover:text-white hover:border-[#3b4352]"
            }`}
            title="Global Push Notification Settings"
            aria-label="Global Push Notification Settings"
          >
            <Bell className="w-4 h-4" />
            {notificationsActive && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Upstream Provider Status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1117] border border-[#262c36] text-[11px] text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full ${
                upstreamStatus === "HEALTHY"
                  ? "bg-emerald-400"
                  : upstreamStatus === "DEGRADED"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            <span>
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
