# Feature Specification: Replace Workers With Pages Functions

**Feature Branch**: `004-pages-functions`  
**Created**: January 2, 2026  
**Status**: Draft  
**Input**: User description: "Replace Cloudflare Workers (inquiry-form-email-worker) with Cloudflare Pages Functions."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Submit inquiry via Pages Function (Priority: P1)

As a site visitor, I can submit the inquiry form and have it processed by a Cloudflare Pages Function that forwards the message to the email Worker for delivery.

**Why this priority**: The primary value of the site depends on form submissions working end-to-end.

**Independent Test**: Can be fully tested by submitting a valid inquiry payload to the function endpoint and receiving a success response while the email is delivered.

**Acceptance Scenarios**:

1. **Given** a valid inquiry payload, **When** the client posts to the inquiry endpoint, **Then** the Pages Function returns success and the email Worker delivery flow is triggered.
2. **Given** an invalid inquiry payload, **When** the client posts to the inquiry endpoint, **Then** the Pages Function returns a validation error response and no email is sent.

---

### User Story 2 - Deploy Pages + Worker (Priority: P2)

As a developer/operator, I can deploy the app to Cloudflare Pages with a dedicated Email Worker so Email Routing is supported.

**Why this priority**: Reduces operational complexity and keeps the backend aligned with the Pages deployment model.

**Independent Test**: Can be fully tested by deploying to Pages and verifying the function endpoint is reachable without a Worker deployment.

**Acceptance Scenarios**:

1. **Given** a Pages deployment, **When** the site is accessed, **Then** the inquiry function endpoint resolves from the Pages Functions runtime and the Email Worker is reachable via service binding.

---

### User Story 3 - Local development and verification (Priority: P3)

As a developer, I can run the app locally with Pages Functions and the Email Worker so I can validate the inquiry flow before deploying.

**Why this priority**: Enables fast iteration and reduces production regressions.

**Independent Test**: Can be fully tested by running local dev tooling and verifying the inquiry endpoint responds to test payloads.

**Acceptance Scenarios**:

1. **Given** a local dev session using `pnpm dev:workers`, `pnpm build`, and `pnpm dev:pages`, **When** a test inquiry is submitted to `http://localhost:8788/api/contact`, **Then** the Pages Function returns the expected response using the local runtime and the Worker receives the request.

---

### Edge Cases

- What happens when the Pages Function throws an exception while sending the email?
- How does the system respond when required fields are missing or invalid?
- What response is returned if the email Worker rejects the message?
- How does the system behave when the request body is empty or malformed JSON?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST use a Cloudflare Pages Function for the inquiry API and a dedicated Email Worker for Email Routing delivery.
- **FR-002**: The inquiry submission endpoint MUST remain compatible with the existing client integration (no client-side changes required).
- **FR-003**: The Pages Function MUST validate inquiry payloads and return clear error responses for invalid input.
- **FR-004**: The Pages Function MUST call the Email Worker on valid submissions.
- **FR-005**: The repository MUST build and deploy to Cloudflare Pages with a Worker deployment for Email Routing.
- **FR-006**: Local development MUST support running and testing the Pages Function endpoint with the Email Worker.
- **FR-007**: The API MUST accept `POST /api/contact` with JSON payload `{ name?, email, subject, message, turnstileToken, honeypot? }`.
- **FR-008**: The API MUST respond with `{ ok: true }` on success, and `{ ok: false, error }` with status codes `400`, `422`, `500`, or `502` on failures.
- **FR-009**: Local development MUST support `pnpm dev:workers` and `pnpm build` + `pnpm dev:pages` to serve the Pages Functions endpoint on port `8788` by default.

### Key Entities _(include if feature involves data)_

- **Inquiry Submission**: A request containing form fields required to compose and send an inquiry email (e.g., name, email, message).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A valid inquiry submission returns success from the Pages Function in a deployed Pages environment.
- **SC-002**: Invalid inquiry submissions return a validation error response without triggering email delivery.
- **SC-003**: The application deploys to Pages without any Worker deployment steps or configuration.
- **SC-004**: Developers can run local dev tooling and receive valid responses from the inquiry Pages Function endpoint.
