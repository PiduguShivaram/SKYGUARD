# SkyGuard — The Living Sky: Creative Direction Specification

## 1. Visual Moodboard & Aesthetic World-Building
- **Atmospheric Palette**: 
  - Deep Dusk Obsidian: `#090B0F`
  - Horizon Dawn Violet: `#1D1E2C`
  - Luminous Cloud Zenith: `#E2E8F0`
  - Golden Hour Solar Flare: `#F59E0B`
  - High Altitude Azure: `#38BDF8`
  - Storm Electrum: `#CBD5E1`
- **Sensory Metaphor**:
  - The viewport is not a dashboard of software widgets; it is an **aperture onto the planet's troposphere**.
  - Looking at Tokyo, Berlin, or New York reveals the real sky luminance, cloud density, and wind vectors of that exact coordinate right now.
- **Reference Fusion**:
  - Pacing and spatial restraint of **Valentime (Noomo)**.
  - Tangible physical presence and crystalline lighting of **Igloo Inc.**
  - Typographic luxury and obsidian contrast of **Santioni Spirits**.

---

## 2. Original Art Direction
- **The Living Horizon (Central Visual Anchor)**:
  - Instead of flat rectangular cards, the primary hero features an organic **Atmospheric Sky Aperture**: a WebGL raymarched volumetric cloud scene (or CSS-animated gradient mesh fallback) that directly mirrors the selected city's actual time of day, cloud cover percentage, and wind velocity.
  - The aperture sits seamlessly within the page background, breathing with gentle atmospheric turbulence.
- **Living Weather Symbols**:
  - Powered by Framer Motion vector drawing (from `21st.dev/r/dev.yadhakim/animated-weather-icons`): rain drops fall and dissolve, solar rays gently rotate, wind streamlines draw themselves with organic path lengths.

---

## 3. Typography System
- **Display Scale (Headline & Hero Temperatures)**:
  - `font-serif tracking-tight font-light` paired with tabular numerical figures (`font-feature-settings: "tnum"`).
  - Sizes: Desktop 96px - 120px; Mobile 64px - 72px.
- **Atmospheric Journal Copy (Editorial Observation)**:
  - Sizes: 18px - 22px, line-height 1.6, letter-spacing -0.01em.
  - Phrased as an environmental journal entry: *"Dusk settles over Hyderabad with calm westerly breezes at 8 km/h. Clear skies will hold through midnight."*
- **Spatial & Provenance Metadata**:
  - Font: Monospace (`font-mono`), 11px - 12px, uppercase with `tracking-widest` (`letter-spacing: 0.15em`).
  - Colors: Subtle muted silver (`#64748B` to `#94A3B8`).

---

## 4. Color and Lighting Strategy
- **Continuous Dynamic Lighting**:
  - Day: Zenith sky blue (`#1E3A8A` / `#38BDF8`), bright diffuse sunlight.
  - Golden Hour / Twilight: Amber crimson horizon (`#7C2D12` / `#D97706`), long soft shadows.
  - Night: Deep obsidian indigo (`#050811` / `#0F172A`), distant twinkling stars.
  - Storm / Warning: Deep slate charcoal with intermittent internal cloud illumination.
- **Surface Lighting**:
  - Proximity spotlights on interactive elements: mouse movements illuminate surfaces with a subtle 300px radial glow (`radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.06), transparent 80%)`).

---

## 5. Desktop Composition (1440px - 1920px)
- **Header**: Minimalist frosted glass band with editorial wordmark `SkyGuard` and a live status indicator `Troposphere Active`.
- **Center Stage**:
  - Left / Center: Grand editorial temperature, condition glyph, and prose journal entry.
  - Right / Ambient: The volumetric sky aperture extending into the depth of the viewport.
- **Sub-tier**:
  - Tactile 24-hour timeline scrubber anchored to the lower viewport, encouraging immediate scrubbing.

---

## 6. Mobile Composition (360px - 390px)
- **Ergonomics**:
  - Single column with full thumb reachability.
  - Location search collapses into an accessible top pill.
  - The atmospheric sky canvas forms the full-bleed ambient background with readable high-contrast foreground cards.
  - The 24-hour scrubber operates as a smooth horizontal touch carousel with elastic momentum.

---

## 7. Full Website Storyboard (The 4 Chapters)
1. **Chapter 1 — Your Sky**:
   - The opening encounter. Immediate location, genuine temperature, living volumetric atmosphere, and urgent official bulletins.
2. **Chapter 2 — Explore Your Day**:
   - The interactive time machine. Dragging the scrubber animates solar arc, sky colors, and precipitation probabilities.
3. **Chapter 3 — A Changing World**:
   - The planetary pulse. WMO and GDACS disaster telemetry rendered as an interactive radar stream with genuine geographic coordinates.
4. **Chapter 4 — Stay Prepared**:
   - Pragmatic agricultural advisories and RFC 8292 possession-token Web Push notifications.

---

## 8. Motion Storyboard
- **0.0s - 0.6s**: Initial load — Canvas background fades in, atmospheric clouds begin slow drift.
- **0.6s - 1.2s**: Editorial temperature and city name rise into place using a staggered split-character reveal (`y: [20, 0], opacity: [0, 1]`, cubic-bezier `(0.16, 1, 0.3, 1)`).
- **1.2s - 1.8s**: Weather icon begins its continuous living animation; metrics settle into place with spring damping.
- **Interactive Scrubber Drag**: As user drags, the sky luminance, temperature digits, and cloud coverage morph with zero latency.

---

## 9. Interaction Specifications
- `useAtmosphereState`: Synchronizes real Open-Meteo weather codes (WMO code, cloud cover, sun position) with the rendering engine.
- `useForecastScrubber`: Maps mouse/touch drag percentage (0% to 100%) to the 24-hour hourly dataset.
- `useSceneProgress`: Tracks scroll position to orchestrate cross-chapter narrative transitions.
- `useAdaptiveQuality`: Monitors FPS and clamps canvas resolution if framerate drops below 55 FPS.
- `useReducedMotion`: Detects `prefers-reduced-motion` and replaces WebGL shaders with static high-resolution gradients.
- `useWebGLFallback`: Tests WebGL context creation; gracefully switches to CSS gradients if hardware shaders are unavailable.

---

## 10. Asset Production Plan
- **Shaders**: Volumetric raymarching shader adapted from `Shader Sky` (`21st.dev/r/radiumcoders/shader-sky`) with customizable sunrise, noon, dusk, and storm parameters.
- **Icons**: 12 living Framer Motion animated weather SVGs (`21st.dev/r/dev.yadhakim/animated-weather-icons`).
- **Textures**: SVG noise filter (`haikei.app`) for natural film grain depth.
- **Fonts**: Inter sans-serif + serif display headings for editorial luxury.
