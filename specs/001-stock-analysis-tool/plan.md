# Implementation Plan: 股票分析工具

**Branch**: `001-stock-analysis-tool` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-stock-analysis-tool/spec.md`

## Summary

构建一个投资用的股票分析工具网站，支持技术指标选股、K线图查看（含多种技术指标展示）、股票收藏管理、图表绘图分析、手动触发数据更新等功能。系统覆盖约1000只符合准入标准的A股，存储近20年的日K和周K线历史数据，使用预设管理员账户登录，所有用户数据（收藏、选股策略、绘图对象）保存在服务器端。

**技术方案**: 前后端分离架构，**后端使用 Node.js + Nest.js + Prisma + SQLite**，对于Python专用工具（如pandas-ta技术指标计算、AkShare数据源）通过 **Python Bridge** 调用，前端使用React+TypeScript+Vite+TradingView Lightweight Charts，数据源使用Tushare Pro HTTP API（主）+ AkShare Python Bridge（备用）。

---

## Technical Context

**Language/Version**: Node.js 18.18.2 LTS, TypeScript 5.x, pnpm 9.6.0 (包管理器)  
**Primary Dependencies**:

- **后端**: Nest.js 10+, Prisma 5+, SQLite3, Bull + Redis (任务队列), class-validator, @nestjs/swagger, axios (Tushare HTTP API)
- **Python Bridge**: Python 3.11+, pandas-ta (技术指标计算), AkShare (备用数据源), 通过 child_process 或微服务调用
- **前端**: React 18+, TradingView Lightweight Charts (图表), Vite (构建), Axios (HTTP), Ant Design (UI), Zustand (状态管理)
- **包管理器**: 全项目统一使用 pnpm（workspace 模式）

**Storage**: SQLite 3.40+ (单文件数据库，WAL模式，预估12-15GB，存储约1000只股票的20年历史K线数据及技术指标)

**Testing**:

- 后端: Jest + Supertest (集成测试)
- 前端: Vitest + React Testing Library (组件测试)
- E2E: Playwright (端到端测试)

**Target Platform**: Web应用（桌面端优先，响应式支持平板和手机）

**Project Type**: Web application (前后端分离 + Python Bridge 混合架构)

**Performance Goals**:

- K线图加载及渲染 <2秒
- 图表交互操作（缩放、平移、切换周期）响应时间 <300ms
- 选股筛选功能返回结果 <3秒（约1000只股票范围内）
- 增量数据更新任务 <10分钟（1-3个交易日）
- 更新进度反馈轮询间隔 <2秒

**Constraints**:

- 支持100个并发用户访问
- SQLite单文件存储，无需复杂数据库部署
- 数据源API限额管理（Tushare Pro免费版：200次/分钟，10000次/天）
- Python Bridge 开销：child_process 调用延迟 <100ms（单次）
- Redis 可选（使用 Bull）或 node-cron（简化方案）

**Scale/Scope**:

- 约1000只符合准入标准的A股（市值>50亿、日均成交额>1000万、上市>5年、排除ST股）
- 20年历史数据（日K：5,000,000条，周K：1,040,000条）
- 技术指标数据：36,240,000条记录
- 6个核心用户故事（登录、K线图、选股筛选、收藏管理、绘图工具、数据更新）

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ I. Component-First (Frontend)

**Status**: ✅ **PASS**

**Evidence**:

- 前端架构计划将UI功能拆分为独立组件：
  - KLineChart（K线图表，核心组件）
  - IndicatorSelector（技术指标选择器）
  - StockSearch（股票搜索）
  - FavoriteList（收藏列表）
  - DrawingToolbar（绘图工具栏）
  - FilterBuilder（筛选条件构建器）
  - StrategyManager（策略管理）
  - UpdateButton（数据更新按钮）
  - UpdateProgress（更新进度条）
- 每个组件都有清晰的 Props 接口和独立的测试文件

**Action Required**:

- 每个组件需要 TypeScript 接口定义
- 使用 `~/.claude/skills/frontend-design` skill 设计页面布局
- 组件测试文件使用 Vitest + React Testing Library

---

### ✅ II. TypeScript & Type Safety

**Status**: ✅ **PASS**

**Evidence**:

- **后端**: Nest.js 原生 TypeScript，启用 strict mode
- **ORM**: Prisma 自动生成类型安全的数据库客户端
- **验证**: class-validator + class-transformer 运行时类型验证
- **前端**: React + TypeScript strict mode
- **类型定义**:
  - 后端: DTO classes (`backend/src/dto/`)
  - 前端: TypeScript interfaces (`frontend/src/types/`)
  - 自动生成: Prisma Client types

**Action Required**:

- 禁止使用 `any`，需要显式类型标注
- 前后端类型定义保持一致（通过 contracts/api-spec.md 同步）
- Prisma schema 定义所有数据库实体

---

### ✅ III. Test-First (NON-NEGOTIABLE)

**Status**: ✅ **PASS**

**Evidence**:

- 开发流程：编写测试 → 测试失败 → 实现功能 → 测试通过
- **后端测试**:
  - 单元测试: Jest (`*.spec.ts`)
  - 集成测试: Supertest (`*.e2e-spec.ts`)
  - 目标覆盖率: >80%
- **前端测试**:
  - 组件测试: Vitest + React Testing Library
  - E2E测试: Playwright
- **测试文件组织**:
  - 后端: `backend/test/unit/`, `backend/test/integration/`
  - 前端: `frontend/tests/components/`, `frontend/tests/pages/`

**Action Required**:

- tasks.md 中每个用户故事都有独立的"测试"部分，必须先完成
- 测试命名规范: `*.spec.ts` (后端), `*.test.tsx` (前端)

---

### ✅ IV. Build & Performance Standards

**Status**: ✅ **PASS**

**Evidence**:

- **前端构建**: Vite（快速 HMR，优化的生产构建）
- **代码分割**: React.lazy() 懒加载所有页面路由
- **Bundle 监控**: vite-plugin-bundle-visualizer
- **性能预算**: 初始 bundle <500KB gzip
- **图表库选择**: TradingView Lightweight Charts（轻量级，~200KB）
- **后端性能**:
  - Nest.js + Fastify 适配器（高性能）
  - Prisma 查询优化（使用 select, where, 索引）
  - SQLite WAL 模式 + 连接池

**Action Required**:

- 配置 Vite bundle analyzer
- 实施懒加载策略
- 监控 bundle 大小变化

---

### ✅ V. Observability & Debugging

**Status**: ✅ **PASS**

**Evidence**:

- **后端日志**:
  - Nest.js 内置 Logger
  - Winston 或 Pino 结构化日志（JSON格式）
  - 日志字段: timestamp, level, module, correlationId, userId, stockCode, error
- **前端错误处理**:
  - ErrorBoundary 组件捕获 React 错误
  - Axios 拦截器记录 API 错误
  - 上下文记录: page, action, stockCode
- **请求追踪**: correlation ID 中间件（跨服务追踪）
- **健康检查**: `/api/v1/health` 端点

**Action Required**:

- 配置结构化日志格式
- 实现 correlation ID 中间件
- 前端 console.error 包含上下文信息

---

### 📋 Constitution Compliance Summary

| 原则            | 状态    | 关键证据                         |
| --------------- | ------- | -------------------------------- |
| Component-First | ✅ Pass | 组件化架构，独立测试             |
| TypeScript      | ✅ Pass | Nest.js + Prisma，strict mode    |
| Test-First      | ✅ Pass | TDD 工作流，每个用户故事都有测试 |
| Performance     | ✅ Pass | 性能目标量化，工具选型优化       |
| Observability   | ✅ Pass | 结构化日志，correlation ID       |

**Overall Status**: ✅ **PASS** - 允许进入 Phase 0 研究阶段

**Re-check Trigger**: Phase 1 设计完成后重新验证

---

## Project Structure

### Documentation (this feature)

```text
specs/001-stock-analysis-tool/
├── spec.md                      # 功能规格
├── plan.md                      # 本文件 - 实施计划
├── research.md                  # Phase 0 输出 - 技术研究
├── data-model.md                # Phase 1 输出 - 数据模型（Prisma）
├── contracts/
│   └── api-spec.md              # Phase 1 输出 - REST API 规格
├── quickstart.md                # Phase 1 输出 - 快速开始指南
├── technical-indicators.md      # 技术指标详细说明
├── admission-criteria.md        # 股票准入标准
├── datasource-config.md         # 数据源配置
└── tasks.md                     # Phase 2 输出 - 任务分解
```

---

### Source Code (repository root)

```text
backend/                         # Node.js + Nest.js 后端
├── src/
│   ├── modules/                 # 功能模块
│   │   ├── auth/                # 认证模块
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   ├── stocks/              # 股票模块
│   │   │   ├── stocks.controller.ts
│   │   │   ├── stocks.service.ts
│   │   │   └── dto/
│   │   ├── klines/              # K线模块
│   │   ├── indicators/          # 技术指标模块
│   │   ├── screener/            # 选股筛选模块
│   │   ├── strategies/          # 策略管理模块
│   │   ├── favorites/           # 收藏模块
│   │   ├── drawings/            # 绘图模块
│   │   └── data-update/         # 数据更新模块
│   ├── services/                # 共享服务
│   │   ├── python-bridge/       # Python Bridge 封装
│   │   │   ├── python-bridge.service.ts
│   │   │   └── bridge-executor.ts
│   │   ├── datasource/          # 数据源服务
│   │   │   ├── tushare.service.ts
│   │   │   ├── akshare.service.ts  (通过bridge)
│   │   │   └── datasource-manager.service.ts
│   │   └── indicator-calculator/ # 指标计算
│   │       ├── native-calculator.ts  (Node.js 原生)
│   │       └── bridge-calculator.ts  (Python bridge)
│   ├── common/                  # 通用代码
│   │   ├── decorators/
│   │   ├── filters/             # 异常过滤器
│   │   ├── guards/              # 守卫
│   │   ├── interceptors/        # 拦截器
│   │   ├── pipes/               # 管道
│   │   └── middleware/          # 中间件
│   ├── config/                  # 配置
│   │   ├── database.config.ts
│   │   ├── queue.config.ts
│   │   └── datasource.config.ts
│   ├── jobs/                    # 后台任务
│   │   ├── data-update.processor.ts
│   │   └── scheduler.service.ts
│   └── main.ts                  # 应用入口
├── prisma/
│   ├── schema.prisma            # Prisma 数据模型
│   └── migrations/              # 数据库迁移
├── test/
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # E2E 测试
├── scripts/                     # 数据脚本
│   ├── init-stocks.ts           # 初始化股票列表
│   ├── fetch-klines.ts          # 获取历史K线
│   ├── calculate-indicators.ts  # 计算技术指标
│   └── seed.ts                  # 数据库种子
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example

