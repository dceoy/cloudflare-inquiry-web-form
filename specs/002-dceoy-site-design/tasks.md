# Tasks: Modernize form design to match dceoy.com

**Input**: Design documents from `/specs/002-dceoy-site-design/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated tests requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Audit current UI structure in `src/App.tsx` and existing styles in `src/App.css` and `src/index.css`
- [x] T002 Define design tokens (colors, typography, spacing, borders) as CSS variables in `src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Add Ubuntu font import and base typography styles in `src/index.css`
- [x] T004 Establish layout scaffolding (page container, section spacing) in `src/App.css`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Read and submit a clean, minimal form (Priority: P1) 🎯 MVP

**Goal**: Deliver a clear hierarchy and minimal layout aligned with dceoy.com.

**Independent Test**: Load the form in desktop viewport and verify typography, layout, and submission UI clarity.

### Implementation for User Story 1

- [x] T005 [P] [US1] Refine markup hierarchy and section labels in `src/App.tsx`
- [x] T006 [P] [US1] Apply typography, spacing, and list-like grouping styles in `src/App.css`
- [x] T007 [US1] Style inputs and primary action button for minimal, readable appearance in `src/App.css`

**Checkpoint**: User Story 1 should be functional and testable independently

---

## Phase 4: User Story 2 - Use the form comfortably on mobile (Priority: P2)

**Goal**: Ensure single-column, touch-friendly layout for small screens.

**Independent Test**: Resize to ≤480px width and validate no horizontal scroll and adequate spacing.

### Implementation for User Story 2

- [x] T008 [P] [US2] Add responsive typography and spacing rules in `src/App.css`
- [x] T009 [US2] Ensure form controls are full-width and tap-friendly on mobile in `src/App.css`

**Checkpoint**: User Story 2 should be functional and testable independently

---

## Phase 5: User Story 3 - Perceive accessible focus and error cues (Priority: P3)

**Goal**: Provide strong focus visibility for keyboard navigation and readable helper text.

**Independent Test**: Tab through inputs and observe focus states and helper/error text styling.

### Implementation for User Story 3

- [x] T010 [US3] Add consistent focus states for inputs and buttons in `src/App.css`
- [x] T011 [US3] Style helper/error text to remain legible without layout shifts in `src/App.css`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T012 [P] Update README with design notes and font usage in `README.md`
- [ ] T013 Validate quickstart steps (pnpm dev/build/preview) for styling changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T005 and T006 can run in parallel (different files)
- T008 can run alongside T009 after T004
- T012 can run after T005–T011 are complete
