# 实施计划：港股和美股核心股票数据支持

**分支**: `005-hk-us-stock-data` | **日期**: 2026-03-12 | **规格**: [spec.md](./spec.md)  
**输入**: 功能规格来自 `/specs/005-hk-us-stock-data/spec.md`

## 概述

本功能为系统添加港股和美股市场的核心股票数据支持。系统将从恒生指数、恒生科技指数、标普500和纳斯达克100获取约660只核心股票的基本信息和最近10年的历史K线数据。使用智能混合数据源策略（AkShare优先，Yahoo Finance备选），支持断点续传的导入流程，并为港股和美股提供与A股相同的VCP分析、K线图查看、技术指标计算等完整功能。

## 技术上下文

**语言/版本**: 
- 后端：TypeScript 5.1+, Node.js 20.x (必需)
- 前端：TypeScript 5.2+, Node.js 18+

**主要依赖**: 
- 后端：NestJS 10.x, Prisma 6.x, SQLite 3.40+
- 前端：React 18.x, Ant Design 5.x, Vite 5.x
- Python桥接：Python 3.x (用于AkShare), AkShare库

**存储**: SQLite 3.40+ (WAL模式，单文件数据库，当前约2.6GB，预计扩展至5-8GB)

**测试**: 
- 后端：Jest (单元测试), Supertest (集成测试)
- 前端：Vitest, React Testing Library

**目标平台**: 
- 后端：macOS/Linux服务器 (本地开发环境)
- 前端：现代浏览器 (Chrome, Safari, Firefox)

**项目类型**: Web应用 (前后端分离)

**性能目标**: 
- 导入：110只港股2小时内完成，550只美股4小时内完成
- 查询：搜索响应<1秒，VCP分析<5秒
- 增量更新：200只股票10分钟内完成

**约束条件**: 
- 数据库大小增长：+3-5GB (660只股票 × 10年 × 约2500个交易日)
- API限流：需处理数据源API的速率限制
- 内存占用：批量导入时控制在合理范围内（分批处理）

**规模范围**: 
- 新增股票：约660只（110港股 + 550美股）
- 历史数据：每只股票约2500个交易日 × 10年
- 总K线记录：约1,650,000条新记录

## 合规性检查

*关卡：必须在Phase 0研究前通过。Phase 1设计后重新检查。*

### I. 组件优先 (前端)

- ✅ **通过** - 前端市场筛选器、跨语言搜索将作为独立可复用组件开发
- ✅ **通过** - 现有K线图、股票列表组件可直接复用，仅需扩展市场类型支持
- ⚠️ **注意** - 如需设计新的页面或重大UI功能，必须使用frontend-design技能

### II. TypeScript & 类型安全

- ✅ **通过** - 后端和前端均已启用TypeScript strict模式
- ✅ **通过** - 需为港股/美股扩展现有类型定义（Stock, KLineData接口）
- ✅ **通过** - 数据源响应需定义清晰的TypeScript接口

### III. 测试优先 (不可协商)

- ✅ **承诺** - 遵循TDD流程：
  1. 编写数据导入脚本的单元测试（mock数据源API）
  2. 编写增量更新逻辑的集成测试
  3. 编写前端市场筛选器的组件测试
  4. 编写VCP分析对港股/美股的集成测试
- 📋 **计划** - 在Phase 2任务分解中明确测试任务的优先级

### IV. 构建 & 性能标准

- ✅ **通过** - 前端bundle size不会显著增加（仅添加少量UI逻辑）
- ✅ **通过** - 数据导入脚本使用批量处理（每批10-20只股票）避免内存溢出
- ✅ **通过** - 使用p-limit控制并发请求数量，避免API限流

### V. 可观测性 & 调试

- ✅ **通过** - 导入脚本输出结构化日志（进度、成功/失败计数、错误详情）
- ✅ **通过** - 数据源切换和失败记录在UpdateLog或新ImportLog表中
- ✅ **通过** - 支持--verbose标志显示详细的API请求和响应信息

**合规性状态**: ✅ 全部通过 - 可以继续Phase 0研究

## 项目结构

### 文档 (本功能)

