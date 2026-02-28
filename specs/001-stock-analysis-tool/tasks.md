# 任务清单：股票分析工具

**输入**: `/specs/001-stock-analysis-tool/` 目录下的设计文档  
**前置条件**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md

**测试**: ✅ 宪章要求 TDD 方法 - 测试必须在实现之前编写

**组织方式**: 任务按用户故事分组，每个故事可以独立实现和测试

---

## 格式说明: `- [ ] [ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖关系）
- **[Story]**: 任务所属的用户故事（US0, US1, US2, US3, US4）
- 描述中包含具体文件路径

---

## 路径约定

- **后端**: `backend/src/`, `backend/tests/`
- **前端**: `frontend/src/`, `frontend/tests/`
- **脚本**: `scripts/`
- **数据**: `data/`

---

## 阶段 1：项目初始化（共享基础设施）

**目的**: 项目初始化和基本结构搭建

### 后端初始化

- [ ] T001 创建后端项目结构，包含 src/, tests/, alembic/ 目录
- [ ] T002 初始化 Python 虚拟环境并创建 requirements.txt，包含 FastAPI, SQLAlchemy, pandas-ta, Tushare, AkShare 依赖
- [ ] T003 [P] 配置后端 .env.example，包含 TUSHARE_TOKEN, DATABASE_PATH, SECRET_KEY, ADMIN_PASSWORD 占位符
- [ ] T004 [P] 创建 backend/.gitignore，忽略 venv/, .env, __pycache__/, *.pyc
- [ ] T005 [P] 在 backend/tests/conftest.py 中配置 pytest，包含数据库和 API 客户端 fixtures
- [ ] T006 [P] 配置后端代码检查工具（ruff/flake8）和格式化工具（black）

### 前端初始化

- [ ] T007 使用 Vite + React + TypeScript 模板创建前端项目
- [ ] T008 在 package.json 中安装前端依赖：lightweight-charts, axios, react-router-dom, zustand
- [ ] T009 [P] 配置前端 .env.example，包含 VITE_API_BASE_URL 占位符
- [ ] T010 [P] 创建 frontend/.gitignore，忽略 node_modules/, dist/, .env.local
- [ ] T011 [P] 在 frontend/vite.config.ts 中配置 Vitest 和 React Testing Library
- [ ] T012 [P] 配置前端 ESLint 和 Prettier，启用 TypeScript strict mode
- [ ] T013 [P] 配置 tsconfig.json，设置 strict: true 和 @/ 路径别名

### 脚本初始化

- [ ] T014 创建 scripts/ 目录，用于存放数据初始化脚本
- [ ] T015 创建 data/ 目录（添加到 .gitignore），用于存放 SQLite 数据库文件

**检查点**: 项目结构就绪，依赖已安装，配置文件已就位

---

## 阶段 2：基础设施（阻塞前置条件）

**目的**: 核心基础设施，必须在任何用户故事实现之前完成

**⚠️ 关键**: 本阶段完成前，任何用户故事工作都不能开始

### 后端基础

- [ ] T016 实现 backend/src/core/config.py，加载环境变量（Tushare token、数据库路径、密钥）
- [ ] T017 实现 backend/src/core/database.py，包含 SQLAlchemy 引擎、会话工厂、Base 模型、WAL 模式配置
- [ ] T018 [P] 在 backend/src/models/ 中创建所有数据库模型：
  - [ ] T018a Stock 模型：stock_code (PK), stock_name, market, industry, list_date, market_cap, avg_turnover, status
  - [ ] T018b KLineData 模型：id (PK), stock_code (FK), date, period, open, high, low, close, volume, turnover
  - [ ] T018c Indicator 模型：id (PK), stock_code (FK), date, period, indicator_type, value
  - [ ] T018d User 模型：user_id (PK), username, password_hash
  - [ ] T018e Favorite 模型：id (PK), user_id (FK), stock_code (FK), group_name, sort_order
  - [ ] T018f Strategy 模型：strategy_id (PK), user_id (FK), strategy_name, description
  - [ ] T018g FilterCondition 模型：condition_id (PK), strategy_id (FK), condition_type, indicator_name, operator, target_value, pattern, sort_order
  - [ ] T018h Drawing 模型：drawing_id (PK), user_id (FK), stock_code (FK), drawing_type, coordinates (JSON), style_preset
- [ ] T019 创建数据库初始化脚本 backend/src/core/init_db.py，创建所有表和索引
- [ ] T020 [P] 实现 backend/src/core/security.py，包含 JWT token 生成、验证、密码哈希（bcrypt）
- [ ] T021 [P] 在 backend/src/schemas/ 中创建所有 Pydantic schemas，与 contracts/rest-api.md 中的 TypeScript 类型对应
- [ ] T022 [P] 实现 backend/src/utils/indicator_calculator.py，包含 pandas-ta 包装器，用于 MA、KDJ、RSI、volume_ma52w、high_52w、low_52w 计算
- [ ] T023 实现 backend/src/services/data_source_service.py，包含 DataSourceManager、TushareDataSource、AkShareDataSource 类，实现 API 降级

