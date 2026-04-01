# Data Model: Volume Surge Scanner Frontend

**Feature**: 009-volume-surge-frontend
**Date**: 2026-04-01

This document describes the frontend TypeScript types that need to align with backend API responses. No new database entities are created — this is a frontend-only feature.

## Existing Types (to be corrected)

### ScanSummary

Represents scan metadata. Used in history list and results header.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| scanId | `string` | Backend | UUID |
| scanDate | `string` | Backend | ISO 8601 datetime |
| scanMode | `ScanMode` | Backend | `'AUTO' \| 'MANUAL'` |
| referenceDate | `string \| null` | Backend | ISO 8601 date, null for AUTO |
| status | `ScanStatus` | Backend | `'RUNNING' \| 'COMPLETED' \| 'FAILED' \| 'CANCELLED'` |
| totalStocks | `number` | Backend | Total stocks scanned |
| matchedStocks | `number` | Backend | Stocks meeting all criteria |
| durationMs | `number \| null` | Backend | Scan duration in milliseconds |

### ScanResultDetail

Individual stock result within a scan. Extends `StockScanResult`.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| resultId | `string` | Backend | UUID |
| scanId | `string` | Backend | Foreign key to scan |
| stockCode | `string` | Backend | e.g., "600519" |
| stockName | `string` | Backend | e.g., "贵州茅台" — **currently optional, should be required** |
| contractionStartDate | `string` | Backend | ISO date |
| contractionEndDate | `string` | Backend | ISO date |
| contractionAvgVolume | `number` | Backend | |
| expansionStartDate | `string` | Backend | ISO date |
| expansionMultiplier | `number` | Backend | e.g., 2.5 = 2.5x avg contraction volume |
| volumeSupportRatio | `number` | Backend | Up-day / down-day volume ratio |
| upDayAvgVolume | `number` | Backend | |
| downDayAvgVolume | `number` | Backend | |
| ma50Value | `number` | Backend | |
| ma150Value | `number` | Backend | |
| ma50Slope | `number` | Backend | |
| ma50TrendingUp | `boolean` | Backend | |
| ma50BelowMa150 | `boolean` | Backend | |
| meetsVolumeCriteria | `boolean` | Backend | |
| meetsMaCriteria | `boolean` | Backend | |
| meetsSupportCriteria | `boolean` | Backend | |
| meetsAllCriteria | `boolean` | Backend | Composite of above three |
| createdAt | `string` | Backend | ISO datetime |

### CompareResult

Comparison output between two scans.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| scan1Summary | `ScanSummary` | Backend | |
| scan2Summary | `ScanSummary` | Backend | |
| persistentStocks | `PersistentStock[]` | Backend | Stocks in both scans |
| summary.persistentCount | `number` | Backend | |
| summary.onlyInScan1 | `number` | Backend | |
| summary.onlyInScan2 | `number` | Backend | |

### PersistentStock

A stock that appears in both compared scans.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| stockCode | `string` | Backend | |
| stockName | `string` | Backend | |
| volumeSupportRatio1 | `number` | Backend | Ratio from scan 1 |
| volumeSupportRatio2 | `number` | Backend | Ratio from scan 2 |
| trend | `'improving' \| 'declining' \| 'stable'` | Backend | Derived from ratio comparison |

## Type Corrections Required

### 1. ScanListResponse shape

**Current** (wrong):
```typescript
// Frontend type declares:
PaginatedResponse<T> = { data: T[]; pagination: {...} }
// UI reads: response.data.items
```

**Backend actually returns**:
```typescript
{ success: boolean; data: { scans: ScanSummary[]; pagination: { page, limit, total, totalPages } } }
```

**Fix**: Create a dedicated `ScanListData` interface:
```typescript
interface ScanListData {
  scans: ScanSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

### 2. stockName optionality

**Current**: `stockName?: string` (optional)
**Fix**: Make `stockName: string` (required) — backend always returns it via Stock join.

### 3. ComparisonView state typing

**Current**: `comparisonResult: any`
**Fix**: `comparisonResult: CompareResult | null`

## State Transitions

### Scan Lifecycle (frontend view)

```
[No Scan] → RUNNING → COMPLETED
                    → FAILED
                    → CANCELLED (via cancel button)
```

- When status is `RUNNING`: poll every 3s, disable "Start Scan", show progress
- When status is `COMPLETED`: stop polling, enable "Start Scan", load results
- When status is `FAILED`: stop polling, enable "Start Scan", show error message
- When status is `CANCELLED`: stop polling, enable "Start Scan", show cancellation notice
