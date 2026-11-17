---
name: project-architecture
description: Architecture standards, phase delivery model, modular vertical slice development, and data integrity boundaries for SkyGuard.
---

# Project Architecture Skill

## Purpose
Establishes the structural foundation, service boundaries, data contracts, and vertical slice execution rules for SkyGuard.

## Checklist
- [ ] Directory layout enforces monorepo structure: `apps/web` (Next.js), `services/api` (FastAPI), `docs/` (documentation).
- [ ] Explicit boundaries: Frontend communicates with backend API; backend securely negotiates with upstream providers (Open-Meteo, IMD).
- [ ] Data models use Pydantic v2 schemas with runtime validation, strict typing, and explicit provenance fields (`provider`, `retrieved_at`, `valid_time`, `unit`).
- [ ] Separation of tiers:
  - Observation/Forecast (Numerical Weather Prediction via Open-Meteo)
  - Official Warnings (National Meteorological Services: IMD / NDMA)
  - Derived Experimental Risk Indicators (Deterministic algorithms based on peer-reviewed guidelines)
  - Agronomic Watches (Gated advisory for farmers)
- [ ] Zero synthetic data in production paths: Fallback to structured unavailability states (`DataUnavailableError`) rather than placeholder figures.
- [ ] Phased delivery roadmap maintained and documented in `docs/PHASES.md` and `docs/IMPLEMENTATION_STATUS.md`.
