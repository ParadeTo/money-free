# Feature Specification: Volume Surge Scanner Frontend Integration

**Feature Branch**: `009-volume-surge-frontend`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "成交量激增的选股前端还没有这个功能呀"

## Context

The Volume Surge stock screening backend is fully implemented (scan, results, export, compare, cancel APIs). Frontend code also exists at `/volume-surge-scan` with four sub-components (ScanTrigger, ScanHistory, ResultsViewer, ComparisonView), but the feature is **not accessible to users** because:

1. **No navigation entry** — the main menu in `MainLayout` does not include a link to the Volume Surge Scanner page
2. **API connectivity broken** — the frontend API service uses a hardcoded URL (`http://localhost:3000/api/volume-surge`) that does not align with the backend's global prefix (`api/v1`) + controller path (`api/volume-surge`), causing all API calls to fail
3. **Missing integration polish** — no stock name display, no link to K-line charts, missing component imports, no real-time scan progress feedback

This spec defines making the Volume Surge Scanner fully accessible, functional, and user-friendly in the frontend.

## Clarifications

### Session 2026-04-01

- Q: How should the system handle a new scan triggered while another is running? → A: Reject with prompt — disable the "Start Scan" button and display a message indicating a scan is already in progress.
- Q: Should the API path fix be frontend-only or include backend changes? → A: Frontend-only — replace the hardcoded axios instance with the shared API client, aligning the URL to match the backend's actual route. No backend controller changes.
- Q: What should the default sort order be for scan results? → A: Default sort by volumeSupportRatio descending (current behavior). Support column-header click to switch sort field and order.

## User Scenarios & Testing

### User Story 1 - Discover and Access Volume Surge Scanner (Priority: P1)

A user opens the StockHub application and sees a "Volume Surge" option in the top navigation menu. They click it and are taken to the Volume Surge Scanner page where they can initiate scans and view results.

**Why this priority**: Without discoverability via navigation, the entire feature is invisible to users. This is the prerequisite for all other stories.

**Independent Test**: Can be fully tested by opening the app, seeing the menu item, clicking it, and verifying the page loads without errors.

**Acceptance Scenarios**:

1. **Given** a user opens StockHub, **When** they look at the navigation bar, **Then** they see a "Volume Surge" menu item alongside existing items (Chart, Screener, VCP Scanner, Favorites)
2. **Given** a user is on any page, **When** they click the "Volume Surge" navigation item, **Then** they are navigated to the Volume Surge Scanner page
3. **Given** a user is on the Volume Surge Scanner page, **When** they look at the navigation bar, **Then** the "Volume Surge" item is highlighted as the active menu item

---

### User Story 2 - Trigger a Scan and View Results (Priority: P1)

A user triggers a volume surge scan (AUTO or MANUAL mode), sees real-time progress while the scan runs, and then views the results table with stock details including stock names and links to K-line charts.

**Why this priority**: This is the core workflow — without a functioning scan-to-results pipeline, the feature has no value.

**Independent Test**: Can be fully tested by starting a scan, waiting for completion, and verifying the results table displays correctly with all expected columns and interactions.

**Acceptance Scenarios**:

1. **Given** a user is on the New Scan tab, **When** they select AUTO mode and click "Start Scan", **Then** the scan starts successfully and they see a progress indicator
2. **Given** a scan is running, **When** the user waits, **Then** they see the scan status update (progress or completion) without manually refreshing
3. **Given** a scan has completed, **When** the user views the Results tab, **Then** they see a table with stock code, stock name, expansion multiplier, volume support ratio, MA50 slope, and match status
4. **Given** results are displayed, **When** the user clicks a stock code, **Then** they are navigated to the K-line chart page for that stock
5. **Given** results are displayed, **When** the user clicks "Details" on a stock row, **Then** a detail panel shows volume pattern, volume support, moving average, and criteria status information

---

### User Story 3 - Browse Scan History (Priority: P2)

A user views a list of previously run scans with their status, matched count, and duration. They can select any completed scan to view its results.

**Why this priority**: History browsing builds on the core scan workflow and enables users to revisit past results without re-running scans.

**Independent Test**: Can be fully tested by navigating to the Scan History tab, verifying past scans appear, and clicking one to load its results.

**Acceptance Scenarios**:

1. **Given** scans have been run before, **When** the user navigates to the Scan History tab, **Then** they see a paginated list of scans sorted by date
2. **Given** the history list is displayed, **When** the user clicks "View Results" on a completed scan, **Then** the Results tab opens with that scan's data

---

### User Story 4 - Export Scan Results (Priority: P2)

