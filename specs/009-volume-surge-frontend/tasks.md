# Tasks: Volume Surge Scanner Frontend Integration

**Input**: Design documents from `/specs/009-volume-surge-frontend/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Tests**: Included per constitution principle III (Test-First, NON-NEGOTIABLE) and plan.md which explicitly lists test file creation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Verification)

**Purpose**: Verify backend API route before making frontend changes

- [x] T001 Verify actual backend API route by running `curl -s http://localhost:3000/api/v1/api/volume-surge/scans` and `curl -s http://localhost:3000/api/v1/volume-surge/scans` to determine correct path prefix (see `specs/009-volume-surge-frontend/quickstart.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix shared types and API client — MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Fix frontend types to align with backend response shapes in `frontend/src/types/scan.types.ts`: (1) Create `ScanListData` interface with `scans: ScanSummary[]` + `pagination` to match backend `ScanListResponseDto`, (2) Change `stockName` from optional to required in `StockScanResult`, (3) Remove or update `PaginatedResponse<T>` generic which doesn't match the scan list backend shape. Reference: `specs/009-volume-surge-frontend/data-model.md` Type Corrections section
- [x] T003 Migrate `frontend/src/services/volumeSurgeScanApi.ts` from hardcoded axios to shared API client: (1) Replace `import axios` with `import { api } from './api'`, (2) Remove `const API_BASE_URL = 'http://localhost:3000/api/volume-surge'`, (3) Replace all `axios.get/post(${API_BASE_URL}/...)` with `api.get/post('/api/volume-surge/...')` using the relative path determined in T001, (4) Remove manual `response.data` unwrapping since shared client already returns `response.data`, (5) Update return types to match corrected types from T002. Reference: `specs/009-volume-surge-frontend/research.md` R1 + `specs/009-volume-surge-frontend/contracts/api.md`

**Checkpoint**: Types aligned and API client functional — user story implementation can now begin

---

## Phase 3: User Story 1 — Discover and Access Volume Surge Scanner (Priority: P1) 🎯 MVP

**Goal**: User sees "Volume Surge" in the nav bar, clicks it, lands on the scanner page with correct active state highlighting

**Independent Test**: Open app → see "Volume Surge" menu item → click → page loads → menu item highlighted

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [US1] Write navigation test in `frontend/tests/components/Layout/MainLayout.test.tsx`: (1) Test that "Volume Surge" menu item renders in the navigation, (2) Test that clicking it navigates to `/volume-surge-scan`, (3) Test that the item is highlighted when location is `/volume-surge-scan`. Mock `react-router-dom` useNavigate/useLocation. Reference existing test patterns in `frontend/tests/components/`

### Implementation for User Story 1

- [x] T005 [US1] Add "Volume Surge" nav item in `frontend/src/components/Layout/MainLayout.tsx`: (1) Import `RiseOutlined` (or `StockOutlined`) from `@ant-design/icons`, (2) Add menu item `{ key: '/volume-surge-scan', icon: <RiseOutlined />, label: 'Volume Surge' }` after VCP Scanner and before Favorites in the `menuItems` array, (3) Add `if (path.startsWith('/volume-surge-scan')) return '/volume-surge-scan';` to `getSelectedKey()` function before the favorites check

**Checkpoint**: User Story 1 complete — navigation discovery works independently

---

## Phase 4: User Story 2 — Trigger Scan and View Results (Priority: P1)

**Goal**: User triggers a scan, sees real-time progress, views results with stock names and chart links, can click stock codes to navigate to K-line charts

**Independent Test**: Start scan → see progress polling → results table shows stock code + name + chart link → click stock code → navigate to `/chart/:stockCode`

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US2] Write scan trigger tests in `frontend/tests/pages/VolumeSurgeScanPage.test.tsx`: (1) Test that "Start Scan" button is disabled when `activeScan?.status === 'RUNNING'`, (2) Test that an alert message appears when a scan is running, (3) Test that the button re-enables when scan status changes to COMPLETED/FAILED/CANCELLED. Mock `volumeSurgeScanApi` methods.
- [x] T007 [P] [US2] Write results viewer tests in `frontend/tests/components/VolumeSurgeScan/ResultsViewer.test.tsx`: (1) Test that stock name column is rendered, (2) Test that stock code renders as a link to `/chart/:stockCode`, (3) Test that sort changes when column header is clicked, (4) Test empty state renders when results array is empty

### Implementation for User Story 2

