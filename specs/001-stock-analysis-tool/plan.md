# Implementation Plan: 股票分析工具

**Branch**: `001-stock-analysis-tool` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-stock-analysis-tool/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

构建一个投资用的股票分析工具网站，支持技术指标选股、K线图查看（含多种技术指标展示）、股票收藏管理、图表绘图分析等功能。系统覆盖约1000只符合准入标准的A股，存储近20年的日K和周K线历史数据，使用预设管理员账户登录，所有用户数据（收藏、选股策略、绘图对象）保存在服务器端。技术方案采用前后端分离架构，后端使用Python+FastAPI+SQLite，前端使用React+TypeScript，图表使用ECharts或TradingView Lightweight Charts，数据源使用Tushare Pro（主）+ AkShare（备用）。

## Technical Context

**Language/Version**: Python 3.11+ (后端), TypeScript 5.x (前端)  
**Primary Dependencies**: 
- 后端: FastAPI, SQLite3, Tushare Pro SDK, AkShare, Pandas, pandas-ta (技术指标计算), APScheduler (定时任务)
- 前端: React 18+, TradingView Lightweight Charts (K线图表库), Vite, Axios
**Storage**: SQLite (单文件数据库，预估12-15GB，存储约1000只股票的20年历史K线数据及技术指标)  
**Testing**: pytest + pytest-asyncio (后端), Vitest + React Testing Library (前端)  
**Target Platform**: Web应用（桌面端优先，响应式支持平板和手机）
**Project Type**: Web application (前后端分离)  
**Performance Goals**: 
- K线图加载及渲染 <2秒
- 图表交互操作（缩放、平移、切换周期）响应时间 <300ms
- 选股筛选功能返回结果 <3秒（约1000只股票范围内）
**Constraints**: 
- 支持100个并发用户访问
- SQLite单文件存储，无需复杂数据库部署
- 数据源API限额管理（Tushare Pro积分限制，需降级策略）
**Scale/Scope**: 
- 约1000只符合准入标准的A股（市值>50亿、日均成交额>1000万、上市>5年、排除ST股）
- 20年历史数据（日K和周K）
- 5种技术指标（MA、KDJ、RSI、成交量、成交额）
- 4个核心用户故事（登录、看图、选股、收藏、绘图）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Component-First (Frontend)
- **Status**: 符合
- **Evidence**: 前端架构计划将UI功能拆分为独立组件：
  - K线图组件（KLineChart）
  - 技术指标选择器（IndicatorSelector）
  - 股票搜索组件（StockSearch）
  - 收藏列表组件（FavoriteList）
  - 绘图工具栏（DrawingToolbar）
  - 筛选条件构建器（FilterBuilder）
  - 策略管理组件（StrategyManager）
- **Action Required**: 每个组件需要：
  - 清晰的 Props/TypeScript 接口定义
  - 独立的单元测试或组件测试
  - JSDoc 文档说明用途和使用方法
- **Page Design**: 设计K线图页面、选股页面、收藏列表页面时，必须使用 `~/.claude/skills/frontend-design` skill

### ✅ II. TypeScript & Type Safety
- **Status**: 符合
- **Evidence**: 
  - 前端强制使用 TypeScript，启用 strict mode
  - 共享类型定义在 `frontend/src/types/` 目录
  - API 响应接口与后端契约对应（Phase 1 contracts/）
- **Action Required**: 
  - 禁止使用 `any`，需要显式类型标注和抑制注释
  - 后端 Python 使用 Pydantic 模型确保类型安全（与 TypeScript 接口对应）

### ✅ III. Test-First (NON-NEGOTIABLE)
- **Status**: 符合
- **Evidence**: 
  - 开发流程：编写测试 → 用户审查 → 测试失败 → 实现功能 → 测试通过
  - 后端：pytest 单元测试（services、models）+ 集成测试（API endpoints）
  - 前端：Vitest 组件测试（UI 组件）+ 单元测试（业务逻辑）
- **Action Required**: 
  - Phase 2 任务分解时，每个任务必须包含"编写测试"步骤在"实现功能"之前
  - 测试覆盖率目标：核心业务逻辑 >80%

### ✅ IV. Build & Performance Standards
- **Status**: 符合
- **Evidence**: 
  - Vite 构建配置，启用代码分割和懒加载
  - K线图页面、选股页面等非关键路由使用 React.lazy() 懒加载
  - 图表库（ECharts/TradingView）按需加载，避免初始 bundle 过大
