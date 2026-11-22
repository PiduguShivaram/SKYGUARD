"use client";

import React, { useEffect, useState } from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LightningRendererProps {
  visuals: AtmosphericVisualParameters;
}

export const LightningRenderer: React.FC<LightningRendererProps> = ({ visuals }) => {
  const prefersReduced = useReducedMotion();
  const { atmosphericEffects } = visuals;
  const [isActive, setIsActive] = useState<boolean>(false);
  const [strikePos, setStrikePos] = useState<{ x: number; y: number }>({ x: 50, y: 35 });

  useEffect(() => {
    if (!atmosphericEffects.hasLightning || prefersReduced) {
      setIsActive(false);
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const scheduleStrike = () => {
      // 3.5 to 8.5 seconds interval between strikes
      const interval = 3500 + Math.random() * 5000;
      timer = setTimeout(() => {
        if (!isMounted) return;

        // Position strike near the central cloud region
        setStrikePos({
          x: 42 + Math.random() * 16,
          y: 28 + Math.random() * 14,
        });

        setIsActive(true);
        setTimeout(() => {
          if (!isMounted) return;
          setIsActive(false);

          // 40% probability of rapid secondary discharge
          if (Math.random() > 0.6) {
            setTimeout(() => {
              if (!isMounted) return;
              setIsActive(true);
              setTimeout(() => {
                if (isMounted) setIsActive(false);
              }, 100);
            }, 75);
          }
          scheduleStrike();
        }, 160);
      }, interval);
    };

    scheduleStrike();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [atmosphericEffects.hasLightning, prefersReduced]);

  if (!atmosphericEffects.hasLightning || !isActive) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none transition-opacity duration-75 z-20"
      style={{
        background: "radial-gradient(circle at 50% 35%, rgba(220, 235, 255, 0.35) 0%, transparent 70%)",
      }}
    >
      <svg
        className="absolute w-36 h-48 sm:w-44 sm:h-60"
        style={{
          left: `${strikePos.x}%`,
          top: `${strikePos.y}%`,
          transform: "translate(-50%, 0)",
        }}
        viewBox="0 0 100 160"
        fill="none"
      >
        {/* Soft Aura Glow */}
        <path
          d="M 50 10 L 42 55 L 56 60 L 32 110 L 45 115 L 20 155"
          stroke="#93C5FD"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-70 blur-sm"
        />

        {/* Sharp White Core Channel */}
        <path
          d="M 50 10 L 42 55 L 56 60 L 32 110 L 45 115 L 20 155"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Forked branch */}
        <path
          d="M 42 55 L 28 85 L 18 95"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-90"
        />
      </svg>
    </div>
  );
};
