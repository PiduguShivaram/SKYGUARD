"use client";

import { useState, useEffect } from "react";

/**
 * Detects whether WebGL and WebGL2 hardware contexts are available.
 * If unavailable, triggers pure CSS gradient and SVG atmospheric fallbacks.
 */
export function useWebGLFallback(): boolean {
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setIsSupported(Boolean(gl));
    } catch {
      setIsSupported(false);
    }
  }, []);

  return isSupported;
}
