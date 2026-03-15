# Implementation Plan: VCP K-Line Chart Overlay

**Branch**: `006-vcp-kline-overlay` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Input**: 将 VCP 相关信息（收缩线、回调线、标记点）直接绘制到每个股票详情的 K 线图上面

## Summary

为 K线图添加 VCP 模式可视化叠加层，使用虚线连接收缩和回调的高低点，并在端点添加颜色标记。收缩线使用深青蓝色（#2563eb），回调线使用琥珀橙色（#f59e0b/# fb923c），标签显示在线段中点。使用 lightweight-charts 的自定义绘制功能实现叠加层，与现有图表组件集成。

## Technical Context

**Language/Version**: TypeScript 5.2 (strict mode enabled)  
**Primary Dependencies**: 
- Frontend: React 18, lightweight-charts 4.2.3, Ant Design 5.12, Zustand 4.4
- Charting: IChartApi, ISeriesApi, CustomSeriesView (lightweight-charts)

**Storage**: N/A (使用现有 VCP API 数据，无新存储需求)  
**Testing**: Vitest with @testing-library/react, component tests + integration tests  
**Target Platform**: Web (Desktop browsers, Chrome/Firefox/Safari/Edge latest versions)  
**Project Type**: Web Application (Frontend feature enhancement)  
**Performance Goals**: 
- 叠加层渲染 < 500ms (最多 10 contractions + 10 pullbacks)
- 60 FPS 维持在 pan/zoom 操作中
- Tooltip 响应 < 100ms

**Constraints**: 
- 必须复用现有 KLineChart 组件架构
- 不修改 VCP 分析算法或后端 API
- Desktop-only (移动端不在范围内)
- 线条端点对齐精度 ≤ 1 pixel

**Scale/Scope**: 
- 1 个主要组件增强 (KLineChart)
- 2-3 个新的辅助组件/hooks (VcpOverlay, useVcpOverlay)
- 约 500-800 行新代码 (组件 + tests)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Component-First (Frontend)
- **Status**: PASS  
- **Rationale**: VCP 叠加层将作为独立的 `VcpOverlayLayer` 组件实现，props 明确（vcpData, colors, visibility），可独立测试，在 KLineChart 中集成使用

### ✅ TypeScript & Type Safety
- **Status**: PASS
- **Rationale**: 
  - 现有 VCP types 已定义于 `frontend/src/types/vcp.ts` (Contraction, Pullback interfaces)
  - 新增类型将添加至同一文件 (VcpOverlayConfig, VcpLineStyle)
  - strict mode 已启用，无 any 类型

### ✅ Test-First (NON-NEGOTIABLE)
- **Status**: PASS (TDD workflow planned)
- **Plan**:
  1. Phase 2 首先编写测试用例 (见 tasks.md)
  2. 测试用例覆盖：线条渲染、颜色正确性、标签位置、tooltip 交互、visibility toggle
  3. Red-Green-Refactor 循环

### ✅ Build & Performance Standards
- **Status**: PASS
- **Rationale**: 
  - 无新依赖项（使用现有 lightweight-charts）
  - 叠加层采用按需渲染（visible range filtering）
  - Bundle size 增加预计 < 20KB (仅新组件代码)

### ✅ Observability & Debugging
- **Status**: PASS
- **Rationale**:
  - 添加结构化日志 (console.debug with context: lineType, count, visibleRange)
  - 错误边界处理 VCP 数据缺失情况
  - Dev tools 友好的组件命名

### ✅ Frontend UI Language
- **Status**: PASS
- **Rationale**: 所有用户可见文本使用英文 (tooltip labels, toggle button text, error messages)

### ⚠️ Technology Stack - Node.js Version
- **Status**: AWARE
- **Note**: Backend requires Node.js 20.x (per constitution), but this feature is **frontend-only**, no backend changes needed

