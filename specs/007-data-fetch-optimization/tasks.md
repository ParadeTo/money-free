# Tasks: 股票数据更新效率优化

**Input**: Design documents from `/specs/007-data-fetch-optimization/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are REQUIRED per Constitution Check (Test-First principle). Existing scripts lack systematic testing - this feature establishes the test framework.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `backend/src/`, `backend/tests/`
- Scripts: `backend/src/scripts/`
- Tests: `backend/tests/unit/`, `backend/tests/integration/`

---

## Phase 1: Setup (共享基础设施)

**Purpose**: 项目初始化和测试框架搭建

- [x] T001 验证Node.js 20.x环境和依赖安装 in backend/
- [x] T002 [P] 安装性能优化依赖 (p-limit, date-fns, date-fns-tz) in backend/package.json
- [x] T003 [P] 配置Jest测试框架和TypeScript配置 in backend/jest.config.js
- [x] T004 [P] 创建测试目录结构 (unit/, integration/) in backend/tests/
- [x] T005 创建优化模块目录 in backend/src/scripts/ 子目录结构

---

## Phase 2: Foundational (阻塞性前置条件)

**Purpose**: 核心优化模块,所有用户故事的基础

**⚠️ CRITICAL**: 所有用户故事必须等待此阶段完成

### 核心优化模块实现

- [x] T006 [P] 实现BatchWriter批量写入器类 in backend/src/scripts/optimized-batch-writer.ts
- [x] T007 [P] 实现ConcurrentFetcher并发控制器类 in backend/src/scripts/concurrent-fetcher.ts
- [x] T008 [P] 实现CheckpointManager断点管理器类 in backend/src/scripts/checkpoint-manager.ts
- [x] T009 [P] 实现ProgressTracker进度追踪器类 in backend/src/scripts/progress-tracker.ts
- [x] T010 [P] 实现DataSourceCache数据源缓存类 in backend/src/scripts/data-source-cache.ts
- [x] T011 实现IncrementalIndicatorCalculator增量指标计算器 in backend/src/scripts/incremental-indicator-calculator.ts

### 核心模块测试

- [x] T012 [P] BatchWriter单元测试 in backend/tests/unit/batch-writer.spec.ts
- [x] T013 [P] ConcurrentFetcher单元测试 in backend/tests/unit/concurrent-fetcher.spec.ts
- [x] T014 [P] CheckpointManager单元测试 in backend/tests/unit/checkpoint-manager.spec.ts
- [x] T015 [P] ProgressTracker单元测试 in backend/tests/unit/progress-tracker.spec.ts
- [x] T016 [P] DataSourceCache单元测试 in backend/tests/unit/data-source-cache.spec.ts
- [x] T017 IncrementalIndicatorCalculator单元测试 in backend/tests/unit/incremental-indicator-calc.spec.ts

### 工具函数和类型定义

- [x] T018 [P] 创建时区转换工具函数 in backend/src/scripts/utils/timezone.ts
- [x] T019 [P] 创建数据验证工具函数 in backend/src/scripts/utils/validation.ts
- [x] T020 [P] 创建重试策略工具函数 in backend/src/scripts/utils/retry.ts
- [x] T021 [P] 定义优化模块的TypeScript类型 in backend/src/scripts/types/optimization.ts

**Checkpoint**: 基础模块就绪 - 用户故事实现可以并行开始

---

## Phase 3: User Story 1 - 每日增量更新 (Priority: P1) 🎯 MVP

**Goal**: 将1300只股票的增量更新时间从30-40分钟缩短到15分钟以内,同时保持95%以上成功率

**Independent Test**: 运行优化后的增量更新命令,验证:
- 更新时间 ≤ 15分钟
- 成功率 ≥ 95%
- 实时进度显示正常
- 智能跳过已是最新的股票

### 测试先行 (US1)

> **NOTE: 先编写这些测试,确保它们失败后再实现功能**

- [x] T022 [P] [US1] 增量更新集成测试框架 in backend/tests/integration/incremental-update.spec.ts
- [x] T023 [P] [US1] 并发控制性能测试 in backend/tests/integration/concurrency-test.spec.ts
- [x] T024 [P] [US1] API重试机制测试 in backend/tests/integration/api-retry.spec.ts
- [x] T025 [P] [US1] 智能跳过机制测试 in backend/tests/integration/smart-skip.spec.ts

### 核心实现 (US1)

- [x] T026 [US1] 优化incremental-update-all-markets.ts主脚本 (集成核心模块)
- [x] T027 [US1] 实现分市场并发控制逻辑 (A股8并发, 港股/美股3并发)
- [x] T028 [US1] 实现智能跳过机制 (查询最新日期,避免不必要API调用)
- [x] T029 [US1] 实现批量数据库写入 (使用BatchWriter, 100条/批次)
- [x] T030 [US1] 实现增量指标计算 (使用IncrementalIndicatorCalculator)
- [x] T031 [US1] 实现实时进度显示 (使用ProgressTracker, 每10只或10秒更新)
- [x] T032 [US1] 实现API重试和降级策略 (指数退避, 主备切换)
- [x] T033 [US1] 实现任务互斥锁机制 (检查UpdateLog running状态)
- [x] T034 [US1] 实现数据验证 (K线数据格式检查)
- [x] T035 [US1] 实现UTC时间转换 (使用timezone工具)

### 命令行接口 (US1)

- [x] T036 [US1] 实现命令行参数解析 (--markets, --limit, --index-only, --resume)
- [x] T037 [US1] 实现干运行模式 (--dry-run)
- [x] T038 [US1] 实现详细日志模式 (--verbose)
- [x] T039 [US1] 实现错误输出格式化 (标准错误码和JSON格式)

### 集成和验证 (US1)

- [x] T040 [US1] 运行集成测试,验证所有测试通过
- [x] T041 [US1] 性能基准测试 (验证15分钟目标)
- [x] T042 [US1] 在测试环境执行完整更新流程
- [x] T043 [US1] 验证成功率 ≥ 95%和进度显示功能

**Checkpoint**: 用户故事1应该完全功能化并可独立测试

---

## Phase 4: User Story 2 - 全量历史数据导入 (Priority: P2)

**Goal**: 将100只股票5年历史数据的导入时间从4-5小时缩短到2小时以内,支持断点续传

**Independent Test**: 执行全量导入命令,验证:
- 导入时间 ≤ 2小时 (100只股票)
- 断点续传功能正常 (中断后可恢复)
- 自动计算技术指标
- 支持多数据源降级

### 测试先行 (US2)

- [x] T044 [P] [US2] 全量导入集成测试框架 in backend/tests/integration/full-import.spec.ts
- [x] T045 [P] [US2] 断点续传功能测试 in backend/tests/integration/checkpoint-recovery.spec.ts
- [x] T046 [P] [US2] 批量历史数据获取测试 in backend/tests/integration/bulk-fetch.spec.ts
- [x] T047 [P] [US2] 多数据源降级测试 in backend/tests/integration/datasource-fallback.spec.ts

### 核心实现 (US2)

- [x] T048 [US2] 创建full-import-stocks.ts新脚本 (全量导入统一入口)
- [x] T049 [US2] 实现市场类型选择逻辑 (支持SH, SZ, HK, US, A)
- [x] T050 [US2] 实现股票列表筛选 (支持--stocks, --file参数)
- [x] T051 [US2] 实现日期范围指定 (--start-date, --end-date)
- [x] T052 [US2] 集成CheckpointManager实现断点续传
- [x] T053 [US2] 实现批量历史数据获取 (并发控制)
- [x] T054 [US2] 实现数据源选择 (--source参数: tushare, akshare, yahoo_finance)
- [x] T055 [US2] 实现全量数据批量写入 (使用BatchWriter)
- [x] T056 [US2] 实现周线数据处理
- [x] T057 [US2] 集成技术指标计算 (导入完成后自动计算)

### 断点恢复机制 (US2)

- [x] T058 [US2] 实现ImportCheckpoint创建和更新逻辑
- [x] T059 [US2] 实现任务恢复查询 (--resume参数)
- [x] T060 [US2] 实现进度计数器更新 (每只股票完成后)
- [x] T061 [US2] 实现失败股票记录 (JSON格式)

### 集成和验证 (US2)

- [x] T062 [US2] 运行集成测试,验证所有测试通过
- [x] T063 [US2] 性能基准测试 (验证2小时目标)
- [x] T064 [US2] 测试断点续传功能 (手动中断并恢复)
- [x] T065 [US2] 验证历史数据完整性和准确性

**Checkpoint**: 用户故事2应该完全功能化并可独立测试

---

## Phase 5: User Story 3 - 监控和诊断更新状态 (Priority: P3)

**Goal**: 提供实时监控和诊断工具,帮助管理员了解更新状态和性能指标

**Independent Test**: 运行管理工具,验证:
- 可查询正在运行的任务状态
- 可查看详细的统计报告
- 可清理异常任务锁
- 可生成性能报告

### 测试先行 (US3)

- [x] T066 [P] [US3] 任务查询功能测试 in backend/tests/integration/task-query.spec.ts
- [x] T067 [P] [US3] 性能报告生成测试 in backend/tests/integration/performance-report.spec.ts
- [x] T068 [P] [US3] 任务锁清理测试 in backend/tests/integration/lock-cleanup.spec.ts

### 核心实现 (US3)

- [x] T069 [US3] 创建manage-tasks.ts管理工具脚本
- [x] T070 [US3] 实现任务状态查询功能 (query-task-status命令)
- [x] T071 [US3] 实现正在运行任务查询 (--running参数)
- [x] T072 [US3] 实现历史任务查询 (--recent参数)
- [x] T073 [US3] 实现任务锁清理功能 (cleanup-task-lock命令)
- [x] T074 [US3] 实现超时任务清理 (--timeout参数)
- [x] T075 [US3] 实现强制清理功能 (--force参数)
- [x] T076 [US3] 实现性能报告生成 (generate-performance-report命令)
- [x] T077 [US3] 实现报告输出格式化 (控制台/JSON/CSV)
- [x] T078 [US3] 实现日期范围筛选 (--start-date, --end-date)

### 性能指标收集 (US3)

- [x] T079 [US3] 实现UpdateLog数据聚合查询
- [x] T080 [US3] 实现按市场分类统计
- [x] T081 [US3] 实现API成功率统计
- [x] T082 [US3] 实现处理速度趋势分析
- [x] T083 [US3] 实现常见错误分析

### 集成和验证 (US3)

- [x] T084 [US3] 运行集成测试,验证所有测试通过
- [x] T085 [US3] 测试查询功能完整性
- [x] T086 [US3] 测试报告生成准确性
- [x] T087 [US3] 验证清理功能安全性

**Checkpoint**: 所有用户故事应该现在独立功能化

---

## Phase 6: Polish & 脚本整合清理

**Purpose**: 脚本整合、文档更新和性能优化

### 脚本整合

- [x] T088 [P] 在废弃脚本中添加废弃警告 (incremental-update-hk-us.ts等6个脚本)
- [x] T089 [P] 创建MIGRATION.md迁移指南 in backend/scripts/
- [x] T090 [P] 更新package.json添加npm scripts快捷方式
- [x] T091 [P] 移动测试脚本到tests/integration/ (test-import-hk.ts等3个)

### 文档更新

- [x] T092 [P] 更新backend/README.md添加优化说明
- [x] T093 [P] 创建命令使用示例文档
- [x] T094 [P] 更新现有脚本注释和文档字符串
- [x] T095 [P] 创建故障排查指南

### 性能优化和验证

- [x] T096 运行完整性能基准测试套件
- [x] T097 验证所有成功标准 (SC-001到SC-010)
- [x] T098 验证内存占用 ≤ 500MB
- [x] T099 验证数据库写入性能 (300条/秒)
- [x] T100 代码审查和重构优化

### 最终验证

- [x] T101 执行quickstart.md中的所有场景
- [x] T102 验证所有CLI契约正确实现
- [x] T103 运行完整的集成测试套件
- [x] T104 生成最终性能报告和对比
- [x] T105 准备部署文档和发布说明

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-5)**: 所有依赖Foundational完成
  - 用户故事可并行进行 (如果有足够人员)
  - 或按优先级顺序执行 (P1 → P2 → P3)
- **Polish (Phase 6)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完成后可开始 - 不依赖其他故事
- **User Story 2 (P2)**: Foundational完成后可开始 - 不依赖US1,独立可测
- **User Story 3 (P3)**: Foundational完成后可开始 - 不依赖US1/US2,独立可测

### Within Each User Story

- 测试必须先编写并失败
- 核心实现遵循:数据流→业务逻辑→接口
- 集成测试最后执行
- 故事完成后再转移到下一优先级

### Parallel Opportunities

- Phase 1所有标记[P]的任务可并行
- Phase 2所有标记[P]的任务可并行 (在Phase 2内)
- Foundational完成后,所有用户故事可并行开始 (如果团队容量允许)
- 每个用户故事内标记[P]的测试可并行
- 每个用户故事内标记[P]的模块可并行
- 不同用户故事可由不同团队成员并行工作

---

## Parallel Example: User Story 1

```bash
# 并行启动User Story 1的所有测试:
Task T022: "增量更新集成测试框架 in backend/tests/integration/incremental-update.spec.ts"
Task T023: "并发控制性能测试 in backend/tests/integration/concurrency-test.spec.ts"
Task T024: "API重试机制测试 in backend/tests/integration/api-retry.spec.ts"
Task T025: "智能跳过机制测试 in backend/tests/integration/smart-skip.spec.ts"

