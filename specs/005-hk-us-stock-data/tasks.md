# 任务清单：港股和美股核心股票数据支持

**输入**: 设计文档来自 `/specs/005-hk-us-stock-data/`  
**前置条件**: plan.md, spec.md, research.md, data-model.md, contracts/

**组织方式**: 任务按用户故事分组，每个故事可独立实施和测试

## 格式说明：`[ID] [P?] [Story?] 描述`

- **[P]**: 可以并行执行（不同文件，无依赖）
- **[Story]**: 任务所属的用户故事（如US1, US2, US3）
- 描述中包含具体文件路径

## 路径约定

本项目使用Web应用结构：
- 后端: `backend/src/`, `backend/tests/`
- 前端: `frontend/src/`, `frontend/tests/`
- Python桥接: `bridge/`

---

## Phase 1: 环境准备（共享基础设施）

**目的**: 项目初始化和基础结构搭建

- [ ] T001 扩展Prisma schema添加currency和searchKeywords字段到Stock表 in backend/prisma/schema.prisma
- [ ] T002 为现有A股数据设置默认currency='CNY' (数据迁移)
- [ ] T003 [P] 在Python bridge中安装yfinance依赖 in bridge/requirements.txt
- [ ] T004 [P] 创建TypeScript类型定义文件 in backend/src/types/market-data.ts
- [ ] T005 [P] 创建TypeScript类型定义文件 in frontend/src/types/stock.ts
- [ ] T006 运行Prisma生成和数据库迁移验证

---

## Phase 2: 基础设施（所有用户故事的前置条件）

**目的**: 核心基础设施，必须在任何用户故事开始前完成

**⚠️ 关键**: 在此阶段完成前，不能开始任何用户故事的开发

- [ ] T007 定义IDataSourceAdapter接口 in backend/src/modules/market-data/data-source/data-source.interface.ts
- [ ] T008 实现DataSourceError错误类和ErrorType枚举 in backend/src/modules/market-data/data-source/errors.ts
- [ ] T009 [P] 创建AkShareAdapter类骨架 in backend/src/modules/market-data/data-source/akshare-adapter.ts
- [ ] T010 [P] 创建YahooFinanceAdapter类骨架 in backend/src/modules/market-data/data-source/yahoo-finance-adapter.ts
- [ ] T011 实现重试机制工具函数fetchWithRetry in backend/src/modules/market-data/utils/retry.ts
- [ ] T012 实现并发控制工具函数createRateLimiter in backend/src/modules/market-data/utils/rate-limiter.ts
- [ ] T013 创建ImportManager类（智能数据源切换逻辑） in backend/src/modules/market-data/import/import-manager.ts
- [ ] T014 实现CheckpointTracker类（断点续传） in backend/src/modules/market-data/import/checkpoint-tracker.ts
- [ ] T015 [P] 创建Python bridge脚本模板 in bridge/bridge_template.py

**检查点**: 基础设施就绪 - 用户故事现在可以并行实施

---

## Phase 3: User Story 1 - 导入港股核心股票数据 (Priority: P1) 🎯 MVP

**目标**: 支持从恒生指数和恒生科技指数导入约110只港股的基本信息和10年历史K线数据

**独立测试**: 运行`ts-node src/scripts/import-hk-stocks.ts`，系统成功导入约110只港股，用户可以通过股票代码"00700.HK"查询到腾讯控股的完整信息和历史数据

### 实施任务 - User Story 1

