# Implementation Plan: Volume Surge Scanner Frontend Integration

**Branch**: `009-volume-surge-frontend` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-volume-surge-frontend/spec.md`

## Summary

Make the existing Volume Surge Scanner frontend feature accessible and functional. The backend is fully built; the frontend code exists but is broken (no navigation entry, API URL mismatch, missing polish). This plan covers: adding a nav menu item, migrating from hardcoded axios to the shared API client, fixing type mismatches, adding stock names/chart links, implementing scan progress polling, and adding empty/error states.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Node.js 18+ (frontend)
**Primary Dependencies**: React 18, Ant Design, Vite, @tanstack/react-query, axios (shared `ApiService`), dayjs, react-router-dom
**Storage**: N/A (frontend-only; backend SQLite unchanged)
**Testing**: Vitest 1.0.4 + @testing-library/react + @testing-library/jest-dom + jsdom
**Target Platform**: Web browser (SPA served by Vite dev server, proxied to backend on port 3000)
**Project Type**: Web application (frontend SPA)
**Performance Goals**: SC-005: feedback within 3 seconds of any user action
**Constraints**: Frontend-only changes; no backend modifications; all UI text in English
**Scale/Scope**: Single-user local application; ~6 files to modify, ~2 files to create (tests)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First | ✅ PASS | Existing components (ScanTrigger, ScanHistory, ResultsViewer, ComparisonView) are self-contained with clear props. Modifications preserve this structure. |
| II. TypeScript & Type Safety | ⚠️ ACTION NEEDED | Current code uses `any` in several places (e.g., `ComparisonView` state, `ResultsViewer` columns). Plan includes fixing `any` types and aligning frontend types with backend response shapes. |
| III. Test-First (NON-NEGOTIABLE) | ⚠️ ACTION NEEDED | No existing tests for Volume Surge components. Plan includes writing tests before implementation changes. |
| IV. Build & Performance | ✅ PASS | Page already uses lazy loading (`lazy(() => import('./pages/VolumeSurgeScan'))`). No new heavy dependencies. |
| V. Observability & Debugging | ✅ PASS | Shared API client has error interceptors with structured logging. Migration to shared client inherits this. |
| English UI Text | ✅ PASS | Existing components already use English text. FR-008 confirms this requirement. |

**Gate Decision**: PASS with action items — TypeScript strictness and test coverage to be addressed in implementation tasks.

**Post-Design Re-check (Phase 1 complete)**:
- II. TypeScript: ✅ Plan includes type corrections (data-model.md) — `any` removal and type alignment specified
- III. Test-First: ✅ Plan includes test file creation (project structure) — tests before implementation
- All other principles: ✅ No changes from initial check

## Project Structure

### Documentation (this feature)

```text
specs/009-volume-surge-frontend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # Frontend→Backend API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── Layout/
│   │       └── MainLayout.tsx          # MODIFY: add Volume Surge nav item
│   ├── pages/
│   │   └── VolumeSurgeScan/
│   │       ├── index.tsx               # MODIFY: scan progress polling, error states
│   │       └── components/
│   │           ├── ScanTrigger.tsx      # MODIFY: disable button during active scan
│   │           ├── ScanHistory.tsx      # MODIFY: fix type alignment, empty states
│   │           ├── ResultsViewer.tsx    # MODIFY: stock names, chart links, sort, types
│   │           └── ComparisonView.tsx   # MODIFY: fix missing import, types, chart links
│   ├── services/
│   │   └── volumeSurgeScanApi.ts       # MODIFY: migrate to shared API client
│   └── types/
│       └── scan.types.ts               # MODIFY: align with backend response shapes
├── tests/
│   ├── pages/
│   │   └── VolumeSurgeScanPage.test.tsx    # CREATE: page-level tests
│   └── services/
│       └── volumeSurgeScanApi.test.ts      # CREATE: API service tests
```

**Structure Decision**: Frontend-only modifications within existing directory structure. No new directories needed beyond test files.

## Complexity Tracking

> No constitution violations requiring justification. All changes use existing patterns.
