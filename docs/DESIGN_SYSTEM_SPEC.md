# SkyGuard — Senior Product Design & Architecture Specification

## 1. UI Audit & Critical Diagnosis of Previous Iterations

### Identified Design Failures
1. **The "Empty-State Monument" Cliché**:
   - The previous three interfaces displayed a massive centered box ("Ready for Global Weather & Disaster Intelligence") containing an oversized glowing cloud icon. For an everyday user opening the app, this felt like an artificial demo card rather than an active utility.
2. **Artificial HUD / Sci-Fi Decoration**:
   - Ticks (`+`), coordinate crosshairs, dot grids, terminal labels (`[DATUM: WGS-84]`, `[AWAITING GEODETIC TARGET]`), and neon amber/cyan glows created the sensation of a spaceship simulator rather than a dependable weather utility like Apple Weather or Windy.
3. **Severe Metric Flattening**:
   - Current conditions were presented with 4 or 6 identical small boxes at the bottom, treating Barometric Pressure, Cloud Cover, and Humidity with the exact same prominence as Temperature and Rain.
4. **Poor Information Architecture & Flow**:
   - Users had to scroll endlessly past multiple full-width vertical blocks. The relationship between current weather, short-term hourly decisions, and weekly planning was fragmented.
5. **Over-Badging & Jargon**:
   - Gratuitous pill badges on every single word (`OBSERVATORY 2.0`, `LIVE INTEL`, `GEODETIC WAYPOINTS`) added cognitive friction and reduced readability.

---

## 2. Primary User Journeys

1. **Journey 1: Immediate Daily Check (The 3-Second Glance)**
   - *Goal*: User opens SkyGuard in the morning to see what the temperature is, if it's going to rain in the next 4 hours, and whether any severe storm or heat warnings exist.
   - *UI Requirement*: High-contrast current temperature, clear condition text, feels-like temperature, and a glanceable horizontal hourly forecast with precipitation probabilities.
2. **Journey 2: Severe Weather & Disaster Verification (The Safety Check)**
   - *Goal*: User hears about a cyclone, flood, or extreme weather and wants to know official warnings for their city or family's area.
   - *UI Requirement*: Official CAP warnings and GDACS disaster alerts placed prominently with authentic issuer attribution, severity level, affected areas, and official instructions—never buried or minimized.
3. **Journey 3: Agricultural Decision Support (Farmer Mode)**
   - *Goal*: Farmer or agronomist checks crop-specific moisture risk, heat stress, and spraying/harvesting conditions based on crop type and sowing date.
   - *UI Requirement*: Dedicated, uncluttered agricultural workbench with practical action items, growth window tracking, and scientific limits clearly stated without fake sensor noise.
4. **Journey 4: Web Push Notification Management**
   - *Goal*: User wants push alerts for their region without compromising privacy.
   - *UI Requirement*: Voluntary opt-in, clear proximity radius, country-wide toggle, and transparent zero-tracking invariant.

---

## 3. Visual Hierarchy & Information Ordering