### 前端基础

- [ ] T024 在 frontend/src/types/ 中创建所有 TypeScript 类型定义：
  - [ ] T024a stock.ts：Stock 接口
  - [ ] T024b kline.ts：KLineData 接口
  - [ ] T024c indicator.ts：IndicatorData、IndicatorsResponse 接口
  - [ ] T024d filter.ts：FilterCondition 联合类型
  - [ ] T024e strategy.ts：Strategy、FilterConditionDetail 接口
  - [ ] T024f favorite.ts：Favorite 接口
  - [ ] T024g drawing.ts：Drawing 接口
- [ ] T025 实现 frontend/src/services/api.ts，包含 Axios 实例、请求/响应拦截器、CORS 配置
- [ ] T026 [P] 在 frontend/src/App.tsx 中配置 React Router，添加登录、K线图、筛选、收藏、策略页面路由
- [ ] T027 [P] 创建 frontend/src/components/common/，包含可复用的 Button、Modal、Loading、ErrorMessage 组件
- [ ] T028 [P] 实现前端错误边界组件 frontend/src/components/ErrorBoundary.tsx

### 数据脚本基础

- [ ] T029 实现 scripts/init_stocks.py，从 Tushare/AkShare 获取股票列表，应用准入标准（市值>50亿、日均成交额>1000万、排除ST股、上市>5年），插入 Stock 表
- [ ] T030 [P] 实现 scripts/fetch_kline_data.py，批量获取所有活跃股票的20年日K线数据，插入 KLineData 表
- [ ] T031 [P] 实现 scripts/calculate_indicators.py，使用 pandas-ta 批量计算所有技术指标，插入 Indicator 表
- [ ] T032 [P] 实现 scripts/update_daily.py，用于每日数据刷新（K线 + 指标重新计算）

**检查点**: 基础就绪 - 所有模型、schemas、基础服务和数据脚本已完成。现在可以并行开始用户故事实现。

---

## 阶段 3：用户故事 0 - 用户登录 (优先级: P0)

**目标**: 实现预设管理员账户登录功能，用户可以使用 admin/admin 登录系统，会话通过 JWT Token 保持

**独立测试**: 输入正确/错误的账户密码，验证登录成功后可以访问主要功能，验证会话持久化

### US0 测试 ⚠️

> **注意: 必须先编写这些测试，确保测试失败后再实现功能**

- [ ] T033 [P] [US0] backend/src/core/security.py 密码哈希和 JWT token 生成的单元测试，位于 backend/tests/unit/test_security.py
- [ ] T034 [P] [US0] POST /auth/login 端点的集成测试（成功和失败场景），位于 backend/tests/integration/test_auth.py
- [ ] T035 [P] [US0] POST /auth/logout 端点的集成测试，位于 backend/tests/integration/test_auth.py
- [ ] T036 [P] [US0] GET /auth/me 端点的集成测试（已认证和未认证），位于 backend/tests/integration/test_auth.py
- [ ] T037 [P] [US0] LoginPage 表单提交的组件测试，位于 frontend/tests/pages/test_LoginPage.test.tsx
- [ ] T038 [P] [US0] authService 的 login/logout/me 方法的服务测试，位于 frontend/tests/services/test_authService.test.ts

### US0 实现

#### 后端实现

- [ ] T039 [US0] 实现 backend/src/api/auth.py，包含 POST /login、POST /logout、GET /me 端点
- [ ] T040 [US0] 在 backend/src/core/security.py 中创建认证中间件，实现 get_current_user 依赖
- [ ] T041 [US0] 在 init_db.py 中初始化管理员用户（username="admin", password_hash=bcrypt("admin")）
- [ ] T042 [US0] 在 backend/src/api/auth.py 中添加结构化日志记录登录/退出事件

#### 前端实现

- [ ] T043 [P] [US0] 实现 frontend/src/services/authService.ts，包含 login、logout、getCurrentUser 方法
- [ ] T044 [P] [US0] 创建 frontend/src/hooks/useAuth.ts，管理认证状态（current user、isAuthenticated、login、logout）
- [ ] T045 [US0] 使用 frontend-design skill 设计 LoginPage 布局，包含表单、验证、错误处理
- [ ] T046 [US0] 实现 frontend/src/pages/LoginPage.tsx，包含登录表单、用户名/密码输入框、提交按钮
- [ ] T047 [US0] 在 frontend/src/App.tsx 中实现认证守卫，将未认证用户重定向到登录页面
- [ ] T048 [US0] 在 frontend/src/services/api.ts 中添加 Axios 拦截器，处理 401 响应（重定向到登录页）

**检查点**: 用户故事 0 完成 - 用户可以使用 admin/admin 登录，会话持久化，受保护路由重定向到登录页

---

## 阶段 4：用户故事 1 - 查看股票 K 线图和技术指标 (优先级: P1) 🎯 MVP

**目标**: 实现K线图查看功能，用户可以搜索股票、查看日K/周K线图、添加技术指标（MA、KDJ、RSI、成交量、成交额）、标注52周高低点

