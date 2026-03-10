# Tasks: VCP 待突破股票筛选器

**Input**: Design documents from `/specs/002-vcp-breakout-screener/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vcp-api.md, quickstart.md

**Tests**: Included per Constitution (Test-First, TDD mandatory). Tests written first, must fail before implementation.

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Database schema changes and shared type definitions

- [X] T001 Add VcpScanResult model to Prisma schema and add vcpScanResults relation to Stock model in `backend/prisma/schema.prisma`
- [X] T002 Run Prisma migration to create vcp_scan_results table: `npx prisma migrate dev --name add-vcp-scan-results` in `backend/`
- [X] T003 [P] Create VCP shared TypeScript type definitions (VcpScanItem, VcpScanResponse, VcpScanQuery, TrendTemplateCheck, Contraction, VcpDetailResponse) in `frontend/src/types/vcp.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend core algorithms and API infrastructure. MUST complete before any user story.

**⚠️ CRITICAL**: All user stories depend on pre-computed VCP data. This phase builds the computation pipeline and API module.

### Tests (TDD — write first, verify they fail)

- [X] T004 [P] Write unit tests for TrendTemplateService in `backend/src/services/vcp/trend-template.service.spec.ts`
- [X] T005 [P] Write unit tests for RsRatingService in `backend/src/services/vcp/rs-rating.service.spec.ts`
- [X] T006 [P] Write unit tests for VcpAnalyzerService in `backend/src/services/vcp/vcp-analyzer.service.spec.ts`
- [X] T007 [P] Write unit tests for VcpScannerService in `backend/src/services/vcp/vcp-scanner.service.spec.ts`

### Implementation

- [X] T008 [P] Implement TrendTemplateService in `backend/src/services/vcp/trend-template.service.ts`
- [X] T009 [P] Implement RsRatingService in `backend/src/services/vcp/rs-rating.service.ts`
- [X] T010 [P] Implement VcpAnalyzerService in `backend/src/services/vcp/vcp-analyzer.service.ts`
- [X] T011 Implement VcpScannerService in `backend/src/services/vcp/vcp-scanner.service.ts`
- [X] T012 [P] Create VCP DTOs in `backend/src/modules/vcp/dto/`
- [X] T013 Implement VcpService in `backend/src/modules/vcp/vcp.service.ts`
- [X] T014 Implement VcpController in `backend/src/modules/vcp/vcp.controller.ts`
- [X] T015 Create VcpModule in `backend/src/modules/vcp/vcp.module.ts`
- [X] T016 Register VcpModule in AppModule in `backend/src/app.module.ts`
- [X] T017 Create calculate-vcp batch script in `backend/src/scripts/calculate-vcp.ts`

---

## Phase 3: User Story 1 — 一键筛选 VCP 待突破股票 (Priority: P1) 🎯 MVP

### Tests (TDD)

- [X] T018 [P] [US1] Write component test for VcpResultTable in `frontend/src/components/VcpResultTable/VcpResultTable.test.tsx`
- [X] T019 [P] [US1] Write service test for vcp.service in `frontend/src/services/vcp.service.test.ts`

### Implementation

- [X] T020 [P] [US1] Implement VCP API service in `frontend/src/services/vcp.service.ts`
- [X] T021 [US1] Implement VcpResultTable component in `frontend/src/components/VcpResultTable/`
- [X] T022 [US1] Implement VcpScreenerPage in `frontend/src/pages/VcpScreenerPage.tsx`
- [X] T023 [US1] Add VCP route and navigation in `frontend/src/App.tsx` and `frontend/src/components/Layout/MainLayout.tsx`

---

## Phase 4: User Story 2 — 查看 VCP 形态详情 (Priority: P2)

### Tests (TDD)

- [X] T024 [P] [US2] Write component test for TrendTemplateChecks in `frontend/src/components/TrendTemplateChecks/TrendTemplateChecks.test.tsx`
- [X] T025 [P] [US2] Write component test for VcpDetailPanel in `frontend/src/components/VcpDetailPanel/VcpDetailPanel.test.tsx`

### Implementation

- [X] T026 [P] [US2] Implement TrendTemplateChecks component in `frontend/src/components/TrendTemplateChecks/`
- [X] T027 [US2] Implement VcpDetailPanel component in `frontend/src/components/VcpDetailPanel/`
- [X] T028 [US2] Integrate VcpDetailPanel with VcpResultTable

---

## Phase 5: User Story 3 — 加入自选跟踪 (Priority: P3)

### Tests (TDD)

- [X] T029 [P] [US3] Write component test for FavoriteButton integration in `frontend/src/components/VcpResultTable/FavoriteIntegration.test.tsx`

### Implementation

- [X] T030 [US3] Add FavoriteButton to VcpResultTable in `frontend/src/pages/VcpScreenerPage.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 [P] Add structured logging to VcpScannerService
- [X] T032 [P] Handle edge cases in VcpAnalyzerService / VcpScannerService
- [X] T033 [P] Add Swagger API documentation to VcpController
- [X] T034 Add calculate-vcp script to batch update pipeline in `backend/src/scripts/batch-incremental-update-latest.ts`
- [X] T035 Run quickstart.md validation: backend compiles, frontend builds, all tests pass, "VCP 筛选" in navigation

---

## Implementation Status

All 35 tasks complete. 39 backend tests + 22 frontend tests = **61 total tests passing**.