- **Action Required**: 
  - 配置 Vite bundle analyzer 监控构建产物大小
  - 性能预算：初始 bundle <500KB gzip，首次内容绘制 <1.5s

### ✅ V. Observability & Debugging
- **Status**: 符合
- **Evidence**: 
  - 后端使用 Python logging 模块，JSON 格式结构化日志
  - 前端错误边界捕获组件错误，记录用户操作上下文（股票代码、当前页面、操作类型）
  - FastAPI 自带请求日志，添加 correlation ID 追踪请求链路
- **Action Required**: 
  - 后端日志包含：timestamp, level, module, action, user_id, stock_code, error_message
  - 前端使用 console.error 记录错误时附带上下文（避免敏感信息如密码）

### 📋 Constitution Compliance Summary
- **Component-First**: ✅ Pass（需在 Phase 1 设计时使用 frontend-design skill）
- **TypeScript**: ✅ Pass（需配置 strict mode）
- **Test-First**: ✅ Pass（需在 Phase 2 任务中体现 TDD 流程）
- **Performance**: ✅ Pass（需配置 bundle analyzer 和性能预算）
- **Observability**: ✅ Pass（需在实现时添加结构化日志）

**Overall Status**: ✅ **PASS** - 允许进入 Phase 0 研究阶段

**Re-check Trigger**: Phase 1 设计完成后，验证数据模型、API 契约、组件结构是否符合上述原则

---

### 📋 Phase 1 后重新评估

**评估日期**: 2026-02-28  
**评估范围**: data-model.md, contracts/rest-api.md, quickstart.md

#### ✅ I. Component-First (Frontend) - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:
- REST API 契约清晰定义了前后端接口边界
- 数据模型中明确了前端 TypeScript 类型定义（附录）
- 组件结构已在项目结构中详细规划：
  - `KLineChart/` - K线图组件（独立、可复用）
  - `IndicatorSelector/` - 技术指标选择器
  - `StockSearch/` - 股票搜索组件
  - `FilterBuilder/` - 筛选条件构建器
  - `StrategyManager/` - 策略管理组件
  - `FavoriteList/` - 收藏列表组件
  - `DrawingToolbar/` - 绘图工具栏
- 每个组件都设计为独立功能模块，具有清晰的 Props 接口

**Action Items**:
- [ ] Phase 2 任务分解时，为每个组件创建独立的测试文件
- [ ] 在实现前使用 `~/.claude/skills/frontend-design` skill 设计页面布局

#### ✅ II. TypeScript & Type Safety - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:
- REST API 契约附录提供了完整的 TypeScript 类型定义
- 所有 API 响应和请求都有对应的接口定义
- 后端使用 Pydantic 模型确保类型安全，与前端 TypeScript 接口一一对应
- 项目结构中 `frontend/src/types/` 目录专门存放类型定义

**验证通过**:
```typescript
// 示例：Stock 接口定义完整，所有字段都有明确类型
interface Stock {
  stock_code: string;
  stock_name: string;
  market: "SH" | "SZ";  // 枚举类型
  industry: string | null;  // 明确可空
  list_date: string;  // 日期格式说明
  market_cap: number;
  avg_turnover: number;
  status: "active" | "inactive";  // 枚举类型
  // 可选字段明确标注
  latest_price?: number;
  price_change?: number;
  price_change_percent?: number;
}
```

#### ✅ III. Test-First (NON-NEGOTIABLE) - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:
- quickstart.md 详细说明了测试运行流程
- 项目结构中明确规划了测试目录：
  - 后端：`backend/tests/unit/` 和 `backend/tests/integration/`
  - 前端：`frontend/tests/components/`, `frontend/tests/pages/`, `frontend/tests/services/`
- 测试工具选型明确：
  - 后端：pytest + pytest-asyncio
  - 前端：Vitest + React Testing Library

**下一步**:
- Phase 2 任务分解时，每个任务必须包含"编写测试"步骤在"实现功能"之前

#### ✅ IV. Build & Performance Standards - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:
- 技术研究（research.md）明确选择 TradingView Lightweight Charts（轻量级，约200KB）
- 项目结构规划中提到使用 React.lazy() 懒加载非关键路由
- quickstart.md 提到性能预算：初始 bundle <500KB gzip
- 成功标准（spec.md）明确性能目标：
  - K线图加载 <2秒
  - 交互响应 <300ms
  - 选股筛选 <3秒

