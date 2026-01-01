# Implementation Plan: Contact Form to Email (Pages + Worker)

**Branch**: `001-contact-form-email` | **Date**: 2026-01-01 | **Spec**: `specs/001-contact-form-email/spec.md`
**Input**: Feature specification from `/specs/001-contact-form-email/spec.md`

## Summary

Build a single-page contact form with Turnstile, then route submissions to a Hono-based Pages Functions API that verifies Turnstile and calls a dedicated Email Worker via Service Binding.

## Technical Context

**Language/Version**: TypeScript (React + Hono)  
**Primary Dependencies**: React, Hono, Zod, mimetext (for MIME construction)  
**Storage**: N/A  
**Testing**: No test framework configured; rely on lint/typecheck and manual verification  
**Target Platform**: Cloudflare Pages (frontend + Functions) and Cloudflare Workers (email sender)  
**Project Type**: Web application  
**Performance Goals**: Low-latency form submission, fast initial render  
**Constraints**: No secrets in repo; email sending must be via Worker binding; Turnstile server-side validation required  
**Scale/Scope**: Single-page form and a single API endpoint

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Spec-driven delivery artifacts created and used for implementation.
- Secrets handled via env vars/secret bindings only.
- Architecture uses Pages + Worker with Service Binding for email.
- Minimal dependencies; no over-engineering.
- Documentation updated with setup and deployment steps.

## Project Structure

### Documentation (this feature)

```text
specs/001-contact-form-email/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx
├── App.css
├── main.tsx
└── index.css

functions/
└── api/
    └── [[route]].ts

worker/
├── src/
│   └── index.ts
├── wrangler.jsonc
└── package.json
```

**Structure Decision**: Use a single web app with `functions/` for Pages Functions and `worker/` for the email sender Worker.

## Complexity Tracking

No constitution violations.
