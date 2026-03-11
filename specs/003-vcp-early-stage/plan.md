# 实现计划：VCP早期启动阶段股票筛选

**分支**: `003-vcp-early-stage` | **日期**: 2026-03-11 | **规格**: [spec.md](./spec.md)  
**输入**: 功能规格来自 `/specs/003-vcp-early-stage/spec.md`

## 概要

实现一个双端（Web界面 + 命令行工具）的VCP早期启动阶段股票筛选功能。用户可以通过可配置的筛选条件（距52周高低点阈值、收缩次数范围）来发现还处于底部区域、刚开始形成VCP形态的股票。系统提供智能提示、快捷调整、localStorage持久化等增强体验功能。

**核心价值**: 帮助投资者在股价启动早期就介入，获得更大的上涨空间，避免追高风险。

## 技术上下文

**语言/版本**: 
- 后端：Node.js 20.x + TypeScript 5.x
- 前端：Node.js 18+ + TypeScript 5.x

**主要依赖**: 
- 后端：NestJS, Prisma ORM, SQLite 3.40+
- 前端：React 18, Vite, Ant Design
- 共享：现有的 VcpAnalyzerService, VcpScannerService

**存储**: 
- SQLite数据库（已有vcpScanResult表）
- 浏览器localStorage（用户筛选条件持久化）

**测试**: 
- 后端：Jest (NestJS集成测试)
- 前端：Vitest + React Testing Library

**目标平台**: 
- Web应用（Chrome, Safari, Firefox最新版本）
- 命令行工具（macOS, Linux）

**项目类型**: Web应用 + CLI工具（双端）

**性能目标**: 
- Web界面筛选响应时间 < 2秒
- 命令行筛选完成时间 < 10秒
- 支持筛选5000+只股票的VCP数据

**约束**: 
- 必须基于现有VCP扫描结果（不重新扫描）
- 前端筛选条件范围：距52周低20%-60%，距52周高10%-50%，收缩次数2-8次
- Web界面分页：每页20-30只股票
- localStorage存储限制：< 1MB（仅存储筛选条件，不存储结果）

**规模/范围**: 
- 预计筛选结果：5-30只股票（可调）
- 前端新增组件：1个筛选器面板 + 1个结果表格增强
- 后端新增API：1-2个端点
- 命令行新增脚本：2个（筛选 + 导出）

## 宪法检查

*关卡：Phase 0研究前必须通过。Phase 1设计后重新检查。*

### ✅ I. Component-First (Frontend)

- [x] **筛选器面板组件**必须是独立可重用的
  - ✅ 清晰的props定义（见contracts/api.ts: FilterConditions）
  - ✅ 可独立测试（计划创建VcpEarlyStageFilter/index.test.tsx）
  - ✅ 有使用文档（见quickstart.md）
- [x] **结果表格组件**必须增强现有VCP表格（不重写）
  - ✅ 通过props控制高亮逻辑（highlightStage prop）
  - ✅ 支持阶段排序（sortByStage prop）
- [x] 必须使用 `~/.claude/skills/frontend-design` 设计筛选器UI
  - ✅ 将在实现阶段调用此技能
  - ✅ 使用Ant Design保持风格一致

**状态**: ✅ **通过** - Phase 1设计符合组件优先原则

### ✅ II. TypeScript & Type Safety

- [x] 所有代码使用TypeScript
- [x] Strict模式已启用（项目现有配置）
- [x] 定义筛选条件接口 → contracts/api.ts: FilterEarlyStageRequest
- [x] 定义早期股票结果接口 → contracts/api.ts: EarlyStageStock
- [x] API契约接口完整定义 → contracts/api.ts

**状态**: ✅ **通过** - 所有类型已定义，无any类型

### ✅ III. Test-First (NON-NEGOTIABLE)

**测试策略**:
1. **后端单元测试**: 筛选逻辑、阈值验证、排序逻辑
2. **后端集成测试**: API端点、数据库查询
3. **前端组件测试**: 筛选器交互、localStorage持久化
4. **前端集成测试**: 完整筛选流程（设置条件→调用API→显示结果）

**TDD流程**:
- ✅ 先编写测试 → 用户审阅 → 测试失败 → 然后实现
- ✅ Red-Green-Refactor循环严格执行
- ✅ 将在tasks.md中为每个任务定义具体测试