**下一步**:
- Phase 2 实现时配置 Vite bundle analyzer
- 设置性能预算监控

#### ✅ V. Observability & Debugging - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:
- 技术研究（research.md）明确后端使用 Python logging 模块，JSON 格式结构化日志
- 日志字段规划：timestamp, level, module, action, user_id, stock_code, error_message
- FastAPI 自带请求日志，添加 correlation ID 追踪请求链路
- 前端错误边界捕获组件错误，记录用户操作上下文

**验证通过**:
- quickstart.md 配置了日志级别环境变量（LOG_LEVEL）
- 开发环境 vs 生产环境日志级别区分（DEBUG vs INFO）

---

### 📊 Phase 1 宪章符合性总结

| 原则 | Phase 0 状态 | Phase 1 后状态 | 变化 |
|------|-------------|---------------|------|
| Component-First | ✅ Pass | ✅ Pass | 组件结构已详细规划 |
| TypeScript | ✅ Pass | ✅ Pass | 类型定义完整，前后端对齐 |
| Test-First | ✅ Pass | ✅ Pass | 测试目录和工具明确 |
| Performance | ✅ Pass | ✅ Pass | 性能目标量化，工具选型优化 |
| Observability | ✅ Pass | ✅ Pass | 日志格式和字段规划完整 |

**Overall Status**: ✅ **PASS** - 所有宪章原则符合，允许进入 Phase 2 任务分解阶段

**关键成果**:
1. ✅ 数据模型设计完成（8个核心实体，完整 ERD 和字段定义）
2. ✅ REST API 契约定义完成（8个模块，40+ 个 endpoints，完整 TypeScript 类型）
3. ✅ 快速开始指南完成（开发环境搭建、测试运行、常见问题）
4. ✅ 技术研究完成（6个关键决策，包含理由和替代方案）
5. ✅ Agent 上下文更新完成（Cursor IDE 规则文件已更新）

**下一步行动**:
- 运行 `/speckit.tasks` 命令生成 Phase 2 任务分解文档
- 开始 TDD 开发流程（测试优先）

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/              # SQLAlchemy 模型（Stock, KLineData, Indicator, User, Favorite, Strategy, Drawing）
│   ├── schemas/             # Pydantic 模型（API 请求/响应 schema）
│   ├── services/            # 业务逻辑层
│   │   ├── stock_service.py        # 股票数据管理（准入标准筛选、数据更新）
│   │   ├── kline_service.py        # K线数据服务（查询、计算周K）
│   │   ├── indicator_service.py    # 技术指标计算服务（MA、KDJ、RSI等）
│   │   ├── filter_service.py       # 选股筛选服务（多条件AND组合）
│   │   ├── strategy_service.py     # 策略管理服务（CRUD）
│   │   ├── favorite_service.py     # 收藏管理服务
│   │   ├── drawing_service.py      # 绘图对象管理服务
│   │   └── data_source_service.py  # 数据源服务（Tushare Pro + AkShare 降级）
│   ├── api/                 # FastAPI 路由
│   │   ├── auth.py                 # 登录、退出
│   │   ├── stocks.py               # 股票搜索、详情
│   │   ├── klines.py               # K线数据查询
│   │   ├── indicators.py           # 技术指标查询
│   │   ├── filters.py              # 选股筛选
│   │   ├── strategies.py           # 策略管理（CRUD）
│   │   ├── favorites.py            # 收藏管理
│   │   └── drawings.py             # 绘图对象管理
│   ├── core/                # 核心配置
│   │   ├── config.py               # 配置管理（Tushare token、SQLite路径）
│   │   ├── database.py             # SQLAlchemy 数据库连接
│   │   ├── security.py             # 认证（JWT token）
│   │   └── scheduler.py            # 定时任务（每日批量计算指标）
│   ├── utils/               # 工具函数
│   │   ├── indicator_calculator.py # 技术指标计算算法
│   │   └── data_validator.py       # 数据验证
│   └── main.py              # FastAPI 应用入口
├── tests/
│   ├── unit/                # 单元测试（services、utils）
│   ├── integration/         # 集成测试（API endpoints）
│   └── conftest.py          # pytest 配置和 fixtures
├── alembic/                 # 数据库迁移（如果需要）
├── requirements.txt         # Python 依赖
└── README.md

