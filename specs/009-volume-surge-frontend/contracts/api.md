# API Contract: Volume Surge Scanner (Frontend → Backend)

**Feature**: 009-volume-surge-frontend
**Date**: 2026-04-01

This document describes the existing backend API endpoints that the frontend must consume. **No backend changes are made** — this contract documents the current backend behavior for frontend alignment.

## Base Configuration

- **Shared API client baseURL**: `/api/v1` (via `VITE_API_BASE_URL` env or default)
- **Backend global prefix**: `api/v1`
- **Backend controller path**: `api/volume-surge`
- **Effective route prefix**: `/api/v1/api/volume-surge`
- **Frontend relative path prefix**: `/api/volume-surge` (appended to baseURL)

> **Note**: The double `api/` is a backend naming artifact. Frontend paths use `/api/volume-surge/...` which the shared client prepends with `/api/v1` to form the correct full URL.

## Endpoints

### POST /api/volume-surge/scan

Trigger a new volume surge scan.

**Request**:
```typescript
interface ScanRequest {
  mode: 'AUTO' | 'MANUAL';
  referenceDate?: string;  // ISO date, required when mode='MANUAL'
  source?: string;         // e.g., 'web'
}
```

**Response** (200):
```typescript
{
  success: true;
  data: { scanId: string; status: string; message: string };
}
```

**Errors**: 400 (validation), 409 (scan already running)

---

### GET /api/volume-surge/scans

List scan history with pagination.

**Query params**: `page?: number`, `limit?: number`, `status?: string`, `mode?: string`

**Response** (200):
```typescript
{
  success: true;
  data: {
    scans: ScanSummary[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}
```

---

### GET /api/volume-surge/scans/:scanId

Get single scan status/summary.

**Response** (200):
```typescript
{
  success: true;
  data: ScanSummary;
}
```

---

### GET /api/volume-surge/scans/:scanId/results

Get paginated scan results.

**Query params**: `filter?: 'all' | 'matched' | 'unmatched'`, `sortBy?: string`, `sortOrder?: 'asc' | 'desc'`, `page?: number`, `limit?: number`

**Response** (200):
```typescript
{
  success: true;
  data: {
    results: ScanResultDetail[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    summary: { totalScanned: number; matched: number; unmatched: number };
  };
}
```

---

### GET /api/volume-surge/scans/:scanId/export

Export results as CSV or Markdown.

**Query params**: `format: 'csv' | 'markdown'`, `filter?: 'all' | 'matched'`

**Response** (200):
```typescript
{
  success: true;
  data: { content: string; format: string; filename: string };
}
```

---

### POST /api/volume-surge/compare

Compare two completed scans.

**Request**:
```typescript
interface CompareRequest {
  scanId1: string;
  scanId2: string;
}
```

**Response** (200):
```typescript
{
  success: true;
  data: CompareResult;
}
```

---

### POST /api/volume-surge/scans/:scanId/cancel

Cancel a running scan.

**Response** (200):
```typescript
{
  success: true;
  data: { scanId: string; status: string; message: string };
}
```

## Error Response Shape

All error responses follow:
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```
