"use client";

import React from "react";
import Link from "next/link";
import { CloudSun, Sprout, User, Bell, Globe, Info, Sun, Moon } from "lucide-react";

interface HeaderProps {
  upstreamStatus: string;
  currentMode?: "public" | "farmer";
  onModeChange?: (mode: "public" | "farmer") => void;
  onOpenNotifications?: () => void;
  onOpenAbout?: () => void;
  notificationsActive?: boolean;
  activeNav?: "weather" | "disasters";
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  upstreamStatus,
  currentMode = "public",
  onModeChange,
  onOpenNotifications,
  onOpenAbout,
  notificationsActive,
  activeNav = "weather",
  theme = "light",
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-black/30 backdrop-blur-md border-b border-white/10 shadow-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-sg bg-white/10 text-[#60A5FA] border border-white/20 group-hover:border-white/40 transition-colors">
              <CloudSun className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                  SkyGuard
                </span>
              </div>
              <p className="text-[11px] text-white/60 hidden sm:block tracking-tight font-medium">
                Weather &amp; Public Warnings
              </p>
            </div>
          </Link>
        </div>

        {/* Primary Navigation & Mode Switch */}
        <div className="flex items-center gap-2">
          {/* Main Route Navigation */}
          <nav aria-label="Main Navigation" className="flex items-center bg-black/40 p-1 rounded-sg border border-white/10">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium transition-all ${
                activeNav === "weather"
                  ? "bg-white/20 text-white font-semibold"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span>Local Weather</span>
            </Link>

            <Link
              href="/disasters"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium transition-all ${
                activeNav === "disasters"
                  ? "bg-white/20 text-white font-semibold"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Global Radar</span>
            </Link>

            {onOpenAbout ? (
              <button
                type="button"
                onClick={onOpenAbout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>About</span>
              </button>
            ) : (
              <Link
                href="/#about"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <Info className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>About</span>
              </Link>
            )}
          </nav>

          {/* Mode Selector (Public vs Farmer) - shown on weather page */}
          {onModeChange && (
            <nav aria-label="Application Mode" className="hidden sm:flex items-center bg-black/40 p-1 rounded-sg border border-white/10">
              <button
                type="button"
                onClick={() => onModeChange("public")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium transition-all ${
                  currentMode === "public"
                    ? "bg-white/20 text-white font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>

              <button
                type="button"
                onClick={() => onModeChange("farmer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium transition-all ${
                  currentMode === "farmer"
                    ? "bg-[#059669]/30 text-[#34D399] font-semibold border border-[#059669]/50"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Sprout className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Farmer</span>
              </button>
            </nav>
          )}
        </div>

        {/* Right Status & Push Settings */}
        <div className="flex items-center gap-2.5">
          {/* Decorated Theme Switcher Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sg border text-xs font-mono font-semibold transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                theme === "light"
                  ? "bg-white/90 hover:bg-white text-amber-900 border-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.25)]"
                  : "bg-white/10 hover:bg-white/20 text-sky-200 border-white/20"
              }`}
              title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
            >
              {theme === "light" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-sky-300 fill-sky-300/30" />
                  <span>Dark</span>
                </>
              )}
            </button>
          )}

          {/* Push Notification Toggle Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className={`relative p-2 rounded-sg border text-xs font-medium transition-colors flex items-center justify-center min-h-[36px] min-w-[36px] ${
                notificationsActive
                  ? "bg-[#2563EB]/20 border-[#60A5FA]/40 text-[#60A5FA]"
                  : "bg-black/40 border-white/10 text-white/70 hover:text-white hover:border-white/25"
              }`}
              title="Push Notification Settings"
              aria-label="Push Notification Settings"
            >
              <Bell className="w-4 h-4" />
              {notificationsActive && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#34D399]" />
              )}
            </button>
          )}

          {/* Upstream Provider Status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-sg bg-black/40 border border-white/10 text-[11px] text-white/80 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                upstreamStatus === "HEALTHY" || upstreamStatus === "CONNECTED"
                  ? "bg-[#34D399]"
                  : upstreamStatus === "DEGRADED"
                  ? "bg-[#FCD34D]"
                  : "bg-[#F87171]"
              }`}
            />
            <span>
              {upstreamStatus === "HEALTHY" || upstreamStatus === "CONNECTED"
                ? "Live Feeds: HEALTHY"
                : upstreamStatus === "DEGRADED"
                ? "Live Feeds: DEGRADED"
                : "Live Feeds: UNAVAILABLE"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
