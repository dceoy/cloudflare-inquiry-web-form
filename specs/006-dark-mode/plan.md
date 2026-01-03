# Implementation Plan: Dark mode UI

**Branch**: `006-dark-mode` | **Date**: 2026-01-03 | **Spec**: `specs/006-dark-mode/spec.md`
**Input**: Feature specification from `/specs/006-dark-mode/spec.md`

## Summary

Implement a theme toggle that switches between light and dark styles, respects OS preference on first load, and persists the choice locally. The approach uses CSS custom properties scoped to a root `data-theme` attribute, with React state controlling the selected theme and localStorage persistence.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Vite
**Primary Dependencies**: React, Vite (no new dependencies)
**Storage**: `localStorage` (best-effort, with fallback)
**Testing**: Vitest (existing), manual UI verification
**Target Platform**: Web (Cloudflare Pages)
**Project Type**: single/web
**Performance Goals**: Theme switch updates within 200ms
**Constraints**: Must respect `prefers-color-scheme` on first load when no saved preference
**Scale/Scope**: Single-page form UI

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Spec-Driven Delivery: PASS (spec exists and plan aligns)
- Secure by Default: PASS (no secrets, localStorage only)
- Cloudflare-Native Architecture: PASS (frontend-only changes)
- Minimal, Type-Safe Dependencies: PASS (no new deps)
- Documented Operations: PASS (quickstart will cover verification)

## Project Structure

### Documentation (this feature)

```text
specs/006-dark-mode/
├── plan.md              # This file
├── research.md          # Theme implementation decisions
├── data-model.md        # ThemePreference model
├── quickstart.md        # Local verification steps
├── contracts/           # No API changes (README)
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

**Structure Decision**: Single Vite + React app with styles in `src/index.css` and `src/App.css`.

## Complexity Tracking

No constitution violations.