```text
specs/005-hk-us-stock-data/
├── spec.md              # 功能规格 (/speckit.specify命令输出)
├── plan.md              # 本文件 (/speckit.plan命令输出)
├── research.md          # Phase 0输出 (/speckit.plan命令)
├── data-model.md        # Phase 1输出 (/speckit.plan命令)
├── quickstart.md        # Phase 1输出 (/speckit.plan命令)
├── contracts/           # Phase 1输出 (/speckit.plan命令)
│   ├── data-source-api.md
│   └── import-script-interface.md
├── checklists/          # 质量检查清单
│   └── requirements.md
└── tasks.md             # Phase 2输出 (/speckit.tasks命令 - 不由/speckit.plan创建)
```

### 源代码 (仓库根目录)

```text
backend/
├── src/
│   ├── modules/
│   │   └── market-data/          # 新增：市场数据模块
│   │       ├── market-data.service.ts
│   │       ├── data-source/
│   │       │   ├── akshare-adapter.ts
│   │       │   ├── yahoo-finance-adapter.ts
│   │       │   └── data-source.interface.ts
│   │       └── import/
│   │           ├── import-manager.ts
│   │           ├── checkpoint-tracker.ts
│   │           └── index-composition.ts
│   ├── scripts/
│   │   ├── import-hk-stocks.ts   # 新增：港股导入脚本
│   │   ├── import-us-stocks.ts   # 新增：美股导入脚本
│   │   ├── update-index-composition.ts  # 新增：更新指数成分股
│   │   └── incremental-update-latest.ts # 扩展：支持港股美股
│   └── prisma/
│       └── schema.prisma          # 扩展：Stock表添加currency字段
├── bridge/
│   ├── fetch_hk_stock_list.py     # 新增：获取港股列表
│   ├── fetch_us_stock_list.py     # 新增：获取美股列表
│   ├── fetch_hk_klines.py         # 新增：获取港股K线
│   └── fetch_us_klines.py         # 新增：获取美股K线
└── tests/
    ├── unit/
    │   └── market-data/
    └── integration/
        └── import-hk-us-stocks.spec.ts

frontend/
├── src/
│   ├── components/
│   │   └── MarketFilter/          # 新增：市场筛选组件
│   │       ├── MarketFilter.tsx
│   │       └── MarketFilter.test.tsx
│   ├── pages/
│   │   └── StockList/             # 扩展：支持多市场显示
│   └── services/
│       └── stock.service.ts       # 扩展：支持港股美股查询
└── tests/
    └── components/
```

**结构决策**: 采用Web应用结构（Option 2），后端添加独立的market-data模块管理多市场数据源和导入逻辑，前端扩展现有股票列表和K线图组件以支持多市场。

## 复杂度跟踪

> **仅在合规性检查有违规需要证明时填写**

本功能无违规项，所有实现符合AI Drama Constitution原则。

## Phase 0: 研究 & 决策

详见 [research.md](./research.md)

关键研究领域：
1. AkShare和Yahoo Finance对港股/美股的支持程度
2. 指数成分股列表的获取方式
3. 跨语言搜索的实现方案
4. 断点续传的检查点设计

## Phase 1: 数据模型 & 接口契约

详见：
- [data-model.md](./data-model.md) - 数据库schema扩展和实体关系
- [contracts/](./contracts/) - 数据源API和导入脚本接口
- [quickstart.md](./quickstart.md) - 快速开始指南

### Phase 1 合规性复核

**复核日期**: 2026-03-12

- ✅ **组件优先**: MarketFilter组件设计符合独立可复用原则
- ✅ **TypeScript类型安全**: 所有新接口和数据模型都有完整类型定义
- ✅ **测试优先**: 已规划单元测试、集成测试和组件测试
- ✅ **性能标准**: 导入和查询性能目标明确且可测量
- ✅ **可观测性**: 导入脚本输出详细日志，支持进度追踪和错误诊断

**Phase 1设计质量**: ✅ 全部通过，可以继续Phase 2任务分解

## Phase 2: 任务分解

使用 `/speckit.tasks` 命令生成 `tasks.md`

## 实施策略

### 开发顺序

1. **Phase 2.1: 数据层扩展** (P1)
   - 扩展Prisma schema支持HK/US市场类型和currency字段
   - 数据库迁移和验证

2. **Phase 2.2: 数据源适配器** (P1)
   - 实现AkShare适配器（港股/美股支持）
   - 实现Yahoo Finance适配器（备选）
   - 智能混合策略和失败切换逻辑

