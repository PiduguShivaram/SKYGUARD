---
name: fullstack-engineering
description: Full-stack implementation guidelines for Next.js App Router, TypeScript, Tailwind CSS, FastAPI, and async HTTPX integration.
---

# Fullstack Engineering Skill

## Purpose
Governs best practices for implementing modern Next.js client applications and high-throughput Python FastAPI backend microservices.

## Frontend (apps/web)
- [ ] Framework: Next.js (App Router), React 19 / 18, TypeScript, Tailwind CSS.
- [ ] State & Networking: React hooks with clean abort controllers, debounced search (min 300ms), and typed fetch wrappers.
- [ ] Visualizations: Chart.js / SVG rendering *only* authentic hourly and daily points returned from the server. Never interpolate missing segments with fake numbers.
- [ ] Accessibility: WCAG AA contrast, keyboard navigation, semantic HTML, ARIA labels for weather status and alert severity badges.
- [ ] Privacy: Geolocation is strictly opt-in via explicit user button click with graceful fallback to search.

## Backend (services/api)
- [ ] Framework: FastAPI with Uvicorn, Python 3.12, strict Pydantic v2 schemas.
- [ ] Networking: HTTPX `AsyncClient` with connection pooling, explicit 10s timeouts, and structured exception handlers.
- [ ] Error Handling: Distinct HTTP status codes (400 for bad queries, 502 for upstream failures, 503 for unavailable services) returning consistent JSON error envelopes.
- [ ] CORS & Security: Configurable CORS middleware, rate limiting readiness, and environment-driven configurations.
