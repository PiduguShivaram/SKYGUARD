---
name: creative-webgl-development
description: Standards for high-performance Canvas, WebGL, shader gradients, and procedural atmospheric graphics in Next.js without bundle bloat.
---

# Creative WebGL & Canvas Development Standards

## 1. Core Principles
1. **Zero Hydration Vulnerabilities**:
   - All Canvas/WebGL lifecycle calls must be strictly confined to `useEffect` or dynamic `ssr: false` imports. Never touch `window` or `document` during SSR.
2. **Deterministic Fallbacks**:
   - Every Canvas scene must feature a graceful, CSS-based ambient light fallback for devices with disabled WebGL or hardware acceleration constraints.
3. **Adaptive Resolution & DPR Clamping**:
   - Clamp device pixel ratio to `Math.min(window.devicePixelRatio, 2)` to avoid GPU memory exhaustion on 4K/Retina displays.
4. **Lifecycle Resource Cleanup**:
   - Cancel `requestAnimationFrame` loops on unmount.
   - Dispose textures, geometries, shaders, and event listeners to prevent memory leaks.