- [x] T008 [US2] Add scan progress polling and concurrent scan gating in `frontend/src/pages/VolumeSurgeScan/index.tsx`: (1) Add `scanRunning` derived state from `activeScan?.status === 'RUNNING'`, (2) Add `useEffect` with `setInterval` (3s) that calls `volumeSurgeScanApi.getScanStatus(activeScan.scanId)` and updates `activeScan` state — clear interval on COMPLETED/FAILED/CANCELLED or unmount, (3) Pass `disabled={scanRunning}` prop to `ScanTrigger`, (4) Add error state with Ant Design `Alert` component for API failures, (5) Update `handleScanStarted` to set activeScan and begin polling immediately
- [x] T009 [US2] Update `ScanTrigger` to accept and respect `disabled` prop in `frontend/src/pages/VolumeSurgeScan/components/ScanTrigger.tsx`: (1) Add `disabled?: boolean` to `ScanTriggerProps`, (2) When `disabled` is true: disable the submit button, show an `Alert` with message "A scan is already in progress. Please wait for it to complete.", (3) Add error handling with `message.error()` for API call failures
- [x] T010 [US2] Add stock name column, chart links, and column sort in `frontend/src/pages/VolumeSurgeScan/components/ResultsViewer.tsx`: (1) Add "Stock Name" column after "Stock Code" showing `record.stockName`, (2) Change stock code `render` to use `<Link to={/chart/${code}}>` from react-router-dom (open in same window like VCP), (3) Add `onChange` handler to Table for server-side sorting — update `sortBy`/`sortOrder` state and re-fetch, (4) Replace `visible` prop on Modal with `open` (antd v5 API), (5) Remove `any` type annotations from column render functions — use typed `record: ScanResultDetail`, (6) Add empty state: when `results.length === 0` and not loading, show Ant Design `Empty` component with description "No results found for this scan"
- [x] T011 [US2] Add error handling for export in `frontend/src/pages/VolumeSurgeScan/components/ResultsViewer.tsx`: wrap `handleExport` try/catch with user-facing `message.error('Export failed: ' + error.message)` and ensure consistent error feedback

**Checkpoint**: User Story 2 complete — full scan→results workflow functional with stock names and chart links

---

## Phase 5: User Story 3 — Browse Scan History (Priority: P2)

**Goal**: User views paginated scan history, selects a completed scan, and its results load

**Independent Test**: Navigate to History tab → see paginated scan list → click "View Results" → results tab opens with data

### Tests for User Story 3 ⚠️

- [x] T012 [US3] Write scan history tests in `frontend/tests/components/VolumeSurgeScan/ScanHistory.test.tsx`: (1) Test that scan list renders when API returns data with `scans` field (not `items`), (2) Test empty state renders when no scans exist, (3) Test pagination works

### Implementation for User Story 3

- [x] T013 [US3] Fix data access and add empty state in `frontend/src/pages/VolumeSurgeScan/components/ScanHistory.tsx`: (1) Change `response.data.items` to `response.data.scans` to match backend `ScanListResponseDto` shape (per research.md R2), (2) Add empty state: when `scans.length === 0` and not loading, render Ant Design `Empty` component with description "No scans found. Start a new scan to see results here.", (3) Add error handling with `message.error()` on API failure

**Checkpoint**: User Story 3 complete — history browsing works independently

---

## Phase 6: User Story 4 — Export Scan Results (Priority: P2)

**Goal**: User exports filtered results as CSV or Markdown file download

**Independent Test**: View scan results → click "Export CSV" → file downloads → click "Export MD" → file downloads

> Note: Export functionality is largely working in ResultsViewer.tsx already. The main fixes are API client migration (T003) and error handling (T011 in US2). This phase handles any remaining export-specific improvements.

- [x] T014 [US4] Verify export functionality end-to-end after API migration: test that `volumeSurgeScanApi.exportResults` works correctly with the shared API client and that file downloads succeed for both CSV and Markdown formats. If the shared `api` client unwraps `response.data` automatically, update `exportResults` method to handle the double-unwrapping (since it currently accesses `response.data.success` and `response.data.data.content`). File: `frontend/src/services/volumeSurgeScanApi.ts`

**Checkpoint**: User Story 4 complete — export works for both formats

---

## Phase 7: User Story 5 — Compare Two Scans (Priority: P3)

**Goal**: User selects two completed scans, sees comparison summary and persistent stocks table with trend indicators

**Independent Test**: Select two scans → click "Compare" → summary stats appear → persistent stocks table shows both ratios and trend

### Tests for User Story 5 ⚠️

