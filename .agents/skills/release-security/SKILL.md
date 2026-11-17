---
name: release-security
description: Security standards, privacy protection, API secret management, and license compliance rules.
---

# Release Security Skill

## Security Requirements
- [ ] **No Client-Side Secrets**: All third-party API credentials (if any) must reside strictly on the server (`services/api`). Next.js client bundles must never contain secrets.
- [ ] **Environment Configuration**:
  - Provide `.env.example` templates with empty placeholders for all configuration options.
  - Never commit real `.env` or production credentials to git.
- [ ] **Privacy & Permissions**:
  - Browser location permissions must be explicitly requested only after user initiates the action (e.g. clicking "Locate Me").
  - Do not track or persist user location history without explicit user opt-in.
- [ ] **Dependency & License Audits**:
  - All third-party packages must use permissive open-source licenses (MIT, Apache 2.0, BSD).
  - Pinned package versions with lockfiles (`pnpm-lock.yaml`, `requirements.txt`).