- [ ] T016 [P] [US1] 创建Python脚本获取恒生指数成分股列表 in bridge/fetch_hk_index_constituents.py
- [ ] T017 [P] [US1] 创建Python脚本获取港股基本信息 in bridge/fetch_hk_stock_info.py
- [ ] T018 [P] [US1] 创建Python脚本获取港股K线数据 in bridge/fetch_hk_klines.py
- [ ] T019 [US1] 在AkShareAdapter中实现fetchIndexConstituents方法（港股） in backend/src/modules/market-data/data-source/akshare-adapter.ts
- [ ] T020 [US1] 在AkShareAdapter中实现fetchStockInfo方法（港股） in backend/src/modules/market-data/data-source/akshare-adapter.ts
- [ ] T021 [US1] 在AkShareAdapter中实现fetchKlineData方法（港股） in backend/src/modules/market-data/data-source/akshare-adapter.ts
- [ ] T022 [US1] 在YahooFinanceAdapter中实现港股数据获取方法（作为备选） in backend/src/modules/market-data/data-source/yahoo-finance-adapter.ts
- [ ] T023 [US1] 创建IndexComposition服务处理指数成分股逻辑 in backend/src/modules/market-data/import/index-composition.ts
- [ ] T024 [US1] 实现港股导入脚本主逻辑（命令行参数解析） in backend/src/scripts/import-hk-stocks.ts
- [ ] T025 [US1] 实现港股导入的批量处理逻辑（并发控制） in backend/src/scripts/import-hk-stocks.ts
- [ ] T026 [US1] 实现港股导入的进度显示和日志输出 in backend/src/scripts/import-hk-stocks.ts
- [ ] T027 [US1] 实现港股导入的错误处理和失败报告生成 in backend/src/scripts/import-hk-stocks.ts
- [ ] T028 [US1] 在package.json中添加import-hk快捷命令 in backend/package.json
- [ ] T029 [US1] 手动执行港股导入验证功能（导入测试环境的少量数据）

**检查点**: User Story 1完成 - 港股数据导入功能完整可用

---

## Phase 4: User Story 2 - 导入美股核心股票数据 (Priority: P1)

**目标**: 支持从标普500和纳斯达克100导入约550只美股的基本信息和10年历史K线数据

**独立测试**: 运行`ts-node src/scripts/import-us-stocks.ts`，系统成功导入约550只美股，用户可以通过股票代码"AAPL"查询到苹果公司的完整信息和历史数据

### 实施任务 - User Story 2

- [ ] T030 [P] [US2] 创建或获取标普500和纳斯达克100成分股JSON文件 in backend/data/index-constituents/sp500.json和ndx100.json
- [ ] T031 [P] [US2] 创建Python脚本获取美股基本信息 in bridge/fetch_us_stock_info.py
- [ ] T032 [P] [US2] 创建Python脚本获取美股K线数据 in bridge/fetch_us_klines.py
- [ ] T033 [US2] 在YahooFinanceAdapter中实现fetchIndexConstituents方法（美股） in backend/src/modules/market-data/data-source/yahoo-finance-adapter.ts
- [ ] T034 [US2] 在YahooFinanceAdapter中实现fetchStockInfo方法（美股） in backend/src/modules/market-data/data-source/yahoo-finance-adapter.ts
- [ ] T035 [US2] 在YahooFinanceAdapter中实现fetchKlineData方法（美股） in backend/src/modules/market-data/data-source/yahoo-finance-adapter.ts
- [ ] T036 [US2] 在AkShareAdapter中实现美股数据获取方法（作为备选） in backend/src/modules/market-data/data-source/akshare-adapter.ts
- [ ] T037 [US2] 扩展IndexComposition服务支持美股指数 in backend/src/modules/market-data/import/index-composition.ts
- [ ] T038 [US2] 实现美股导入脚本主逻辑（命令行参数解析） in backend/src/scripts/import-us-stocks.ts
- [ ] T039 [US2] 实现美股导入的批量处理逻辑（并发控制） in backend/src/scripts/import-us-stocks.ts
- [ ] T040 [US2] 实现美股导入的进度显示和日志输出 in backend/src/scripts/import-us-stocks.ts
- [ ] T041 [US2] 实现美股导入的错误处理和失败报告生成 in backend/src/scripts/import-us-stocks.ts
- [ ] T042 [US2] 在package.json中添加import-us快捷命令 in backend/package.json
- [ ] T043 [US2] 手动执行美股导入验证功能（导入测试环境的少量数据）

**检查点**: User Story 2完成 - 美股数据导入功能完整可用

---

## Phase 5: User Story 3 - 查询和分析港股、美股VCP形态 (Priority: P2)

**目标**: 支持对港股和美股执行VCP形态分析，在K线图页面生成和查看分析报告

**独立测试**: 用户选择港股"00700.HK"，点击生成VCP分析报告，系统在5秒内完成分析并在新页面展示VCP形态、收缩阶段、回调状态等信息