# 并行启动Foundational阶段的核心模块实现:
Task T006: "BatchWriter in backend/src/scripts/optimized-batch-writer.ts"
Task T007: "ConcurrentFetcher in backend/src/scripts/concurrent-fetcher.ts"
Task T008: "CheckpointManager in backend/src/scripts/checkpoint-manager.ts"
Task T009: "ProgressTracker in backend/src/scripts/progress-tracker.ts"
Task T010: "DataSourceCache in backend/src/scripts/data-source-cache.ts"
```

---

## Parallel Example: User Story 2

```bash
# 并行启动User Story 2的所有测试:
Task T044: "全量导入集成测试框架 in backend/tests/integration/full-import.spec.ts"
Task T045: "断点续传功能测试 in backend/tests/integration/checkpoint-recovery.spec.ts"
Task T046: "批量历史数据获取测试 in backend/tests/integration/bulk-fetch.spec.ts"
Task T047: "多数据源降级测试 in backend/tests/integration/datasource-fallback.spec.ts"
```

---

## Parallel Example: Polish Phase

```bash
# 并行启动脚本整合和文档更新:
Task T088: "添加废弃警告在6个旧脚本中"
Task T089: "创建MIGRATION.md in backend/scripts/"
Task T090: "更新package.json添加npm scripts"
Task T091: "移动测试脚本到tests/integration/"
Task T092: "更新backend/README.md"
Task T093: "创建命令使用示例文档"
Task T094: "更新现有脚本文档"
Task T095: "创建故障排查指南"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL - 阻塞所有故事)
3. 完成 Phase 3: User Story 1
4. **停止并验证**: 独立测试User Story 1
5. 如果就绪,部署/演示

