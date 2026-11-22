"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface WeatherIconProps {
  size?: number;
  className?: string;
  code?: number;
  isDay?: boolean;
}

export function LivingSunIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <circle cx="24" cy="24" r="9" stroke="#FCD34D" strokeWidth={2} />
      <line x1="24" y1="5" x2="24" y2="10" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="43" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="5" y1="24" x2="10" y2="24" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="38" y1="24" x2="43" y2="24" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="34" y1="34" x2="37.5" y2="37.5" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="10.5" y1="37.5" x2="14" y2="34" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
      <line x1="34" y1="14" x2="37.5" y2="10.5" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function LivingMoonIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path
        d="M28 10a14 14 0 100 28 10 10 0 01 0-28z"
        stroke="#60A5FA"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35" cy="14" r="1" fill="#8B95A8" />
      <circle cx="39" cy="22" r="1" fill="#8B95A8" />
      <circle cx="33" cy="28" r="1" fill="#8B95A8" />
    </svg>
  );
}

export function LivingCloudIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path
        d="M36 30H14a8 8 0 01-.5-16A10 10 0 0134 16a7 7 0 012 14z"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LivingRainIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path
        d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="16" y1="28" x2="14" y2="34" stroke="#60A5FA" strokeWidth={2} strokeLinecap="round" />
      <line x1="24" y1="28" x2="22" y2="34" stroke="#60A5FA" strokeWidth={2} strokeLinecap="round" />
      <line x1="32" y1="28" x2="30" y2="34" stroke="#60A5FA" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function LivingThunderIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path
        d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M26 20l-4 9h6l-4 11"
        stroke="#FCD34D"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LivingSnowIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path
        d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line x1="18" y1="28" x2="18" y2="32" stroke="#E8EDF4" strokeWidth={2} strokeLinecap="round" />
      <line x1="26" y1="30" x2="26" y2="34" stroke="#E8EDF4" strokeWidth={2} strokeLinecap="round" />
      <line x1="34" y1="28" x2="34" y2="32" stroke="#E8EDF4" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function LivingWindIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path
        d="M8 18h24a4 4 0 000-8"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M8 26h30a3 3 0 010 6"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M8 34h18"
        stroke="#8B95A8"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LivingWeatherIcon({ size = 48, className, code = 0, isDay = true }: WeatherIconProps) {
  if (code >= 95) return <LivingThunderIcon size={size} className={className} />;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <LivingSnowIcon size={size} className={className} />;
  if (code >= 51 && code <= 82) return <LivingRainIcon size={size} className={className} />;
  if (code >= 45 && code <= 48) return <LivingWindIcon size={size} className={className} />;
  if (code >= 2 && code <= 3) return <LivingCloudIcon size={size} className={className} />;
  return isDay ? <LivingSunIcon size={size} className={className} /> : <LivingMoonIcon size={size} className={className} />;
}