### 实施任务 - User Story 3

- [ ] T044 [US3] 扩展VCP分析服务支持多市场（验证market参数） in backend/src/modules/vcp/vcp.service.ts
- [ ] T045 [US3] 为港股和美股创建VCP配置（初期与A股相同） in backend/src/modules/vcp/vcp-config.ts
- [ ] T046 [US3] 扩展calculate-vcp脚本支持HK和US市场参数 in backend/src/scripts/calculate-vcp.ts
- [ ] T047 [US3] 扩展analyze-stock-vcp脚本支持港股和美股代码格式 in backend/src/scripts/analyze-stock-vcp.ts
- [ ] T048 [US3] 在VCP分析报告中添加货币单位显示逻辑（根据stock.currency） in backend/src/scripts/analyze-stock-vcp.ts
- [ ] T049 [US3] 扩展前端VCP分析报告页面显示货币单位 in frontend/src/pages/VcpAnalysis/VcpAnalysisPage.tsx
- [ ] T050 [US3] 扩展export-all-vcp脚本支持导出港股和美股VCP报告 in backend/src/scripts/export-all-vcp.ts
- [ ] T051 [US3] 手动测试：对港股"00700.HK"执行VCP分析，验证结果正确且货币单位为HKD
- [ ] T052 [US3] 手动测试：对美股"AAPL"执行VCP分析，验证结果正确且货币单位为USD

**检查点**: User Story 3完成 - VCP分析支持港股和美股

---

## Phase 6: User Story 4 - 查看跨市场股票列表 (Priority: P2)

**目标**: 支持在股票列表中同时查看和筛选A股、港股、美股

**独立测试**: 用户打开股票列表页面，看到混合的A股、港股、美股列表（每只股票显示市场标识），点击"港股"筛选器后列表只显示港股

### 实施任务 - User Story 4

- [ ] T053 [P] [US4] 创建MarketFilter组件 in frontend/src/components/MarketFilter/MarketFilter.tsx
- [ ] T054 [P] [US4] 添加货币符号映射常量 in frontend/src/constants/currency.ts
- [ ] T055 [P] [US4] 添加市场标签映射常量 in frontend/src/constants/market.ts
- [ ] T056 [US4] 扩展StockService添加market参数支持 in frontend/src/services/stock.service.ts
- [ ] T057 [US4] 扩展股票列表页面集成MarketFilter组件 in frontend/src/pages/StockList/StockListPage.tsx
- [ ] T058 [US4] 在股票列表中显示市场标识（HK/US/SH/SZ） in frontend/src/pages/StockList/StockListPage.tsx
- [ ] T059 [US4] 实现市场筛选逻辑（按market字段过滤） in frontend/src/pages/StockList/StockListPage.tsx
- [ ] T060 [US4] 在股票列表中显示货币单位符号 in frontend/src/pages/StockList/StockListPage.tsx
- [ ] T061 [US4] 扩展后端股票查询API支持market参数筛选 in backend/src/modules/stock/stock.controller.ts
- [ ] T062 [US4] 实现跨语言搜索逻辑（搜索stockName和searchKeywords字段） in backend/src/modules/stock/stock.service.ts
- [ ] T063 [US4] 手动测试：在股票列表页面切换市场筛选器，验证筛选功能正确
- [ ] T064 [US4] 手动测试：搜索"腾讯"和"Apple"，验证搜索结果正确

**检查点**: User Story 4完成 - 跨市场股票列表查看和筛选功能可用

---

## Phase 7: User Story 5 - 增量更新港股和美股K线数据 (Priority: P3)

**目标**: 支持定期更新港股和美股的K线数据，保持数据时效性

**独立测试**: 手动修改某只港股的最新K线数据日期为7天前，运行增量更新脚本，系统检测到数据过期并自动拉取最近7天的K线数据

### 实施任务 - User Story 5

