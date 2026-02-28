# Tasks: 股票分析工具

**Input**: Design documents from `/specs/001-stock-analysis-tool/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-spec.md

**Tests**: Tests are REQUIRED per Constitution (Test-First principle). Each user story includes tests that MUST be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Technology Stack**:

- **Backend**: Node.js 18+, Nest.js 10+, Prisma 5+, SQLite, Bull + Redis, TypeScript strict mode
- **Python Bridge**: Python 3.11+, pandas-ta, AkShare (for backup data source)
- **Frontend**: React 18+, TypeScript, Vite, TradingView Lightweight Charts, Ant Design, Zustand

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2...)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create monorepo project structure with backend/, frontend/, bridge/, data/ directories
- [x] T002 Initialize Nest.js backend project in backend/ with TypeScript strict mode and ESLint
- [x] T003 [P] Initialize React + Vite frontend project in frontend/ with TypeScript and ESLint
- [x] T004 [P] Create Python virtual environment in bridge/ and setup requirements.txt (pandas, akshare, tushare) - Python 3.11.14
- [x] T005 [P] Create Prisma schema file at backend/prisma/schema.prisma with all 9 entities from data-model.md
- [x] T006 [P] Setup Jest testing framework in backend/test/ with unit/ and integration/ subdirectories
- [x] T007 [P] Setup Vitest and React Testing Library in frontend/tests/ with components/ and pages/ subdirectories
- [x] T008 [P] Create .env.example files for backend (DATABASE_URL, JWT_SECRET, TUSHARE_TOKEN, REDIS_URL, CORS_ORIGIN)
- [x] T009 [P] Create docker-compose.yml with services for backend, frontend, redis, and optional python-bridge-service
- [x] T010 [P] Create data/.gitkeep (SQLite database will be stored here, excluded from git)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation ✅

- [x] T011 Run Prisma migration to create SQLite database at data/stocks.db with all tables
- [x] T012 Enable SQLite WAL mode and performance optimizations in backend/src/config/database.config.ts
- [x] T013 [P] Create backend/src/common/decorators/ with custom decorators for validation
- [x] T014 [P] Create backend/src/common/filters/http-exception.filter.ts for global error handling
- [x] T015 [P] Create backend/src/common/interceptors/logging.interceptor.ts for request/response logging
- [x] T016 [P] Create backend/src/common/pipes/validation.pipe.ts with class-validator integration
- [x] T017 Create backend/src/config/swagger.config.ts for API documentation generation
- [x] T018 [P] Create backend/src/services/python-bridge/python-bridge.service.ts with execute() method for child_process
- [x] T019 [P] Create bridge/calculate_kdj.py Python script for KDJ calculation (receives JSON via stdin, outputs JSON)
- [x] T020 [P] Create bridge/akshare_fetcher.py Python script for AkShare data retrieval
- [x] T021 Test Python Bridge integration by calling calculate_kdj.py from Node.js in backend/test/unit/test_python_bridge.spec.ts

### Frontend Foundation

- [x] T022 [P] Create frontend/src/services/api.ts with Axios instance and JWT interceptor
- [x] T023 [P] Create frontend/src/types/ directory with all TypeScript interfaces from contracts/api-spec.md
- [x] T024 [P] Create frontend/src/store/auth.store.ts using Zustand for authentication state
- [x] T025 [P] Create frontend/src/components/common/ErrorBoundary.tsx for React error handling
- [x] T026 [P] Setup React Router in frontend/src/App.tsx with protected route wrapper
- [x] T027 [P] Create frontend/src/styles/theme.ts with Ant Design customization
- [x] T028 [P] Create frontend/src/utils/constants.ts with API endpoints and configuration

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 0 - 用户登录 (Priority: P0)

**Goal**: Implement admin authentication so users can access all features requiring persistence (favorites, strategies, drawings)

**Independent Test**: Enter correct/incorrect credentials to verify login flow, check session persistence after refresh

### US0 Tests ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T029 [P] [US0] Unit test for JWT strategy in backend/test/unit/test_jwt_strategy.spec.ts
- [x] T030 [P] [US0] Integration test for POST /auth/login endpoint in backend/test/integration/test_auth.spec.ts
- [x] T031 [P] [US0] Integration test for GET /auth/me endpoint with valid/invalid tokens
- [x] T032 [P] [US0] Component test for LoginPage in frontend/tests/pages/LoginPage.test.tsx

### US0 Backend Implementation

- [x] T033 [P] [US0] Create User model migration and seed admin user (username: admin, password: bcrypt hashed) using backend/src/scripts/seed.ts
- [x] T034 [P] [US0] Create backend/src/modules/auth/dto/login.dto.ts with class-validator decorators
- [x] T035 [P] [US0] Create backend/src/modules/auth/jwt.strategy.ts for JWT validation
- [x] T036 [US0] Implement backend/src/modules/auth/auth.service.ts with login(), validateUser(), generateToken() methods
- [x] T037 [US0] Implement backend/src/modules/auth/auth.controller.ts with POST /auth/login and GET /auth/me endpoints
- [x] T038 [P] [US0] Create backend/src/common/guards/jwt-auth.guard.ts to protect authenticated routes
- [x] T039 [US0] Register AuthModule in backend/src/app.module.ts with JWT configuration

### US0 Frontend Implementation

- [x] T040 [P] [US0] Create frontend/src/services/auth.service.ts with login(), logout(), getMe() API calls
- [x] T041 [P] [US0] Create frontend/src/types/auth.ts with User and LoginResponse interfaces (已在 types/index.ts 中实现)
- [x] T042 [P] [US0] Create frontend/src/hooks/useAuth.ts hook for authentication logic
- [x] T043 [US0] Implement frontend/src/pages/LoginPage.tsx with Ant Design Form component
- [x] T044 [US0] Create frontend/src/components/common/ProtectedRoute.tsx wrapper component (已在 Phase 2 完成)
- [x] T045 [US0] Update frontend/src/App.tsx to add /login route and protected route logic
- [x] T046 [US0] Implement token storage in localStorage and auto-logout on 401 responses in frontend/src/services/api.ts (已在 Phase 2 完成)

**Checkpoint**: ✅ User can log in, session persists, protected routes redirect to login

**Additional**: Stocks API implemented (search, detail), 5 test stocks added to database

---

## Phase 4: User Story 1 - 查看K线图和技术指标 (Priority: P1) 🎯 MVP

**Goal**: Display stock K-line charts with technical indicators (MA, KDJ, RSI, Volume, Amount, 52-week markers) for investment analysis

**Independent Test**: Search for any stock (e.g., "600519"), verify K-line chart loads with at least one indicator visible

### US1 Tests ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T047 [P] [US1] Unit test for TechnicalIndicatorsService in backend/test/unit/test_technical_indicators.spec.ts
- [ ] T048 [P] [US1] Integration test for GET /stocks/search endpoint in backend/test/integration/test_stocks.spec.ts
- [ ] T049 [P] [US1] Integration test for GET /klines/:stockCode endpoint in backend/test/integration/test_klines.spec.ts
- [ ] T050 [P] [US1] Integration test for GET /indicators/:stockCode endpoint in backend/test/integration/test_indicators.spec.ts
- [ ] T051 [P] [US1] Component test for StockSearch component in frontend/tests/components/StockSearch.test.tsx
- [ ] T052 [P] [US1] Component test for KLineChart component in frontend/tests/components/KLineChart.test.tsx
- [ ] T053 [P] [US1] Page test for KLineChartPage in frontend/tests/pages/KLineChartPage.test.tsx

### US1 Backend Implementation - Data Models

- [ ] T054 [P] [US1] Verify Stock entity exists in backend/prisma/schema.prisma (already created in T005)
- [ ] T055 [P] [US1] Verify KLineData entity exists in backend/prisma/schema.prisma
- [ ] T056 [P] [US1] Verify TechnicalIndicator entity exists in backend/prisma/schema.prisma

### US1 Backend Implementation - Data Scripts

- [ ] T057 [US1] Create backend/src/scripts/init-stocks.ts to fetch ~1000 admitted stocks from Tushare and insert into database
- [ ] T058 [US1] Create backend/src/scripts/fetch-klines.ts to download 20 years of daily/weekly K-line data (supports --stocks, --start-date, --end-date params)
- [ ] T059 [US1] Create backend/src/scripts/calculate-indicators.ts to compute all 5 indicator types for all stocks

### US1 Backend Implementation - Services

- [ ] T060 [P] [US1] Create backend/src/services/datasource/tushare.service.ts with getDailyKLine() using HTTP API (axios)
- [ ] T061 [P] [US1] Create backend/src/services/datasource/akshare.service.ts calling bridge/akshare_fetcher.py via PythonBridgeService
- [ ] T062 [US1] Create backend/src/services/datasource/datasource-manager.service.ts with fallback logic (Tushare → AkShare)
- [ ] T063 [P] [US1] Create backend/src/services/indicators/technical-indicators.service.ts with calculateMA(), calculateKDJ(), calculateRSI() using technicalindicators npm library
- [ ] T064 [US1] Implement backend/src/modules/stocks/stocks.service.ts with search(), getStockDetail() methods
- [ ] T065 [US1] Implement backend/src/modules/klines/klines.service.ts with getKLineData() method (fetches from database)
- [ ] T066 [US1] Implement backend/src/modules/indicators/indicators.service.ts with getIndicators() method (fetches pre-calculated indicators from database)

### US1 Backend Implementation - Controllers & DTOs

- [ ] T067 [P] [US1] Create backend/src/modules/stocks/dto/search-stock.dto.ts with query validation
- [ ] T068 [P] [US1] Create backend/src/modules/klines/dto/get-klines.dto.ts with period, startDate, endDate validation
- [ ] T069 [P] [US1] Create backend/src/modules/indicators/dto/get-indicators.dto.ts with indicators[] array validation
- [ ] T070 [US1] Implement backend/src/modules/stocks/stocks.controller.ts with GET /stocks/search and GET /stocks/:stockCode
- [ ] T071 [US1] Implement backend/src/modules/klines/klines.controller.ts with GET /klines/:stockCode
- [ ] T072 [US1] Implement backend/src/modules/indicators/indicators.controller.ts with GET /indicators/:stockCode and GET /indicators/:stockCode/week52-markers
- [ ] T073 [US1] Register StocksModule, KLinesModule, IndicatorsModule in backend/src/app.module.ts

### US1 Frontend Implementation - Services

- [x] T074 [P] [US1] Create frontend/src/types/stock.ts with Stock, KLineData, IndicatorValues interfaces
- [x] T075 [P] [US1] Create frontend/src/services/stock.service.ts with searchStocks(), getStockDetail() methods
- [x] T076 [P] [US1] Create frontend/src/services/kline.service.ts with getKLineData() method
- [x] T077 [P] [US1] Create frontend/src/services/indicator.service.ts with getIndicators(), get52WeekMarkers() methods

### US1 Frontend Implementation - Components

- [x] T078 [P] [US1] Create frontend/src/components/StockSearch/index.tsx with debounced search input using Ant Design AutoComplete
- [x] T079 [P] [US1] Create frontend/src/hooks/useKLineData.ts hook to fetch and manage K-line data state
- [x] T080 [P] [US1] Create frontend/src/hooks/useIndicators.ts hook to fetch and manage indicator data state
- [x] T081 [US1] Use frontend-design skill to design KLineChartPage layout (search bar + chart + indicator selector + period toggle)
- [x] T082 [US1] Create frontend/src/components/KLineChart/index.tsx integrating TradingView Lightweight Charts library
- [x] T083 [US1] Implement MA overlay rendering in KLineChart component (MA50/150/200 for daily, MA10/30/40 for weekly)
- [x] T084 [US1] Implement KDJ subchart rendering in KLineChart component (K, D, J lines)
- [x] T085 [US1] Implement RSI subchart rendering in KLineChart component
- [x] T086 [US1] Implement Volume subchart with 52-week MA overlay
- [x] T087 [US1] Implement Amount subchart with 52-week MA overlay
- [x] T088 [US1] Implement 52-week high/low markers as annotations on main chart
- [x] T089 [P] [US1] Create frontend/src/components/IndicatorSelector/index.tsx with checkboxes for MA, KDJ, RSI, Volume, Amount
- [x] T090 [P] [US1] Create frontend/src/components/PeriodToggle/index.tsx with radio buttons for Daily/Weekly
- [x] T091 [US1] Create frontend/src/store/chart.store.ts with Zustand to manage selected indicators, period, zoom state

### US1 Frontend Implementation - Page Integration

- [x] T092 [US1] Implement frontend/src/pages/KLineChartPage.tsx integrating StockSearch, KLineChart, IndicatorSelector, PeriodToggle components
- [x] T093 [US1] Add /chart/:stockCode route in frontend/src/App.tsx
- [x] T094 [US1] Implement chart interaction handlers (zoom, pan) with <300ms response time
- [x] T095 [US1] Add error handling for stock not found and data load failures

**Checkpoint**: MVP is functional - users can search stocks and view charts with indicators

---

## Phase 5: User Story 5 - 手动触发数据更新 (Priority: P2)

**Goal**: Allow users to manually trigger incremental data updates with real-time progress tracking and error logging

**Independent Test**: Click "Update Data" button, observe progress from 0% to 100%, check success/failure summary and error logs

### US5 Tests ⚠️

- [x] T096 [P] [US5] Unit test for DataUpdateService.triggerIncrementalUpdate() in backend/test/unit/test_data_update.spec.ts
- [x] T097 [P] [US5] Unit test for async task status management in backend/test/unit/test_async_tasks.spec.ts
- [x] T098 [P] [US5] Unit test for error retry logic in backend/test/unit/test_data_update.spec.ts
- [x] T099 [P] [US5] Integration test for POST /data/update endpoint in backend/test/integration/test_data_update.spec.ts
- [x] T100 [P] [US5] Integration test for GET /data/update/:taskId/status endpoint
- [x] T101 [P] [US5] Integration test for GET /data/update/history endpoint
- [ ] T102 [P] [US5] Component test for UpdateButton in frontend/tests/components/UpdateButton.test.tsx
- [ ] T103 [P] [US5] Component test for UpdateProgress with 2s polling in frontend/tests/components/UpdateProgress.test.tsx
- [ ] T104 [P] [US5] Page test for DataManagementPage in frontend/tests/pages/DataManagementPage.test.tsx

### US5 Backend Implementation - Task Queue

- [x] T105 [US5] Choose async task system: Install @nestjs/bull and bull packages, configure Redis connection in backend/src/config/queue.config.ts
- [x] T106 [US5] Verify UpdateLog entity exists in backend/prisma/schema.prisma (already created in T005)
- [x] T107 [US5] Create backend/src/modules/data-update/processors/data-update.processor.ts implementing @Process('incremental-update') with job.progress() updates

### US5 Backend Implementation - Services

- [x] T108 [US5] Enhance backend/src/scripts/fetch-klines.ts to support incremental mode: query max(date) from KLineData, only fetch dates > last update
- [x] T109 [US5] Enhance backend/src/scripts/calculate-indicators.ts to accept stock_codes[] parameter for selective recalculation
- [x] T110 [US5] Create backend/src/modules/data-update/data-update.service.ts with triggerIncrementalUpdate(), getUpdateStatus(), getUpdateHistory(), retryFailedStocks() methods
- [x] T111 [US5] Implement error handling: catch per-stock failures, record to UpdateLog.errorDetails as JSON array, auto-retry once, continue processing

### US5 Backend Implementation - Controllers

- [x] T112 [P] [US5] Create backend/src/modules/data-update/dto/update-status-response.dto.ts
- [x] T113 [US5] Implement backend/src/modules/data-update/data-update.controller.ts with POST /data/update, GET /data/update/:taskId/status, GET /data/update/history, GET /data/update/:taskId/logs endpoints
- [x] T114 [US5] Add conflict handling: if update task already running, return 409 with current progress
- [x] T115 [US5] Register DataUpdateModule in backend/src/app.module.ts with BullModule.registerQueue()

### US5 Backend Implementation - Scheduler

- [x] T116 [US5] Create backend/src/jobs/scheduler.service.ts with @Cron('0 17 \* \* \*') decorator to trigger daily update at 5 PM
- [x] T117 [US5] Add structured logging for all update operations (trigger, progress, completion, failures)

### US5 Frontend Implementation - Services

- [ ] T118 [P] [US5] Create frontend/src/types/update.ts with UpdateStatus, UpdateLog interfaces
- [ ] T119 [P] [US5] Create frontend/src/services/update.service.ts with triggerUpdate(), getUpdateStatus(), getUpdateHistory(), getUpdateLogs() methods
- [ ] T120 [US5] Create frontend/src/hooks/useUpdatePolling.ts hook with 2-second interval polling, auto-stop when status is completed/failed

### US5 Frontend Implementation - Components

- [ ] T121 [US5] Use frontend-design skill to design DataManagementPage layout (last update time, update button, progress area, history table)
- [ ] T122 [US5] Create frontend/src/components/UpdateButton/index.tsx showing "Last updated: YYYY-MM-DD HH:mm", disable when update running or <1 min since last update
- [ ] T123 [US5] Create frontend/src/components/UpdateProgress/index.tsx with Ant Design Progress bar, real-time stats "Updating 500/1000 stocks", success/failure counters
- [ ] T124 [US5] Create frontend/src/components/UpdateHistory/index.tsx with Ant Design Table showing past updates with "View Logs" button per row
- [ ] T125 [US5] Create frontend/src/components/UpdateLogModal/index.tsx with Ant Design Modal displaying errorDetails in filterable table format
- [ ] T126 [US5] Create frontend/src/store/update.store.ts with Zustand to manage current task, polling state

### US5 Frontend Implementation - Page Integration

- [ ] T127 [US5] Implement frontend/src/pages/DataManagementPage.tsx integrating UpdateButton, UpdateProgress, UpdateHistory components
- [ ] T128 [US5] Add /data-management route in frontend/src/App.tsx with React.lazy() for code splitting
- [ ] T129 [US5] Implement useUpdatePolling hook activation when task starts, cleanup on component unmount
- [ ] T130 [US5] Add notification display when update completes showing "Success X, Failed Y" summary
- [ ] T131 [US5] Ensure K-line chart page does NOT auto-refresh after update (user must manually refresh browser or re-search stock)

**Checkpoint**: Data update feature complete with progress tracking and error handling

---

## Phase 6: User Story 2 - 技术指标筛选股票 (Priority: P2)

**Goal**: Filter stocks based on technical indicator conditions (e.g., RSI < 30, KDJ golden cross) to discover investment opportunities

**Independent Test**: Set one filter condition (e.g., "RSI < 30"), verify system returns matching stock list (max 100)

### US2 Tests ⚠️

- [ ] T132 [P] [US2] Unit test for ScreenerService.executeFilter() in backend/test/unit/test_screener.spec.ts
- [ ] T133 [P] [US2] Unit test for filter condition AND logic in backend/test/unit/test_filter_logic.spec.ts
- [ ] T134 [P] [US2] Integration test for POST /screener/execute endpoint in backend/test/integration/test_screener.spec.ts
- [ ] T135 [P] [US2] Integration test for strategy CRUD endpoints in backend/test/integration/test_strategies.spec.ts
- [ ] T136 [P] [US2] Component test for FilterBuilder in frontend/tests/components/FilterBuilder.test.tsx
- [ ] T137 [P] [US2] Component test for StrategyManager in frontend/tests/components/StrategyManager.test.tsx
- [ ] T138 [P] [US2] Page test for FilterPage in frontend/tests/pages/FilterPage.test.tsx

### US2 Backend Implementation - Data Models

- [ ] T139 [P] [US2] Verify ScreenerStrategy entity exists in backend/prisma/schema.prisma (already created in T005)
- [ ] T140 [P] [US2] Verify FilterCondition entity exists in backend/prisma/schema.prisma

### US2 Backend Implementation - Services

- [ ] T141 [US2] Create backend/src/modules/screener/screener.service.ts with executeFilter() method: build Prisma query with nested AND conditions
- [ ] T142 [US2] Implement indicator value filtering: join TechnicalIndicator table, parse JSON values field, apply comparison operators
- [ ] T143 [US2] Implement pattern matching: check for kdj_golden_cross (K crosses above D), kdj_death_cross, price_above_ma, price_below_ma
- [ ] T144 [US2] Implement price/volume change filtering: calculate percentage change from previous day
- [ ] T145 [US2] Implement 52-week high/low filtering: compare current price with 52-week markers
- [ ] T146 [US2] Add result limiting: cap at 100 stocks, set isTruncated flag if more results exist
- [ ] T147 [US2] Add sorting: support sortBy (stockCode, priceChangePercent, amount, marketCap) and sortOrder (asc, desc)
- [ ] T148 [US2] Create backend/src/modules/strategies/strategies.service.ts with create(), findAll(), findOne(), update(), delete() methods

### US2 Backend Implementation - Controllers

- [ ] T149 [P] [US2] Create backend/src/modules/screener/dto/execute-filter.dto.ts with FilterCondition[] validation
- [ ] T150 [P] [US2] Create backend/src/modules/strategies/dto/create-strategy.dto.ts with strategyName, description, conditions validation
- [ ] T151 [US2] Implement backend/src/modules/screener/screener.controller.ts with POST /screener/execute endpoint
- [ ] T152 [US2] Implement backend/src/modules/strategies/strategies.controller.ts with POST, GET, PUT, DELETE endpoints for CRUD operations
- [ ] T153 [US2] Add POST /strategies/:strategyId/execute endpoint to run saved strategy
- [ ] T154 [US2] Register ScreenerModule and StrategiesModule in backend/src/app.module.ts

### US2 Frontend Implementation - Services

- [ ] T155 [P] [US2] Create frontend/src/types/filter.ts with FilterCondition, FilterResult interfaces
- [ ] T156 [P] [US2] Create frontend/src/types/strategy.ts with Strategy interface
- [ ] T157 [P] [US2] Create frontend/src/services/screener.service.ts with executeFilter() method
- [ ] T158 [P] [US2] Create frontend/src/services/strategy.service.ts with createStrategy(), getStrategies(), updateStrategy(), deleteStrategy(), executeStrategy() methods

### US2 Frontend Implementation - Components

- [ ] T159 [US2] Use frontend-design skill to design FilterPage layout (condition builder, execute button, results table, save strategy button)
- [ ] T160 [US2] Create frontend/src/components/FilterBuilder/index.tsx with Ant Design Form: add/remove conditions, select indicator/operator/value
- [ ] T161 [US2] Add condition types in FilterBuilder: indicator_value (MA50, KDJ_K, RSI, Volume, Amount with >, <, >=, <=, = operators)
- [ ] T162 [US2] Add pattern conditions in FilterBuilder: kdj_golden_cross, kdj_death_cross, price_above_ma, price_below_ma dropdown
- [ ] T163 [US2] Add change conditions in FilterBuilder: price_change, volume_change with percentage input
- [ ] T164 [US2] Add 52-week conditions in FilterBuilder: week_52_high, week_52_low, near_52_high (<5%), near_52_low (<5%)
- [ ] T165 [US2] Create frontend/src/components/FilterResultsTable/index.tsx with Ant Design Table showing stockCode, stockName, latestPrice, priceChange, amount
- [ ] T166 [US2] Add sorting controls in FilterResultsTable (sortable columns with onClick handlers)
- [ ] T167 [US2] Add row click handler to navigate to /chart/:stockCode
- [ ] T168 [US2] Create frontend/src/components/StrategyManager/index.tsx with list view, edit/delete buttons, "Save Current" button
- [ ] T169 [US2] Create frontend/src/components/SaveStrategyModal/index.tsx with Ant Design Modal for strategyName and description input

### US2 Frontend Implementation - Page Integration

- [ ] T170 [US2] Implement frontend/src/pages/FilterPage.tsx integrating FilterBuilder, FilterResultsTable, SaveStrategyModal, StrategyManager
- [ ] T171 [US2] Add /filter route in frontend/src/App.tsx with React.lazy()
- [ ] T172 [US2] Add /strategies route for strategy management page
- [ ] T173 [US2] Implement filter execution logic: call screener.service.executeFilter(), display results or "Too many results" warning
- [ ] T174 [US2] Implement strategy save logic: call strategy.service.createStrategy() with current filter conditions
- [ ] T175 [US2] Implement strategy load logic: click strategy → populate FilterBuilder with saved conditions
- [ ] T176 [US2] Add loading states and error handling for filter execution

**Checkpoint**: Stock filtering and strategy management fully functional

---

## Phase 7: User Story 3 - 收藏和管理股票 (Priority: P3)

**Goal**: Allow users to bookmark favorite stocks for quick access and comparison

**Independent Test**: Favorite one stock, view favorites list, unfavorite it, verify list updates

### US3 Tests ⚠️

- [ ] T177 [P] [US3] Unit test for FavoritesService CRUD operations in backend/test/unit/test_favorites.spec.ts
- [ ] T178 [P] [US3] Integration test for POST /favorites endpoint in backend/test/integration/test_favorites.spec.ts
- [ ] T179 [P] [US3] Integration test for GET /favorites and DELETE /favorites/:id endpoints
- [ ] T180 [P] [US3] Component test for FavoriteButton in frontend/tests/components/FavoriteButton.test.tsx
- [ ] T181 [P] [US3] Component test for FavoriteList in frontend/tests/components/FavoriteList.test.tsx
- [ ] T182 [P] [US3] Page test for FavoritePage in frontend/tests/pages/FavoritePage.test.tsx

### US3 Backend Implementation - Data Models

- [ ] T183 [P] [US3] Verify Favorite entity exists in backend/prisma/schema.prisma (already created in T005)

### US3 Backend Implementation - Services

- [ ] T184 [US3] Create backend/src/modules/favorites/favorites.service.ts with create(), findAll(), updateSortOrder(), remove() methods
- [ ] T185 [US3] Implement findAll() to join Stock table and enrich with latestPrice, priceChange, priceChangePercent from latest KLineData

### US3 Backend Implementation - Controllers

- [ ] T186 [P] [US3] Create backend/src/modules/favorites/dto/create-favorite.dto.ts with stockCode and groupName validation
- [ ] T187 [P] [US3] Create backend/src/modules/favorites/dto/update-sort-order.dto.ts
- [ ] T188 [US3] Implement backend/src/modules/favorites/favorites.controller.ts with POST, GET, PUT, DELETE endpoints
- [ ] T189 [US3] Add @UseGuards(JwtAuthGuard) to all favorites endpoints
- [ ] T190 [US3] Register FavoritesModule in backend/src/app.module.ts

### US3 Frontend Implementation - Services

- [ ] T191 [P] [US3] Create frontend/src/types/favorite.ts with Favorite interface
- [ ] T192 [P] [US3] Create frontend/src/services/favorite.service.ts with addFavorite(), getFavorites(), updateSortOrder(), removeFavorite() methods

### US3 Frontend Implementation - Components

- [ ] T193 [US3] Use frontend-design skill to design FavoritePage layout (favorites list with drag-drop, latest price, change%)
- [ ] T194 [US3] Create frontend/src/components/FavoriteButton/index.tsx toggle button (empty star ↔ filled star) on chart page
- [ ] T195 [US3] Create frontend/src/components/FavoriteList/index.tsx with Ant Design List, show stockCode, stockName, latestPrice, priceChange badge
- [ ] T196 [US3] Implement drag-and-drop reordering in FavoriteList using react-beautiful-dnd or Ant Design's sortable list
- [ ] T197 [US3] Add click handler to navigate to /chart/:stockCode when clicking list item
- [ ] T198 [US3] Add remove button (× icon) per list item
- [ ] T199 [US3] Create frontend/src/store/favorites.store.ts with Zustand to cache favorites list and isFavorited status

### US3 Frontend Implementation - Page Integration

- [ ] T200 [US3] Implement frontend/src/pages/FavoritePage.tsx integrating FavoriteList component
- [ ] T201 [US3] Add /favorites route in frontend/src/App.tsx with React.lazy()
- [ ] T202 [US3] Integrate FavoriteButton into KLineChartPage, check current stock isFavorited on mount
- [ ] T203 [US3] Implement add/remove favorite handlers with optimistic UI updates
- [ ] T204 [US3] Add groupName support (optional): allow users to create custom groups in favorites list

**Checkpoint**: Favorites feature complete with sorting and quick access

---

## Phase 8: User Story 4 - 绘制辅助线和标记 (Priority: P4)

**Goal**: Enable users to draw trend lines, support/resistance levels, and other technical analysis markings on charts

**Independent Test**: Draw one trend line on chart, save, refresh page, verify line persists at same position

### US4 Tests ⚠️

- [x] T205 [P] [US4] Unit test for DrawingsService CRUD operations in backend/test/unit/test_drawings.spec.ts
- [x] T206 [P] [US4] Integration test for POST /drawings endpoint in backend/test/integration/test_drawings.spec.ts
- [x] T207 [P] [US4] Integration test for GET /drawings and DELETE /drawings/:drawingId endpoints
- [ ] T208 [P] [US4] Component test for DrawingToolbar in frontend/tests/components/DrawingToolbar.test.tsx
- [ ] T209 [P] [US4] Component test for drawing interaction handlers in frontend/tests/components/KLineChart.test.tsx

### US4 Backend Implementation - Data Models

- [x] T210 [P] [US4] Verify Drawing entity exists in backend/prisma/schema.prisma (already created in T005)

### US4 Backend Implementation - Services

- [x] T211 [US4] Create backend/src/modules/drawings/drawings.service.ts with create(), findByStockAndPeriod(), remove() methods
- [x] T212 [US4] Implement coordinates validation: ensure JSON format matches drawingType schema (TrendLine: [{x, y}, {x, y}], HorizontalLine: [{y}], etc.)

### US4 Backend Implementation - Controllers

- [x] T213 [P] [US4] Create backend/src/modules/drawings/dto/create-drawing.dto.ts with stockCode, period, drawingType, coordinates validation
- [x] T214 [US4] Implement backend/src/modules/drawings/drawings.controller.ts with POST, GET, DELETE endpoints
- [x] T215 [US4] Add @UseGuards(JwtAuthGuard) to all drawings endpoints
- [x] T216 [US4] Register DrawingsModule in backend/src/app.module.ts

### US4 Frontend Implementation - Services

- [ ] T217 [P] [US4] Create frontend/src/types/drawing.ts with Drawing, DrawingType, Coordinates interfaces
- [ ] T218 [P] [US4] Create frontend/src/services/drawing.service.ts with createDrawing(), getDrawings(), deleteDrawing() methods

### US4 Frontend Implementation - Components

- [ ] T219 [US4] Create frontend/src/components/DrawingToolbar/index.tsx with buttons for TrendLine, HorizontalLine, VerticalLine, Rectangle tools
- [ ] T220 [US4] Add tool selection state in chart.store.ts (activeTool: 'none' | 'trend_line' | 'horizontal_line' | 'vertical_line' | 'rectangle')
- [ ] T221 [US4] Extend KLineChart component with drawing interaction handlers: mouse down → drag → mouse up to capture coordinates
- [ ] T222 [US4] Implement trend line drawing: click two points on chart, draw line between them using TradingView Lightweight Charts drawing API
- [ ] T223 [US4] Implement horizontal line drawing: click once on price level, draw horizontal line across chart
- [ ] T224 [US4] Implement vertical line drawing: click once on date, draw vertical line across chart
- [ ] T225 [US4] Implement rectangle drawing: click two diagonal corners, draw filled rectangle
- [ ] T226 [US4] Add drawing preview during mouse drag (semi-transparent line shown before mouse up)
- [ ] T227 [US4] Apply preset style to all drawings: blue color (#1890ff), 2px line width, no customization
- [ ] T228 [US4] Implement drawing deletion: right-click drawing → context menu → Delete option
- [ ] T229 [US4] Persist drawings on save: call drawing.service.createDrawing() after each drawing completed
- [ ] T230 [US4] Load existing drawings on chart mount: call drawing.service.getDrawings(stockCode, period) and render all saved drawings

### US4 Frontend Implementation - Integration

- [ ] T231 [US4] Integrate DrawingToolbar into KLineChartPage below indicator selector
- [ ] T232 [US4] Add drawing mode indicator (e.g., "Drawing: Trend Line") when tool selected
- [ ] T233 [US4] Implement drawing state management in chart.store.ts to track all drawings for current stock/period
- [ ] T234 [US4] Add error handling for drawing save failures with retry option
- [ ] T235 [US4] Ensure drawings scale correctly with chart zoom/pan interactions

**Checkpoint**: Drawing tools fully functional with persistence

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T236 [P] Add Swagger UI documentation at /api-docs endpoint using @nestjs/swagger decorators on all controllers
- [ ] T237 [P] Implement rate limiting using @nestjs/throttler: 10 req/min for auth, 100 req/min for data queries, 5 req/hour for data updates
- [ ] T238 [P] Add CORS configuration in backend/src/main.ts allowing frontend origin from CORS_ORIGIN env variable
- [ ] T239 [P] Implement correlation ID middleware in backend/src/common/middleware/correlation-id.middleware.ts for request tracing
- [ ] T240 [P] Add structured logging with Winston or Pino in backend/src/config/logger.config.ts (JSON format with timestamp, level, correlationId, userId, stockCode)
- [ ] T241 [P] Create health check endpoint GET /health in backend/src/health/health.controller.ts (check database, redis connections)
- [ ] T242 [P] Implement frontend loading skeletons using Ant Design Skeleton for all data-loading components
- [ ] T243 [P] Add frontend error toast notifications using Ant Design message API for all API failures
- [ ] T244 [P] Implement responsive design breakpoints in frontend/src/styles/theme.ts for tablet (768px) and mobile (480px)
- [ ] T245 [P] Add frontend navigation menu in frontend/src/components/common/Layout.tsx with links to Chart, Filter, Favorites, Strategies, Data Management
- [ ] T246 [P] Create README.md at repository root with project overview, setup instructions, and quickstart reference
- [ ] T247 [P] Create backend/README.md with API documentation link and development commands
- [ ] T248 [P] Create frontend/README.md with component structure and development commands
- [ ] T249 [P] Create bridge/README.md with Python bridge usage instructions
- [ ] T250 Code cleanup: Remove console.log statements, add JSDoc comments to all public methods
- [ ] T251 Run ESLint --fix on backend/ and frontend/ to ensure code style consistency
- [ ] T252 [P] Performance optimization: Add query result caching using @nestjs/cache-manager for stock list and indicators (5-minute TTL)
- [ ] T253 [P] Performance optimization: Implement frontend bundle splitting with React.lazy() for all routes (verify <500KB gzip initial bundle)
- [ ] T254 [P] Security: Add helmet middleware in backend/src/main.ts for HTTP security headers
- [ ] T255 [P] Security: Implement CSRF protection for state-changing operations
- [ ] T256 [P] Security: Add input sanitization for user-provided strings (stock search, strategy names)
- [ ] T257 Run all backend unit and integration tests: npm run test && npm run test:e2e in backend/
- [ ] T258 Run all frontend component and page tests: npm run test in frontend/
- [ ] T259 [P] Create Playwright E2E test suite in e2e/ directory covering all 6 user stories
- [ ] T260 Run quickstart.md validation: verify data initialization scripts work (init-stocks, fetch-klines, calculate-indicators)
- [ ] T261 Performance validation: Measure K-line chart loading time (must be <2秒), chart interaction response time (must be <300ms)
- [ ] T262 Performance validation: Measure screener execution time (must be <3秒 for ~1000 stocks)
- [ ] T263 Performance validation: Measure data update task completion time (must be <10分钟 for 1-3 trading days)
- [ ] T264 [P] Database optimization: Run ANALYZE and verify all indexes are used in query plans
- [ ] T265 [P] Database optimization: Enable SQLite auto-vacuum and set cache_size to 64MB in database.config.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: US0 (P0) → US1 (P1) → US5/US2 (P2) → US3 (P3) → US4 (P4)
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 0 (P0)**: Can start after Foundational - No dependencies on other stories
- **User Story 1 (P1)**: Can start after Foundational - Requires US0 for user context, otherwise independent
- **User Story 5 (P2)**: Can start after Foundational - Independent (requires US0 for auth)
- **User Story 2 (P2)**: Can start after Foundational - Uses indicators from US1 but independently testable (requires US0 for auth)
- **User Story 3 (P3)**: Can start after Foundational - Integrates with US1 (favorite button on chart) but independently testable (requires US0 for auth)
- **User Story 4 (P4)**: Can start after Foundational - Extends US1 chart but independently testable (requires US0 for auth)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD requirement)
- Models/entities before services
- Services before controllers
- DTOs in parallel with services
- Frontend components after backend endpoints are ready (or use mock data)
- Page integration after all components ready
- Story complete and independently tested before moving to next priority

### Parallel Opportunities

- **Setup tasks**: T002-T010 all marked [P] can run in parallel
- **Foundational tasks**: T013-T021 backend foundation tasks can run parallel, T022-T028 frontend foundation tasks can run parallel
- **Within each user story**:
  - All test tasks marked [P] can run together
  - All DTO tasks marked [P] can run together
  - All frontend component tasks marked [P] can run together
- **Between user stories**: After Foundational phase, different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 Backend

```bash
# Launch all US1 tests together:
Task T047: "Unit test for TechnicalIndicatorsService"
Task T048: "Integration test for GET /stocks/search"
Task T049: "Integration test for GET /klines/:stockCode"
Task T050: "Integration test for GET /indicators/:stockCode"

