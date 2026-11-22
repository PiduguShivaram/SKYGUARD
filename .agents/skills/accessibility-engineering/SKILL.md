---
name: accessibility-engineering
description: WCAG 2.2 AA accessibility standards, semantic landmarks, keyboard focus rings, screen reader assertions, and color contrast.
---

# Accessibility Engineering (WCAG 2.2 AA)

## 1. Standards & Mandates
1. **Semantic Landmarks**:
   - `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`, `<section aria-labelledby="...">`.
   - Distinct, descriptive heading hierarchy (`h1` for application/city header, `h2` for primary sections, `h3` for subsections).
2. **Keyboard Navigation & Visible Focus**:
   - Every interactive control must be reachable via `Tab` and activatable via `Enter` or `Space`.
   - Explicit, high-contrast focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`.
3. **Contrast Ratios**:
   - Normal text: At least 4.5:1 against its background.
   - Large text (>= 18pt or bold >= 14pt): At least 3:1.
   - UI components and border boundaries: At least 3:1.
4. **Color Independence**:
   - Warning severities must NOT rely solely on color. Always pair colors with explicit text labels: `Extreme`, `Severe`, `Moderate`, `Minor`.
5. **Reduced Motion**:
   - Honor `@media (prefers-reduced-motion: reduce)` by disabling transitions and animations for users with vestibular sensitivity.

## 2. Review Criteria
- Complete all primary workflows using keyboard only (no mouse).
- Verify zero color-only information barriers.
- Screen readers announce dynamic alerts and modal dialogs with proper `aria-live` and `role="dialog"`.