- [ ] T065 [US5] 扩展incremental-update-latest脚本支持HK和US市场参数 in backend/src/scripts/incremental-update-latest.ts
- [ ] T066 [US5] 实现港股最新K线日期查询逻辑 in backend/src/scripts/incremental-update-latest.ts
- [ ] T067 [US5] 实现美股最新K线日期查询逻辑 in backend/src/scripts/incremental-update-latest.ts
- [ ] T068 [US5] 实现港股增量K线数据拉取（调用AkShare/Yahoo Finance） in backend/src/scripts/incremental-update-latest.ts
- [ ] T069 [US5] 实现美股增量K线数据拉取（调用Yahoo Finance/AkShare） in backend/src/scripts/incremental-update-latest.ts
- [ ] T070 [US5] 扩展batch-incremental-update-latest支持港股和美股批量更新 in backend/src/scripts/batch-incremental-update-latest.ts
- [ ] T071 [US5] 手动测试：运行增量更新脚本for港股，验证只更新缺失日期的数据
- [ ] T072 [US5] 手动测试：运行增量更新脚本for美股，验证批量处理和进度显示

**检查点**: User Story 5完成 - 增量更新支持港股和美股

---

## Phase 8: 补充功能和优化（跨用户故事）

**目的**: 补充指数成分股更新功能和系统优化

- [ ] T073 [P] 创建update-index-composition脚本（手动触发指数更新） in backend/src/scripts/update-index-composition.ts
- [ ] T074 [P] 实现指数成分股对比逻辑（识别新增和移除的股票） in backend/src/modules/market-data/import/index-composition.ts
- [ ] T075 [P] 为常用港股和美股添加searchKeywords预置数据 in backend/data/search-keywords.json
- [ ] T076 创建脚本批量导入searchKeywords数据到数据库 in backend/src/scripts/import-search-keywords.ts
- [ ] T077 [P] 扩展K线图组件显示货币单位（在价格轴） in frontend/src/components/StockChart/StockChart.tsx
- [ ] T078 [P] 验证数据库索引性能（跨市场查询） in backend/tests/integration/market-query-performance.spec.ts
- [ ] T079 运行quickstart.md中的完整验证检查清单
- [ ] T080 更新项目文档（README更新多市场支持说明） in README.md

---

## 依赖关系和执行顺序

### 阶段依赖

- **环境准备 (Phase 1)**: 无依赖 - 可立即开始
- **基础设施 (Phase 2)**: 依赖Phase 1完成 - **阻塞所有用户故事**
- **用户故事 (Phase 3-7)**: 所有依赖Phase 2完成
  - User Story 1和2可并行开发（不同数据源，无冲突）
  - User Story 3依赖US1或US2完成（需要有港股或美股数据）
  - User Story 4可与US1-3并行（仅前端展示逻辑）
  - User Story 5依赖US1和US2完成（需要港股和美股数据存在）
- **补充优化 (Phase 8)**: 依赖所需的用户故事完成

### 用户故事依赖图

```
Phase 1 (Setup) → Phase 2 (Foundational)
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
    US1 (P1)        US2 (P1)        US4 (P2)
    港股导入        美股导入        前端多市场
        ↓               ↓               ↓
        └───────┬───────┘               │
                ↓                       │
            US3 (P2)                    │
            VCP分析                     │
                ↓                       │
                └───────┬───────────────┘
                        ↓
                    US5 (P3)
                    增量更新
                        ↓
                    Phase 8
                    补充优化
```

**依赖说明**:
- US1和US2可以并行（无依赖）
- US3需要US1或US2之一完成（需要测试数据）
- US4可以与US1-3并行（仅UI，不依赖数据）
- US5需要US1和US2都完成（需要完整数据集）

### 单个用户故事内部

每个用户故事内部的任务顺序：
1. Python bridge脚本（数据获取层）[P]
2. 数据源适配器实现（调用bridge）
3. 导入管理器/服务层
4. 命令行脚本实现
5. 手动验证测试

### 并行机会

**Phase 1 并行**:
- T003, T004, T005 可以并行（不同文件）

**Phase 2 并行**:
- T009, T010 可以并行（不同适配器）
- T011, T012, T015 可以并行（不同工具文件）

**User Story 1 并行**:
- T016, T017, T018 可以并行（不同Python脚本）

**User Story 2 并行**:
- T030, T031, T032 可以并行（不同文件）

