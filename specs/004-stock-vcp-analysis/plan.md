# Implementation Plan: 单股票VCP分析查询

**Branch**: `004-stock-vcp-analysis` | **Date**: 2026-03-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-stock-vcp-analysis/spec.md`

## Summary

实现单股票VCP分析查询功能，允许用户通过K线图页面生成VCP分析报告，并在独立页面查看详细分析结果。同时提供命令行脚本支持，输出格式化的中文文本报告。该功能复用现有的VCP分析服务（VcpAnalyzerService），但提供更直观的用户界面和更详细的分析展示。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x (backend), Node.js 18+ (frontend)  
**Primary Dependencies**: 
- Backend: NestJS, Prisma ORM, SQLite 3.40+
- Frontend: React 18, Vite, Ant Design
**Storage**: SQLite (已存在 VcpScanResult, KLineData, Stock 表)  
**Testing**: Jest (backend), Vitest (frontend)  
**Target Platform**: Web application (localhost development, 生产环境TBD)  
**Project Type**: Full-stack web application (前后端分离架构)  
**Performance Goals**: 
- VCP分析生成响应时间 < 3秒 (SC-001)
- 支持50个并发查询，响应时间 < 5秒 (SC-008)
**Constraints**: 
- 必须使用中文界面和提示 (FR-013)
- 所有数值格式符合中国用户习惯 (FR-014)
- 后端必须使用 Node.js 20.x (constitution 要求)
**Scale/Scope**: 
- 支持至少1000只A股查询 (SC-004)
- 展示所有收缩阶段和回调阶段（数量不限）
- K线数据通常为300天（最多1000条）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Component-First (Frontend)

- **Status**: PASS
- **Compliance**: 
  - 新增独立的 VCP 分析报告页面组件 (`VcpAnalysisPage`)
  - K线图页面添加生成按钮组件 (`VcpGenerateButton`)
  - 可复用的收缩阶段展示组件 (`ContractionList`)
  - 可复用的回调阶段展示组件 (`PullbackList`)
  - 可复用的K线数据表格组件 (`KLineDataTable`)
- **Action Required**: 在 Phase 1 设计时使用 `~/.claude/skills/frontend-design` 技能设计页面布局和组件结构

### ✅ II. TypeScript & Type Safety

- **Status**: PASS
- **Compliance**:
  - 所有前端和后端代码使用 TypeScript
  - Strict mode 已启用
  - 复用现有类型定义：`VcpAnalysisResult`, `ContractionResult`, `PullbackResult`, `KLineBar`
  - 新增 DTO 类型：VCP分析请求/响应接口

### ✅ III. Test-First (NON-NEGOTIABLE)

- **Status**: PASS
- **Compliance**:
  - TDD 工作流：先写测试 → 用户审批 → 测试失败 → 实现
  - 后端单元测试：VCP 分析接口逻辑
  - 后端集成测试：完整的VCP分析生成流程
  - 前端组件测试：各展示组件的渲染和交互
  - 前端集成测试：从K线图页面生成到查看报告的完整流程
- **Test Strategy**: 
  - 优先级 P1 (User Story 1): 完整的端到端测试
  - 优先级 P2/P3: 组件级别测试

### ✅ IV. Build & Performance Standards

- **Status**: PASS
- **Compliance**:
  - 前端：使用 Vite 进行快速构建
  - 懒加载：VCP分析报告页面使用动态导入
  - 后端：VCP分析使用缓存优先策略（FR-015），避免重复计算
  - 监控：响应时间通过日志记录，便于性能优化

### ✅ V. Observability & Debugging

- **Status**: PASS
- **Compliance**:
  - 后端：使用 NestJS Logger，结构化日志（JSON格式）
  - 前端：错误边界捕获组件错误，上报到后端或本地日志
  - 命令行脚本：支持 `--verbose` 参数输出详细调试信息
  - 错误上下文：包含股票代码、分析步骤、时间戳

### Constitution Compliance Summary

**Overall Status**: ✅ PASS - 所有检查门均通过，无需记录违规项

## Project Structure

### Documentation (this feature)

```text
specs/004-stock-vcp-analysis/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (decisions & patterns)
├── data-model.md        # Phase 1 output (data structures)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (API contracts)
│   └── vcp-analysis-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── vcp/
│   │       ├── vcp.controller.ts      # 新增：VCP分析生成接口
│   │       ├── vcp.service.ts         # 扩展：添加分析生成方法
│   │       ├── vcp.module.ts          # 已存在
│   │       └── dto/
│   │           ├── generate-vcp-analysis.dto.ts    # 新增：生成请求DTO
│   │           └── vcp-analysis-response.dto.ts    # 新增：分析响应DTO
│   ├── services/
│   │   └── vcp/
│   │       ├── vcp-analyzer.service.ts             # 已存在：复用
│   │       └── vcp-formatter.service.ts            # 新增：格式化输出
│   └── scripts/
│       └── generate-vcp-analysis.ts                 # 新增：命令行脚本
└── tests/
    ├── integration/
    │   └── vcp-analysis.e2e.spec.ts                # 新增：端到端测试
    └── unit/
        └── vcp-formatter.service.spec.ts           # 新增：格式化器测试

frontend/
├── src/
│   ├── components/
│   │   ├── VcpGenerateButton/                      # 新增：生成按钮组件
│   │   │   ├── index.tsx
│   │   │   ├── index.test.tsx
│   │   │   └── styles.module.css
│   │   ├── ContractionList/                        # 新增：收缩列表组件
│   │   │   ├── index.tsx
│   │   │   ├── index.test.tsx
│   │   │   └── styles.module.css
│   │   ├── PullbackList/                           # 新增：回调列表组件
│   │   │   ├── index.tsx
│   │   │   ├── index.test.tsx
│   │   │   └── styles.module.css
│   │   └── KLineDataTable/                         # 新增：K线表格组件
│   │       ├── index.tsx
│   │       ├── index.test.tsx
│   │       └── styles.module.css
│   ├── pages/
│   │   ├── KLineChartPage.tsx                      # 扩展：添加生成按钮
│   │   └── VcpAnalysisPage.tsx                     # 新增：VCP分析报告页面
│   ├── services/
│   │   └── vcp.service.ts                          # 扩展：添加生成分析接口
│   └── types/
│       └── vcp.ts                                   # 扩展：添加分析响应类型
└── tests/
    ├── integration/
    │   └── vcp-analysis-flow.test.tsx              # 新增：完整流程测试
    └── component/
        ├── VcpGenerateButton.test.tsx              # 新增：按钮组件测试
        └── VcpAnalysisPage.test.tsx                # 新增：页面组件测试
```

**Structure Decision**: 
采用现有的前后端分离架构（Option 2: Web application）。后端扩展 VCP 模块，添加分析生成接口和格式化服务；前端新增 VCP 分析报告页面和相关组件。命令行脚本放在 `backend/src/scripts/` 目录，与现有脚本保持一致。

## Complexity Tracking

无需记录违规项，所有 Constitution 检查门均已通过。
