---
name: anti-ai-slop-design
description: Strict guidelines, prohibitions, and heuristic checklists for eradicating generic AI-generated dashboard tropes and template slop.
---

# Anti-AI-Slop Design Standards

## 1. The AI Slop Taxonomy (Prohibited Elements)
1. **Neon Radial Glows**: Large blurred colored balls behind cards (`blur-3xl bg-sky-500/20`).
2. **Glassmorphism Excess**: Layering heavy blurs (`backdrop-blur-xl bg-white/5`) that reduce text contrast and increase GPU repaints.
3. **Bento-Grid Cliché**: Chopping the screen into 16 tiny, identical rounded rectangles each containing one icon and one number.
4. **Futuristic HUD Pretension**: Adding crosshairs (`+`), tick marks, grid coordinates, and terminal headers to everyday consumer tools.
5. **Over-Badging**: Placing pill badges on every single word (`[ LIVE INTEL ]`, `[ HIGH CONFIDENCE ]`, `[ PRO ]`).
6. **Fake Sci-Fi Typography**: Monospacing body paragraphs, buttons, and titles.
7. **Marketing Buzzwords inside Tooling**: Text claiming "Advanced Neural Synthesis Engine" or "Ready for Next-Gen Disaster Intelligence".

## 2. Replacement Principles
- Replace neon blur with **clean 1px structural borders** and subtle elevation shadows (`shadow-sm`, `shadow-md`).
- Replace separate bento cards with **integrated editorial sections** separated by whitespace and thin dividers.
- Replace pill badges with **standard typographic hierarchy** (subtitles, section headers, metadata captions).
- Replace sci-fi jargon with **direct human verbs**: "Search", "Save location", "Hourly forecast", "Official advisories".

## 3. Verification Heuristic
If the screen looks like a Dribbble mock for a crypto exchange or spaceship cockpit, it is AI slop and must be rejected. If it looks like a refined, dependable tool by Apple, Google, or Linear, it passes.