**跨故事并行**:
- US1和US2可以由不同开发者并行开发
- US4（前端）可以与US1-3（后端）并行开发

---

## 并行示例：User Story 1（港股导入）

```bash
# 同时启动US1的所有Python脚本开发:
Task: "创建Python脚本获取恒生指数成分股列表 in bridge/fetch_hk_index_constituents.py"
Task: "创建Python脚本获取港股基本信息 in bridge/fetch_hk_stock_info.py"
Task: "创建Python脚本获取港股K线数据 in bridge/fetch_hk_klines.py"

# 三个脚本完成后，再实现适配器:
Task: "在AkShareAdapter中实现fetchIndexConstituents方法（港股）"
Task: "在AkShareAdapter中实现fetchStockInfo方法（港股）"
Task: "在AkShareAdapter中实现fetchKlineData方法（港股）"
```

---

## 并行示例：跨用户故事

```bash
# Phase 2完成后，可以同时启动多个用户故事:
Developer A: Phase 3 (US1 - 港股导入)
Developer B: Phase 4 (US2 - 美股导入)
Developer C: Phase 6 (US4 - 前端多市场支持)

# US1和US2完成后:
Developer D: Phase 5 (US3 - VCP分析扩展)
Developer E: Phase 7 (US5 - 增量更新扩展)
```

---

## 实施策略

### MVP优先（仅User Story 1和2）

1. 完成Phase 1: 环境准备
2. 完成Phase 2: 基础设施（关键阻塞）
3. 完成Phase 3: User Story 1（港股导入）
4. 完成Phase 4: User Story 2（美股导入）
5. **停止并验证**: 独立测试US1和US2，验证数据导入功能完整
6. 可以先部署/演示基本的数据导入功能

**MVP价值**: 
- 系统支持港股和美股数据导入
- 约660只核心股票，10年历史数据
- 为后续VCP分析和前端展示打下基础

### 增量交付

1. 完成Setup + Foundational → 基础设施就绪
2. 添加US1（港股导入）→ 独立测试 → 交付港股支持
3. 添加US2（美股导入）→ 独立测试 → 交付美股支持
4. 添加US3（VCP分析）→ 独立测试 → 交付分析功能
5. 添加US4（前端多市场）→ 独立测试 → 交付UI改进
6. 添加US5（增量更新）→ 独立测试 → 交付自动化运维
7. 每个故事都增加价值，不破坏已有功能

### 并行团队策略

如果有多个开发者：

1. **全员协作**: 完成Setup + Foundational（1-2天）
2. **Phase 2完成后分工**:
   - 开发者A: User Story 1（港股导入，2-3天）
   - 开发者B: User Story 2（美股导入，3-4天）
   - 开发者C: User Story 4（前端多市场UI，2天）
3. **US1+US2完成后**:
   - 开发者A: User Story 3（VCP分析，1-2天）
   - 开发者B: User Story 5（增量更新，1天）
4. **独立集成**: 每个故事完成后独立测试，无冲突

**总并行时间**: 约6-8天（vs 串行12-16天）

---

## 任务统计

### 总体统计

- **总任务数**: 80个任务
- **可并行任务**: 19个任务标记[P]
- **用户故事覆盖**: 5个用户故事，每个都有独立测试标准

### 各阶段任务数

| 阶段 | 任务数 | 预计耗时 |
|------|--------|---------|
| Phase 1: 环境准备 | 6 | 0.5天 |
| Phase 2: 基础设施 | 9 | 2-3天 |
| Phase 3: US1 港股导入 | 14 | 2-3天 |
| Phase 4: US2 美股导入 | 14 | 3-4天 |
| Phase 5: US3 VCP分析 | 9 | 1-2天 |
| Phase 6: US4 前端多市场 | 12 | 2天 |
| Phase 7: US5 增量更新 | 8 | 1天 |
| Phase 8: 补充优化 | 8 | 1-2天 |

**总预计时间**: 12-16天（串行） / 6-8天（并行）

### MVP范围建议

**最小MVP**: Phase 1 + Phase 2 + Phase 3 + Phase 4
- 任务数: 43个
- 预计时间: 8-10天（串行） / 4-5天（并行）
- 交付价值: 港股和美股数据导入功能完整可用

