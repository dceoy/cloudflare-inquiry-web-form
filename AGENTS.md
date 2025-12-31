# Repository Guidelines

## Project Structure & Module Organization

- `src/` holds the React + TypeScript app (`main.tsx` bootstraps, `App.tsx` is the top-level UI).
- `src/assets/` contains bundled assets (example: `react.svg`).
- `src/*.css` holds component and global styles (`index.css`, `App.css`).
- `public/` contains static assets copied as-is into the build (`public/vite.svg`).
- Build/config files live at the repo root (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`).

## Build, Test, and Development Commands

Use pnpm (lockfile is `pnpm-lock.yaml`).

- `pnpm dev`: start the Vite dev server with HMR.
- `pnpm build`: type-check (`tsc -b`) and produce a production build via Vite.
- `pnpm lint`: run ESLint across the repo.
- `pnpm preview`: serve the production build locally for verification.

## Coding Style & Naming Conventions

- Language: TypeScript + React (TSX).
- Formatting/linting: follow `eslint.config.js` (ESLint + TypeScript ESLint + React Hooks/Refresh rules).
- Naming: use PascalCase for components (`App.tsx`) and camelCase for functions/variables.
- Prefer colocating component styles in `src/` (e.g., `App.css`).

## Testing Guidelines

- No test framework is configured yet (no `test` script or test dependencies).
- If you add tests, document the framework and the command in `package.json` and update this guide.

## Commit & Pull Request Guidelines

- Commit messages are short, imperative, sentence-case (e.g., “Create a scaffold using pnpm and vite”).
- PRs should include: a clear summary, relevant context or linked issue, and screenshots for UI changes.

## Configuration Tips

- Vite config lives in `vite.config.ts`; TypeScript settings in `tsconfig*.json`.
- The app is set up for modern React with the React Compiler enabled by the Vite template.

## Serena MCP Usage (Prioritize When Available)

- **If Serena MCP is available, use it first.** Treat Serena MCP tools as the primary interface over local commands or ad-hoc scripts.
- **Glance at the Serena MCP docs/help before calling a tool** to confirm tool names, required args, and limits.
- **Use the MCP-exposed tools for supported actions** (e.g., reading/writing files, running tasks, fetching data) instead of re-implementing workflows.
- **Never hardcode secrets.** Reference environment variables or the MCP's configured credential store; avoid printing tokens or sensitive paths.
- **If Serena MCP isn't enabled or lacks a needed capability, say so and propose a safe fallback.** Mention enabling it via `.mcp.json` when relevant.
- **Be explicit and reproducible.** Name the exact MCP tool and arguments you intend to use in your steps.

## AI-Assisted Development Tools

**Note:** Spec-Kit (below) is REQUIRED for all feature development. Codex and Copilot integrations are optional supplementary tools.

### Codex CLI Integration (Optional)

OpenAI Codex CLI integration provides two interfaces for enhanced development workflows:

#### Skills (Model-Invoked)

Claude automatically uses these when appropriate based on your request:

- **codex-ask** - Ask questions about code (read-only analysis)
- **codex-exec** - Execute development tasks (modifies code)
- **codex-review** - Perform code reviews (read-only analysis)

Located in `.claude/skills/` - Claude invokes these automatically when your request matches their descriptions.

#### Agents (Task-Launched)

Autonomous multi-phase agents for complex workflows:

- **codex-ask** - Deep code analysis with detailed explanations
- **codex-exec** - Comprehensive task execution with verification
- **codex-review** - Thorough code review with categorized findings

Located in `.claude/agents/` - Launch explicitly for multi-step autonomous execution.

**Prerequisites:** Codex CLI must be installed (`npm install -g @openai/codex`)

**Documentation:**

- `.claude/skills/codex-*/SKILL.md` - Individual skill guides
- `.claude/agents/README.md` - Agent usage and workflow patterns

### GitHub Copilot CLI Integration (Optional)

GitHub Copilot CLI integration provides similar capabilities using GitHub Copilot:

#### Skills (Model-Invoked)

Claude automatically uses these when appropriate based on your request:

- **copilot-ask** - Ask questions about code (read-only analysis)
- **copilot-exec** - Execute development tasks (modifies code)
- **copilot-review** - Perform code reviews (read-only analysis)

Located in `.claude/skills/` - Claude invokes these automatically when your request matches their descriptions.

**Prerequisites:** GitHub Copilot CLI must be installed with active subscription

**Documentation:**

- `.claude/skills/copilot-*/SKILL.md` - Individual skill guides

## Spec-Kit Feature Development Workflow (Required)

**IMPORTANT: Always use Spec-Kit for all feature development.** This structured workflow ensures consistency, quality, and maintainability from specification through implementation.

### Foundation Skills (Model-Invoked)

Project governance and setup tools Claude uses to establish project principles:

1. **speckit-constitution** - Create or update project constitution
   - Defines versioned principles and governance rules
   - Ensures spec/plan/task templates align with project values
   - Auto-invokes when you need to establish or update project principles

### Core Workflow Skills (Model-Invoked)

Claude automatically uses these skills when you describe features or ask about planning:

2. **speckit-specify** - Create feature specifications from natural language
   - Generates structured spec.md with user stories, acceptance criteria
   - Auto-invokes when you describe a new feature to build

3. **speckit-plan** - Create technical implementation plans
   - Generates plan.md with architecture, data models, API contracts
   - Auto-invokes when you ask "how should we implement this?"

4. **speckit-tasks** - Generate actionable task lists
   - Creates tasks.md with dependency-ordered, parallelizable tasks
   - Auto-invokes when you ask "what needs to be done?"

5. **speckit-implement** - Execute implementation plan
   - Processes tasks phase-by-phase with testing and verification
   - Auto-invokes when you say "let's build this" or "implement the feature"

### Supporting Skills (Model-Invoked)

Quality and validation tools Claude uses automatically:

6. **speckit-clarify** - Resolve specification ambiguities
   - Interactive questioning to clarify vague requirements
   - Auto-invokes when spec has ambiguities or missing decisions

7. **speckit-analyze** - Cross-artifact consistency analysis
   - Validates spec.md, plan.md, tasks.md consistency
   - Auto-invokes when you ask to "check consistency" or "validate artifacts"

8. **speckit-checklist** - Generate requirement quality validation checklists
   - Creates "unit tests for requirements" to validate completeness and clarity
   - Auto-invokes when you ask for "quality checklist" or "requirements validation"

9. **speckit-taskstoissues** - Convert tasks to GitHub issues
   - Transforms tasks.md into GitHub issues with dependencies and labels
   - Auto-invokes when you ask to "create issues" or "sync tasks to GitHub"

### Required Workflow

**All feature development must follow this workflow:**

```
1. Describe Feature → speckit-specify generates spec.md (REQUIRED)
2. Clarify → speckit-clarify resolves ambiguities (AUTO-INVOKED as needed)
3. Create Plan → speckit-plan generates plan.md (REQUIRED)
4. Generate Tasks → speckit-tasks creates tasks.md (REQUIRED)
5. Validate → speckit-analyze checks consistency (RECOMMENDED)
6. Quality Gate → speckit-checklist validates requirements (RECOMMENDED)
7. Implement → speckit-implement executes tasks phase-by-phase (REQUIRED)
```

**Optional steps:**

- Step 0: Define Principles → speckit-constitution (only for initial project setup or governance changes)
- Step 8: Sync to GitHub → speckit-taskstoissues (use when GitHub issue tracking is needed)

**Location:** `.claude/skills/speckit-*/SKILL.md` - Individual skill documentation

**Prerequisites:** Spec-kit initialized in repository (`.specify/` directory exists)

## Code Design Principles

Follow Robert C. Martin's SOLID and Clean Code principles:

### SOLID Principles

1. **SRP (Single Responsibility)**: One reason to change per class; separate concerns (e.g., storage vs formatting vs calculation)
2. **OCP (Open/Closed)**: Open for extension, closed for modification; use polymorphism over if/else chains
3. **LSP (Liskov Substitution)**: Subtypes must be substitutable for base types without breaking expectations
4. **ISP (Interface Segregation)**: Many specific interfaces over one general; no forced unused dependencies
5. **DIP (Dependency Inversion)**: Depend on abstractions, not concretions; inject dependencies

### Clean Code Practices

- **Naming**: Intention-revealing, pronounceable, searchable names (`daysSinceLastUpdate` not `d`)
- **Functions**: Small, single-task, verb names, 0-3 args, extract complex logic
- **Classes**: Follow SRP, high cohesion, descriptive names
- **Error Handling**: Exceptions over error codes, no null returns, provide context, try-catch-finally first
- **Testing**: TDD, one assertion/test, FIRST principles (Fast, Independent, Repeatable, Self-validating, Timely), Arrange-Act-Assert pattern
- **Code Organization**: Variables near usage, instance vars at top, public then private functions, conceptual affinity
- **Comments**: Self-documenting code preferred, explain "why" not "what", delete commented code
- **Formatting**: Consistent, vertical separation, 88-char limit, team rules override preferences
- **General**: DRY, KISS, YAGNI, Boy Scout Rule, fail fast

## Development Methodology

Follow Martin Fowler's Refactoring, Kent Beck's Tidy Code, and t_wada's TDD principles:

### Core Philosophy

- **Small, safe changes**: Tiny, reversible, testable modifications
- **Separate concerns**: Never mix features with refactoring
- **Test-driven**: Tests provide safety and drive design
- **Economic**: Only refactor when it aids immediate work

### TDD Cycle

1. **Red** → Write failing test
2. **Green** → Minimum code to pass
3. **Refactor** → Clean without changing behavior
4. **Commit** → Separate commits for features vs refactoring

### Practices

- **Before**: Create TODOs, ensure coverage, identify code smells
- **During**: Test-first, small steps, frequent tests, two hats rule
- **Refactoring**: Extract function/variable, rename, guard clauses, remove dead code, normalize symmetries
- **TDD Strategies**: Fake it, obvious implementation, triangulation

### When to Apply

- Rule of Three (3rd duplication)
- Preparatory (before features)
- Comprehension (as understanding grows)
- Opportunistic (daily improvements)

### Key Rules

- One assertion per test
- Separate refactoring commits
- Delete redundant tests
- Human-readable code first

> "Make the change easy, then make the easy change." - Kent Beck
