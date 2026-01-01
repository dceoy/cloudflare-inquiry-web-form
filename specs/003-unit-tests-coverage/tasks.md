# Tasks: Unit Tests and Full Coverage

**Input**: Design documents from `/specs/003-unit-tests-coverage/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Add Vitest and testing dependencies in `package.json` (Vitest, @testing-library/react, @testing-library/jest-dom)
- [x] T002 [P] Add Vitest configuration (coverage, jsdom) in `vite.config.ts` or `vitest.config.ts`
- [x] T003 [P] Add test setup file (jest-dom matchers) in `src/test/setup.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T004 Configure test scripts in `package.json` (`pnpm test`, `pnpm test:coverage`)
- [x] T005 Define coverage scope/thresholds for `src/**/*.ts` + `src/**/*.tsx` in Vitest config (exclude `*.d.ts`, `*.test.*`, `*.spec.*`)
- [x] T006 Update `README.md` with test/coverage commands and expected usage

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Run a reliable unit test suite (Priority: P1) 🎯 MVP

**Goal**: Provide a runnable test suite for the current app code

**Independent Test**: `pnpm test` runs and completes successfully

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Add App rendering tests in `src/__tests__/App.test.tsx`
- [x] T008 [P] [US1] Add component-level tests for shared UI in `src/__tests__/` (as needed for coverage)

### Implementation for User Story 1

- [x] T009 [US1] Fix any test environment errors (jsdom, fetch, timers) surfaced by initial runs

**Checkpoint**: User Story 1 is testable independently

---

## Phase 4: User Story 2 - Achieve complete coverage for app logic (Priority: P2)

**Goal**: 100% branch coverage for scoped TypeScript source files

**Independent Test**: `pnpm test:coverage` reports 100% branch coverage on the scoped files

### Tests for User Story 2 ⚠️

- [x] T010 [P] [US2] Add tests to cover all branches in `src/App.tsx`
- [x] T011 [P] [US2] Add tests to cover all branches in other `src/` TypeScript modules (as needed)

### Implementation for User Story 2

- [x] T012 [US2] Refactor app logic (if needed) to make branches testable without altering behavior (not needed)

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Eliminate test errors and flakiness (Priority: P3)

**Goal**: Stable, repeatable test runs

**Independent Test**: `pnpm test` runs 3x without intermittent failures

### Implementation for User Story 3

- [x] T013 [US3] Stabilize tests and mocks (timers, async waits, globals) to avoid flakiness

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 [P] Validate quickstart steps in `specs/003-unit-tests-coverage/quickstart.md`
- [ ] T015 [P] Run lint/typecheck if required after test changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- App logic refactors before additional test fixes
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Coverage threshold and scripts can be updated in parallel
- Test files can be authored in parallel once the runner is ready
