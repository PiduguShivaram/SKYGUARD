---
name: animation-performance
description: Performance budgeting and 60fps optimization for WebGL, Canvas, and Framer Motion in Next.js.
---

# Animation Performance Standards

## 1. Performance Budgets
- **Frame Rate Target**: 60 FPS on representative consumer hardware (no frame drops during scroll or scrubber drag).
- **Core Web Vitals**:
  - Largest Contentful Paint (LCP) <= 2.5s.
  - Interaction to Next Paint (INP) <= 200ms.
  - Cumulative Layout Shift (CLS) <= 0.1.

## 2. GPU & Rendering Guardrails
1. **Transform and Opacity Only**: Never animate `top`, `left`, `width`, `height`, or `margin`.
2. **Will-Change Restraint**: Apply `will-change: transform` only during active animation; remove when settled.
3. **Canvas Offscreen Pausing**: Use `IntersectionObserver` to halt canvas `requestAnimationFrame` loops when the element scrolls out of view.
4. **DPR Clamping**: Restrict canvas render buffer resolution to `Math.min(window.devicePixelRatio, 2)`.
