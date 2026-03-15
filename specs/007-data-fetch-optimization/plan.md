# Implementation Plan: 股票数据更新效率优化

**Branch**: `007-data-fetch-optimization` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-data-fetch-optimization/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

本功能旨在优化股票数据更新系统的性能,包括增量更新和全量导入两个场景。通过并发控制优化、批量数据库操作、智能重试机制、断点续传和增量指标计算等技术手段,将增量更新时间从30-40分钟缩短到15分钟以内,全量导入时间从4-5小时缩短到2小时以内。技术方案基于现有的NestJS后端架构,使用Prisma ORM和SQLite数据库,集成多个数据源(Tushare、AkShare、Yahoo Finance),通过p-limit实现并发控制,使用事务和连接池优化数据库性能。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x (backend required)  
**Primary Dependencies**: NestJS, Prisma ORM, SQLite 3.40+, p-limit, date-fns  
**Storage**: SQLite (单文件数据库, WAL模式, 现有表: Stock, KLineData, TechnicalIndicator, UpdateLog, ImportCheckpoint)  
**Testing**: Jest (NestJS默认测试框架)  
**Target Platform**: macOS/Linux server, 命令行脚本执行  
**Project Type**: Backend service + CLI scripts (数据处理工具)  
**Performance Goals**: 
- 增量更新: 80只股票/分钟 (当前30-40只/分钟)
- 全量导入: 50只股票/分钟 (当前20-25只/分钟)
- API调用: <2秒平均响应时间
- 数据库批量写入: 100条/批次 <500ms
- 内存占用: <500MB (处理1000只股票)

**Constraints**: 
- API速率限制: Tushare 200次/分钟, Yahoo Finance 2000次/小时
- 数据库并发写入: SQLite WAL模式支持读写并发
- 不修改现有数据库schema
- 保持与现有TechnicalIndicatorsService兼容
- UTC时间存储,跨时区支持(A股/港股UTC+8, 美股UTC-5/-4)

**Scale/Scope**: 
- 约1300只股票 (800只A股 + 200只港股 + 300只美股)
- 每只股票约5-10年历史数据 (约1250-2500条日线记录)
- 每天增量更新1-5条新记录
- 3个数据源API集成
- 5个核心数据表

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Component-First (Frontend)
**Status**: N/A - 本功能为后端数据处理脚本,不涉及前端UI组件

### ✅ II. TypeScript & Type Safety
**Status**: PASS
- 使用TypeScript 5.x, strict mode已启用
- 现有代码库已有类型定义 (PriceData, MarketType等)
- 将为新增的优化功能添加明确的类型定义

### ⚠️ III. Test-First (NON-NEGOTIABLE)
**Status**: REQUIRES ATTENTION
- 现有脚本缺少系统化的单元测试
- **行动**: 本功能将补充测试覆盖,包括:
  - 并发控制逻辑的单元测试
  - 批量写入性能测试
  - 断点续传恢复测试
  - API降级和重试机制测试
  - 时区转换逻辑测试

### ✅ IV. Build & Performance Standards
**Status**: PASS
- 性能目标明确且可衡量
- 使用p-limit进行并发控制,避免资源耗尽
- 批量操作减少数据库I/O
- 内存使用有明确约束

### ✅ V. Observability & Debugging
**Status**: PASS
- 使用NestJS Logger进行结构化日志
- UpdateLog表记录任务执行详情
- 实时进度反馈机制
- 详细的错误上下文(股票代码、日期、错误类型)

### ✅ Technology Stack
**Status**: PASS
- Node.js 20.x (已明确要求,参见 `.cursor/rules/specify-rules.mdc`)
- 现有技术栈: NestJS + Prisma + SQLite
- 包管理: npm
- 已配置ESLint和TypeScript strict mode

### 🔄 Post-Design Re-check
将在Phase 1完成后重新检查:
- 测试用例是否完整覆盖关键逻辑
- 性能监控指标是否充分
- 错误处理是否符合可观测性要求

## Project Structure

### Documentation (this feature)

