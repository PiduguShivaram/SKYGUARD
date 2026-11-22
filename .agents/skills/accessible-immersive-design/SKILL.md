---
name: accessible-immersive-design
description: Ensures immersive WebGL and motion experiences remain fully accessible, keyboard-operable, and respectful of prefers-reduced-motion.
---

# Accessible Immersive Design Standards

## 1. Non-Negotiable Invariants
1. **Prefers-Reduced-Motion**:
   - When `prefers-reduced-motion: reduce` is detected, instantly disable canvas particle animations, spring overshoots, and parallax shifts.
   - Replace continuous animations with subtle cross-fades or static high-quality graphics.
2. **Accessible DOM Parallels**:
   - Any data or control represented inside an interactive Canvas or WebGL scene MUST have an accessible HTML equivalent (e.g., hidden accessible table or slider with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
3. **Contrast Compliance**:
   - All critical text labels and values must maintain at least 4.5:1 contrast against dynamic canvas backgrounds.
