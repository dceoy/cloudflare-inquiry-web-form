# Feature Specification: Contact Form to Email (Pages + Worker)

**Feature Branch**: `001-contact-form-email`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "Contact / Inquiry form for Cloudflare Pages that posts to Hono API and sends email via Worker"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Submit inquiry (Priority: P1)

A site visitor fills out the contact form and submits an inquiry, then sees a clear confirmation that it was sent.

**Why this priority**: This is the core value of the feature: capturing inquiries reliably.

**Independent Test**: Can be fully tested by submitting the form with valid inputs and verifying a success message.

**Acceptance Scenarios**:

1. **Given** the contact page is loaded, **When** the user submits valid required fields with a Turnstile token, **Then** the UI shows a success message and resets the form.
2. **Given** the form is submitting, **When** the request is in flight, **Then** the submit button is disabled and a submitting state is visible.

---

### User Story 2 - Validation & bot protection feedback (Priority: P2)

A visitor is guided to correct invalid inputs or bot protection failures with clear, actionable errors.

**Why this priority**: Prevents invalid submissions and reduces support noise.

**Independent Test**: Can be tested by omitting required fields, using an invalid email, or forcing Turnstile failure and observing errors.

**Acceptance Scenarios**:

1. **Given** missing or invalid required fields, **When** the user attempts to submit, **Then** inline validation errors are shown and no request is sent.
2. **Given** Turnstile verification fails, **When** the API responds with a 4xx error, **Then** the UI displays a user-facing error message.

---

### User Story 3 - Operator receives email (Priority: P3)

The operator receives a well-formatted email containing the inquiry details at a fixed destination address.

**Why this priority**: Confirms delivery and enables response workflows.

**Independent Test**: Can be tested by sending a request that triggers the email worker and verifying email receipt.

**Acceptance Scenarios**:

1. **Given** a valid inquiry, **When** the backend calls the email worker, **Then** an email is sent to the configured destination address.

---

### Edge Cases

- What happens when Turnstile token is missing or expired?
- How does the system handle malformed JSON or oversized fields?
- What happens when the email worker returns a non-200 response?
- What happens when the honeypot field is filled?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The UI MUST render a single-page contact form with fields: name (optional), email (required), subject (required), message (required).
- **FR-002**: The UI MUST perform basic client-side validation for required fields, email format, and length limits.
- **FR-003**: The UI MUST include Cloudflare Turnstile and include the token in the POST body.
- **FR-004**: The frontend MUST POST JSON to `/api/contact` with `{ name, email, subject, message, turnstileToken }`.
- **FR-005**: The backend MUST validate request payloads with a type-safe schema and reject invalid input with 4xx `{ ok: false, error }`.
- **FR-006**: The backend MUST verify Turnstile server-side and reject failures with 4xx `{ ok: false, error }`.
- **FR-007**: The backend MUST include lightweight abuse control via a honeypot field.
- **FR-008**: The backend MUST call a separate email Worker via Service Binding (Fetcher) to send emails.
- **FR-009**: The email Worker MUST authenticate requests from Pages Functions using a shared secret and MUST send to a fixed destination address only.
- **FR-010**: The email Worker MUST use Cloudflare Email Routing `send_email` binding and construct a text/plain email.
- **FR-011**: Secrets (Turnstile secret, shared secret) MUST be configured via secrets and MUST NOT be committed.
- **FR-012**: README MUST include local dev and deployment steps for Pages, Turnstile, and Email Routing.
- **FR-013**: On success, the API MUST return `{ ok: true }` and the UI MUST reset the form and Turnstile widget.
- **FR-014**: On failure, the API MUST return 4xx for validation/bot failures and 5xx for unexpected errors without sensitive info.

### Key Entities _(include if feature involves data)_

- **Inquiry Submission**: name, email, subject, message, turnstileToken, honeypot.
- **Turnstile Verification**: token, secret, verification result (success/error-codes).
- **Email Delivery Request**: name, email, subject, message, authenticated internal request.

### Assumptions

- The destination email address is fixed and configured in the email Worker binding.
- A honeypot field is acceptable as lightweight abuse control (rate limiting is not required for MVP).
- Turnstile keys and worker secrets will be provisioned by the operator during setup.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A valid form submission results in a `{ ok: true }` response and a visible success message.
- **SC-002**: Invalid input or Turnstile failure results in clear, actionable UI errors and 4xx API responses.
- **SC-003**: The configured destination email receives the inquiry content within minutes of submission.
- **SC-004**: No secrets are present in git history and required secrets are documented in README.
