# SkyGuard — Benchmark Analysis & Master Resource Catalog

## Executive Summary
This document records forensic evidence, architectural analysis, and compositional techniques extracted from live browser inspection of the three benchmark websites:
1. **Valentime by Noomo Agency** (`https://valentime.noomoagency.com/`)
2. **Igloo Inc.** (`https://www.igloo.inc/`)
3. **Santioni Spirits** (`https://santionispirits.com/`)

Coupled with Google Chrome's **Modern Web Guidance** (v1.0 stable) and the **21st.dev MCP** catalog, this analysis establishes the empirical foundation for **SkyGuard — The Living Sky**.

---

## 1. Deep Benchmark Forensic Analysis

### Benchmark 1: Valentime by Noomo Agency (`https://valentime.noomoagency.com/`)
- **Captured Evidence**: 
  - Desktop Initial: `design/references/screenshots/valentime_noomo_desktop_initial.png`
  - Desktop Scrolled: `design/references/screenshots/valentime_noomo_desktop_scrolled.png`
  - Mobile Initial: `design/references/screenshots/valentime_noomo_mobile_initial.png`
- **Initial Screen & Visual Pacing**:
  - The experience opens with radical restraint: a warm alabaster/cream canvas (`#EDE7E0`), zero clutter, and a single animated calligraphic bezier line that gently breathes and morphs above a whisper-thin uppercase caption: `FINDING LOVE...`.
  - Pacing is patient and confident: it does not assault the visitor with immediate UI widgets; it sets an emotional tone before introducing interactive controls.
- **Atmospheric Technique**:
  - Operates 1 central WebGL/Canvas viewport layer running custom shaders.
  - As the user scrolls, the background seamlessly transitions between emotional hues (warm dusk, midnight velvet, golden hour) without hard CSS section boundaries.
- **Typography & Hierarchy**:
  - Primary Display: Custom high-contrast display font paired with `Source Sans Pro`.
  - Secondary/Metadata: Condensed uppercase micro-tracking (`letter-spacing: 0.15em`, 11px-13px).
- **Interactive Identity**:
  - Fluid cursor drag interaction: Dragging across the canvas bends the visual lines with elastic spring inertia.
  - Staggered split-text reveals that unfold character-by-character along cubic-bezier easing curves.

---

### Benchmark 2: Igloo Inc. (`https://www.igloo.inc/`)
- **Captured Evidence**:
  - Desktop Initial: `design/references/screenshots/igloo_inc_desktop_initial.png`
  - Desktop Scrolled: `design/references/screenshots/igloo_inc_desktop_scrolled.png`
  - Mobile Initial: `design/references/screenshots/igloo_inc_mobile_initial.png`
- **Initial Screen & Visual Pacing**:
  - An iconic 3D crystalline igloo structure resting on a floating bedrock island, surrounded by a luminous silver-grey atmospheric horizon (`#D4D8DD` to `#8F97A0`).
  - Delicate geometric wireframe constellation lines (`#FFFFFF` at 40% opacity) float in 3D space, anchored to real spatial coordinates.
- **Atmospheric Lighting & Depth**:
  - Soft directional rim lighting creates radiant backlighting behind the island.
  - Depth of field is achieved via radial light falloff and delicate atmospheric haze, giving the digital asset weight and physical presence.
- **Physical Elasticity & Interactive Identity**:
  - Elements possess physical mass, subtle spring recoil, and momentum when dragged or hovered.
  - The UI feels tactile like smooth ice, frosted glass, and cold stone.
- **Key Takeaway for SkyGuard**:
  - The atmosphere needs an **anchor object** (the Living Sky sphere / horizon dome) that gives the user a tangible physical window into the selected city's atmosphere.

---

### Benchmark 3: Santioni Spirits (`https://santionispirits.com/`)
- **Captured Evidence**:
  - Desktop Initial: `design/references/screenshots/santioni_spirits_desktop_initial.png`
  - Desktop Scrolled: `design/references/screenshots/santioni_spirits_desktop_scrolled.png`
  - Mobile Initial: `design/references/screenshots/santioni_spirits_mobile_initial.png`
- **Critical Architectural Finding (The Non-WebGL Fallback)**:
  - When inspected in headless Chromium without hardware WebGL acceleration, Santioni strictly displays: `"YOUR BROWSER IS NOT SUPPORTED"` with their bespoke brand emblem.
  - **Crucial Lesson**: Santioni relies entirely on WebGL fragment shaders. If hardware acceleration is restricted or disabled, the entire site is inaccessible.
  - **SkyGuard Mandate**: We must implement an **automatic CSS-gradient/noise fallback (`useWebGLFallback`)** so users on low-power devices, battery saver, or restricted browsers experience full editorial weather utility without ever hitting a dead block screen.
- **Typography & Composition**:
  - High-luxury editorial serif (`Charles Rosie Regular`, `Times New Roman`) paired with minimalist stark white on obsidian black (`#0B0C0E`).
  - Staggered parallax scrolling with virtual scroll momentum.

---

## 2. Master Catalog of User-Supplied UI/UX Resources

The user's complete collection of reference libraries has been categorized, verified, and mapped into our production architecture:

### Category 1: Creative Inspiration & Benchmarks
| Resource | URL (Cleaned) | Creative Essence | Application to SkyGuard |
|---|---|---|---|
| **Awwwards** | `https://www.awwwards.com/` | Cutting-edge international creative design standards | Compositional layout benchmarks and typography pacing |
| **Cosmos** | `https://www.cosmos.so/` | Visual moodboard and sensory curation | Visual textures, moodboard curation, aesthetic discovery |
| **Minimal Gallery** | `https://minimal.gallery/` | Hyper-curated minimalist web applications | Information restraint, negative space balance |
| **Dark Design** | `https://www.dark.design/` | Premier dark-mode interfaces | Obsidian luminance levels, non-jarring contrast |
| **Recent Design / Godly** | `https://recent.design/` | Daily curation of modern web craft | Contemporary hero layouts and interactive scroll transitions |
| **Refero Design** | `https://refero.design/` | Real production application UI screens | Search flows, mobile drawers, settings modals |
| **Mobbin** | `https://mobbin.com/` | Mobile iOS/Android interaction patterns | Thumb-friendly mobile ergonomics and sheet gestures |

### Category 2: Typography & Editorial Expression
| Resource | URL (Cleaned) | Creative Essence | Application to SkyGuard |
|---|---|---|---|
| **Typographic Posters** | `https://www.typographicposters.com/` | High-impact brutalist & classical typography | Headline scale contrast (96px display vs 11px micro-caps) |
| **Flyer JP** | `https://flyer-jp.com/` | Japanese precision layout & editorial grids | Delicate vertical metadata lines and coordinate dividers |
| **The Moving Poster** | `https://themovingposter.com/` | Kinetic typography and motion posters | Weather condition title reveals with staggered bezier easing |
| **Three Text Demo** | `https://countertype.com/tools/three-text/demo` | WebGL 3D extruded and billboarded typography | Spatial coordinate annotations floating in atmospheric scene |

### Category 3: Shaders, WebGL & Generative Canvas
| Resource | URL (Cleaned) | Capabilities | Application to SkyGuard |
|---|---|---|---|
| **Shader Sky (21st.dev)** | `21st.dev/r/radiumcoders/shader-sky` | Volumetric cumulus raymarching, Beer-Lambert attenuation | Living sky hero background responding to real cloud cover |
| **ShaderGradient** | `https://shadergradient.co/` | Organic fluid gradient meshes | Dawn-to-dusk celestial lighting transitions |
| **Shaders.com** | `https://shaders.com/` | Curated GLSL fragment shader repository | Atmospheric noise, turbulence, and rain streak distortion |
| **Haikei App** | `https://haikei.app/` | Generative SVG wave meshes and topographic curves | Elevation topography and precipitation layer graphics |
| **Particles Casberry** | `https://particles.casberry.in/` | Zero-dependency canvas particle simulations | Procedural wind vector particle flow and snow drift |
| **HTML-in-Canvas** | `https://cullenwebber.github.io/three-html-to-canvas/` | Rasterizing DOM elements into WebGL textures | Mirroring temperature curves onto atmospheric depth planes |

### Category 4: Interaction & Motion Primitives
| Resource | URL (Cleaned) | Capabilities | Application to SkyGuard |
|---|---|---|---|
| **Animated Weather Icons (21st.dev)** | `21st.dev/r/dev.yadhakim/animated-weather-icons` | 12 living micro-scenes, framer-motion driven | Condition badges that continuously breathe, rotate, and drop rain |
| **Motion Primitives** | `https://motion-primitives.com/` | Spring-physics layout animations, text morphing | Chapter transitions, tab pill switching |
| **React Bits** | `https://reactbits.dev/` | Pure React + Canvas animation components | Rolling digit odometers, subtle cursor auras |
| **UI Aceternity** | `https://ui.aceternity.com/` | Tracing beams, background beams, card spotlights | Proximity flashlights on disaster cards, timeline tracing |
| **Skiper UI** | `https://skiper-ui.com/` | Interactive sliders, spring dock magnifiers | Chapter 2 24-hour tactile weather scrubber |
| **Smooth UI** | `https://smoothui.dev/` | Fluid physics and gesture hooks | Momentum drag and release velocity transfer |
| **Transitions.dev** | `https://transitions.dev/` | Native View Transitions API wrappers | Smooth page and location switching |
| **60fps.design** | `https://60fps.design/` | GPU-accelerated 60fps interaction standards | Transform/opacity only, zero-jank guarantee |

### Category 5: Design Systems & Component Foundations
| Resource | URL (Cleaned) | Capabilities | Application to SkyGuard |
|---|---|---|---|
| **Shadcn UI** | `https://ui.shadcn.com/` | Accessible unstyled primitives (Radix) | Accessible dialog, popover, tooltip foundations |
| **LS Graphics** | `https://www.ls.graphics/` | High-craft mockups, textures, and clay devices | Texture assets, tactile material surfaces |
| **SVGL** | `https://svgl.app/` | SVG vector icons and logos | Clean agency attribution badges (WMO, GDACS, ECMWF) |
| **OriginKit** | `https://www.originkit.dev/` | Modern landing page component primitives | Section hero structures and pricing/footer grids |

---

## 3. Technology Synthesis: Modern Web Guidance Compliance

In accordance with Google Chrome's **Modern Web Guidance** (v1.0 stable) installed at `.agents/skills/modern-web-guidance`:
1. **Zero Obsolete Dependencies**:
   - Modern CSS features (`@container`, `color-mix()`, `subgrid`, `backdrop-filter`, `accent-color`) are leveraged directly instead of bloated helper libraries.
2. **Accessible Native Dialogs & Popovers**:
   - Modals use native HTML `<dialog>` or ARIA-compliant Radix primitives with inert backgrounds, escape listeners, and focus traps.
3. **Core Web Vitals Guardrails**:
   - LCP target <= 2.5s via prioritized hero rendering and CSS fallbacks.
   - INP target <= 200ms via `requestAnimationFrame` debouncing on scrubber interactions.
   - CLS target <= 0.1 via explicit width/height aspect ratios on all Canvas and SVG containers.
