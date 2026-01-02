# Feature Specification: Pages Functions Email Delivery (No Workers)

**Feature Branch**: `005-pages-functions-email`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "Replace Cloudflare Workers with Cloudflare Pages Functions for email delivery"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Submit inquiry with Pages Functions-only email (Priority: P1)

As a site visitor, I can submit the contact form and receive a successful response while the Pages Function delivers the email directly (no Worker involved).

**Why this priority**: This is the core product behavior and must work without a Worker dependency.

**Independent Test**: POST a valid payload to `/api/contact` on Pages Functions and receive `{ ok: true }` with email delivery triggered directly from the Function.

**Acceptance Scenarios**:

1. **Given** a valid form payload and valid Turnstile token, **When** the Pages Function processes the request, **Then** it delivers the email directly and returns `{ ok: true }`.
2. **Given** an invalid payload or Turnstile failure, **When** the Pages Function processes the request, **Then** it returns a 4xx error without attempting delivery.

---

### User Story 2 - Deploy and operate Pages without Worker configuration (Priority: P2)

As a maintainer, I can deploy Pages without creating or deploying any Worker or service binding.

**Why this priority**: Removes operational overhead and eliminates a second deploy pipeline.

**Independent Test**: `pnpm deploy:pages` succeeds and there is no Worker deploy step or service binding required.

**Acceptance Scenarios**:

1. **Given** Pages project settings, **When** I configure environment variables/secrets, **Then** no Worker service binding is required.

---

### User Story 3 - Local development with Pages Functions only (Priority: P3)

As a developer, I can run Pages Functions locally without running a Worker dev server.

**Why this priority**: Streamlines local setup and reduces the number of moving parts.

**Independent Test**: `pnpm build` + `pnpm dev:pages` serves `/api/contact` locally without Worker setup.

**Acceptance Scenarios**:

1. **Given** local `.dev.vars`, **When** I run `pnpm dev:pages`, **Then** the API works without Worker dependencies.

---

### Edge Cases

- What happens when the email provider returns a 4xx/5xx response?
- How does the system handle a timeout while attempting email delivery?
- What happens when required email configuration values are missing?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Pages Functions MUST deliver inquiry emails directly (no Worker/service binding).
- **FR-002**: The API MUST continue to validate payloads and Turnstile tokens before sending email.
- **FR-003**: The API MUST return a normalized `{ ok: true }` success response on delivery success and `{ ok: false, error }` on failure.
- **FR-004**: Deployment and local dev scripts MUST not include Worker deploy/dev commands.
- **FR-005**: Configuration MUST include email sender, destination, and provider credentials or settings.
- **FR-006**: System MUST send emails using the Resend HTTP API.

### Key Entities _(include if feature involves data)_

- **ContactSubmission**: name (optional), email, subject, message, turnstileToken
- **EmailConfig**: sender address, optional sender name, destination address, provider auth/settings

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A valid submission to `/api/contact` succeeds without Worker configuration.
- **SC-002**: Pages deployment completes using only Pages settings and environment variables.
- **SC-003**: Local development runs with only `pnpm dev` + `pnpm dev:pages` (no Worker dev command).