- [x] T015 [US5] Write comparison view tests in `frontend/tests/components/VolumeSurgeScan/ComparisonView.test.tsx`: (1) Test that `Statistic` components render in summary, (2) Test that persistent stocks table shows stock name and chart link, (3) Test empty state when no completed scans exist

### Implementation for User Story 5

- [x] T016 [P] [US5] Fix imports and types in `frontend/src/pages/VolumeSurgeScan/components/ComparisonView.tsx`: (1) Add `Statistic` to the antd import (currently missing — causes runtime error, per research.md R5), (2) Change `comparisonResult` state type from `any` to `CompareResult | null`, (3) Fix `response.data.items` to `response.data.scans` in `fetchScans` (same issue as ScanHistory per R2)
- [x] T017 [US5] Add stock chart links and empty state in `frontend/src/pages/VolumeSurgeScan/components/ComparisonView.tsx`: (1) Make `stockCode` column render as `<Link to={/chart/${code}}>` for chart navigation, (2) Add empty state when `scans.length === 0`: show Ant Design `Empty` with "No completed scans available for comparison. Run at least two scans first.", (3) Add empty state when comparison result has zero persistent stocks

**Checkpoint**: User Story 5 complete — comparison works with all fixes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 Verify all user-facing text is in English across all modified components — scan through `frontend/src/pages/VolumeSurgeScan/` and confirm no Chinese text in labels, buttons, messages, placeholders (FR-008)
- [x] T019 Run `npm test` in `frontend/` to verify all new and existing tests pass
- [x] T020 Run TypeScript type check `npx tsc --noEmit` in `frontend/` to verify no type errors remain
- [x] T021 Manual end-to-end validation following `specs/009-volume-surge-frontend/quickstart.md`: (1) Nav item visible and working, (2) Scan triggers and shows progress, (3) Results display with stock names and chart links, (4) History loads correctly, (5) Export downloads files, (6) Comparison works with summary stats

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (need verified API route) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — no dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Phase 2 — no dependencies on other stories
- **User Story 3 (Phase 5)**: Depends on Phase 2 — no dependencies on other stories
- **User Story 4 (Phase 6)**: Depends on Phase 2 + T011 from US2 (export error handling) — light dependency
- **User Story 5 (Phase 7)**: Depends on Phase 2 — no dependencies on other stories
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2
- **US2 (P1)**: Independent after Phase 2
- **US3 (P2)**: Independent after Phase 2
- **US4 (P2)**: Light dependency on US2's T011 (export error handling in ResultsViewer)
- **US5 (P3)**: Independent after Phase 2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Type fixes (foundational) before component updates
- Parent component (index.tsx) before child components when passing new props
- Core implementation before integration

### Parallel Opportunities

- T002 and T003 are sequential (T003 depends on types from T002)
- T004 (US1 test) can run in parallel with T006/T007 (US2 tests) — different files
- US1 (Phase 3) and US2 (Phase 4) can start in parallel after Phase 2
- US3 (Phase 5) and US5 (Phase 7) can start in parallel after Phase 2
- T016 and T017 within US5 are sequential (T017 depends on T016 fixing imports)

---

## Parallel Example: After Phase 2 Completes

```text
# These can all start simultaneously (different files, no cross-dependencies):

Stream A (US1): T004 → T005 (MainLayout.tsx)
Stream B (US2): T006 + T007 → T008 (index.tsx) → T009 (ScanTrigger.tsx) → T010 + T011 (ResultsViewer.tsx)
Stream C (US3): T012 → T013 (ScanHistory.tsx)
Stream D (US5): T015 → T016 → T017 (ComparisonView.tsx)

# After US2 T011 completes:
Stream E (US4): T014 (volumeSurgeScanApi.ts export verification)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Verify API route
2. Complete Phase 2: Fix types + migrate API client
3. Complete Phase 3: US1 — Nav menu item
4. Complete Phase 4: US2 — Scan + Results
5. **STOP and VALIDATE**: App is usable — user can find, trigger scans, and view results

### Incremental Delivery

1. Setup + Foundational → API works ✓
2. US1 → Navigation discoverable ✓ (MVP start)
3. US2 → Core scan workflow functional ✓ (MVP complete)
4. US3 → History browsing ✓
5. US4 → Export working ✓
6. US5 → Comparison working ✓
7. Polish → Production-ready ✓

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Total tasks: 21 (T001–T021)
- Commit after each completed user story phase
- The `PaginatedResponse<T>` type change (T002) may affect other consumers — check for imports before modifying
- Backend route verification (T001) is critical — if path is different than expected, T003 paths need adjustment
