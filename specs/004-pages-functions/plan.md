# Implementation Plan: Replace Workers With Pages Functions

**Branch**: `004-pages-functions` | **Date**: January 2, 2026 | **Spec**: `specs/004-pages-functions/spec.md`
**Input**: Feature specification from `/specs/004-pages-functions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Preserve the existing `/api/contact` contract and validation behavior while keeping Email Routing support via a dedicated Email Worker. The Pages Function will validate and verify Turnstile, then call the Worker via Service Binding. Local development and deployment docs will reflect Pages + Worker setup.

## Technical Context

**Language/Version**: TypeScript (Vite + React 19, Hono + Zod)  
**Primary Dependencies**: React, Hono, Zod, mimetext  
**Storage**: N/A  
**Testing**: Vitest  
**Target Platform**: Cloudflare Pages Functions  
**Project Type**: web  
**Performance Goals**: Low-latency API responses for form submissions (<500ms p95 excluding worker send latency)  
**Constraints**: Email delivery via Worker Service Binding; secrets only via environment bindings; preserve `/api/contact` contract  
**Scale/Scope**: Low-volume contact form submissions

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle III (Cloudflare-Native Architecture)**: Pass. Pages Functions delegate email sending to a Worker via Service Binding.
- **Principle II (Secure by Default)**: Ensure shared secret and email addresses are stored as encrypted secrets and not committed.
- **Principle V (Documented Operations)**: Update README with local-dev and deploy steps reflecting Pages + Worker setup.

## Project Structure

### Documentation (this feature)

```text
specs/004-pages-functions/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
functions/
└── api/
    └── [[route]].ts     # Hono Pages Functions API

src/
├── App.tsx              # Contact form UI
├── App.css
├── main.tsx
└── index.css

worker/                  # Email Worker project

src/__tests__/
└── App.test.tsx
```

**Structure Decision**: Web application with Pages Functions backend (`functions/`), Email Worker (`worker/`), and React frontend (`src/`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
