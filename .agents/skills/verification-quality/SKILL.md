---
name: verification-quality
description: Verification, automated testing, real upstream integration smoke tests, and observability procedures for SkyGuard.
---

# Verification Quality Skill

## Verification Strategy
1. **Unit Testing (pytest)**:
   - Test pure functional logic (e.g. risk engine threshold mappings, WMO weather code translators, schema serialization).
   - Use clearly labeled, isolated test fixtures.
2. **Live Integration Smoke Testing**:
   - Execute real calls against upstream providers (Open-Meteo geocoding and forecast) during CI/test passes.
   - Assert schema compliance and response validity.
   - Log latency, HTTP status, and payload provenance.
3. **Frontend Testing & Type Checking**:
   - Run `tsc --noEmit` to verify 100% strict TypeScript typing.
   - Validate Next.js production build (`next build`).
   - Browser rendering verification (Playwright or headless browser) to confirm real weather cards and charts render without errors.
4. **Transparent Status Reporting**:
   - Maintain `docs/IMPLEMENTATION_STATUS.md` recording actual passed tests, skipped tests with explicit reasons, and real command outputs.
