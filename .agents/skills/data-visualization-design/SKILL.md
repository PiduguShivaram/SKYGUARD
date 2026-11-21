---
name: data-visualization-design
description: Scientifically honest, accessible, and distortion-free weather charts, timelines, and statistical graphics.
---

# Data Visualization Design for Weather Intelligence

## 1. Scientific Integrity Invariants
1. **No Artificial Curve Distortion**: Never apply aggressive Bézier smoothing that creates peaks higher than actual forecast values or troughs lower than forecasted minimums.
2. **Authentic Scale & Intervals**: Explicit baseline, legible degree ticks, and clear time interval labels (e.g. 3-hour or 1-hour ticks).
3. **Dual-Variable Clarity**: When plotting temperature and precipitation on the same chart:
   - Temperature is plotted as a line/area graph with high-contrast color.
   - Precipitation is plotted as vertical bars or discrete chance badges to avoid confusion.
4. **Visible Missing Data**: Never interpolate or invent missing values. Render explicit gaps if sensor or model data is unavailable.

## 2. Interactive Ergonomics
- Smooth, non-laggy cursor scrub across hourly forecast points.
- Tooltips display exact value, unit, and forecast valid timestamp.
- Contrast compliant text labels on chart axes.

## 3. Review Criteria
- Does the chart accurately represent the backend JSON array without rounding distortion?
- Is the hourly timeline legible on both 360px mobile viewports (via smooth horizontal scroll) and 1440px desktop?