**推荐MVP**: Phase 1-6（包含VCP分析和前端多市场）
- 任务数: 64个
- 预计时间: 10-14天（串行） / 6-7天（并行）
- 交付价值: 完整的港股和美股支持，用户可以查询、分析、筛选

---

## 并行执行机会识别

### Phase 1 并行组

```
组1（Python环境）:
- T003 安装yfinance依赖

组2（TypeScript类型）:
- T004 后端类型定义
- T005 前端类型定义
```

### Phase 2 并行组

```
组1（适配器骨架）:
- T009 AkShareAdapter骨架
- T010 YahooFinanceAdapter骨架

组2（工具函数）:
- T011 重试机制
- T012 并发控制
- T015 Python bridge模板
```

### User Story 1 并行组

```
组1（Python脚本）:
- T016 获取指数成分股
- T017 获取股票信息
- T018 获取K线数据
```

### User Story 2 并行组

```
组1（数据和脚本）:
- T030 准备成分股JSON文件
- T031 美股基本信息脚本
- T032 美股K线数据脚本
```

### User Story 4 并行组

```
组1（前端组件和常量）:
- T053 MarketFilter组件
- T054 货币符号常量
- T055 市场标签常量
```

---

## 实施注意事项

### 关键路径

最长路径（串行执行）：
```
Phase 1 → Phase 2 → US2（美股导入，3-4天）→ US5（增量更新，1天）→ Phase 8（1-2天）
```

**总串行时间**: 约12-16天

### 风险任务

| 任务 | 风险 | 缓解措施 |
|------|------|---------|
| T021, T035 | 数据源API可能不稳定 | 提前测试API可用性，准备mock数据 |
| T025, T039 | 批量导入可能超时 | 使用分批处理，调整并发参数 |
| T062 | 跨语言搜索性能可能不佳 | 提前测试查询性能，必要时添加索引 |
| T043 | 美股数据量大（550只）导入耗时长 | 先导入少量测试，验证逻辑后再全量导入 |

### 测试检查点

虽然未包含自动化测试任务，但每个用户故事都有手动测试任务：
- US1: T029（港股导入验证）
- US2: T043（美股导入验证）
- US3: T051, T052（VCP分析验证）
- US4: T063, T064（前端多市场验证）
- US5: T071, T072（增量更新验证）
- Phase 8: T079（quickstart完整验证）

### 提交策略

建议提交粒度：
- 每完成一个Phase提交一次
- 每完成一个用户故事提交一次
- 关键文件（如schema扩展）单独提交

---

## 下一步

### 立即开始

从Phase 1开始执行任务：

```bash
# 切换到功能分支（应该已经在）
git checkout 005-hk-us-stock-data

# 开始Task T001: 扩展Prisma schema
# 编辑 backend/prisma/schema.prisma
```

### 推荐流程

1. **第1天**: 完成Phase 1（环境准备）和Phase 2（基础设施）前半部分
2. **第2-3天**: 完成Phase 2后半部分，开始Phase 3（港股导入）
3. **第4-6天**: 完成Phase 3，同时进行Phase 4（美股导入）
4. **第7-8天**: 完成Phase 4，开始Phase 5和Phase 6
5. **第9-10天**: 完成Phase 5和Phase 6，开始Phase 7
6. **第11-12天**: 完成Phase 7和Phase 8，全量数据导入和验证

### 使用speckit工具继续

如果需要进一步分析或实施：

- `/speckit.analyze` - 运行项目一致性分析
- `/speckit.implement` - 开始分阶段实施
- 或手动按任务清单执行

---

## 附注

- **[P]任务**: 不同文件，无依赖，可并行
- **[Story]标签**: 任务归属的用户故事，便于追踪
- **独立可测**: 每个用户故事都可独立完成和测试
- **MVP建议**: Phase 1-4（港股和美股导入功能）
- **提交频率**: 每完成一个用户故事或重要milestone提交一次
- **检查点**: 在每个用户故事完成后验证独立功能
- **避免**: 模糊任务、同文件冲突、破坏故事独立性的跨故事依赖