3. **Phase 2.3: 港股数据导入** (P1)
   - 获取恒生指数和恒生科技指数成分股列表
   - 导入港股基本信息和10年K线数据
   - 断点续传和错误处理

4. **Phase 2.4: 美股数据导入** (P1)
   - 获取标普500和纳斯达克100成分股列表
   - 导入美股基本信息和10年K线数据
   - 断点续传和错误处理

5. **Phase 2.5: 前端多市场支持** (P2)
   - 市场筛选器组件
   - 股票列表扩展（显示市场标识）
   - 货币单位正确显示

6. **Phase 2.6: VCP分析扩展** (P2)
   - VCP分析支持港股和美股
   - 货币单位在分析报告中正确显示

7. **Phase 2.7: 增量更新扩展** (P3)
   - 扩展现有增量更新脚本支持港股和美股
   - 批量处理和进度显示

### 测试策略

- **单元测试**: 数据源适配器、智能混合策略、断点续传逻辑
- **集成测试**: 完整导入流程（使用mock数据源）、增量更新、VCP分析
- **端到端测试**: 从导入到前端展示的完整流程
- **性能测试**: 导入速度、查询响应时间、数据库性能

### 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AkShare不支持港股/美股 | 高 | 使用Yahoo Finance作为主要数据源，AkShare作为备选 |
| 数据源API限流 | 中 | 实现请求速率控制（每秒2-3个请求），使用p-limit控制并发 |
| 10年数据量过大导致导入超时 | 中 | 分批导入（每只股票按年份分批），支持断点续传 |
| 数据库容量不足 | 中 | 监控数据库大小，必要时清理旧数据或迁移到更大存储 |
| 股票代码格式不兼容 | 低 | 统一使用带市场后缀的格式（如"00700.HK", "AAPL.US"） |
| 跨语言搜索性能问题 | 低 | 使用数据库索引优化，考虑添加搜索关键词表 |

## 技术决策记录

### 决策1: 股票代码格式标准化

**问题**: 港股、美股、A股的股票代码格式不同，如何统一存储和查询？

**选择**: 统一使用"代码.市场"格式
- 港股: "00700.HK"
- 美股: "AAPL.US" (添加.US后缀以保持一致性)
- A股: "600519.SH", "000001.SZ" (保持现有格式)

**原因**: 
- 统一格式便于代码逻辑统一处理
- 避免代码冲突（如港股"00001"和A股"000001"）
- 便于market字段的提取和验证

**替代方案**: 
- ❌ 使用复合主键(stockCode + market) - 增加查询复杂度
- ❌ 保持原始格式不加后缀 - 可能产生代码冲突

### 决策2: 数据源适配器架构

**问题**: 如何设计灵活的数据源切换机制？

**选择**: 策略模式 + 智能混合
- 定义统一的IDataSourceAdapter接口
- 实现AkShareAdapter和YahooFinanceAdapter
- ImportManager协调数据源切换逻辑

**原因**: 
- 符合开闭原则，易于扩展新数据源
- 统一接口简化上层调用代码
- 便于单元测试（mock数据源）

**替代方案**: 
- ❌ 硬编码if-else切换逻辑 - 难以维护和扩展
- ❌ 只支持单一数据源 - 可靠性不足

### 决策3: 断点续传实现方式

**问题**: 如何实现导入过程的断点续传？

**选择**: 基于数据库状态的检查点
- 检查数据库中已存在的股票记录
- 跳过已有完整10年数据的股票
- 对部分数据缺失的股票补充缺失部分

**原因**: 
- 无需额外的检查点文件，利用数据库作为单一数据源
- 天然支持增量导入（补充缺失数据）
- 简化状态管理

**替代方案**: 
- ❌ 使用外部检查点文件 - 需同步数据库和文件状态，复杂度高
- ❌ 使用专门的ImportTask表 - 需额外的状态维护逻辑

### 决策4: 跨语言搜索实现

**问题**: 用户输入中文"苹果"如何匹配英文股票名"Apple Inc."？

**选择**: 扩展Stock表添加searchKeywords字段
- 存储常用中英文搜索关键词（JSON格式）
- 如: {"zh": ["苹果", "苹果公司"], "en": ["Apple", "AAPL"]}
- 搜索时同时匹配stockName和searchKeywords

**原因**: 
- 性能好（使用数据库索引）
- 灵活（可手动维护常用翻译）
- 简单（无需外部翻译API）