bridge/                          # Python Bridge 脚本
├── calculate_kdj.py             # KDJ 计算（可选）
├── akshare_fetcher.py           # AkShare 数据获取
├── requirements.txt
└── README.md

frontend/                        # React + TypeScript 前端
├── src/
│   ├── components/              # UI 组件
│   │   ├── KLineChart/          # K线图组件
│   │   ├── IndicatorSelector/   # 指标选择器
│   │   ├── StockSearch/         # 股票搜索
│   │   ├── FavoriteList/        # 收藏列表
│   │   ├── DrawingToolbar/      # 绘图工具栏
│   │   ├── FilterBuilder/       # 筛选条件构建器
│   │   ├── StrategyManager/     # 策略管理
│   │   ├── UpdateButton/        # 更新按钮
│   │   ├── UpdateProgress/      # 更新进度条
│   │   └── common/              # 通用组件
│   ├── pages/                   # 页面组件
│   │   ├── LoginPage.tsx
│   │   ├── KLineChartPage.tsx
│   │   ├── FilterPage.tsx
│   │   ├── StrategyPage.tsx
│   │   ├── FavoritePage.tsx
│   │   └── DataManagementPage.tsx
│   ├── services/                # API 服务层
│   │   ├── api.ts               # Axios 配置
│   │   ├── auth.service.ts
│   │   ├── stock.service.ts
│   │   ├── kline.service.ts
│   │   ├── indicator.service.ts
│   │   ├── screener.service.ts
│   │   ├── strategy.service.ts
│   │   ├── favorite.service.ts
│   │   ├── drawing.service.ts
│   │   └── update.service.ts
│   ├── types/                   # TypeScript 类型
│   │   ├── stock.ts
│   │   ├── kline.ts
│   │   ├── indicator.ts
│   │   ├── filter.ts
│   │   ├── strategy.ts
│   │   ├── favorite.ts
│   │   ├── drawing.ts
│   │   └── update.ts
│   ├── hooks/                   # React Hooks
│   │   ├── useAuth.ts
│   │   ├── useKLineData.ts
│   │   ├── useIndicators.ts
│   │   └── useUpdatePolling.ts
│   ├── store/                   # Zustand 状态管理
│   │   ├── auth.store.ts
│   │   ├── chart.store.ts
│   │   └── update.store.ts
│   ├── utils/                   # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── tests/                       # 测试文件
│   ├── components/
│   ├── pages/
│   └── services/
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example

