# cloudflare-inquiry-web-form Constitution

## Core Principles

### I. Spec-Driven Delivery

All feature work follows Spec Kit end-to-end (spec → plan → tasks → implement). Artifacts live under `specs/` and are the source of truth for scope, acceptance criteria, and delivery.

### II. Secure by Default

No secrets in git history. All sensitive values are provided via environment variables or secret bindings. Public APIs validate inputs server-side and avoid leaking sensitive error details.

### III. Cloudflare-Native Architecture

Frontend is static on Cloudflare Pages. Server logic runs in Pages Functions (Hono) and may either delegate email sending to a Worker via Service Binding or send email directly from Pages Functions via an external provider API when Worker usage is not desired.

### IV. Minimal, Type-Safe Dependencies

Prefer small, well-supported libraries. Type safety is required at the API boundary and UI forms. Do not introduce frameworks or abstractions beyond what the feature needs.

### V. Documented Operations

Every deployable feature includes clear local-dev steps, production setup, and rationale for key design decisions in the README.

## Constraints & Standards

- **Tech stack**: Vite + React + TypeScript on the frontend; Hono + Zod on the backend; Wrangler for local dev and deployment.
- **Accessibility**: Form UI must be accessible, keyboard-friendly, and provide clear validation errors.
- **Error handling**: Client receives actionable messages for expected failures; server logs avoid exposing secrets.

## Workflow & Quality Gates

- Use small, reviewable changes and keep refactors separate from new behavior.
- Run lint/typecheck when introducing new TS/React code.
- Update documentation alongside code changes.

## Governance

The constitution supersedes other guidance. Amendments require updating this file and noting any impacted templates or workflows.

**Version**: 1.1.0 | **Ratified**: 2026-01-01 | **Last Amended**: 2026-01-02