```
+-----------------------------------------------------------------------------------------+
| Level 1: Primary Status & Search                                                        |
| SkyGuard Brand · Clean Search Input · Geolocation Trigger · Mode Switcher · Push Bell   |
+-----------------------------------------------------------------------------------------+
| Level 2: Urgent Official Warnings (Conditional)                                         |
| High-contrast alert banner (Extreme/Severe/Moderate) with explicit official issuer    |
+-----------------------------------------------------------------------------------------+
| Level 3: Current Atmospheric Conditions                                                  |
| Large editorial temperature · Condition description · High/Low · Rain % · Feels-like   |
+-----------------------------------------------------------------------------------------+
| Level 4: Immediate Actionable Horizon (Next 24 Hours)                                    |
| Continuous hourly timeline ribbon with temperature curve and rain probability bars      |
+-----------------------------------------------------------------------------------------+
| Level 5: Mid-Term Outlook & Risk Engine                                                  |
| 7-Day synoptic forecast with min/max delta bars + Scientific derived risk signals       |
+-----------------------------------------------------------------------------------------+
| Level 6: Global Emergency Bulletins & Multi-Hazard Disasters                            |
| Categorized list: Local CAP Warnings, National Bulletins, Worldwide GDACS Alerts        |
+-----------------------------------------------------------------------------------------+
| Level 7: Data Provenance & Invariants                                                   |
| Open-Meteo model attribution, retrieval timestamp, IMD/NDMA source notices             |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Three Structurally Distinct Layout Concepts

### Concept A: The Editorial Weather Journal (Selected & Recommended)
- **Structure**:
  - Top header with compact search bar, recent location chips, and top navigation tabs (`Weather`, `Severe Alerts`, `Farmer Mode`).
  - Hero section presents current conditions using clean typography (like Apple Weather and NYT Weather): huge legible temperature, clear condition, feels-like delta, and today's rain outlook.
  - Directly underneath: a continuous 24-hour horizontal hourly forecast ribbon.
  - Balanced two-column grid on desktop:
    - Left Column: 7-day forecast with compact visual temperature sliders and rain percentages.
    - Right Column: Weather metrics grid (Wind, Humidity, Dew Point, Pressure, UV Index) + Derived Risk Indicators.
  - Separate full section for Official Warnings and GDACS Disaster Monitoring with clear filtering tabs.
- **Advantages**: Natural reading flow, optimal mobile-first stacking, editorial breathing room, instantly readable by everyday citizens.

### Concept B: The Meteorological Operations Deck (Windy / Ventusky Style)
- **Structure**:
  - Persistent left-hand navigation sidebar (or rail) housing search, saved cities, mode toggles, and notification settings.
  - Main viewport split into a primary synoptic cockpit on top with an extensive hourly meteogram showing wind vectors, gusts, and cloud base.
  - Lower tabbed panel switching between 7-Day projections, Severe CAP bulletins, and Agricultural advisory.
- **Trade-offs**: Excellent for power users and desktop displays, but creates cramped viewports on tablets and requires a radically different layout on mobile.

### Concept C: The Split Command Terminal (Linear / Superhuman Density)
- **Structure**:
  - Fixed-height split-screen interface where left 45% shows current weather and hourly forecast, and right 55% shows an expandable accordion list of alerts and agricultural watches.
  - Keyboard-first interaction with command palette (`/` to search, `M` for mode switch).
- **Trade-offs**: Very efficient for desktop power users, but completely breaks down on mobile devices and feels overly technical for everyday citizens checking if they need an umbrella.

---

## 5. Evaluation & Concept Selection
**Selection: Concept A (The Editorial Weather Journal)**.
*Why*:
- It directly addresses the user's critique: eliminating fake HUDs, dark-blue gamer slop, and oversized empty-state cards.
- It delivers the highest usability score across all viewports (from 360px mobile up to 1440px desktop).
- It places primary weather truth in front of the user immediately, while keeping severe alerts discoverable and authoritative.

---

## 6. Design System Tokens

### Palette (Light & Dark Neutral Foundation)
- `bg-canvas`: Light `#F8F9FA` / Dark `#0E1117` (Neutral basalt, zero blue tint)
- `bg-surface`: Light `#FFFFFF` / Dark `#161B22` (Clean card surface)
- `bg-surface-elevated`: Light `#F1F3F5` / Dark `#1E242E`
- `border-subtle`: Light `#E5E7EB` / Dark `#28303E`
- `text-primary`: Light `#111827` / Dark `#F3F4F6`
- `text-secondary`: Light `#4B5563` / Dark `#9CA3AF`
- `text-muted`: Light `#6B7280` / Dark `#6B7280`

### Semantic Alert Tokens (Used Exclusively for Meaningful Status)
- `alert-extreme`: `#DC2626` (Red 600)
- `alert-severe`: `#EA580C` (Orange 600)
- `alert-moderate`: `#D97706` (Amber 600)
- `alert-minor`: `#2563EB` (Blue 600)
- `accent-brand`: `#2563EB` (Restrained Cobalt Blue)
- `farmer-accent`: `#059669` (Field Emerald)
