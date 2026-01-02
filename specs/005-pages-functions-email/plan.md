# Implementation Plan: Pages Functions Email Delivery (No Workers)

**Branch**: `005-pages-functions-email` | **Date**: 2026-01-02 | **Spec**: `specs/005-pages-functions-email/spec.md`
**Input**: Feature specification from `specs/005-pages-functions-email/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the Worker-based email pipeline with direct email delivery from Cloudflare Pages Functions using Resend's HTTP API. Remove Worker deployment, bindings, and local dev steps, while preserving existing validation, Turnstile verification, and response normalization.

## Technical Context

**Language/Version**: TypeScript 5.x (Vite + React) and TypeScript for Pages Functions  
**Primary Dependencies**: Hono, Zod, mimetext (existing), Resend HTTP API (no new SDK required)  
**Storage**: N/A  
**Testing**: Vitest (existing, optional for this feature)  
**Target Platform**: Cloudflare Pages Functions (Workers runtime)  
**Project Type**: Web application (frontend + serverless API)  
**Performance Goals**: Email send request completes < 5s p95  
**Constraints**: No Worker deploy/bindings; secrets via Pages env vars; avoid leaking provider errors  
**Scale/Scope**: Single Pages project, single email delivery path

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Spec-Driven Delivery**: Spec + checklist created; plan and tasks will be used. ✅
- **Secure by Default**: Email provider key stored in env vars; do not expose raw provider errors. ✅
- **Cloudflare-Native Architecture**: Pages Functions send email directly via external provider (allowed by constitution). ✅
- **Minimal, Type-Safe Dependencies**: No new SDKs required; use fetch + Zod validation. ✅
- **Documented Operations**: README updates included. ✅

## Project Structure

### Documentation (this feature)

```text
specs/005-pages-functions-email/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
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

worker/                 # To be removed in this feature
README.md
wrangler.jsonc
package.json
.dev.vars.example
```

**Structure Decision**: Web application with a Pages Functions API under `functions/api/[[route]].ts`. Remove the `worker/` directory and related scripts/bindings.

## Phase 0: Research

Create `research.md` documenting Resend API usage (endpoint, auth header, payload shape) and Pages Functions constraints; confirm removal of Worker service binding and update env var plan.

## Phase 1: Design & Contracts

- **data-model.md**: Define `ContactSubmission` and `EmailConfig` (Resend API key, sender, recipient, optional reply-to).
- **contracts/**: Define API request/response contract for `/api/contact` (already implicit, document for clarity).
- **quickstart.md**: Provide Pages-only setup steps including Resend key configuration.

## Phase 2: Implementation Plan

1. Update Pages Function to call Resend HTTP API directly; remove Worker fetch, binding, and shared secret usage.
2. Update env vars examples and docs for Resend configuration.
3. Remove Worker project (`worker/`), Worker scripts, and service binding in `wrangler.jsonc` and `package.json`.
4. Update README deployment and local dev sections for Pages-only flow.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
