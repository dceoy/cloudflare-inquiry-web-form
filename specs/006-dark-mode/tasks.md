# Tasks: Dark mode UI

**Input**: Design documents from `/specs/006-dark-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Shared foundations

- [x] T001 [P] Update theme tokens + background variables in `src/index.css`
- [x] T002 [P] Align component styles to theme tokens in `src/App.css`

---

## Phase 2: User Story 1 - Toggle dark mode (Priority: P1) 🎯 MVP

**Goal**: Provide a visible theme toggle that switches UI styles immediately.

**Independent Test**: Toggle the theme control and confirm the UI palette updates without reload.

- [x] T003 [US1] Add theme state and toggle control in `src/App.tsx` (depends on T001, T002)

---

## Phase 3: User Story 2 - Respect system preference (Priority: P2)

**Goal**: Initialize theme using OS preference when no saved choice exists.

**Independent Test**: Clear storage, set OS to dark, reload, confirm dark theme is default.

- [x] T004 [US2] Implement system preference initialization logic in `src/App.tsx` (depends on T003)

---

## Phase 4: User Story 3 - Persist theme choice (Priority: P3)

**Goal**: Remember the selected theme across reloads.

**Independent Test**: Select dark, reload, confirm dark remains.

- [x] T005 [US3] Persist theme to `localStorage` with error handling in `src/App.tsx` (depends on T004)
- [x] T006 [US3] Apply `data-theme` on `document.documentElement` in `src/App.tsx` (depends on T005)

---

## Dependencies & Execution Order

- T001 and T002 can run in parallel.
- T003 depends on T001 and T002.
- T004 depends on T003.
- T005 and T006 depend on T004.
