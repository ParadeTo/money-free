# Tasks: 单股票VCP分析查询

**Feature**: 004-stock-vcp-analysis  
**Input**: Design documents from `/specs/004-stock-vcp-analysis/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vcp-analysis-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**TDD Required**: Constitution 要求 Test-First 开发，所有任务必须先写测试再实现。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- 使用 Node.js 20.x for backend, Node.js 18+ for frontend

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify Node.js versions (backend: 20.x, frontend: 18+) and switch if needed
- [ ] T002 [P] Install backend dependencies: review and update package.json if needed
- [ ] T003 [P] Install frontend dependencies: review and update package.json if needed
- [ ] T004 [P] Verify Prisma Client generation: run `npx prisma generate` in backend/
- [ ] T005 [P] Create backend test utilities in backend/tests/utils/ for mocking services

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [ ] T006 [P] Create GenerateVcpAnalysisDto in backend/src/modules/vcp/dto/generate-vcp-analysis.dto.ts
- [ ] T007 [P] Create VcpAnalysisResponseDto and related DTOs in backend/src/modules/vcp/dto/vcp-analysis-response.dto.ts
- [ ] T008 [P] Extend VcpService types in backend/src/types/vcp.ts (add VcpAnalysis, Contraction, Pullback types)
- [ ] T009 Create VcpFormatterService skeleton in backend/src/services/vcp/vcp-formatter.service.ts
- [ ] T010 Add formatter service to VcpModule providers in backend/src/modules/vcp/vcp.module.ts

### Frontend Foundation

- [ ] T011 [P] Extend VCP types in frontend/src/types/vcp.ts (add VcpAnalysis interface)
- [ ] T012 [P] Create formatter utility functions in frontend/src/utils/formatters.ts (formatPercent, formatPrice, formatVolume, formatDate)
- [ ] T013 Add VCP analysis route in frontend/src/App.tsx: `/vcp-analysis/:stockCode`
- [ ] T014 Extend VCP service in frontend/src/services/vcp.service.ts (add generateVcpAnalysis function)
- [ ] T015 Create useVcpAnalysis hook in frontend/src/hooks/useVcpAnalysis.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 快速生成单个股票的VCP分析 (Priority: P1) 🎯 MVP

**Goal**: 用户在K线图页面点击生成按钮，系统生成VCP分析报告并在新页面展示

**Independent Test**: 用户点击K线图页面的"生成VCP分析报告"按钮，系统在3秒内完成分析并在新页面展示完整报告

### Tests for User Story 1 (TDD - Write First) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Backend Tests

- [ ] T016 [P] [US1] Unit test for VcpService.generateAnalysis (cached path) in backend/src/modules/vcp/vcp.service.spec.ts
- [ ] T017 [P] [US1] Unit test for VcpService.generateAnalysis (real-time path) in backend/src/modules/vcp/vcp.service.spec.ts
- [ ] T018 [P] [US1] Unit test for VcpService error handling (stock not found) in backend/src/modules/vcp/vcp.service.spec.ts
- [ ] T019 [P] [US1] Unit test for VcpService error handling (insufficient data) in backend/src/modules/vcp/vcp.service.spec.ts
- [ ] T020 [P] [US1] E2E test for GET /api/vcp/:stockCode/analysis in backend/tests/integration/vcp-analysis.e2e.spec.ts

#### Frontend Tests

- [ ] T021 [P] [US1] Component test for VcpGenerateButton in frontend/src/components/VcpGenerateButton/index.test.tsx
- [ ] T022 [P] [US1] Component test for VcpAnalysisPage (basic render) in frontend/src/pages/VcpAnalysisPage.test.tsx
- [ ] T023 [US1] Integration test for complete flow (K线图 → 生成 → 新页面) in frontend/tests/integration/vcp-analysis-flow.test.tsx

### Backend Implementation for User Story 1

- [ ] T024 [US1] Implement VcpService.generateAnalysis() method in backend/src/modules/vcp/vcp.service.ts
  - Check cache (VcpScanResult table)
  - If forceRefresh or no cache: call VcpAnalyzerService
  - Calculate isExpired (>7 days)
  - Return VcpAnalysisResponseDto
- [ ] T025 [US1] Add GET /api/vcp/:stockCode/analysis endpoint in backend/src/modules/vcp/vcp.controller.ts
- [ ] T026 [US1] Add error handling for 404 (stock not found) and 400 (insufficient data) in backend/src/modules/vcp/vcp.controller.ts
- [ ] T027 [US1] Add structured logging for VCP analysis generation in VcpService

### Frontend Implementation for User Story 1

- [ ] T028 [P] [US1] Create VcpGenerateButton component in frontend/src/components/VcpGenerateButton/index.tsx
  - Show "生成VCP分析报告" button
  - Handle click → call generateVcpAnalysis
  - Show loading state ("生成中...")
  - On success: open new window with /vcp-analysis/:stockCode
- [ ] T029 [P] [US1] Create VcpGenerateButton styles in frontend/src/components/VcpGenerateButton/styles.module.css
- [ ] T030 [US1] Integrate VcpGenerateButton into KLineChartPage in frontend/src/pages/KLineChartPage.tsx
- [ ] T031 [P] [US1] Create VcpAnalysisPage skeleton in frontend/src/pages/VcpAnalysisPage.tsx
  - Use useParams to get stockCode
  - Use useVcpAnalysis hook to fetch data
  - Show loading, error, and success states
- [ ] T032 [P] [US1] Create VcpAnalysisHeader component in frontend/src/components/VcpAnalysisHeader/index.tsx
  - Display stock code, stock name, scan date
  - Display expired warning if isExpired
- [ ] T033 [US1] Integrate VcpAnalysisHeader into VcpAnalysisPage

**Checkpoint**: User Story 1 完成 - 用户可以生成VCP分析并查看基本信息

---

## Phase 4: User Story 2 - 查看收缩阶段详细信息 (Priority: P2)

**Goal**: 系统展示每个收缩阶段的高点、低点、幅度、持续时间和平均成交量

**Independent Test**: 查询一只有多个收缩阶段的股票，系统按时间顺序列出所有收缩阶段，显示完整统计数据

### Tests for User Story 2 (TDD - Write First) ⚠️

- [ ] T034 [P] [US2] Component test for ContractionList in frontend/src/components/ContractionList/index.test.tsx
- [ ] T035 [P] [US2] Test contraction data formatting in ContractionList.test.tsx

### Backend Implementation for User Story 2

- [ ] T036 [US2] Ensure VcpService.generateAnalysis includes contractions[] in response (should already exist from US1)
- [ ] T037 [US2] Add contraction-specific formatting logic in VcpFormatterService

### Frontend Implementation for User Story 2

- [ ] T038 [P] [US2] Create ContractionList component in frontend/src/components/ContractionList/index.tsx
  - Display all contractions in table/card format
  - Show: 序号, 期间(日期范围), 高点, 低点, 幅度(%), 持续天数, 平均成交量
  - Highlight decreasing contraction depths
- [ ] T039 [P] [US2] Create ContractionList styles in frontend/src/components/ContractionList/styles.module.css
- [ ] T040 [US2] Integrate ContractionList into VcpAnalysisPage

**Checkpoint**: User Story 2 完成 - 用户可以查看详细的收缩阶段信息

---

## Phase 5: User Story 3 - 查看回调阶段分析 (Priority: P2)

**Goal**: 系统展示回调阶段的高点、低点、回调幅度、持续时间，标注当前回调状态

**Independent Test**: 查询一只正在回调的股票，系统显示当前回调状态和完整回调数据

### Tests for User Story 3 (TDD - Write First) ⚠️

- [ ] T041 [P] [US3] Component test for PullbackList in frontend/src/components/PullbackList/index.test.tsx
- [ ] T042 [P] [US3] Test pullback status calculation (正在回调中, N天前到达最低点) in PullbackList.test.tsx

### Backend Implementation for User Story 3

- [ ] T043 [US3] Ensure VcpService.generateAnalysis includes pullbacks[] with daysSinceLow in response
- [ ] T044 [US3] Add pullback-specific formatting logic in VcpFormatterService

### Frontend Implementation for User Story 3

- [ ] T045 [P] [US3] Create PullbackList component in frontend/src/components/PullbackList/index.tsx
  - Display all pullbacks in table/card format
  - Show: 序号, 期间, 高点, 低点, 幅度(%), 持续天数, 是否在上升趋势中, 距最低点天数
  - Highlight active pullbacks (daysSinceLow <= 5)
  - Show status: 🔴 正在回调中 / 🟡 N天前到达最低点 / 🟢 回调结束
- [ ] T046 [P] [US3] Create PullbackList styles in frontend/src/components/PullbackList/styles.module.css
- [ ] T047 [US3] Integrate PullbackList into VcpAnalysisPage

**Checkpoint**: User Story 3 完成 - 用户可以查看详细的回调阶段信息

---

## Phase 6: User Story 4 - 查看趋势模板和RS评分 (Priority: P3)

**Goal**: 系统显示趋势模板检查结果和RS评分

**Independent Test**: 查询任意股票，系统显示趋势模板状态和RS评分数值

### Tests for User Story 4 (TDD - Write First) ⚠️

- [ ] T048 [P] [US4] Component test for TrendTemplateSummary in frontend/src/components/TrendTemplateSummary/index.test.tsx

### Backend Implementation for User Story 4

- [ ] T049 [US4] Ensure VcpService.generateAnalysis includes trendTemplate and summary.rsRating in response
- [ ] T050 [US4] Add trend template formatting logic in VcpFormatterService

### Frontend Implementation for User Story 4

- [ ] T051 [P] [US4] Create TrendTemplateSummary component in frontend/src/components/TrendTemplateSummary/index.tsx
  - Display trend template pass/fail status
  - List all trend template checks with pass/fail icons
  - Display RS rating with visual indicator (0-100 progress bar)
  - Display 52周高低点距离
- [ ] T052 [P] [US4] Create TrendTemplateSummary styles in frontend/src/components/TrendTemplateSummary/styles.module.css
- [ ] T053 [US4] Integrate TrendTemplateSummary into VcpAnalysisPage

**Checkpoint**: User Story 4 完成 - 用户可以查看趋势模板和RS评分

---

## Phase 7: User Story 5 - 查看最近K线数据 (Priority: P3)

**Goal**: 系统显示最近10天的K线数据表格

**Independent Test**: 查询任意股票，系统在分析结果下方显示最近10天的K线数据表格

### Tests for User Story 5 (TDD - Write First) ⚠️

- [ ] T054 [P] [US5] Component test for KLineDataTable in frontend/src/components/KLineDataTable/index.test.tsx
- [ ] T055 [P] [US5] Test K-line data formatting (涨绿跌红, 千位分隔符) in KLineDataTable.test.tsx

### Backend Implementation for User Story 5

- [ ] T056 [US5] Ensure VcpService.generateAnalysis includes klines[] (last 10 days) with changePct in response
- [ ] T057 [US5] Add K-line formatting logic in VcpFormatterService

### Frontend Implementation for User Story 5

- [ ] T058 [P] [US5] Create KLineDataTable component in frontend/src/components/KLineDataTable/index.tsx
  - Display K-line data in table format
  - Columns: 日期, 开盘, 最高, 最低, 收盘, 涨跌幅(%), 成交量(手)
  - Color涨跌幅: 正数绿色, 负数红色
  - Use formatters.ts for number formatting
- [ ] T059 [P] [US5] Create KLineDataTable styles in frontend/src/components/KLineDataTable/styles.module.css
- [ ] T060 [US5] Integrate KLineDataTable into VcpAnalysisPage
- [ ] T061 [US5] Add "查看更多K线" button to expand to 30/60 days (optional enhancement)

**Checkpoint**: User Story 5 完成 - 用户可以查看最近K线数据

---

## Phase 8: Command-Line Script (Priority: P1 - MVP Feature)

**Goal**: 提供命令行脚本支持，输出格式化的中文文本报告

**Independent Test**: 运行 `npm run generate-vcp-analysis 605117` 输出完整的中文VCP分析报告

### Tests for Command-Line Script (TDD - Write First) ⚠️

- [ ] T062 [P] Unit test for VcpFormatterService.formatToText() in backend/src/services/vcp/vcp-formatter.service.spec.ts
- [ ] T063 [P] Test script execution with valid stock code (mock test)
- [ ] T064 [P] Test script error handling (invalid stock, insufficient data)

### Implementation for Command-Line Script

- [ ] T065 [P] Implement VcpFormatterService.formatToText() in backend/src/services/vcp/vcp-formatter.service.ts
  - Format header (股票名称, 代码)
  - Format summary section
  - Format contractions table
  - Format pullbacks table
  - Format K-line data table
  - Format trend template checks
  - Use box-drawing characters for visual appeal
- [ ] T066 [P] Implement VcpFormatterService helper methods (formatContractionTable, formatPullbackTable, formatKLineTable)
- [ ] T067 Create command-line script in backend/src/scripts/generate-vcp-analysis.ts
  - Parse command-line arguments (stockCode)
  - Create NestJS ApplicationContext
  - Call VcpService.generateAnalysis()
  - Call VcpFormatterService.formatToText()
  - Output to console
  - Handle errors gracefully with Chinese messages
- [ ] T068 Add npm script "generate-vcp-analysis" in backend/package.json
- [ ] T069 Test script manually: `cd backend && npm run generate-vcp-analysis 605117`

**Checkpoint**: Command-line script完成 - 用户可以通过终端生成VCP分析报告

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Error Handling & Edge Cases

- [ ] T070 [P] Add error boundary in VcpAnalysisPage to catch component errors in frontend/src/pages/VcpAnalysisPage.tsx
- [ ] T071 [P] Add retry button for failed VCP analysis generation in VcpAnalysisPage
- [ ] T072 [P] Add "正在生成中，请稍候" protection in VcpGenerateButton to prevent duplicate submissions
- [ ] T073 [P] Add loading progress indicator in VcpAnalysisPage (optional)

### Performance & Optimization

- [ ] T074 [P] Implement lazy loading for VcpAnalysisPage in frontend/src/App.tsx using React.lazy()
- [ ] T075 [P] Add React Query caching configuration (staleTime: 7 days) in useVcpAnalysis hook
- [ ] T076 [P] Add response time logging in VcpService.generateAnalysis()

### Documentation & Testing

- [ ] T077 [P] Update API documentation in backend Swagger (add VCP analysis endpoint examples)
- [ ] T078 [P] Add usage examples to quickstart.md based on implementation
- [ ] T079 [P] Run all tests and ensure 100% pass rate: `npm run test` (backend and frontend)
- [ ] T080 [P] Run linter and fix any issues: `npm run lint` (backend and frontend)

### Manual Testing Checklist

- [ ] T081 Manual test: 生成VCP分析报告 (P1功能)
- [ ] T082 Manual test: 查看收缩阶段详情 (P2功能)
- [ ] T083 Manual test: 查看回调阶段详情 (P2功能)
- [ ] T084 Manual test: 查看趋势模板和RS评分 (P3功能)
- [ ] T085 Manual test: 查看K线数据表格 (P3功能)
- [ ] T086 Manual test: 命令行脚本生成报告
- [ ] T087 Manual test: 边界情况 (股票不存在, 数据不足, 过期数据)
- [ ] T088 Manual test: 性能测试 (响应时间 < 3秒)

**Checkpoint**: All features polished and production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Command-Line Script (Phase 8)**: Can start after Foundational + Backend US1 (VcpService.generateAnalysis)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: Can start after Foundational - Extends US1 VcpAnalysisPage
- **User Story 3 (P2)**: Can start after Foundational - Extends US1 VcpAnalysisPage
- **User Story 4 (P3)**: Can start after Foundational - Extends US1 VcpAnalysisPage
- **User Story 5 (P3)**: Can start after Foundational - Extends US1 VcpAnalysisPage
- **Command-Line Script**: Depends on US1 backend (VcpService + VcpFormatterService)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD requirement)
- Backend tests before backend implementation
- Frontend tests before frontend implementation
- Backend implementation before frontend implementation (API must exist for UI to call)
- Core component before integration into page
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All tasks marked [P] can run in parallel
- **Phase 2**: All tasks marked [P] can run in parallel (within foundational)
- **Phase 3-7**: 
  - All test tasks marked [P] within a story can run in parallel
  - All implementation tasks marked [P] within a story can run in parallel
  - Different user stories can be worked on in parallel by different team members
- **Phase 8**: All tasks marked [P] can run in parallel
- **Phase 9**: All tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Backend Tests (run in parallel):
Task: "Unit test for VcpService.generateAnalysis (cached)"
Task: "Unit test for VcpService.generateAnalysis (real-time)"
Task: "Unit test for error handling (stock not found)"
Task: "E2E test for GET /api/vcp/:stockCode/analysis"

# Frontend Tests (run in parallel):
Task: "Component test for VcpGenerateButton"
Task: "Component test for VcpAnalysisPage"

# Frontend Components (after tests, run in parallel):
Task: "Create VcpGenerateButton component"
Task: "Create VcpGenerateButton styles"
Task: "Create VcpAnalysisPage skeleton"
Task: "Create VcpAnalysisHeader component"
```

