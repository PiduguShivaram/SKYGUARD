---
name: design-system-engineering
description: Design tokens, semantic scales, typography standards, surface hierarchy, and theme tokens for scalable web applications.
---

# Design System Engineering

## 1. Token Architecture
1. **Neutral Foundation**:
   - `bg-canvas`: Default page background (`#F9FAFB` light, `#0D0F12` dark).
   - `bg-surface`: Elevated content cards and panels (`#FFFFFF` light, `#13171E` dark).
   - `bg-subtle`: Secondary container or input background (`#F3F4F6` light, `#1A1F29` dark).
   - `border-base`: Subtle structural border (`#E5E7EB` light, `#232936` dark).
   - `border-subtle`: Secondary hairline separator (`#F3F4F6` light, `#1A1F29` dark).
2. **Typography Scale**:
   - High-legibility grotesque sans-serif (`Inter`, system UI font stack) with consistent optical tracking.
   - Display/Hero: `text-5xl` to `text-6xl` font-semibold with `tabular-nums` for primary temperature.
   - Heading 1/2: `text-xl` to `text-2xl` font-medium tracking-tight.
   - Body & Metrics: `text-sm` (14px) and `text-xs` (12px) with `font-normal` or `font-medium`.
   - Monospace: Reserved strictly for geodetic coordinates, timestamps, and model run identifiers (`text-[11px] font-mono`).
3. **Semantic Status Tokens**:
   - **Severe/Extreme Alert**: `#DC2626` (Red 600) / dark `#EF4444`.
   - **Moderate/Advisory Alert**: `#D97706` (Amber 600) / dark `#F59E0B`.
   - **Informational/Observation**: `#2563EB` (Blue 600) / dark `#38BDF8`.
   - **Agronomic/Safe/Active**: `#059669` (Emerald 600) / dark `#10B981`.
   *Never use semantic status colors decoratively.*

## 2. Anti-Patterns
- Using random hex values across CSS files instead of systematic tokens.
- Oversized border radii (`rounded-3xl` or `rounded-full` everywhere). Keep cards to `rounded-lg` (8px) or `rounded-xl` (12px).
- Inconsistent line heights or cramped letter spacing.

## 3. Implementation Checklist
- Tailwind configuration cleanly defines semantic colors.
- High contrast compliant in both dark and light modes (WCAG 2.2 AA).
- Interactive states (`hover`, `focus-visible`, `active`) have consistent token transitions.