**独立测试**: 访问任意股票的图表页面，验证K线图正确渲染，至少一个技术指标显示，周期切换正常

### US1 测试 ⚠️

> **注意: 必须先编写这些测试，确保测试失败后再实现功能**

- [ ] T049 [P] [US1] backend/src/services/stock_service.py 的 search 和 get_detail 方法的单元测试，位于 backend/tests/unit/test_stock_service.py
- [ ] T050 [P] [US1] backend/src/services/kline_service.py 的 get_kline_data 方法的单元测试，位于 backend/tests/unit/test_kline_service.py
- [ ] T051 [P] [US1] backend/src/services/indicator_service.py 的 get_indicators 方法的单元测试，位于 backend/tests/unit/test_indicator_service.py
- [ ] T052 [P] [US1] GET /stocks/search 端点的集成测试，位于 backend/tests/integration/test_stocks.py
- [ ] T053 [P] [US1] GET /stocks/{stock_code} 端点的集成测试，位于 backend/tests/integration/test_stocks.py
- [ ] T054 [P] [US1] GET /klines/{stock_code} 端点（带 period 查询参数）的集成测试，位于 backend/tests/integration/test_klines.py
- [ ] T055 [P] [US1] GET /indicators/{stock_code} 端点的集成测试，位于 backend/tests/integration/test_indicators.py
- [ ] T056 [P] [US1] GET /indicators/{stock_code}/week52-markers 端点的集成测试，位于 backend/tests/integration/test_indicators.py
- [ ] T057 [P] [US1] StockSearch 组件的组件测试，位于 frontend/tests/components/test_StockSearch.test.tsx
- [ ] T058 [P] [US1] KLineChart 组件的组件测试（使用 mock 数据），位于 frontend/tests/components/test_KLineChart.test.tsx
- [ ] T059 [P] [US1] IndicatorSelector 组件的组件测试，位于 frontend/tests/components/test_IndicatorSelector.test.tsx
- [ ] T060 [P] [US1] KLineChartPage 的页面测试（带股票代码路由参数），位于 frontend/tests/pages/test_KLineChartPage.test.tsx

### US1 实现

#### 后端实现

- [ ] T061 [P] [US1] 实现 backend/src/services/stock_service.py，包含 search_stocks、get_stock_detail 方法
- [ ] T062 [P] [US1] 实现 backend/src/services/kline_service.py，包含 get_kline_data（日K/周K）、calculate_weekly_kline 方法
- [ ] T063 [P] [US1] 实现 backend/src/services/indicator_service.py，包含 get_indicators、get_week52_markers 方法
- [ ] T064 [US1] 实现 backend/src/api/stocks.py，包含 GET /search、GET /{stock_code}、GET / 端点
- [ ] T065 [US1] 实现 backend/src/api/klines.py，包含 GET /{stock_code}、POST /{stock_code}/refresh 端点
- [ ] T066 [US1] 实现 backend/src/api/indicators.py，包含 GET /{stock_code}、GET /{stock_code}/week52-markers 端点
- [ ] T067 [US1] 在 backend/src/main.py 中注册所有 API 路由，使用 /api/v1 前缀，配置前端来源的 CORS 中间件
- [ ] T068 [US1] 在服务层添加结构化日志记录股票搜索、K线查询、指标查询

#### 前端实现

- [ ] T069 [P] [US1] 实现 frontend/src/services/stockService.ts，包含 searchStocks、getStockDetail、getStockList 方法
- [ ] T070 [P] [US1] 实现 frontend/src/services/klineService.ts，包含 getKLineData、refreshKLineData 方法
- [ ] T071 [P] [US1] 实现 frontend/src/services/indicatorService.ts，包含 getIndicators、getWeek52Markers 方法
- [ ] T072 [P] [US1] 创建 frontend/src/hooks/useKLineData.ts，用于 K 线数据获取和缓存
- [ ] T073 [P] [US1] 创建 frontend/src/hooks/useIndicators.ts，用于指标数据获取
- [ ] T074 [US1] 使用 frontend-design skill 设计 KLineChartPage 布局，包含搜索栏、图表区域、指标选择器、周期切换
- [ ] T075 [US1] 实现 frontend/src/components/StockSearch/index.tsx，包含自动完成搜索输入、防抖、结果下拉框
- [ ] T076 [US1] 实现 frontend/src/components/KLineChart/index.tsx，使用 TradingView Lightweight Charts：
  - K 线的蜡烛图系列
  - MA 指标的线系列（MA50/150/200 或 MA10/30/40）
  - 成交量的独立图表窗格（带 52 周均线）
  - 52 周高低点标记
  - 缩放和平移控制
  - 带价格/时间信息的十字线
- [ ] T077 [US1] 实现 frontend/src/components/IndicatorSelector/index.tsx，包含 MA、KDJ、RSI、成交量、成交额的复选框
- [ ] T078 [US1] 实现 frontend/src/components/KLineChart/SubChart.tsx，用于副图（KDJ、RSI）渲染
- [ ] T079 [US1] 实现 frontend/src/pages/KLineChartPage.tsx，集成 StockSearch、KLineChart、IndicatorSelector、周期切换
- [ ] T080 [US1] 在 KLineChartPage 中实现周期切换逻辑（日K ↔ 周K），自动切换 MA 参数
- [ ] T081 [US1] 在 KLineChartPage 中添加加载状态、错误边界和空状态处理
- [ ] T082 [US1] 在 App.tsx 路由中实现 KLineChartPage 的懒加载