---

## Implementation Strategy

### MVP First (User Story 1 + Command-Line Script Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (core VCP analysis generation + basic UI)
4. Complete Phase 8: Command-Line Script
5. **STOP and VALIDATE**: Test US1 + script independently
6. Deploy/demo if ready (MVP = 生成VCP分析报告 + 命令行脚本)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + Command-Line Script → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (收缩阶段详情) → Test independently → Deploy/Demo
4. Add User Story 3 (回调阶段详情) → Test independently → Deploy/Demo
5. Add User Stories 4 & 5 (趋势模板/K线) → Test independently → Deploy/Demo
6. Polish & optimize → Final production release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Backend + Frontend core)
   - **Developer B**: Command-Line Script (depends on US1 backend)
   - **Developer C**: User Story 2 (parallel to US1 if possible)
3. After US1 MVP:
   - **Developer A**: User Story 3
   - **Developer B**: User Story 4
   - **Developer C**: User Story 5
4. All: Polish phase together

---

## Task Statistics

- **Total Tasks**: 88
- **Setup**: 5 tasks
- **Foundational**: 10 tasks
- **User Story 1 (P1)**: 18 tasks (7 tests + 11 implementation)
- **User Story 2 (P2)**: 7 tasks (2 tests + 5 implementation)
- **User Story 3 (P2)**: 7 tasks (2 tests + 5 implementation)
- **User Story 4 (P3)**: 6 tasks (1 test + 5 implementation)
- **User Story 5 (P3)**: 8 tasks (2 tests + 6 implementation)
- **Command-Line Script**: 8 tasks (3 tests + 5 implementation)
- **Polish**: 19 tasks

**Parallel Tasks**: 56 tasks marked [P] can run in parallel (within their phase)

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 + Phase 8 = 41 tasks (Setup + Foundational + US1 + Script)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD is mandatory: Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend must use Node.js 20.x, frontend uses Node.js 18+
- All UI text must use Chinese (FR-013)
- All number formatting must follow Chinese conventions (FR-014)