frontend/
├── src/
│   ├── components/          # UI 组件
│   │   ├── KLineChart/             # K线图组件（主图+副图）
│   │   ├── IndicatorSelector/      # 技术指标选择器
│   │   ├── StockSearch/            # 股票搜索组件
│   │   ├── FavoriteList/           # 收藏列表组件
│   │   ├── DrawingToolbar/         # 绘图工具栏
│   │   ├── FilterBuilder/          # 筛选条件构建器
│   │   ├── StrategyManager/        # 策略管理组件（列表、编辑、删除）
│   │   └── common/                 # 通用组件（Button、Modal、Loading等）
│   ├── pages/               # 页面组件
│   │   ├── LoginPage.tsx           # 登录页面
│   │   ├── KLineChartPage.tsx      # K线图查看页面
│   │   ├── FilterPage.tsx          # 选股筛选页面
│   │   ├── FavoritePage.tsx        # 收藏列表页面
│   │   └── StrategyPage.tsx        # 策略管理页面
│   ├── services/            # API 服务层
│   │   ├── api.ts                  # Axios 配置和通用请求方法
│   │   ├── authService.ts          # 认证 API
│   │   ├── stockService.ts         # 股票 API
│   │   ├── klineService.ts         # K线 API
│   │   ├── indicatorService.ts     # 技术指标 API
│   │   ├── filterService.ts        # 选股筛选 API
│   │   ├── strategyService.ts      # 策略管理 API
│   │   ├── favoriteService.ts      # 收藏 API
│   │   └── drawingService.ts       # 绘图 API
│   ├── types/               # TypeScript 类型定义
│   │   ├── stock.ts                # Stock 相关类型
│   │   ├── kline.ts                # K线数据类型
│   │   ├── indicator.ts            # 技术指标类型
│   │   ├── filter.ts               # 筛选条件类型
│   │   ├── strategy.ts             # 策略类型
│   │   ├── favorite.ts             # 收藏类型
│   │   └── drawing.ts              # 绘图对象类型
│   ├── hooks/               # 自定义 React Hooks
│   │   ├── useAuth.ts              # 认证 Hook
│   │   ├── useKLineData.ts         # K线数据 Hook
│   │   └── useIndicators.ts        # 技术指标 Hook
│   ├── store/               # 状态管理（如果需要 Redux/Zustand）
│   ├── utils/               # 工具函数
│   │   ├── format.ts               # 数据格式化（价格、日期）
│   │   └── chart.ts                # 图表配置辅助函数
│   ├── App.tsx              # 应用根组件
│   └── main.tsx             # 应用入口
├── tests/
│   ├── components/          # 组件测试
│   ├── pages/               # 页面测试
│   └── services/            # 服务层测试
├── public/                  # 静态资源
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md

data/                        # SQLite 数据库文件目录（git ignore）
└── stocks.db                # 主数据库文件

scripts/                     # 数据初始化和维护脚本
├── init_stocks.py           # 初始化股票列表（应用准入标准）
├── fetch_kline_data.py      # 批量获取历史K线数据
├── calculate_indicators.py  # 批量计算技术指标
└── update_daily.py          # 每日更新脚本（定时任务调用）
```

**Structure Decision**: 
- 采用**前后端分离架构**（Option 2: Web application）
- **后端**（`backend/`）：Python + FastAPI + SQLite，提供 RESTful API
- **前端**（`frontend/`）：React + TypeScript + Vite，独立构建部署
- **数据库**（`data/`）：SQLite 单文件数据库，存储约1000只股票的20年历史数据（12-15GB）
- **脚本**（`scripts/`）：数据初始化和维护脚本，独立于后端服务运行

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**当前状态**: ✅ 无复杂度违规

本项目遵循所有宪章原则，未发现需要豁免的复杂度违规项。所有技术选型和架构决策都符合以下标准：
- 前后端分离架构清晰，符合现代 Web 应用最佳实践
- 组件化设计（Component-First）
- 类型安全（TypeScript + Pydantic）
- 测试优先（TDD）
- 性能优化（轻量级图表库、懒加载、索引优化）
- 可观测性（结构化日志）

如未来出现需要豁免的情况，将在此表格中记录。
