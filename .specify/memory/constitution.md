<!--
  Sync Impact Report
  =================
  Version change: 1.0.0 → 1.1.0
  Modified principles: I. Component-First (Frontend) - Added page design requirements
  Added sections: Changelog
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ updated (Constitution Check gates)
    - .specify/templates/spec-template.md: ✅ no changes needed
    - .specify/templates/tasks-template.md: ✅ no changes needed
  Follow-up TODOs: 
    - When implementing new pages, ensure frontend-design skill is consulted
    - Update any existing page designs to follow frontend-design guidelines
-->

# AI Drama Constitution

## Core Principles

### 使用中文
*important* 使用中文！！！！

### I. Component-First (Frontend)

Every UI feature MUST start as a standalone, reusable component or module. Components MUST be:

- Self-contained with clear props/inputs and outputs
- Independently testable (unit or component tests)
- Documented with purpose and usage
- Free of organizational-only abstractions

**Page Design Requirements**:
- When designing new pages or major UI features, MUST use the frontend-design skill
  located at `~/.claude/skills/frontend-design`
- This skill provides design patterns, component structure, and UX best practices
- Ensures consistency across all pages and adherence to modern design standards

**Rationale**: Reusable components reduce duplication, improve consistency, and enable
incremental delivery. Frontend complexity grows quickly without this discipline.

### II. TypeScript & Type Safety

All frontend and Node.js code MUST use TypeScript. Strict mode MUST be enabled.

- No `any` without explicit justification and suppression comment
- Shared types MUST live in a dedicated types package or module
- API contracts MUST have corresponding TypeScript interfaces

**Rationale**: Type safety catches errors at compile time, improves IDE support, and
documents intent. Essential for maintainability in frontend + Node.js ecosystems.

### III. Test-First (NON-NEGOTIABLE)

TDD is mandatory for feature work:

- Tests written → User/Reviewer approved → Tests fail → Then implement
- Red-Green-Refactor cycle strictly enforced
- Component tests for UI; unit tests for logic; integration tests for flows

**Rationale**: Prevents regression, forces clear requirements, and enables confident
refactoring. Non-negotiable to maintain quality as the codebase grows.

### IV. Build & Performance Standards

- Bundle size MUST be monitored; significant increases require justification
- Lazy loading MUST be used for non-critical routes or heavy components
- Node.js scripts MUST run within reasonable time; long tasks MUST be chunked or
  parallelized where possible

**Rationale**: Frontend performance directly impacts user experience. Node.js tooling
must remain fast to keep developer feedback loops short.

### V. Observability & Debugging

- Structured logging MUST be used (JSON or key-value format)
- Errors MUST include context (component, action, user state when safe)
- Node.js tooling MUST support `--verbose` or equivalent for troubleshooting

**Rationale**: Frontend and Node.js environments are harder to debug than traditional
server logs. Structured data enables tooling and faster incident resolution.

## Technology Stack

- **Frontend**: Modern framework (React, Vue, Svelte, etc.) with standard tooling
  (Vite, esbuild, or equivalent)
- **Node.js**: LTS version; used for tooling, scripts, dev servers, or backend services
- **Package Manager**: npm, pnpm, or yarn (project MUST pin one)
- **Linting/Formatting**: ESLint + Prettier (or project-equivalent) MUST be configured

## Development Workflow

- All PRs MUST pass lint, type-check, and tests before merge
- Constitution compliance MUST be verified in plan/spec reviews
- Breaking changes MUST be documented and versioned (semver for libraries)
- Use `.specify/` and plan.md for feature design; do not skip specification for
  "small" features that add new components or APIs

## Governance

- This constitution supersedes ad-hoc practices. Conflicts are resolved in favor
  of the constitution.
- Amendments require: documented rationale, version bump, and update to dependent
  templates (plan-template, spec-template, tasks-template).
- All PRs and reviews MUST verify compliance with these principles.
- Complexity beyond these rules MUST be justified in plan.md Complexity Tracking table.

**Version**: 1.1.0 | **Ratified**: 2025-02-25 | **Last Amended**: 2025-02-25

---

## Changelog

### v1.1.0 (2025-02-25)
- Added page design requirements to Component-First principle
- Mandated use of `~/.claude/skills/frontend-design` for UI design work
