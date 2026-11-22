---
name: information-architecture
description: Information architecture, visual hierarchy, navigation flow, and screen composition standards for data-intensive applications.
---

# Information Architecture & Navigation

## 1. Structural Composition
1. **Header & Navigation Bar**:
   - Brand mark (SkyGuard) + Compact search field with recent location history.
   - Clear top tabs or segment navigation:
     - **Forecast** (Current, hourly, 7-day)
     - **Alerts** (Location warnings, regional bulletins, global disaster monitor)
     - **Agriculture** (Farmer mode operational watches & crop stage)
   - Secondary utilities: Notification preferences, current location shortcut, theme/status.
2. **First-Screen State (Zero Search Query)**:
   - Must be immediately useful without fake weather.
   - Show:
     - Search bar with clear auto-complete and recent location chips.
     - "Use current location" button (browser geolocation with explicit consent).
     - Active global disaster map/summary (authentic GDACS / WMO bulletins) labeled clearly as "Worldwide Active Alerts".
     - Guidance text on how to view local weather.
3. **Location Selected State (Forecast View)**:
   - **Hero Band**: Selected location name, current temperature, condition summary, high/low, rain probability, feels-like.
   - **Urgent Advisory Banner**: Only rendered if an official warning is active for this location.
   - **Immediate Outlook**: 24-hour horizontal hourly forecast tape with temperature, precipitation volume, and rain probability.
   - **Mid-Term Outlook**: 7-day forecast with day-by-day temperature range bars, precipitation probability, and wind metrics.
   - **Weather Details Matrix**: Humidity, apparent temperature, wind vector, UV index, sunrise/sunset.
   - **Scientific Transparency & Provenance**: Model grid citation, provider timestamp, and data integrity note in a discrete, non-intrusive footer.

## 2. Review Checklist
- Is the most urgent information (severe weather warnings) visible before secondary details?
- Does each section have a single clear job without content duplication?
- Does the navigation transition seamlessly between modes without page reloads?
