"use client";

import { useState, useEffect, useRef } from "react";

export function usePointerVelocity() {
  const [velocity, setVelocity] = useState({ vx: 0, vy: 0, speed: 0 });
  const lastPos = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = now - lastPos.current.time;
      if (dt > 16) {
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        const vx = (dx / dt) * 1000;
        const vy = (dy / dt) * 1000;
        const speed = Math.sqrt(vx * vx + vy * vy);

        setVelocity({ vx, vy, speed });
        lastPos.current = { x: e.clientX, y: e.clientY, time: now };
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return velocity;
}
