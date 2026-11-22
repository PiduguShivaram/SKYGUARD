"use client";

import { useState, useEffect, RefObject } from "react";

/**
 * Halts intensive Canvas animation loops when element is scrolled off-screen.
 */
export function useVisibilityPause(ref: RefObject<HTMLElement>): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
}
