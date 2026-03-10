# VCP Breakout Screener - Plan

## 1. Summary

**VCP待突破股票筛选器** — Implements Mark Minervini's VCP (Volatility Contraction Pattern) theory to find stocks ready for breakout. Pre-computes daily, serves via API, displays in React frontend.

## 2. Technical Context

| Item | Value |
|------|-------|
| Language | TypeScript (strict mode) |
| Backend | NestJS 10 + Prisma ORM + SQLite |
| Frontend | React 18 + Ant Design 5 + Vite + Zustand |
| Testing | Jest (backend), Vitest (frontend) |
| Platform | Web SPA |
| Performance | <10s scan for 5000 stocks (pre-computation) |
| Key Constraints | Component-First, Test-First (TDD), TypeScript strict |

## 3. Constitution Check

| Principle | Status |
|-----------|--------|
| I. Component-First (Frontend) | [x] |
| II. TypeScript & Type Safety (strict mode) | [x] |
| III. Test-First (TDD) | [x] |
| IV. Build & Performance Standards | [x] |
| V. Observability & Debugging | [x] |

## 4. Project Structure

### Backend

- `backend/src/services/vcp/` — Core VCP logic
  - `trend-template.service.ts` — Minervini trend template checks (MA, 52-week, RS)
  - `rs-rating.service.ts` — Relative strength rating
  - `vcp-analyzer.service.ts` — VCP pattern detection
  - `vcp-scanner.service.ts` — Orchestrates scan and persistence
- `backend/src/modules/vcp/` — NestJS module
  - `vcp.controller.ts`, `vcp.service.ts`, `vcp.module.ts`
  - `dto/` — `get-vcp-scan.dto.ts`, `vcp-response.dto.ts`
- `backend/src/scripts/calculate-vcp.ts` — Daily pre-computation script

### Frontend

- `frontend/src/types/vcp.ts` — VCP types
- `frontend/src/services/vcp.service.ts` — API client
- `frontend/src/components/VcpResultTable/` — Main results table
- `frontend/src/components/TrendTemplateChecks/` — Trend template check display
- `frontend/src/components/VcpDetailPanel/` — Expanded row detail (contractions, checks)
- `frontend/src/pages/VcpScreenerPage.tsx` — VCP screener page

### Database

- `VcpScanResult` model in Prisma schema — Stores pre-computed scan results per stock/date

## 5. Complexity Tracking

| Item | Status |
|------|--------|
| None | — |
