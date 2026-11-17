---
name: weather-ui-ux
description: Accessible, responsive, real-data dashboard design guidelines with high contrast, dark/light themes, and clear provenance displays.
---

# Weather UI/UX Skill

## Principles
1. **Real Data Exclusivity**: Charts and KPI cards must only populate once genuine provider responses arrive. Use clean skeleton loaders during loading; never flash dummy numbers like "24°C" or "Sunny" as placeholders.
2. **Accessible Visual Hierarchy**:
   - High contrast ratios meeting WCAG 2.1 AA/AAA guidelines.
   - Dark mode default with sleek glassmorphism / slate finish and light mode support.
   - Distinct icons for day vs night conditions using WMO weather codes.
3. **Responsive Mobile-First Design**:
   - Touch-friendly tap targets (minimum 44x44px).
   - Horizontal scrolling for 24-hour hourly forecast cards and timeline graphs.
   - Collapsible cards for secondary metrics (air quality, UV index, wind compass, atmospheric pressure).
4. **Transparent Provenance Badges**:
   - Top or bottom status bar showing "Data provided by Open-Meteo · Updated at [time] · Timezone [TZ]".
   - One-click copy or inspect of raw data payload for power users and auditing.