**检查点**: 用户故事 1 完成 - MVP 就绪！用户可以搜索股票、查看 K 线图、添加指标、切换周期。系统可以独立测试和部署。

---

## 阶段 5：用户故事 2 - 使用技术指标筛选股票 (优先级: P2)

**目标**: 实现选股筛选功能，用户可以设置多个筛选条件（AND逻辑），执行筛选返回符合条件的股票列表（最多100只），支持保存/编辑/删除筛选策略

**独立测试**: 设置一个筛选条件（如"RSI < 30"），验证返回符合条件的股票列表，保存策略并重新加载验证策略持久化

### US2 测试 ⚠️

> **注意: 必须先编写这些测试，确保测试失败后再实现功能**

- [ ] T083 [P] [US2] backend/src/services/filter_service.py 的 execute_filter 方法（多条件）的单元测试，位于 backend/tests/unit/test_filter_service.py
- [ ] T084 [P] [US2] backend/src/services/strategy_service.py 的 CRUD 方法的单元测试，位于 backend/tests/unit/test_strategy_service.py
- [ ] T085 [P] [US2] POST /filters/execute 端点（indicator_value, pattern, price_change 条件）的集成测试，位于 backend/tests/integration/test_filters.py
- [ ] T086 [P] [US2] POST /strategies 创建策略的集成测试，位于 backend/tests/integration/test_strategies.py
- [ ] T087 [P] [US2] GET /strategies 列出策略的集成测试，位于 backend/tests/integration/test_strategies.py
- [ ] T088 [P] [US2] PUT /strategies/{strategy_id} 编辑策略的集成测试，位于 backend/tests/integration/test_strategies.py
- [ ] T089 [P] [US2] DELETE /strategies/{strategy_id} 删除策略的集成测试，位于 backend/tests/integration/test_strategies.py
- [ ] T090 [P] [US2] POST /strategies/{strategy_id}/execute 执行保存的策略的集成测试，位于 backend/tests/integration/test_strategies.py
- [ ] T091 [P] [US2] FilterBuilder 组件（添加/删除条件）的组件测试，位于 frontend/tests/components/test_FilterBuilder.test.tsx
- [ ] T092 [P] [US2] StrategyManager 组件（列出/编辑/删除策略）的组件测试，位于 frontend/tests/components/test_StrategyManager.test.tsx
- [ ] T093 [P] [US2] FilterPage 页面（执行筛选和显示结果）的页面测试，位于 frontend/tests/pages/test_FilterPage.test.tsx

### US2 实现

#### 后端实现

- [ ] T094 [P] [US2] 实现 backend/src/services/filter_service.py，包含 execute_filter 方法：
  - 解析 FilterCondition 数组
  - 查询最新交易日期
  - 使用 AND 逻辑构建 SQL 查询
  - 处理 indicator_value、pattern（KDJ 金叉/死叉、价格上穿/下穿 MA）、price_change、volume_change、week_52_high/low
  - 限制结果为 100 条
  - 支持自定义排序（stock_code、price_change_percent、turnover、market_cap）
- [ ] T095 [P] [US2] 实现 backend/src/services/strategy_service.py，包含 create_strategy、get_strategies、get_strategy_detail、update_strategy、delete_strategy、execute_strategy 方法
- [ ] T096 [US2] 实现 backend/src/api/filters.py，包含 POST /execute 端点
- [ ] T097 [US2] 实现 backend/src/api/strategies.py，包含 POST /、GET /、GET /{id}、PUT /{id}、DELETE /{id}、POST /{id}/execute 端点
- [ ] T098 [US2] 在 filter_service.py 中添加结构化日志记录筛选执行（条件数量、结果数量、执行时间）

#### 前端实现

- [ ] T099 [P] [US2] 实现 frontend/src/services/filterService.ts，包含 executeFilter 方法
- [ ] T100 [P] [US2] 实现 frontend/src/services/strategyService.ts，包含 createStrategy、getStrategies、getStrategyDetail、updateStrategy、deleteStrategy、executeStrategy 方法
- [ ] T101 [US2] 使用 frontend-design skill 设计 FilterPage 布局，包含条件构建器、结果列表、策略管理器
- [ ] T102 [US2] 实现 frontend/src/components/FilterBuilder/index.tsx：
  - condition_type 下拉框（indicator_value、pattern、price_change、volume_change、week_52_high/low）
  - 基于 condition_type 的动态表单字段（indicator_name、operator、target_value、pattern）
  - 添加/删除条件按钮
  - 带条件排序的条件列表
  - "执行筛选"和"保存为策略"按钮
