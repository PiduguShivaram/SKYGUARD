---
name: senior-product-design
description: Human-centered senior product design standards, editorial restraint, and everyday consumer usability for weather and data products.
---

# Senior Product Design Standards

## 1. Core Principles
1. **Calm & Editorial Restraint**: Prioritize clarity, legibility, and immediate utility over visual spectacle. Weather software is consulted dozens of times a week; it should calm the user, not overwhelm them with blinking instrumentation.
2. **Glanceable Primary Truth**: The user's primary mental question ("What is the weather right now, and will it ruin my plans today?") must be answered in under 2 seconds.
3. **Hierarchy of Needs**:
   - Level 1: Selected location, current temperature, high/low range, condition summary, immediate emergency warnings.
   - Level 2: Hourly precipitation window, today's rain chance, wind speed, UV index.
   - Level 3: 7-day outlook, daily trends, agricultural advisories (when requested).
   - Level 4: Technical provenance, NWP model resolution, numerical grid coordinates.
4. **Natural Human Language**: Eliminate techno-babble ("Geodetic Waypoints", "Observatory 2.0", "Awaiting Target"). Use plain, respectable, human phrasing ("Saved locations", "Search by city or region", "Updated 4 minutes ago").

## 2. Anti-Patterns
- **The Empty-State Monument**: Huge central cards with giant icons announcing that the app is waiting for input.
- **Metric Flattening**: Displaying 12 small cards in a grid giving equal visual weight to air pressure and current temperature.
- **Marketing Inside the Tool**: Large promotional headlines ("Ready for World-Class Weather Intelligence!") rendered inside daily operating software.
- **Decorative Clutter**: Icons added purely to fill space; artificial neon glow halos; decorative crosshairs.

## 3. Implementation Procedures
- Lead with an editorial header and concise search bar.
- Provide immediate shortcuts to saved/recent locations and a permission-gated "Use current location" button.
- Group metrics logically (Temperature & Feel, Moisture & Rain, Wind & Air, Sun & Daylight) using whitespace, typography, and subtle 1px dividers rather than enclosing every single statistic in a rounded card.

## 4. Review Criteria
- Can a non-technical user immediately find their forecast in 3 seconds?
- Does the interface look intentional and human-crafted without template clichés?
- Is there zero decorative noise that competes with weather data?