**状态**: ✅ **通过** - 测试策略明确，将在Phase 2执行

### ✅ IV. Build & Performance Standards

- [x] 前端Bundle大小：筛选器组件预计 < 50KB
  - ✅ 使用Ant Design现有组件，无需额外库
  - ✅ 自定义Hook轻量级（< 5KB）
- [x] 命令行脚本性能优化
  - ✅ 后端筛选逻辑（数据库查询）
  - ✅ 避免全量数据传输
- [x] 监控打包大小变化
  - ✅ Vite build时输出bundle analysis

**状态**: ✅ **通过** - 性能目标可达成

### ✅ V. Observability & Debugging

- [x] 结构化日志（JSON格式）
  - ✅ 后端：NestJS Logger with context
  - ✅ 前端：console.log带筛选条件
- [x] 错误上下文包含：
  - ✅ 筛选条件（记录在日志）
  - ✅ 股票数量（返回在tip中）
  - ✅ 用户操作（API endpoint）
- [x] 命令行支持 `--verbose` 标志
  - ✅ 在research.md中已设计

**状态**: ✅ **通过** - 可观察性设计完整

---

**Phase 1后总体评估**: ✅ **所有宪法检查通过，可进入Phase 2任务分解**

## 项目结构

### 文档（本功能）

```
specs/003-vcp-early-stage/
├── plan.md              # 本文件 (/speckit.plan命令输出)
├── research.md          # Phase 0输出
├── data-model.md        # Phase 1输出
├── quickstart.md        # Phase 1输出
├── contracts/           # Phase 1输出
│   ├── api.ts          # API接口定义
│   └── types.ts        # 共享类型定义
└── tasks.md             # Phase 2输出 (/speckit.tasks命令 - 不由/speckit.plan创建)
```

### 源代码（仓库根目录）

```
backend/
├── src/
│   ├── modules/vcp/
│   │   ├── vcp.controller.ts          # 新增：早期筛选API端点
│   │   └── vcp.service.ts             # 修改：添加早期筛选方法
│   ├── services/vcp/
│   │   ├── vcp-analyzer.service.ts    # 现有：VCP分析服务
│   │   └── vcp-early-filter.service.ts # 新增：早期筛选逻辑
│   └── scripts/
│       ├── show-vcp-early-stage.ts    # 新增：终端筛选脚本
│       └── export-vcp-early-stage.ts  # 新增：导出Markdown脚本
├── show-vcp-early.sh                  # 新增：Shell包装脚本
└── export-vcp-early.sh                # 新增：导出Shell脚本

frontend/
├── src/
│   ├── components/
│   │   ├── VcpEarlyStageFilter/       # 新增：筛选器组件
│   │   │   ├── index.tsx
│   │   │   ├── index.test.tsx
│   │   │   ├── FilterSlider.tsx       # 子组件：滑块控件
│   │   │   ├── QuickAdjust.tsx        # 子组件：快捷调整按钮
│   │   │   └── FilterTips.tsx         # 子组件：智能提示
│   │   └── VcpResultTable/            # 修改：增强现有表格
│   │       └── index.tsx              # 添加阶段高亮、排序逻辑
│   ├── pages/
│   │   └── VcpStock/                  # 修改：VCP选股页面
│   │       └── index.tsx              # 集成筛选器组件
│   ├── services/
│   │   └── vcpService.ts              # 修改：添加早期筛选API调用
│   ├── hooks/
│   │   ├── useVcpEarlyFilter.ts       # 新增：筛选逻辑Hook
│   │   └── useLocalStoragePersist.ts  # 新增：localStorage持久化Hook
│   └── types/
│       └── vcp.ts                     # 修改：添加筛选相关类型

docs/vcp/daily-reports/               # 现有：Markdown报告输出目录
```

**结构决策**: 
- **后端**: 采用分层架构，新增EarlyFilterService处理筛选逻辑，保持与现有VCP服务解耦
- **前端**: 组件优先设计，筛选器作为独立组件可在其他VCP功能中复用
- **命令行**: 遵循现有脚本模式（TypeScript + Shell包装），便于nvm切换Node版本

## 复杂度跟踪

> **仅在宪法检查有需要解释的违规时填写**

| 违规项 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|--------|----------|------------------------------|
| N/A    | N/A      | N/A                          |

**说明**: 本功能完全符合宪法要求，无需违规解释。