# After tests written, launch all US1 DTOs together:
Task T067: "Create search-stock.dto.ts"
Task T068: "Create get-klines.dto.ts"
Task T069: "Create get-indicators.dto.ts"

# Launch all US1 services together (after models ready):
Task T060: "Create tushare.service.ts"
Task T061: "Create akshare.service.ts"
Task T063: "Create technical-indicators.service.ts"
```

---

## Implementation Strategy

### MVP First (US0 + US1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T028) **CRITICAL BLOCKING PHASE**
3. Complete Phase 3: US0 - User Login (T029-T046)
4. Complete Phase 4: US1 - K-line Charts (T047-T095)
5. **STOP and VALIDATE**: Test US1 independently - search stock, view chart, toggle indicators
6. Deploy/demo MVP if ready

**MVP Success Criteria**:

- User can log in as admin
- User can search any stock (e.g., "600519")
- K-line chart loads in <2秒
- At least MA indicator visible on chart
- Chart interaction (zoom, pan) responds in <300ms

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → Project structure ready
2. **+ US0** → Authentication works → Login page functional
3. **+ US1** → Core value delivery → MVP ready for demo! 🎯
4. **+ US5** → Data freshness → Users can update stocks themselves
5. **+ US2** → Active stock selection → Power users can filter
6. **+ US3** → Convenience → Users build personal watchlists
7. **+ US4** → Advanced analysis → Pro users draw technical analysis

Each increment adds value without breaking previous features.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: US1 backend (T047-T073) → US2 backend (T132-T154)
- **Developer B**: US1 frontend (T074-T095) → US3 frontend (T193-T204)
- **Developer C**: US5 backend (T096-T117) → US4 backend (T205-T216)
- **Developer D**: US5 frontend (T118-T131) → US4 frontend (T217-T235)

Stories integrate independently when complete.

---

## Task Summary

- **Total Tasks**: 265
- **Setup Phase**: 10 tasks
- **Foundational Phase**: 18 tasks
- **US0 (Login)**: 18 tasks
- **US1 (Charts)**: 49 tasks 🎯 MVP
- **US5 (Data Update)**: 36 tasks
- **US2 (Filtering)**: 45 tasks
- **US3 (Favorites)**: 28 tasks
- **US4 (Drawing)**: 31 tasks
- **Polish Phase**: 30 tasks

**Parallel Tasks**: 157 tasks marked [P] can be parallelized

**Estimated MVP Effort**: Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (US0) + Phase 4 (US1) = 95 tasks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label (US0-US4) maps task to specific user story for traceability
- Each user story independently completable and testable
- Tests written FIRST per TDD/Constitution requirement
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Technology stack: Node.js + Nest.js + Prisma + React + TypeScript + Python Bridge
- Database: SQLite (single file at data/stocks.db, excluded from git)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