- [ ] T103 [US2] 实现 frontend/src/components/FilterBuilder/ConditionRow.tsx，用于单个条件编辑
- [ ] T104 [US2] 实现 frontend/src/components/StrategyManager/index.tsx：
  - 策略列表，显示策略名称、条件数量、创建/更新日期
  - "编辑"、"删除"、"执行"操作按钮
  - "创建新策略"按钮
  - 保存时输入策略名称的模态框
- [ ] T105 [US2] 实现 frontend/src/components/StrategyManager/StrategyEditModal.tsx，用于编辑策略名称和条件
- [ ] T106 [US2] 实现 frontend/src/pages/FilterPage.tsx：
  - FilterBuilder 组件
  - 结果表格，显示 stock_code、stock_name、latest_price、price_change_percent、market_cap、turnover
  - 排序控制（排序字段下拉框、升序/降序切换）
  - 点击结果行导航到该股票的 KLineChartPage
  - 当 is_truncated=true 时显示"结果过多（超过100只），仅显示前100个"消息
  - 当结果为空时显示"未找到符合条件的股票"
- [ ] T107 [US2] 实现 frontend/src/pages/StrategyPage.tsx，包含 StrategyManager 组件
- [ ] T108 [US2] 在 App.tsx 中添加 FilterPage 和 StrategyPage 路由，使用懒加载

**检查点**: 用户故事 2 完成 - 用户可以使用多条件筛选股票、保存/编辑/删除策略、执行保存的策略。可以独立测试。

---

## 阶段 6：用户故事 3 - 收藏和管理股票 (优先级: P3)

**目标**: 实现收藏功能，用户可以在K线图页面收藏股票，查看收藏列表（包括实时价格和涨跌幅），调整收藏顺序，取消收藏

**独立测试**: 收藏一只股票，查看收藏列表验证股票出现，拖动调整顺序验证保存，取消收藏验证移除

### US3 测试 ⚠️

> **注意: 必须先编写这些测试，确保测试失败后再实现功能**

- [ ] T109 [P] [US3] backend/src/services/favorite_service.py 的 add、remove、update_sort、get_favorites 方法的单元测试，位于 backend/tests/unit/test_favorite_service.py
- [ ] T110 [P] [US3] POST /favorites 添加收藏的集成测试，位于 backend/tests/integration/test_favorites.py
- [ ] T111 [P] [US3] GET /favorites 列出收藏的集成测试，位于 backend/tests/integration/test_favorites.py
- [ ] T112 [P] [US3] PUT /favorites/{id}/sort 更新排序的集成测试，位于 backend/tests/integration/test_favorites.py
- [ ] T113 [P] [US3] DELETE /favorites/{id} 删除收藏的集成测试，位于 backend/tests/integration/test_favorites.py
- [ ] T114 [P] [US3] FavoriteList 组件（拖放功能）的组件测试，位于 frontend/tests/components/test_FavoriteList.test.tsx
- [ ] T115 [P] [US3] FavoritePage 页面（渲染收藏列表）的页面测试，位于 frontend/tests/pages/test_FavoritePage.test.tsx

### US3 实现

#### 后端实现

- [ ] T116 [P] [US3] 实现 backend/src/services/favorite_service.py，包含 add_favorite、get_favorites、update_sort_order、remove_favorite 方法
- [ ] T117 [US3] 实现 backend/src/api/favorites.py，包含 POST /、GET /、PUT /{id}/sort、DELETE /{id} 端点
- [ ] T118 [US3] 增强 GET /favorites 端点，关联 Stock 表并从最新 KLineData 获取 latest_price、price_change、price_change_percent
- [ ] T119 [US3] 在 favorite_service.py 中添加结构化日志记录收藏操作（添加、删除、重新排序）

#### 前端实现

- [ ] T120 [P] [US3] 实现 frontend/src/services/favoriteService.ts，包含 addFavorite、getFavorites、updateSortOrder、removeFavorite 方法
- [ ] T121 [US3] 使用 frontend-design skill 设计 FavoritePage 布局，包含可拖动列表、带价格信息的股票卡片
- [ ] T122 [US3] 实现 frontend/src/components/FavoriteList/index.tsx：
  - 收藏股票列表，显示 stock_code、stock_name、latest_price、price_change、price_change_percent
  - 按 group_name 分组（如果存在）
  - 拖放功能重新排序（使用 react-dnd 或 react-beautiful-dnd）
  - 每个收藏的"移除"按钮
  - 点击股票导航到 KLineChartPage
- [ ] T123 [US3] 实现 frontend/src/components/FavoriteList/FavoriteCard.tsx，用于单个收藏股票显示
- [ ] T124 [US3] 在 frontend/src/pages/KLineChartPage.tsx 中添加"添加收藏"按钮：
  - 当股票已收藏时按钮状态变为"已收藏"
  - 点击时调用 addFavorite 服务
  - 显示成功/错误提示通知
- [ ] T125 [US3] 实现 frontend/src/pages/FavoritePage.tsx，包含 FavoriteList 组件
- [ ] T126 [US3] 在 App.tsx 中添加 FavoritePage 路由，使用懒加载

**检查点**: 用户故事 3 完成 - 用户可以添加/删除收藏、查看带实时价格的收藏列表、重新排序收藏。可以独立测试。