data/                            # SQLite 数据文件（.gitignore）
└── stocks.db

docker/
├── backend.Dockerfile
├── frontend.Dockerfile
└── docker-compose.yml
```

**Structure Decision**:

- 采用**前后端分离 + Python Bridge 混合架构**
- **后端**（`backend/`）：Node.js + Nest.js + Prisma + SQLite，提供 RESTful API
- **Python Bridge**（`bridge/`）：独立的 Python 脚本，通过 child_process 调用
- **前端**（`frontend/`）：React + TypeScript + Vite，独立构建部署
- **数据库**（`data/`）：SQLite 单文件数据库，存储约1000只股票的20年历史数据（12-15GB）

---

## Python Bridge 架构设计

### Bridge 调用流程

```
Node.js API Request
      ↓
Nest.js Controller
      ↓
Service Layer
      ↓
┌─────┴──────┐
│            │
Node.js      Python Bridge
原生计算      (可选/备用)
│            │
└─────┬──────┘
      ↓
Response
```

### 使用场景

1. **技术指标计算**:
   - **优先**: Node.js 原生库（technicalindicators）
   - **Fallback**: Python Bridge（pandas-ta）- 如果精度有问题

2. **数据源访问**:
   - **Tushare**: Node.js 直接 HTTP 调用（推荐）
   - **AkShare**: Python Bridge（必需，无 HTTP API）

3. **复杂数据处理**:
   - **周K聚合**: Node.js 原生（简单逻辑）
   - **批量计算**: Python Bridge（pandas 向量化，性能更好）

### Bridge 实现

```typescript
// backend/src/services/python-bridge/python-bridge.service.ts
import {Injectable, Logger} from '@nestjs/common'
import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)