A user exports matched scan results as CSV or Markdown format for external use or record keeping.

**Why this priority**: Export is a convenience feature that adds value for users who track stocks outside the app.

**Independent Test**: Can be fully tested by running a scan, clicking "Export CSV" or "Export MD", and verifying a file downloads with the expected content.

**Acceptance Scenarios**:

1. **Given** scan results are displayed, **When** the user clicks "Export CSV", **Then** a CSV file downloads with the filtered scan results
2. **Given** scan results are displayed, **When** the user clicks "Export MD", **Then** a Markdown file downloads with the filtered scan results

---

### User Story 5 - Compare Two Scans (Priority: P3)

A user selects two completed scans and compares them to see which stocks persist across both, which are new, and the trend direction for persistent stocks.

**Why this priority**: Comparison is an advanced analytical feature that builds on basic scan functionality.

**Independent Test**: Can be fully tested by selecting two completed scans from dropdowns, clicking "Compare", and verifying the comparison summary and persistent stocks table appear.

**Acceptance Scenarios**:

1. **Given** at least two completed scans exist, **When** the user selects two scans and clicks "Compare", **Then** they see a summary (persistent count, only-in-scan-1 count, only-in-scan-2 count)
2. **Given** a comparison result is displayed, **When** the user looks at the persistent stocks table, **Then** each stock shows both scan ratios and a trend indicator (improving/declining/stable)

---

### Edge Cases

- What happens when the backend is unreachable? The user should see a clear error message, not a blank screen or browser error.
- What happens when a scan returns zero matched stocks? The results table should show an empty state message.
- What happens when the user triggers a scan while another is already running? The "Start Scan" button is disabled and a message is displayed indicating a scan is already in progress. Users must wait for the current scan to complete, fail, or be cancelled before starting a new one.
- What happens when scan history is empty (first-time user)? The history tab should show an informative empty state.

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a "Volume Surge" navigation menu item in the main layout header, positioned after "VCP Scanner" and before "Favorites"
- **FR-002**: System MUST use the shared API client (consistent with other features like VCP) so that the base URL aligns with the backend's actual route. This is a frontend-only change; the backend controller path remains unchanged
- **FR-003**: Results table MUST display both stock code and stock name for each scan result
- **FR-004**: Stock codes in the results table MUST link to the K-line chart page (`/chart/:stockCode`)
- **FR-005**: System MUST show real-time scan progress after a scan is triggered, polling for status updates until the scan completes, fails, or is cancelled
- **FR-006**: System MUST display user-friendly error messages when API calls fail (network errors, backend errors)
- **FR-007**: System MUST show appropriate empty states when no data is available (no results, no history, no comparison data)
- **FR-008**: All user-facing text in the frontend MUST be in English (per project constitution v1.2.0)
- **FR-009**: System MUST disable the "Start Scan" button and display a status message when a scan is already running, preventing concurrent scan triggers
- **FR-010**: Results table MUST default to sorting by volume support ratio (descending) and MUST support user-initiated sort switching via column headers

### Key Entities

- **VolumeSurgeScan**: Represents a single scan execution — includes scan date, mode (AUTO/MANUAL), status (RUNNING/COMPLETED/FAILED/CANCELLED), total and matched stock counts, duration
- **ScanResult**: Individual stock result within a scan — includes stock code, volume contraction/expansion metrics, moving average data, volume support ratio, and criteria match status
- **CompareResult**: Comparison between two scans — includes persistent stocks with trend direction, and counts of stocks unique to each scan

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can discover and navigate to the Volume Surge Scanner from the main menu within 1 click
- **SC-002**: Users can trigger a scan and see results displayed within the page without needing to manually refresh or navigate
- **SC-003**: Users can identify stocks by both code and name in the results table
- **SC-004**: Users can navigate from a scan result to the stock's K-line chart within 1 click
- **SC-005**: Users receive feedback within 3 seconds of any action (scan start, page load, export) — either results or a loading/progress indicator
- **SC-006**: All scan operations (trigger, view results, export, compare) complete successfully end-to-end through the frontend UI

## Assumptions

- The backend Volume Surge API is fully implemented and functional (existing 008-volume-surge-scan spec)
- The backend returns stock names in scan results (available via the `Stock` relation in the database)
- The shared API client pattern used by VCP and other features is the standard approach for this project
- The existing component structure (ScanTrigger, ScanHistory, ResultsViewer, ComparisonView) is a reasonable architecture and should be improved in-place rather than rewritten
- All changes are scoped to the frontend; no backend code modifications are required
