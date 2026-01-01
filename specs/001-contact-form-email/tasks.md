# Tasks: Contact Form to Email (Pages + Worker)

## P1 — User Story 1: Submit inquiry

- [x] T001 [P] [US1] Build contact form UI with required fields and status messaging in `src/App.tsx` and `src/App.css`.
- [x] T002 [P] [US1] Add client-side validation and submit-state handling in `src/App.tsx`.
- [x] T003 [P] [US1] Integrate Turnstile widget and token capture/reset in `src/App.tsx`.

## P2 — User Story 2: Validation & bot protection feedback

- [x] T004 [P] [US2] Add Pages Functions API entrypoint using Hono in `functions/api/[[route]].ts`.
- [x] T005 [P] [US2] Implement Zod schema validation and error responses in `functions/api/[[route]].ts`.
- [x] T006 [P] [US2] Implement Turnstile server-side verification helper in `functions/api/[[route]].ts`.
- [x] T007 [P] [US2] Add honeypot validation and error handling in `functions/api/[[route]].ts`.
- [x] T008 [P] [US2] Call email worker via Service Binding Fetcher in `functions/api/[[route]].ts`.
- [x] T009 [US2] Standardize API success/error responses in `functions/api/[[route]].ts`.

## P3 — User Story 3: Operator receives email

- [x] T010 [P] [US3] Scaffold email worker with config in `worker/wrangler.jsonc`, `worker/package.json`, `worker/src/index.ts`.
- [x] T011 [P] [US3] Implement worker auth and payload validation in `worker/src/index.ts`.
- [x] T012 [US3] Construct and send email via `send_email` binding in `worker/src/index.ts`.

## Platform & Docs

- [x] T013 [P] Add Pages and Worker Wrangler configs and dev vars examples in `wrangler.jsonc`, `worker/wrangler.jsonc`, `.dev.vars.example`, `worker/.dev.vars.example`.
- [x] T014 Update dependencies and scripts in `package.json` for `dev:pages`, `dev:workers`, lint/typecheck.
- [x] T015 Update README with setup, local dev, deployment, and implementation notes in `README.md`.
