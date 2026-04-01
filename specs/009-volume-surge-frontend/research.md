# Research: Volume Surge Scanner Frontend Integration

**Feature**: 009-volume-surge-frontend
**Date**: 2026-04-01

## R1: API Client Migration Strategy

**Decision**: Migrate `volumeSurgeScanApi.ts` from hardcoded axios to the shared `ApiService` singleton (`api` from `./api`), using relative paths that match the backend's actual route structure.

**Rationale**:
- The shared client (`frontend/src/services/api.ts`) provides: environment-based baseURL (`/api/v1`), Vite dev proxy to `localhost:3000`, structured error logging via response interceptor, and consistent timeout/headers.
- VCP service (`vcp.service.ts`) uses relative paths like `/vcp/scan` — Volume Surge should follow the same pattern.
- The current hardcoded `http://localhost:3000/api/volume-surge` bypasses the Vite proxy and breaks in non-localhost deployments.

**Alternatives considered**:
- Keep separate axios instance with env variable for base URL — rejected because it duplicates shared infrastructure and misses error interceptors.
- Create a new shared service layer — rejected as over-engineering for a migration task.

**Implementation detail**: The backend controller is `@Controller('api/volume-surge')` with global prefix `api/v1`, making actual routes `/api/v1/api/volume-surge/...`. Using the shared client (baseURL `/api/v1`), relative paths should be `/api/volume-surge/scan`, `/api/volume-surge/scans`, etc. This is admittedly ugly (`/api` appears twice) but correct without backend changes.

**Verification step**: Before finalizing paths, make one test HTTP request to confirm the actual backend route. If the backend doesn't respond at `/api/v1/api/volume-surge/scans`, the controller path may have been designed for a different prefix scheme and needs investigation.

## R2: Scan List Type Mismatch

**Decision**: Fix the frontend `PaginatedResponse<T>` type and `ScanHistory`/`ComparisonView` component code to match the backend's actual response shape.

**Rationale**:
- Backend `getScans` returns `{ success, data: { scans: ScanSummary[], pagination: { page, limit, total, totalPages } } }`
- Frontend `PaginatedResponse<T>` declares `data: T[]` + `pagination` — field name mismatch (`data` vs `scans`)
- UI code reads `response.data.items` — matches neither the type nor the backend
- This triple inconsistency guarantees runtime errors

**Alternatives considered**:
- Create a separate type for volume surge responses — rejected for consistency; fix the shared type instead.
- Use `any` — rejected per constitution principle II (TypeScript strictness).

**Resolution**: Update `PaginatedResponse` or create a `ScanListResponse` type that uses `scans: ScanSummary[]` to match the backend. Update UI code to read `response.data.scans` instead of `response.data.items`.

## R3: Scan Progress Polling Pattern

**Decision**: Use `setInterval` with the existing `getScanStatus` API call, polling every 3 seconds while scan status is `RUNNING`. Clear interval on completion, failure, cancellation, or component unmount.

**Rationale**:
- The backend already provides a `GET /scans/:scanId` endpoint returning scan status with progress information.
- 3-second interval balances responsiveness (SC-005) with minimal backend load for a single-user app.
- `@tanstack/react-query` is available but polling with `useQuery` + `refetchInterval` would add complexity for a simple status check. A `useEffect` + `setInterval` pattern is simpler and consistent with the component's existing imperative data-fetching style.

**Alternatives considered**:
- WebSocket/SSE for real-time updates — rejected as over-engineering for single-user local app.
- `react-query` `refetchInterval` — acceptable alternative but the existing components don't use react-query; migrating would expand scope.

## R4: Concurrent Scan Prevention (Frontend-side)

**Decision**: Track active scan status in the page-level state. When a scan is `RUNNING`, disable the "Start Scan" button and show an inline alert. Re-enable when scan completes/fails/cancels.

**Rationale**: Per clarification Q1, the system rejects concurrent scans at the UI level. The simplest approach is checking `activeScan?.status === 'RUNNING'` in the parent `VolumeSurgeScanPage` and passing a `disabled` prop to `ScanTrigger`.

**Alternatives considered**:
- Backend-enforced rejection — already exists (backend rejects concurrent scans), but frontend UX should prevent the attempt proactively.
- Global state management — rejected; component-level state sufficient for a single page.

## R5: Missing `Statistic` Import in ComparisonView

**Decision**: Add `Statistic` to the antd import in `ComparisonView.tsx`.

**Rationale**: The component renders `<Statistic>` elements but does not import the component from antd. This causes a runtime error. Simple fix.

## R6: Stock Name Display and Chart Links

**Decision**: Add `stockName` column to the results table and make `stockCode` a clickable link navigating to `/chart/:stockCode`.

**Rationale**:
- Backend confirms `stockName` is included in `ScanResultDetail` responses (via `stock.stockName` join).
- Frontend `StockScanResult` type already has optional `stockName?: string` — just not displayed.
- VCP results table links stock codes to the chart page — Volume Surge should follow the same pattern using `react-router-dom`'s `Link` or `useNavigate`.
