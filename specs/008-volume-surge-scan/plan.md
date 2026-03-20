# 实现计划：成交量激增扫描器

**分支**: `008-volume-surge-scan` | **日期**: 2026-03-18 | **规格**: [spec.md](./spec.md)  
**输入**: 功能规格说明来自 `/specs/008-volume-surge-scan/spec.md`

## 概要

识别成交量从萎缩转为放大、均线开始向上但未形成明确上升趋势的早期启动股票。提供Web界面和命令行工具两种访问方式，支持历史记录追踪和CSV/Markdown格式导出。

**技术方案**: 
- 后端NestJS服务负责扫描逻辑和数据持久化
- 前端React+Ant Design展示结果和可视化
- 复用现有VCP基础设施（数据库、K线数据、均线计算）
- CLI工具通过NestJS命令行入口实现

## 技术上下文

**语言/版本**: TypeScript 5.x + Node.js 20.x（后端）, Node.js 18+（前端）  
**主要依赖**: NestJS, Prisma ORM, React 18, Ant Design, Vite  
**存储**: SQLite 3.40+（复用现有数据库：Stock, KLineData表；新增：VolumeSurgeScan, ScanResult表）  
**测试**: Jest（后端单元测试）, React Testing Library（前端组件测试）  
**目标平台**: macOS/Linux开发环境，Web浏览器  
**项目类型**: Web应用 + 命令行工具  
**性能目标**: 全市场扫描（3000只股票）< 30秒，Web页面首次加载 < 2秒  
**约束**: 
- 后端必须使用Node.js 20.x（与现有后端兼容）
- 均线计算需要至少150个交易日历史数据
- 扫描过程可中断，不保存不完整结果
**规模/范围**: 
- 支持3000-5000只A股扫描
- 前端新增1-2个页面组件
- 后端新增1个扫描模块（约5-8个服务类）

## Constitution检查

*门禁：必须在Phase 0研究前通过。Phase 1设计后重新检查。*

### ✅ I. Component-First (Frontend)

- **符合性**: 将创建独立的扫描结果列表组件、股票详情卡片组件、历史对比组件
- **页面设计**: 将使用 `~/.claude/skills/frontend-design` 技能设计扫描器页面
- **UI语言**: 所有前端界面文本使用英文（按钮、标签、提示信息等）

### ✅ II. TypeScript & Type Safety

- **符合性**: 全栈TypeScript，启用strict模式
- **共享类型**: 扫描参数、结果实体类型定义在 `backend/src/types/scan.types.ts`
- **API契约**: 定义在 `contracts/api.md`

### ✅ III. Test-First (NON-NEGOTIABLE)

- **符合性**: 将遵循TDD流程
- **测试层次**:
  - 单元测试：扫描算法、成交量计算、均线趋势判断
  - 组件测试：React组件（列表、图表、导出按钮）
  - 集成测试：完整扫描流程（从触发到结果存储）

### ✅ IV. Build & Performance Standards

- **符合性**: 
  - 前端使用代码分割（扫描器页面懒加载）
  - 扫描任务使用并行处理（p-limit控制并发）
  - 大量数据渲染使用虚拟滚动（Ant Design Table内置）

### ✅ V. Observability & Debugging

- **符合性**:
  - 使用NestJS内置Logger（JSON格式）
  - CLI工具支持 `--verbose` 标志
  - 前端错误捕获包含用户操作上下文

### ✅ Technology Stack

- **符合性**: 
  - 前端：React 18 + Vite（已有配置）
  - 后端：Node.js 20.x + NestJS（已有基础设施）
  - 包管理器：npm（项目已使用）
  - 代码质量：ESLint + Prettier（已配置）

### ✅ Development Workflow

- **符合性**: 
  - 所有PR通过lint、type-check、测试
  - 使用 `.specify/` 进行功能设计（本文档）
  - 遵循constitution进行代码审查

## 项目结构

### 文档（本功能）

```text
specs/008-volume-surge-scan/
├── plan.md              # 本文件（/speckit.plan命令输出）
├── research.md          # Phase 0输出
├── data-model.md        # Phase 1输出
├── quickstart.md        # Phase 1输出
├── contracts/           # Phase 1输出
│   └── api.md          # REST API接口定义
└── tasks.md             # Phase 2输出（/speckit.tasks命令）
```

### 源代码（仓库根目录）

