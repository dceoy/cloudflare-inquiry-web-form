# Tasks: Replace Workers With Pages Functions

**Input**: Design documents from `/specs/004-pages-functions/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Blocking Prerequisites)

- [x] T001 [P] [US1] Confirm Worker service binding configuration in `wrangler.jsonc` and `functions/api/[[route]].ts`
- [x] T002 [US1] Ensure Pages Functions calls the Email Worker in `functions/api/[[route]].ts`
- [x] T003 [P] [US2] Restore Worker deployment scripts/config in `package.json`, `wrangler.jsonc`, and `worker/`
- [x] T004 [P] [US2] Update documentation for Pages + Worker deployment in `README.md`
- [x] T005 [US3] Align local dev scripts to Pages + Worker workflow in `package.json`

## Phase 2: User Story 1 - Submit inquiry via Pages Function (Priority: P1) 🎯 MVP

**Goal**: Process inquiry submissions via Pages Functions and deliver email without a Worker.

**Independent Test**: Post a valid payload to `/api/contact` and receive `{ ok: true }` without Worker dependencies.

### Implementation for User Story 1

- [x] T006 [US1] Validate and forward email payloads to the Worker in `functions/api/[[route]].ts`
- [x] T007 [US1] Add Worker error handling and response normalization in `functions/api/[[route]].ts`

**Checkpoint**: User Story 1 can be tested independently via `/api/contact`

---

## Phase 3: User Story 2 - Deploy without Workers (Priority: P2)

**Goal**: Deploy to Pages without Worker configuration.

**Independent Test**: `pnpm deploy:pages` succeeds and no Worker deployment steps are required.

### Implementation for User Story 2

- [x] T008 [US2] Restore Worker project artifacts in `worker/` and related docs

**Checkpoint**: Deployment docs/config contain Pages-only steps

---

## Phase 4: User Story 3 - Local development and verification (Priority: P3)

**Goal**: Run Pages Functions locally without Worker setup.

**Independent Test**: `pnpm build` + `pnpm dev:pages` serve `/api/contact` locally.

### Implementation for User Story 3

- [x] T009 [US3] Update README local dev steps to include Worker requirements and shared secret setup

**Checkpoint**: Local dev workflow documented and runnable

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T010 [P] Documentation updates in `README.md` and `specs/004-pages-functions/quickstart.md`
- [x] T011 [P] Code cleanup and refactoring in `functions/api/[[route]].ts`

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

- T001, T003, T004 can run in parallel
- T006 and T007 can run after T002
- Docs tasks (T004, T009, T010) can run in parallel
