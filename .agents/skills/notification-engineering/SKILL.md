---
name: notification-engineering
description: Standards for privacy-preserving Web Push notifications, VAPID security, SSRF defense, and rate-limited alert dispatch.
---

# Notification Engineering Skill

## Push Notification Architecture & Invariants
- [ ] **Voluntary User Consent**:
  - Never prompt for browser notification permissions automatically on page load.
  - Require explicit user interaction (e.g. clicking "Enable Notifications").
- [ ] **Possession-Bound Subscription Security**:
  - Subscription endpoints and preferences must be securely possession-bound via cryptographically random authorization tokens.
  - Never allow cross-client modification or enumeration of other users' push subscriptions.
- [ ] **VAPID Security & SSRF Protection**:
  - VAPID private keys must strictly remain server-side.
  - Validate push subscription endpoint domains against authorized browser push gateways (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`) to prevent Server-Side Request Forgery (SSRF).
- [ ] **Deterministic Delivery & Alert Storm Prevention**:
  - Track delivery attempts and idempotency keys per alert identifier and subscription.
  - Filter out expired warnings before attempting dispatch.
  - Respect user-configured geographic filters (country code / proximity bounding) without assuming arbitrary proximity implies emergency relevance.
- [ ] **Zero Synthetic Weather in Diagnostic Pushes**:
  - Test notifications must be clearly labeled diagnostic messages containing no fabricated weather hazard claims.
