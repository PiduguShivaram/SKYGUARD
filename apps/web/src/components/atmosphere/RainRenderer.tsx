"use client";

import React, { useEffect, useRef } from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface RainRendererProps {
  visuals: AtmosphericVisualParameters;
}

export const RainRenderer: React.FC<RainRendererProps> = ({ visuals }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();
  const { precipitationVisuals, atmosphericEffects } = visuals;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isVisible = true;

    // Clamp DPR to max 2 to ensure silky 60fps performance without GPU texture bloat
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let curWidth = canvas.parentElement?.clientWidth || window.innerWidth || 1440;
    let curHeight = canvas.parentElement?.clientHeight || window.innerHeight || 900;

    const resize = () => {
      const parent = canvas.parentElement;
      curWidth = parent?.clientWidth || window.innerWidth || 1440;
      curHeight = parent?.clientHeight || window.innerHeight || 900;

      canvas.width = Math.round(curWidth * dpr);
      canvas.height = Math.round(curHeight * dpr);
      canvas.style.width = `${curWidth}px`;
      canvas.style.height = `${curHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // 1. Normalized Raindrops (nx: 0-1, ny: 0-1) across the screen
    const isRain =
      precipitationVisuals.type === "rain" || precipitationVisuals.type === "drizzle";
    const rainCount = isRain ? precipitationVisuals.particleCount : 0;

    const drops: {
      nx: number;
      ny: number;
      length: number;
      speed: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < rainCount; i++) {
      drops.push({
        nx: Math.random(),
        ny: Math.random(),
        length: 12 + Math.random() * 16,
        speed: precipitationVisuals.speed + Math.random() * 6,
        opacity: 0.35 + Math.random() * 0.45,
      });
    }

    // 2. Normalized Condensation Water Droplets on Glass
    const glassDrops: {
      nx: number;
      ny: number;
      r: number;
      opacity: number;
    }[] = [];

    if (atmosphericEffects.condensationDroplets) {
      const count = atmosphericEffects.dropletDensity;
      for (let i = 0; i < count; i++) {
        glassDrops.push({
          nx: 0.02 + Math.random() * 0.96,
          ny: 0.02 + Math.random() * 0.96,
          r: 1.5 + Math.random() * 4.0,
          opacity: 0.16 + Math.random() * 0.28,
        });
      }
    }

    // 3. Normalized Snowflakes
    const isSnow = precipitationVisuals.type === "snow";
    const snowCount = isSnow ? Math.min(precipitationVisuals.particleCount, 70) : 0;
    const snowflakes: {
      nx: number;
      ny: number;
      r: number;
      speed: number;
      sway: number;
      swaySpeed: number;
    }[] = [];

    for (let i = 0; i < snowCount; i++) {
      snowflakes.push({
        nx: Math.random(),
        ny: Math.random(),
        r: 1.5 + Math.random() * 2.8,
        speed: 1.2 + Math.random() * 1.8,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.015 + Math.random() * 0.025,
      });
    }

    const slant = precipitationVisuals.slantAngle;
    const slantDx = Math.sin(slant) * 2;

    const render = () => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, curWidth, curHeight);

      // 1. Draw Realistic Water Droplets on Window Glass with Specular Catchlight
      if (glassDrops.length > 0) {
        for (const drop of glassDrops) {
          const gx = drop.nx * curWidth;
          const gy = drop.ny * curHeight;

          // Droplet body
          ctx.beginPath();
          ctx.arc(gx, gy, drop.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity})`;
          ctx.fill();

          // Refraction catchlight
          ctx.beginPath();
          ctx.arc(gx - drop.r * 0.3, gy - drop.r * 0.3, drop.r * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 1.6})`;
          ctx.fill();
        }
      }

      // 2. Draw Falling Rain Streaks
      if (drops.length > 0) {
        ctx.strokeStyle = "rgba(230, 242, 255, 0.65)";
        ctx.lineWidth = 1.25;
        ctx.lineCap = "round";

        for (const drop of drops) {
          const rx = drop.nx * curWidth;
          const ry = drop.ny * curHeight;

          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + slantDx * 2, ry + drop.length);
          ctx.stroke();

          // Move normalized coordinates
          drop.ny += drop.speed / curHeight;
          drop.nx += (slantDx * 0.6) / curWidth;

          if (drop.ny > 1.05) {
            drop.ny = -0.05;
            drop.nx = Math.random();
          }
        }
      }

      // 3. Draw Drifting Snowflakes
      if (snowflakes.length > 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";

        for (const flake of snowflakes) {
          flake.sway += flake.swaySpeed;
          const sx = flake.nx * curWidth + Math.sin(flake.sway) * 15;
          const sy = flake.ny * curHeight;

          ctx.beginPath();
          ctx.arc(sx, sy, flake.r, 0, Math.PI * 2);
          ctx.fill();

          flake.ny += flake.speed / curHeight;
          if (flake.ny > 1.05) {
            flake.ny = -0.05;
            flake.nx = Math.random();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [precipitationVisuals, atmosphericEffects, prefersReduced]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full select-none"
      style={{ zIndex: 6 }}
    />
  );
};
