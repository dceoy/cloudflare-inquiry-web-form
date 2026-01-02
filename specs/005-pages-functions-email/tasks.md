# Tasks: Pages Functions Email Delivery (No Workers)

**Input**: Design documents from `/specs/005-pages-functions-email/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Blocking Prerequisites)

- [x] T001 [P] [US1] Remove Worker service binding from `wrangler.jsonc`
- [x] T002 [P] [US1] Remove Worker dev/deploy scripts from `package.json`
- [x] T003 [P] [US2] Remove Worker project directory `worker/`
- [x] T004 [P] [US1] Update Pages env var examples in `.dev.vars.example`

## Phase 2: User Story 1 - Submit inquiry with Pages Functions-only email (Priority: P1) 🎯 MVP

**Goal**: Send email directly from Pages Functions via Resend without Worker dependencies.

**Independent Test**: POST a valid payload to `/api/contact` and receive `{ ok: true }` with Resend delivery.

### Implementation for User Story 1

- [x] T005 [US1] Replace Worker fetch with Resend API call in `functions/api/[[route]].ts`
- [x] T006 [US1] Add Resend error handling + timeout behavior in `functions/api/[[route]].ts`
- [x] T007 [US1] Remove Worker shared secret usage in `functions/api/[[route]].ts`

**Checkpoint**: User Story 1 can be tested independently via `/api/contact`

---

## Phase 3: User Story 2 - Deploy and operate Pages without Worker configuration (Priority: P2)

**Goal**: Deploy Pages without Worker config or bindings.

**Independent Test**: `pnpm deploy:pages` succeeds without Worker steps.

### Implementation for User Story 2

- [x] T008 [US2] Update deployment docs in `README.md`

**Checkpoint**: Deployment docs/config contain Pages-only steps

---

## Phase 4: User Story 3 - Local development with Pages Functions only (Priority: P3)

**Goal**: Run Pages Functions locally without Worker setup.

**Independent Test**: `pnpm build` + `pnpm dev:pages` serve `/api/contact` locally.

### Implementation for User Story 3

- [x] T009 [US3] Update local dev docs in `README.md`

**Checkpoint**: Local dev workflow documented and runnable

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T010 [P] Documentation updates in `README.md` and `specs/005-pages-functions-email/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately
- **User Stories (Phase 2+)**: Depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational
- **User Story 2 (P2)**: Can start after Foundational
- **User Story 3 (P3)**: Can start after Foundational

### Parallel Opportunities

- T001, T002, T003, T004 can run in parallel
- Docs tasks (T008, T009, T010) can run in parallel