### Incremental Delivery

1. 完成 Setup + Foundational → 基础就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示 (MVP!)
3. 添加 User Story 2 → 独立测试 → 部署/演示
4. 添加 User Story 3 → 独立测试 → 部署/演示
5. 每个故事增加价值而不破坏之前的故事

### Parallel Team Strategy

多个开发者协作:

1. 团队一起完成 Setup + Foundational
2. Foundational完成后:
   - Developer A: User Story 1 (每日增量更新)
   - Developer B: User Story 2 (全量历史导入)
   - Developer C: User Story 3 (监控诊断)
3. 故事独立完成和集成

---

## Task Metrics

**Total Tasks**: 105
- Phase 1 Setup: 5 tasks
- Phase 2 Foundational: 16 tasks (核心模块+测试)
- Phase 3 User Story 1 (P1): 22 tasks (测试+实现)
- Phase 4 User Story 2 (P2): 22 tasks (测试+实现)
- Phase 5 User Story 3 (P3): 22 tasks (测试+实现)
- Phase 6 Polish: 18 tasks (整合+验证)

**Parallel Opportunities**: 36 tasks marked [P]

**Independent Test Criteria**:
- US1: 15分钟内完成1300只股票更新,成功率≥95%
- US2: 2小时内完成100只股票5年历史导入,支持断点续传
- US3: 提供完整的监控查询和性能报告功能

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only)

---

## Notes

- [P] 标记 = 不同文件,无依赖关系
- [Story] 标签将任务映射到特定用户故事以便追溯
- 每个用户故事应该可独立完成和测试
- 实现前验证测试失败
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免:模糊任务、相同文件冲突、破坏独立性的跨故事依赖