**Overall Gate Result**: ✅ **PASS** - 可以进入 Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/006-vcp-kline-overlay/
├── plan.md              # 本文件
├── research.md          # Phase 0: 技术调研结果
├── data-model.md        # Phase 1: 数据模型定义
├── quickstart.md        # Phase 1: 开发快速上手指南
├── contracts/           # Phase 1: 组件 API 契约
│   └── vcp-overlay.contract.md
└── tasks.md             # Phase 2: 任务分解 (via /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── KLineChart/
│   │   │   ├── index.tsx              # [MODIFY] 集成 VCP overlay
│   │   │   ├── KLineChart.module.css  # [MODIFY] 添加 overlay 样式
│   │   │   ├── VcpOverlayLayer.tsx    # [NEW] VCP 叠加层组件
│   │   │   ├── VcpLine.ts             # [NEW] 线条绘制逻辑
│   │   │   ├── VcpMarker.ts           # [NEW] 标记点绘制逻辑
│   │   │   └── VcpTooltip.tsx         # [NEW] Tooltip 组件
│   │   ├── VcpOverlayControl/         # [NEW] Toggle 控制组件
│   │   │   ├── index.tsx
│   │   │   └── VcpOverlayControl.module.css
│   │   └── ... (existing components)
│   ├── hooks/
│   │   ├── useVcpOverlay.ts           # [NEW] VCP overlay 逻辑 hook
│   │   ├── useVcpDetail.ts            # [EXISTING] 已有，无需修改
│   │   └── ... (existing hooks)
│   ├── store/
│   │   └── chart.store.ts             # [MODIFY] 添加 vcpOverlayVisible 状态
│   ├── types/
│   │   ├── vcp.ts                     # [MODIFY] 添加 overlay 相关类型
│   │   └── ... (existing types)
│   └── utils/
│       └── vcpOverlayHelpers.ts       # [NEW] 坐标计算、边界检测工具函数
│
└── tests/
    ├── components/
    │   ├── KLineChart/
    │   │   ├── VcpOverlayLayer.test.tsx      # [NEW] 组件测试
    │   │   ├── VcpLine.test.ts               # [NEW] 单元测试
    │   │   └── VcpMarker.test.ts             # [NEW] 单元测试
    │   └── VcpOverlayControl/
    │       └── VcpOverlayControl.test.tsx    # [NEW] 组件测试
    ├── hooks/
    │   └── useVcpOverlay.test.ts             # [NEW] Hook 测试
    ├── utils/
    │   └── vcpOverlayHelpers.test.ts         # [NEW] 工具函数测试
    └── integration/
        └── vcp-overlay-integration.test.tsx   # [NEW] 集成测试
```

**Structure Decision**: 使用现有 Web Application 结构，在 `frontend/` 目录下扩展。VCP overlay 相关代码组织在 `KLineChart` 组件内部作为子模块，遵循组件优先原则。新增的 VcpOverlayControl 作为独立可复用组件。

## Complexity Tracking

无 Constitution 违规需要豁免。所有设计决策符合宪法原则。

---

## Phase 0: Research & Technical Decisions

*详见 [research.md](./research.md)*

**研究主题**:
1. lightweight-charts 自定义叠加层 API (CustomSeriesView vs Primitives API)
2. 虚线绘制最佳实践 (Canvas setLineDash vs SVG)
3. Tooltip 边界检测算法
4. 坐标映射精度优化 (date/price → pixel)
5. 性能优化策略 (visible range filtering, throttling)

## Phase 1: Design & Contracts

*详见 [data-model.md](./data-model.md) 和 [contracts/](./contracts/)*

**核心设计要素**:
- VcpOverlayLayer 组件 API
- VcpLineStyle 类型定义 (color, dashArray, width)
- Coordinate mapping 函数签名
- State management (Zustand store extension)
- Integration points with existing KLineChart

## Phase 2: Implementation Tasks

*将由 `/speckit.tasks` 命令生成，见 [tasks.md](./tasks.md)*

**预期任务阶段**:
- Phase 2.1: 核心渲染逻辑 (线条 + 标记)
- Phase 2.2: 交互功能 (Tooltip + Hover)
- Phase 2.3: 控制与状态 (Toggle + Persistence)
- Phase 2.4: 性能优化与边缘情况
- Phase 2.5: 测试与文档

---

## Next Steps

1. ✅ Constitution Check 通过
2. ⏭️ 执行 Phase 0 research (填写 research.md)
3. ⏭️ 执行 Phase 1 design (填写 data-model.md, contracts/)
4. ⏭️ 运行 `/speckit.tasks` 生成任务分解
5. ⏭️ 开始 TDD 实现

**预计完成时间**: 3-5 个开发日 (假设单人开发，每日 6-8 小时)
