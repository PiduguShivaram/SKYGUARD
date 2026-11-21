"use client";

import { useState, useEffect } from "react";

/**
 * Monitors frame timing and clamps DPR or shader complexity if frame drops occur.
 */
export function useAdaptiveQuality() {
  const [dpr, setDpr] = useState<number>(1);
  const [isLowPower, setIsLowPower] = useState<boolean>(false);

  useEffect(() => {
    // Initial safe clamp
    const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    setDpr(baseDpr);

    // Frame rate measurement
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measure = (now: number) => {
      frameCount++;
      if (now - lastTime >= 2000) {
        const fps = (frameCount * 1000) / (now - lastTime);
        if (fps < 45) {
          setIsLowPower(true);
          setDpr(1); // Downsample for smooth execution
        }
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measure);
    };

    animId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animId);
  }, []);

  return { dpr, isLowPower };
}