@Injectable()
export class PythonBridgeService {
  private readonly logger = new Logger(PythonBridgeService.name)

  async execute<T>(script: string, args: any): Promise<T> {
    try {
      const input = JSON.stringify(args)
      const command = `python3 bridge/${script} '${input.replace(/'/g, "'\\''")}'`

      this.logger.debug(`Executing Python bridge: ${script}`)

      const {stdout, stderr} = await execAsync(command, {
        timeout: 30000, // 30秒超时
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      if (stderr) {
        this.logger.warn(`Python stderr: ${stderr}`)
      }

      const result = JSON.parse(stdout)
      this.logger.debug(`Python bridge completed: ${script}`)

      return result
    } catch (error) {
      this.logger.error(`Python bridge error: ${error.message}`)
      throw new InternalServerErrorException(
        `Python bridge failed: ${error.message}`,
      )
    }
  }
}
```

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**当前状态**: ✅ 无复杂度违规

本项目遵循所有宪章原则，未发现需要豁免的复杂度违规项。

**混合架构说明**:

- Node.js + Python Bridge 的混合架构是技术需求驱动，而非复杂度违规
- Python Bridge 仅用于特定场景（AkShare 数据源、可选的 pandas-ta 计算）
- 核心逻辑全部在 Node.js 中实现，保持架构清晰

如未来出现需要豁免的情况，将在此表格中记录。

---

## Phase 0: 研究阶段

**目标**: 解决技术栈选型和架构设计的所有未知项

**输出**: `research.md`

### 研究任务

已完成的关键决策（详见 `research.md`）：

1. ✅ **Node.js 后端框架选择** → Nest.js (企业级架构、TypeScript 优先、完整生态)
2. ✅ **数据库 ORM 选择** → Prisma (类型安全、性能优秀、迁移工具强大)
3. ✅ **技术指标计算方案** → Node.js 原生 (technicalindicators) + Python Bridge 备用 (pandas-ta)
4. ✅ **数据源访问方案** → Tushare HTTP API (主) + AkShare Python Bridge (备)
5. ✅ **异步任务系统** → Bull + Redis (生产) 或 node-cron (简化)
6. ✅ **图表库选择** → TradingView Lightweight Charts (轻量级、高性能)

**状态**: ✅ Phase 0 完成

---

## Phase 1: 设计阶段

**目标**: 生成详细的数据模型、API 契约和开发指南

**输出**: `data-model.md`, `contracts/api-spec.md`, `quickstart.md`

### 设计产物

1. ✅ **data-model.md**:
   - Prisma Schema 定义9个核心实体
   - TypeScript 类型定义
   - 索引优化策略
   - 存储空间估算（12-15GB）

2. ✅ **contracts/api-spec.md**:
   - REST API 规格（40+ 端点）
   - 请求/响应格式
   - 错误处理规范
   - 限流和 CORS 配置

3. ✅ **quickstart.md**:
   - Node.js + Python Bridge 混合环境搭建
   - 数据初始化流程
   - 开发和部署指南
   - 常见问题解决

**状态**: ✅ Phase 1 完成

---

## Phase 1 后 Constitution 重新评估

### ✅ I. Component-First - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:

- API 契约清晰定义了前后端接口边界（REST API）
- 数据模型使用 Prisma，自动生成 TypeScript 类型
- 组件结构已规划：KLineChart, IndicatorSelector, StockSearch, FilterBuilder 等
- 每个组件都是独立的功能模块，具有清晰的 Props 接口

**Action Items**:

- [ ] Phase 2 任务分解时，为每个组件创建独立的测试文件
- [ ] 使用 `~/.claude/skills/frontend-design` skill 设计页面布局

---

### ✅ II. TypeScript & Type Safety - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:

- Nest.js 原生 TypeScript 支持
- Prisma 自动生成类型安全的数据库客户端
- class-validator 提供运行时验证
- 前后端类型定义完整（contracts/api-spec.md）
- tsconfig.json strict mode 已启用

---

### ✅ III. Test-First - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:

- quickstart.md 详细说明了测试运行流程
- 测试工具完整：Jest (后端), Vitest (前端), Playwright (E2E)
- 每个用户故事都有测试任务在实现任务之前

---

### ✅ IV. Build & Performance Standards - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:

- Vite 构建配置，支持代码分割和懒加载
- TradingView Lightweight Charts（轻量级，~200KB）
- Prisma 查询优化，SQLite WAL 模式
- 性能目标明确量化（<2秒, <300ms, <3秒, <10分钟）

---

### ✅ V. Observability & Debugging - 重新评估

**评估结果**: ✅ **PASS**

**Evidence**:

- Nest.js 内置 Logger
- 结构化日志（JSON格式）
- Correlation ID 中间件
- 健康检查端点
- 前端 ErrorBoundary

---

### 📋 Phase 1 宪章符合性总结

| 原则            | Phase 0 状态 | Phase 1 后状态 | 变化                        |
| --------------- | ------------ | -------------- | --------------------------- |
| Component-First | ✅ Pass      | ✅ Pass        | 组件结构已详细规划          |
| TypeScript      | ✅ Pass      | ✅ Pass        | Prisma 类型生成，前后端对齐 |
| Test-First      | ✅ Pass      | ✅ Pass        | 测试工具和流程明确          |
| Performance     | ✅ Pass      | ✅ Pass        | 性能目标量化，优化策略明确  |
| Observability   | ✅ Pass      | ✅ Pass        | 日志和监控完整规划          |

**Overall Status**: ✅ **PASS** - 所有宪章原则符合，允许进入 Phase 2 任务分解阶段

---

## 关键技术决策总结

### 1. Node.js 技术栈

| 组件     | 技术选择            | 理由                                  |
| -------- | ------------------- | ------------------------------------- |
| 框架     | Nest.js             | 企业级架构、TypeScript 优先、完整生态 |
| ORM      | Prisma              | 类型安全、性能好、迁移工具强          |
| 任务队列 | Bull (Redis)        | 成熟稳定、支持进度追踪                |
| 技术指标 | technicalindicators | Node.js 原生，部署简单                |
| 验证     | class-validator     | Nest.js 官方推荐，装饰器风格          |
| 文档     | @nestjs/swagger     | 自动生成 API 文档                     |

### 2. Python Bridge

| 用途           | 技术                | 调用方式             |
| -------------- | ------------------- | -------------------- |
| AkShare 数据   | Python akshare 库   | child_process        |
| pandas-ta 计算 | Python pandas-ta 库 | child_process (可选) |
| 批量数据处理   | Python pandas       | 脚本方式             |

### 3. 数据源策略

```
优先级: Tushare HTTP API (Node.js 原生)
           ↓ 失败
       AkShare (Python Bridge)
           ↓ 失败
       返回错误提示
```

---

## 下一步行动

✅ **Phase 0-1 完成**

**进入 Phase 2**:

```bash
/speckit.tasks
```

这将生成 `tasks.md`，包含：

- 按优先级分组的开发任务
- 每个任务的验收标准
- 任务依赖关系
- 并行执行机会

**或立即开始开发**:

```bash
/develop-phase Phase 1  # 项目初始化
```

---

## 关键指标总结

| 维度   | 目标               | 验证方式        |
| ------ | ------------------ | --------------- |
| 性能   | K线加载 <2秒       | Performance API |
| 性能   | 交互响应 <300ms    | Performance API |
| 性能   | 筛选 <3秒          | API 响应时间    |
| 性能   | 增量更新 <10分钟   | 任务执行时间    |
| 可靠性 | 测试覆盖率 >80%    | Jest coverage   |
| 可用性 | 100 并发用户       | 负载测试        |
| 存储   | 数据库大小 12-15GB | 磁盘使用        |

---

## 所有文档位置

| 文档       | 路径                                                  | 状态      |
| ---------- | ----------------------------------------------------- | --------- |
| 功能规格   | specs/001-stock-analysis-tool/spec.md                 | ✅        |
| 实施计划   | specs/001-stock-analysis-tool/plan.md                 | ✅ 本文件 |
| 技术研究   | specs/001-stock-analysis-tool/research.md             | ✅        |
| 数据模型   | specs/001-stock-analysis-tool/data-model.md           | ✅        |
| API 契约   | specs/001-stock-analysis-tool/contracts/api-spec.md   | ✅        |
| 快速开始   | specs/001-stock-analysis-tool/quickstart.md           | ✅        |
| 技术指标   | specs/001-stock-analysis-tool/technical-indicators.md | ✅        |
| 准入标准   | specs/001-stock-analysis-tool/admission-criteria.md   | ✅        |
| 数据源配置 | specs/001-stock-analysis-tool/datasource-config.md    | ✅        |
| 任务清单   | specs/001-stock-analysis-tool/tasks.md                | ✅        |
