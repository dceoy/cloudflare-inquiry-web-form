# Tasks: Modern, Dynamic Background

**Input**: Design documents from `/specs/007-dynamic-background/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Not requested for this visual-only change.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared)

- [x] T001 [P] [US1] Review existing layout and background styles in `src/index.css`
- [x] T002 [P] [US1] Review component-level styling constraints in `src/App.css`

---

## Phase 2: User Story 1 - Immediate Visual Upgrade (Priority: P1) 🎯 MVP

**Goal**: Deliver a modern, layered background with subtle motion.

**Independent Test**: Load the app and visually confirm layered gradient/shapes behind the form.

- [x] T003 [US1] Add CSS variables and base background composition in `src/index.css`
- [x] T004 [US1] Add animated background layers (gradients/shapes) in `src/index.css`
- [x] T005 [US1] Ensure form container remains readable above background in `src/App.css`

---

## Phase 3: User Story 2 - Responsive Visuals (Priority: P2)

**Goal**: Ensure background scales/positions cleanly across breakpoints.

**Independent Test**: Resize viewport and verify background stays balanced and content readable.

- [x] T006 [US2] Add responsive tweaks for background sizing/position in `src/index.css`

---

## Phase 4: User Story 3 - Motion Preferences (Priority: P3)

**Goal**: Respect reduced motion settings.

**Independent Test**: Enable reduced motion and confirm background animations stop.

- [x] T007 [US3] Add `prefers-reduced-motion` overrides in `src/index.css`

---

## Phase 5: Polish & Verification

- [ ] T008 [P] [US1] Visual polish pass to reduce distraction and ensure contrast in `src/index.css`
- [ ] T009 [P] [US1] Validate quickstart checklist in `specs/007-dynamic-background/quickstart.md`

---

## Dependencies & Execution Order

- T001-T002 can run in parallel.
- T003-T005 build the MVP (US1) and should land before US2/US3.
- T006 and T007 can run after T003.
- T008-T009 finalize after all story tasks.