---

## 阶段 7：用户故事 4 - 在图表上绘制辅助线和标记 (优先级: P4)

**目标**: 实现绘图功能，用户可以在K线图上绘制趋势线、水平线、垂直线、矩形框，绘图对象持久化保存并在重新打开时显示

**独立测试**: 在图表上绘制一条趋势线，刷新页面验证趋势线仍然存在，删除趋势线验证移除

### US4 测试 ⚠️

> **注意: 必须先编写这些测试，确保测试失败后再实现功能**

- [ ] T127 [P] [US4] backend/src/services/drawing_service.py 的 create、get、delete 方法的单元测试，位于 backend/tests/unit/test_drawing_service.py
- [ ] T128 [P] [US4] POST /drawings 创建绘图的集成测试，位于 backend/tests/integration/test_drawings.py
- [ ] T129 [P] [US4] GET /drawings 列出股票绘图的集成测试，位于 backend/tests/integration/test_drawings.py
- [ ] T130 [P] [US4] DELETE /drawings/{id} 删除绘图的集成测试，位于 backend/tests/integration/test_drawings.py
- [ ] T131 [P] [US4] DrawingToolbar 组件（工具选择）的组件测试，位于 frontend/tests/components/test_DrawingToolbar.test.tsx
- [ ] T132 [P] [US4] KLineChart 组件（绘图叠加层）的集成测试，位于 frontend/tests/components/test_KLineChart.test.tsx

### US4 实现

#### 后端实现

- [ ] T133 [P] [US4] 实现 backend/src/services/drawing_service.py，包含 create_drawing、get_drawings、delete_drawing 方法
- [ ] T134 [US4] 实现 backend/src/api/drawings.py，包含 POST /、GET /?stock_code={code}、DELETE /{id} 端点
- [ ] T135 [US4] 在 drawing_service.py 中添加结构化日志记录绘图操作（创建、删除）

#### 前端实现

- [ ] T136 [P] [US4] 实现 frontend/src/services/drawingService.ts，包含 createDrawing、getDrawings、deleteDrawing 方法
- [ ] T137 [US4] 实现 frontend/src/components/DrawingToolbar/index.tsx：
  - trend_line、horizontal_line、vertical_line、rectangle 的工具按钮
  - 活动工具高亮显示
  - "清除全部"按钮删除所有绘图
  - 工具选择状态管理
- [ ] T138 [US4] 增强 frontend/src/components/KLineChart/index.tsx 以支持绘图：
  - 在图表上添加绘图图层叠加
  - 当绘图工具激活时监听鼠标事件（点击、移动）
  - 渲染趋势线（两点线）
  - 渲染水平线（单个 y 坐标线）
  - 渲染垂直线（单个 x 坐标日期线）
  - 渲染矩形（两点边界框）
  - 使用预定义样式（蓝色实线，2px 宽度）
  - 完成时将绘图保存到后端
- [ ] T139 [US4] 实现 frontend/src/components/KLineChart/DrawingLayer.tsx，用于在图表上渲染保存的绘图
- [ ] T140 [US4] 在 KLineChartPage 中添加绘图管理：
  - 集成 DrawingToolbar
  - 页面加载时加载当前股票的绘图
  - 鼠标悬停在绘图对象上时显示"删除"按钮
  - 点击删除按钮时调用 deleteDrawing 服务
- [ ] T141 [US4] 在 frontend/src/utils/chart.ts 中添加坐标验证，确保 x（日期）和 y（价格）在图表范围内

**检查点**: 用户故事 4 完成 - 用户可以在图表上绘制趋势线、支撑/阻力线、矩形。绘图在会话之间持久化。所有用户故事（US0-US4）现已完成并可独立测试。

---

## 阶段 8：优化和跨功能改进

**目的**: 影响多个用户故事的改进

### 文档和部署

- [ ] T142 [P] 创建 backend/README.md，包含设置说明、API 文档链接、开发工作流
- [ ] T143 [P] 创建 frontend/README.md，包含设置说明、组件结构、开发工作流
- [ ] T144 [P] 创建根目录 README.md，包含项目概述、快速开始指南、架构图、功能清单
- [ ] T145 [P] 创建 docker-compose.yml，用于容器化部署，包含后端、前端和数据卷
- [ ] T146 [P] 创建后端 Dockerfile，使用 Python 3.11、安装依赖、uvicorn 入口
- [ ] T147 [P] 创建前端 Dockerfile，使用 Node 18、多阶段构建（构建 + nginx 服务）

### 性能优化

- [ ] T148 [P] 在 backend/src/core/database.py 中添加数据库索引验证脚本
- [ ] T149 [P] 在 frontend/vite.config.ts 中配置 Vite bundle analyzer
- [ ] T150 [P] 测量并优化前端打包大小至 <500KB gzip（代码分割、tree shaking）
- [ ] T151 [P] 在 App.tsx 中为所有页面组件实现 React.lazy()
- [ ] T152 [P] 在后端为 GET 端点添加响应缓存，设置适当的 Cache-Control 头
- [ ] T153 [P] 实现前端数据缓存，使用 SWR 或 React Query 缓存股票数据、K线数据、指标

