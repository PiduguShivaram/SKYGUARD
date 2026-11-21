"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WeatherIconProps {
  size?: number;
  className?: string;
  code?: number;
  isDay?: boolean;
}

export function LivingSunIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <motion.svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 16, ease: "linear", repeat: Infinity }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <motion.line
            key={deg}
            x1="24"
            y1="6"
            x2="24"
            y2="10"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeLinecap="round"
            style={{ transformOrigin: "24px 24px", rotate: deg }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: deg / 360 }}
          />
        ))}
      </motion.g>
      <motion.circle
        cx="24"
        cy="24"
        r="8"
        fill="#F59E0B"
        opacity={0.2}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="24" cy="24" r="8" stroke="#F59E0B" strokeWidth={2} />
    </motion.svg>
  );
}

export function LivingMoonIcon({ size = 48, className }: { size?: number; className?: string }) {
  const stars = [
    { cx: 34, cy: 10, d: 0 },
    { cx: 38, cy: 18, d: 0.5 },
    { cx: 30, cy: 6, d: 1 },
    { cx: 40, cy: 12, d: 1.5 },
  ];
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path d="M28 8a14 14 0 100 28 10 10 0 01 0-28z" fill="#93C5FD" opacity={0.15} />
      <path d="M28 8a14 14 0 100 28 10 10 0 01 0-28z" stroke="#93C5FD" strokeWidth={2} strokeLinecap="round" />
      {stars.map((s) => (
        <motion.circle
          key={s.cx + s.cy}
          cx={s.cx}
          cy={s.cy}
          r="1"
          fill="#38BDF8"
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: s.d }}
        />
      ))}
    </svg>
  );
}

export function LivingCloudIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <motion.g animate={{ x: [0, 2, 0, -2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M36 30H14a8 8 0 01-.5-16A10 10 0 0134 16a7 7 0 012 14z" fill="#94A3B8" opacity={0.15} />
        <path
          d="M36 30H14a8 8 0 01-.5-16A10 10 0 0134 16a7 7 0 012 14z"
          stroke="#94A3B8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

export function LivingRainIcon({ size = 48, className }: { size?: number; className?: string }) {
  const drops = [
    { x: 16, d: 0 },
    { x: 22, d: 0.3 },
    { x: 28, d: 0.6 },
    { x: 34, d: 0.15 },
  ];
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z" fill="#38BDF8" opacity={0.12} />
      <path d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z" stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
      {drops.map((drop) => (
        <motion.line
          key={drop.x}
          x1={drop.x}
          y1={26}
          x2={drop.x}
          y2={30}
          stroke="#38BDF8"
          strokeWidth={2}
          strokeLinecap="round"
          animate={{ y: [0, 12], opacity: [0.8, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: drop.d, ease: "easeIn" }}
        />
      ))}
    </svg>
  );
}

export function LivingThunderIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z" fill="#F59E0B" opacity={0.12} />
      <path d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" />
      <motion.path
        d="M26 20l-3 8h6l-3 10"
        stroke="#F59E0B"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0, 1, 1, 0, 0, 0, 1, 0, 0, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </svg>
  );
}

export function LivingSnowIcon({ size = 48, className }: { size?: number; className?: string }) {
  const flakes = [
    { x: 16, d: 0 },
    { x: 22, d: 0.5 },
    { x: 28, d: 0.2 },
    { x: 34, d: 0.7 },
  ];
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <path d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z" fill="#CBD5E1" opacity={0.15} />
      <path d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" />
      {flakes.map((f, i) => (
        <motion.circle
          key={i}
          cx={f.x}
          cy={26}
          r={1.5}
          fill="#CBD5E1"
          animate={{ y: [0, 14], x: [0, i % 2 === 0 ? 3 : -3, 0], opacity: [0.8, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: f.d, ease: "easeIn" }}
        />
      ))}
    </svg>
  );
}

export function LivingWindIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
      <motion.path
        d="M6 18h26a4 4 0 000-8"
        stroke="#94A3B8"
        strokeWidth={2}
        strokeLinecap="round"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M6 24h32a3 3 0 010 6"
        stroke="#94A3B8"
        strokeWidth={2}
        strokeLinecap="round"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
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