```text
specs/007-data-fetch-optimization/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (completed)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── cli-commands.md  # 命令行接口契约
├── checklists/          # Quality assurance checklists
│   └── requirements.md  # Requirements checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── scripts/                           # 数据更新脚本 (主要修改区域)
│   │   ├── incremental-update-all-markets.ts    # ✅ 保留并优化 - 增量更新统一入口
│   │   ├── full-import-stocks.ts                # 🆕 新建 - 全量导入统一入口
│   │   ├── manage-tasks.ts                      # 🆕 新建 - 任务管理工具
│   │   ├── update-index-composition.ts          # ✅ 保留 - 指数成分更新
│   │   ├── verify-import.ts                     # ✅ 保留 - 导入验证工具
│   │   │
│   │   ├── [废弃脚本 - 1个月后删除]
│   │   ├── incremental-update-hk-us.ts          # ❌ 废弃 → 合并到统一入口
│   │   ├── incremental-update-latest.ts         # ❌ 废弃 → 合并到统一入口
│   │   ├── batch-incremental-update-latest.ts   # ❌ 废弃 → 合并到统一入口
│   │   ├── import-hk-stocks.ts                  # ❌ 废弃 → 合并到统一入口
│   │   ├── import-us-stocks.ts                  # ❌ 废弃 → 合并到统一入口
│   │   └── import-stocks-from-akshare.ts        # ❌ 废弃 → 合并到统一入口
│   │   │
│   │   └── [新增优化模块]
│   │       ├── optimized-batch-writer.ts        # 批量写入优化
│   │       ├── concurrent-fetcher.ts            # 并发获取管理
│   │       ├── checkpoint-manager.ts            # 断点续传管理
│   │       └── incremental-indicator-calc.ts    # 增量指标计算
│   ├── services/                          # 服务层
│   │   ├── datasource/                    # 数据源服务 (可能需要优化)
│   │   │   ├── datasource-manager.service.ts    # 数据源管理
│   │   │   ├── tushare.service.ts               # Tushare API
│   │   │   └── akshare.service.ts               # AkShare API
│   │   └── indicators/                    # 技术指标服务 (可能需要优化)
│   │       └── technical-indicators.service.ts  # 技术指标计算
│   ├── modules/                           # 业务模块
│   │   └── market-data/                   # 市场数据模块 (可能需要优化)
│   │       ├── import/                    # 导入管理
│   │       │   ├── import-manager.ts            # 导入管理器
│   │       │   └── checkpoint-tracker.ts        # 断点追踪
│   │       └── data-source/               # 数据源适配器
│   │           ├── yahoo-finance-adapter.ts     # Yahoo Finance
│   │           └── akshare-adapter.ts           # AkShare
│   ├── prisma/                            # 数据库
│   │   └── schema.prisma                  # 数据模型 (不修改)
│   └── data/                              # SQLite数据文件
│       └── stock.db                       # 单文件数据库
└── tests/                                 # 测试 (新增)
    ├── unit/                              # 单元测试
    │   ├── batch-writer.spec.ts           # 批量写入测试
    │   ├── concurrent-fetcher.spec.ts     # 并发控制测试
    │   └── checkpoint-manager.spec.ts     # 断点恢复测试
    └── integration/                       # 集成测试
        ├── incremental-update.spec.ts     # 增量更新端到端测试
        └── full-import.spec.ts            # 全量导入端到端测试
```

**Structure Decision**: 
使用现有的Web应用结构(backend + frontend分离)。本功能主要修改backend部分,不涉及frontend。采用模块化设计,将优化逻辑封装为独立的工具模块,可被现有脚本复用。保持现有目录结构,新增优化模块放在`src/scripts/`下的独立子目录中,便于管理和测试。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 缺少测试覆盖 (违反III. Test-First) | 现有数据更新脚本以快速迭代为主,缺少系统化测试 | 本次优化涉及复杂的并发控制和状态管理,不补充测试将无法保证正确性和性能。将在本功能中建立测试框架,覆盖关键优化逻辑 |

---

## Phase 0: Research & Technical Decisions

详见 [research.md](./research.md)

## Phase 1: Design & Contracts

详见:
- [data-model.md](./data-model.md) - 数据模型设计
- [contracts/cli-commands.md](./contracts/cli-commands.md) - 命令行接口契约
- [quickstart.md](./quickstart.md) - 快速开始指南
- [SCRIPT_MIGRATION.md](./SCRIPT_MIGRATION.md) - 脚本迁移指南

## Next Steps

1. ✅ Phase 0 完成: 研究并确定技术决策
2. ✅ Phase 1 完成: 设计数据模型和接口契约
3. ⏳ Phase 2 待执行: 运行 `/speckit.tasks` 生成任务分解