### 安全和可观测性

- [ ] T154 [P] 在 backend/src/main.py 中为 API 端点添加速率限制中间件
- [ ] T155 [P] 在 backend/src/main.py 中实现生产环境的 CORS 配置
- [ ] T156 [P] 在 backend/src/core/logging.py 中添加请求关联 ID 中间件
- [ ] T157 [P] 配置后端结构化日志格式（JSON），包含 timestamp、level、module、correlation_id、user_id、stock_code
- [ ] T158 [P] 添加前端错误跟踪，使用 console.error 记录上下文（page、action、stock_code）
- [ ] T159 [P] 在 backend/src/main.py 中创建健康检查端点 GET /health

### 测试和质量

- [ ] T160 [P] 运行所有后端单元测试，使用 pytest --cov 验证覆盖率 >80%
- [ ] T161 [P] 运行所有后端集成测试，验证所有 API 端点正常工作
- [ ] T162 [P] 运行所有前端组件测试，验证 UI 组件正确渲染
- [ ] T163 [P] 运行所有前端服务测试，验证 API 服务层正常工作
- [ ] T164 [P] 运行 quickstart.md 验证：设置环境、运行后端/前端、测试登录、K线查看、筛选、收藏、绘图
- [ ] T165 [P] 按照 spec.md 中的验收场景对所有用户故事（US0-US4）执行手动端到端测试
- [ ] T166 [P] 性能测试：验证 K线加载 <2秒、交互 <300ms、筛选 <3秒（按成功标准）

### 代码质量

- [ ] T167 [P] 运行后端代码检查工具（ruff/flake8）并修复所有问题
- [ ] T168 [P] 运行后端格式化工具（black）格式化所有 Python 文件
- [ ] T169 [P] 运行前端代码检查工具（ESLint）并修复所有问题
- [ ] T170 [P] 运行前端格式化工具（Prettier）格式化所有 TypeScript/React 文件
- [ ] T171 [P] 审查并重构所有带 TODO 注释的代码
- [ ] T172 [P] 为所有前端组件和服务添加 JSDoc 注释
- [ ] T173 [P] 为所有后端服务和 API 端点添加 docstrings

**最终检查点**: 所有用户故事完成，测试通过，性能目标达成，文档就绪。系统已准备好投入生产！

---

## 依赖关系和执行顺序

### 阶段依赖

- **初始化（阶段 1）**: 无依赖 - 可立即开始
- **基础设施（阶段 2）**: 依赖初始化完成 - 阻塞所有用户故事
- **用户故事 0（阶段 3）**: 依赖基础设施 - 其他所有故事都需要认证
- **用户故事 1-4（阶段 4-7）**: 都依赖用户故事 0（认证）
  - US1 可在 US0 后开始 - 不依赖其他故事
  - US2 可在 US0 后开始 - 与 US1 集成（筛选结果链接到 K 线图）但可独立测试
  - US3 可在 US0 后开始 - 与 US1 集成（图表页面收藏按钮、收藏列表链接到图表）但可独立测试
  - US4 可在 US0 后开始 - 与 US1 集成（在图表上绘图）但可独立测试
- **优化（阶段 8）**: 依赖所有需要的用户故事完成

### 用户故事依赖

- **用户故事 0 (P0)**: 认证 - 阻塞所有其他故事（所有功能都需要登录）
- **用户故事 1 (P1)**: K 线图 - 核心功能，不依赖 US2/US3/US4
- **用户故事 2 (P2)**: 筛选 - 链接到 US1（筛选结果导航到图表）但可独立测试
- **用户故事 3 (P3)**: 收藏 - 链接到 US1（图表上的收藏按钮、收藏列表导航到图表）但可独立测试
- **用户故事 4 (P4)**: 绘图 - 依赖 US1（在图表上渲染绘图）但可独立测试

### 每个用户故事内部

- 测试必须先编写并失败，然后再实现
- 后端：模型 → 服务 → 端点 → 日志
- 前端：类型 → 服务 → 组件 → 页面 → 集成
- 故事完成后再进入下一个优先级

### 并行执行机会

- **阶段 1（初始化）**: T003-T006 后端配置、T009-T013 前端配置、T014-T015 脚本都可并行
- **阶段 2（基础设施）**: T018a-T018h 模型、T024a-T024g 类型、T027-T028 通用组件可并行
- **每个用户故事内部**:
  - 故事中标记 [P] 的所有测试可并行
  - 标记 [P] 的后端模型/服务可并行
  - 标记 [P] 的前端类型/服务/组件可并行
- **用户故事（阶段 3-7）**: US0 完成后，US1、US2、US3、US4 可由不同开发者并行工作

---

## 并行示例：用户故事 1