```text
backend/
├── src/
│   ├── modules/
│   │   └── volume-surge/              # 新增扫描模块
│   │       ├── volume-surge.module.ts
│   │       ├── volume-surge.controller.ts
│   │       ├── volume-surge.service.ts
│   │       ├── services/
│   │       │   ├── pattern-detector.service.ts    # 成交量模式识别
│   │       │   ├── moving-average.service.ts      # 均线计算
│   │       │   └── scan-executor.service.ts       # 扫描执行器
│   │       ├── dto/
│   │       │   ├── scan-request.dto.ts
│   │       │   └── scan-result.dto.ts
│   │       └── entities/
│   │           ├── volume-surge-scan.entity.ts
│   │           └── scan-result.entity.ts
│   ├── scripts/
│   │   └── scan-cli.ts                            # 新增CLI工具
│   └── types/
│       └── scan.types.ts                          # 共享类型定义
├── prisma/
│   └── schema.prisma                              # 更新（新增表）
└── tests/
    └── volume-surge/                              # 新增测试
        ├── pattern-detector.service.spec.ts
        ├── moving-average.service.spec.ts
        └── scan-executor.service.spec.ts

frontend/
├── src/
│   ├── pages/
│   │   └── VolumeSurgeScan/                       # 新增页面
│   │       ├── index.tsx
│   │       ├── ScanConfig.tsx                     # 扫描参数配置
│   │       ├── ScanResults.tsx                    # 结果列表
│   │       ├── StockDetail.tsx                    # 股票详情
│   │       └── HistoryComparison.tsx              # 历史对比
│   ├── components/
│   │   └── VolumeSurgeChart.tsx                   # 可视化图表组件
│   ├── services/
│   │   └── volumeSurgeScanApi.ts                  # API调用封装
│   └── types/
│       └── scan.types.ts                          # 前端类型（从后端同步）
└── tests/
    └── pages/
        └── VolumeSurgeScan/                       # 组件测试
            ├── ScanConfig.test.tsx
            └── ScanResults.test.tsx
```

**结构决策**: 
- 采用Web应用结构（frontend + backend分离）
- 后端新增独立模块 `volume-surge`，遵循NestJS模块化架构
- 前端新增独立页面 `VolumeSurgeScan`，遵循页面-组件分层
- CLI工具作为后端脚本实现，复用核心业务逻辑

## 复杂度追踪

> 本功能无constitution违规，无需填写此表。

## Phase 0: 大纲与研究

*输出: research.md*

### 研究任务

1. **成交量模式识别算法**
   - 问题：如何准确识别"萎缩期"和"放大期"的转折点？
   - 需要研究：滑动窗口算法、成交量标准差、趋势变化检测
   - 替代方案：固定阈值 vs 动态阈值 vs 统计显著性检验

2. **均线斜率计算方法**
   - 问题：如何判断"50日均线开始向上"？
   - 需要研究：线性回归斜率、移动平均差值、角度计算
   - 替代方案：最近N日趋势线 vs 均线交叉 vs 均值变化率

3. **扫描性能优化策略**
   - 问题：如何在30秒内完成3000只股票扫描？
   - 需要研究：数据库查询优化、并行处理策略、增量计算
   - 替代方案：全量扫描 vs 增量扫描 vs 缓存策略

4. **CLI工具实现模式**
   - 问题：NestJS应用如何提供命令行入口？
   - 需要研究：NestJS Commander、独立脚本、参数解析库
   - 替代方案：nestjs-command vs yargs vs commander.js

5. **前端图表可视化库**
   - 问题：选择哪个图表库展示K线和成交量？
   - 需要研究：ECharts、Chart.js、Recharts、TradingView Lightweight Charts
   - 替代方案：功能丰富度 vs 性能 vs 学习成本

## Phase 1: 设计与契约

*输出: data-model.md, contracts/, quickstart.md*

### 数据模型设计

见 `data-model.md`（将包含）：
- VolumeSurgeScan实体（扫描记录）
- ScanResult实体（股票扫描结果）
- 与现有Stock、KLineData的关系
- 查询模式和索引设计

### API契约

见 `contracts/api.md`（将包含）：
- `POST /api/volume-surge/scan` - 触发扫描
- `GET /api/volume-surge/scans` - 查询历史扫描
- `GET /api/volume-surge/scans/:id/results` - 获取扫描结果
- `GET /api/volume-surge/export/:id` - 导出结果（CSV/Markdown）

### 快速开始指南

见 `quickstart.md`（将包含）：
- 本地开发环境配置
- 运行Web界面步骤
- 运行CLI工具示例
- 常见问题排查

## Phase 2: 任务分解

*由 `/speckit.tasks` 命令生成，不在本文档范围内*

## 实现优先级

基于用户故事优先级：

1. **Phase A（P1 - 核心扫描逻辑）**:
   - 成交量模式识别算法
   - 均线计算和趋势判断
   - 基础扫描服务
   - 数据持久化

2. **Phase B（P2 - 买量支撑验证）**:
   - 上涨日/下降日成交量对比
   - 买量支撑度计算
   - 结果筛选增强

3. **Phase C（P3 - 用户界面）**:
   - Web前端页面
   - CLI工具
   - 导出功能
   - 历史对比功能

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 扫描性能不达标（>30秒） | 高 | 采用并行处理、数据库查询优化、增量扫描策略 |
| 算法准确率低（<80%） | 高 | 使用历史数据验证、参数可调整、人工验证反馈机制 |
| 前端图表渲染慢（大数据量） | 中 | 虚拟滚动、数据分页、图表懒加载 |
| CLI工具与Web API逻辑不一致 | 中 | 共享核心业务逻辑服务、统一测试覆盖 |
| 数据缺失导致扫描失败 | 低 | 边缘案例处理（跳过+日志记录），测试覆盖异常场景 |

## 下一步

运行 `/speckit.tasks` 生成详细任务列表和开发检查清单。