**替代方案**: 
- ❌ 实时调用翻译API - 性能差，依赖外部服务
- ❌ 全文搜索引擎（如Elasticsearch） - 过度设计，引入复杂依赖

## 数据流

### 导入流程

```
管理员运行导入脚本
    ↓
获取指数成分股列表 (AkShare/Yahoo Finance)
    ↓
遍历每只股票:
    ↓
检查数据库是否已存在 → 存在且数据完整 → 跳过
    ↓                    ↓
不存在或数据不完整    尝试AkShare获取数据
    ↓                    ↓
                        成功 → 保存到数据库 (source: akshare)
                         ↓
                        失败 → 尝试Yahoo Finance
                         ↓
                        成功 → 保存到数据库 (source: yahoo_finance)
                         ↓
                        失败 → 记录错误日志，继续下一只
    ↓
生成导入报告 (成功/失败统计)
```

### 查询流程（扩展现有流程）

```
用户在前端搜索股票
    ↓
前端发送查询请求 (支持中英文)
    ↓
后端查询Stock表 (匹配stockCode, stockName, searchKeywords)
    ↓
返回结果（包含market和currency字段）
    ↓
前端显示结果：
    - 市场标识 (HK/US/SH/SZ)
    - 正确的货币符号 (HKD/USD/CNY)
```

## 依赖关系

### 外部依赖

- **AkShare Python库**: 数据源（主要）
- **Yahoo Finance API**: 数据源（备选）
- **恒生指数官网**: 指数成分股列表
- **标普/纳斯达克官网**: 指数成分股列表

### 内部依赖

- 现有Prisma schema和数据库
- 现有的Python bridge机制
- 现有的增量更新脚本逻辑
- 现有的VCP分析算法

### 数据依赖

- 现有A股数据（作为参考和对比）
- SQLite数据库有足够的存储空间（需3-5GB额外空间）

## 实施里程碑

### Milestone 1: 数据层就绪 (1天)
- ✅ Prisma schema扩展完成
- ✅ 数据库迁移成功
- ✅ 本地测试通过

### Milestone 2: 数据源适配器就绪 (2-3天)
- ✅ AkShare和Yahoo Finance适配器实现
- ✅ 智能混合策略测试通过
- ✅ 单元测试覆盖率>80%

### Milestone 3: 港股数据导入完成 (2-3天)
- ✅ 110只港股基本信息导入
- ✅ 10年历史K线数据导入
- ✅ 导入时间<2小时
- ✅ 失败率<5%

### Milestone 4: 美股数据导入完成 (3-4天)
- ✅ 550只美股基本信息导入
- ✅ 10年历史K线数据导入
- ✅ 导入时间<4小时
- ✅ 失败率<5%

### Milestone 5: 前端多市场支持 (2天)
- ✅ 市场筛选器组件完成
- ✅ 股票列表显示市场标识
- ✅ 货币单位正确显示
- ✅ 跨语言搜索功能

### Milestone 6: VCP分析扩展 (1-2天)
- ✅ VCP分析支持港股和美股
- ✅ 分析报告货币单位正确
- ✅ 分析准确率>95%

### Milestone 7: 增量更新扩展 (1天)
- ✅ 增量更新支持港股和美股
- ✅ 更新时间<10分钟（200只股票）

**总预计时间**: 12-16天

## 回滚策略

由于本功能主要是数据添加和功能扩展，对现有A股功能无破坏性影响：

1. **数据库回滚**: 
   - 使用Prisma迁移机制，可回滚schema变更
   - 港股/美股数据独立存储，删除market='HK'/'US'的记录即可

2. **代码回滚**: 
   - 使用Git分支隔离，主分支不受影响
   - 新增的market-data模块可以完全移除

3. **前端回滚**: 
   - 市场筛选器为独立组件，移除不影响现有功能
   - 前端代码向后兼容，不展示港股/美股数据即可

## 监控指标

### 导入阶段

- 导入进度（已完成/总数）
- 导入速度（股票数/小时）
- 数据源成功率（AkShare vs Yahoo Finance）
- 失败率和失败原因分布
- 数据库大小增长

### 运行阶段

- 查询响应时间（按市场类型）
- VCP分析性能（港股/美股 vs A股）
- 增量更新耗时
- 数据新鲜度（最后更新时间）

## 下一步

运行 `/speckit.tasks` 生成详细的任务分解和实施检查清单。