```bash
# 首先一起编写用户故事 1 的所有测试（让它们失败）：
任务 T049: stock_service.py 的单元测试
任务 T050: kline_service.py 的单元测试
任务 T051: indicator_service.py 的单元测试
任务 T052: GET /stocks/search 的集成测试
任务 T053: GET /stocks/{code} 的集成测试
任务 T054: GET /klines/{code} 的集成测试
任务 T055: GET /indicators/{code} 的集成测试
任务 T056: GET /indicators/{code}/week52-markers 的集成测试
任务 T057: StockSearch 的组件测试
任务 T058: KLineChart 的组件测试
任务 T059: IndicatorSelector 的组件测试
任务 T060: KLineChartPage 的页面测试

# 然后并行实现后端模型和服务：
任务 T061: 实现 stock_service.py
任务 T062: 实现 kline_service.py
任务 T063: 实现 indicator_service.py

# 然后并行实现前端服务：
任务 T069: 实现 stockService.ts
任务 T070: 实现 klineService.ts
任务 T071: 实现 indicatorService.ts
任务 T072: 创建 useKLineData hook
任务 T073: 创建 useIndicators hook
```

---

## 实施策略

### MVP 优先（仅用户故事 0 + 用户故事 1）

1. 完成阶段 1：初始化 → ✅ 项目结构就绪
2. 完成阶段 2：基础设施 → ✅ 数据库、模型、认证基础设施就绪
3. 完成阶段 3：用户故事 0 → ✅ 用户可以登录
4. 完成阶段 4：用户故事 1 → ✅ 用户可以查看带指标的 K 线图
5. **停止并验证**: 按照 spec.md 中的验收场景独立测试 US0 + US1
6. 运行性能测试：K 线加载 <2秒，交互 <300ms
7. **部署/演示 MVP** - 核心价值已交付！

### 增量交付

1. 完成初始化 + 基础设施 → ✅ 基础就绪
2. 添加用户故事 0（登录）→ 独立测试 → ✅ 认证正常工作
3. 添加用户故事 1（K 线图）→ 独立测试 → ✅ **部署/演示 MVP！**
4. 添加用户故事 2（筛选）→ 独立测试 → ✅ 部署/演示（MVP + 筛选）
5. 添加用户故事 3（收藏）→ 独立测试 → ✅ 部署/演示（MVP + 筛选 + 收藏）
6. 添加用户故事 4（绘图）→ 独立测试 → ✅ 部署/演示（完整功能集）
7. 每个故事都在不破坏之前故事的情况下增加价值

### 并行团队策略

多人开发时：

1. **所有团队成员一起完成初始化 + 基础设施**（关键路径）
2. **一起完成用户故事 0**（所有故事都需要认证）
3. US0 完成后，分配工作：
   - **开发者 A**: 用户故事 1（K 线图）- MVP 优先级
   - **开发者 B**: 用户故事 2（筛选）
   - **开发者 C**: 用户故事 3（收藏）
   - **开发者 D**: 用户故事 4（绘图）
4. 故事独立完成和集成
5. 运行集成测试验证所有故事协同工作

---

## 任务统计摘要

- **总任务数**: 173 个任务
- **阶段 1（初始化）**: 15 个任务
- **阶段 2（基础设施）**: 17 个任务
- **阶段 3（US0 - 登录）**: 16 个任务（6 个测试 + 10 个实现）
- **阶段 4（US1 - K 线图）**: 33 个任务（12 个测试 + 21 个实现）- **MVP**
- **阶段 5（US2 - 筛选）**: 26 个任务（11 个测试 + 15 个实现）
- **阶段 6（US3 - 收藏）**: 18 个任务（7 个测试 + 11 个实现）
- **阶段 7（US4 - 绘图）**: 16 个任务（6 个测试 + 10 个实现）
- **阶段 8（优化）**: 32 个任务

**MVP 范围**（初始化 + 基础设施 + US0 + US1）：**81 个任务** → 具有核心价值的可交付增量

**并行机会**: 89 个任务标记为 [P]，可在各阶段内并行运行

**测试覆盖**: 42 个测试任务（占总数的 24%），遵循宪章要求的 TDD 方法

---

## 注意事项

- [P] 任务 = 不同文件，无依赖，可以并行运行
- [Story] 标签将任务映射到特定用户故事以便追溯
- 每个用户故事都可以独立完成和测试
- **TDD 要求**: 先编写测试，验证失败，然后实现
- 每个任务或逻辑组完成后提交
- 在任何检查点停止以独立验证故事
- 后端使用 SQLAlchemy（ORM）、FastAPI（API）、pandas-ta（指标）、Tushare/AkShare（数据源）
- 前端使用 React 18、TypeScript、Vite、TradingView Lightweight Charts、Axios
- 数据库：SQLite 使用 WAL 模式、多层索引以提高性能
- 认证：JWT tokens 存储在 HttpOnly cookies 中
- 性能目标：K 线 <2秒、交互 <300ms、筛选 <3秒
- 所有用户故事遵循优先级顺序：P0（登录）→ P1（K 线图/MVP）→ P2（筛选）→ P3（收藏）→ P4（绘图）

**准备开始实施**: 从阶段 1（初始化）任务开始，然后按顺序执行各阶段。US1 是 MVP 里程碑 - 优先完成 初始化 → 基础设施 → US0 → US1 以实现最快的价值交付。
