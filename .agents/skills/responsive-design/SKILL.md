---
name: responsive-design
description: Multi-viewport responsive layout standards, touch ergonomics, fluid grids, and adaptive density from mobile (360px) to desktop (1440px+).
---

# Responsive Design & Multi-Viewport Engineering

## 1. Viewport Tiers & Targets
- **Mobile Compact (360px - 390px)**: iPhone SE / standard Android. Single column flow, sticky or compact top bar, touch targets >= 44x44px, horizontally scrollable hourly forecasts, no awkward horizontal page overflow.
- **Mobile Large / Phablet (391px - 480px)**: iPhone 15 Pro, Pixel 8. Comfortable reading line lengths, compact weather stat pairs.
- **Tablet (768px - 1024px)**: iPad Mini / Air. Two-column balanced layouts, sidebar or top tab navigation.
- **Desktop (1280px - 1440px+)**: Restrained max-width container (`max-w-6xl` or `max-w-7xl`), multi-column operational view, zero unnatural component stretching.

## 2. Touch Ergonomics
- Buttons and interactive selectors must have a minimum tap target of 44x44 CSS pixels.
- Generous padding between clickable chips to prevent accidental taps.
- Inputs must not zoom automatically on iOS (font-size >= 16px or disabled zoom).

## 3. Review Criteria
- Test at 1440px, 1024px, 768px, 390px, and 360px.
- No clipped text or horizontal page scrollbars at any viewport.
- Content re-stacks logically rather than simply shrinking down to illegible font sizes.
