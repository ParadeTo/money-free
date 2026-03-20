# 任务列表：成交量激增扫描器

**输入**: 设计文档来自 `/specs/008-volume-surge-scan/`  
**前置条件**: plan.md（必需）, spec.md（用户故事必需）, research.md, data-model.md, contracts/

**测试**: 本项目遵循TDD（测试驱动开发）原则，测试任务已包含在内

**组织方式**: 任务按用户故事分组，以支持每个故事的独立实现和测试

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**: 可并行运行（不同文件，无依赖）
- **[Story]**: 任务所属的用户故事（如 US1, US2, US3）
- 描述中包含准确的文件路径

## 路径约定

本项目使用Web应用结构：
- 后端：`backend/src/`
- 前端：`frontend/src/`
- 测试：`backend/tests/`, `frontend/tests/`

---

## Phase 1: Setup（共享基础设施）

**目的**: 项目初始化和基本结构

- [x] T001 在 backend/prisma/schema.prisma 中添加 VolumeSurgeScan 和 ScanResult 模型定义
- [x] T002 运行数据库迁移创建新表: npx prisma db push
- [x] T003 生成Prisma Client: 已自动完成
- [x] T004 [P] 在 backend/src/types/scan.types.ts 中定义共享TypeScript类型（ScanMode, ScanStatus, VolumePattern等）
- [x] T005 [P] 在 frontend/src/types/scan.types.ts 中定义前端类型（从后端类型同步）

---

## Phase 2: Foundational（阻塞性前置条件）

**目的**: 所有用户故事必须依赖的核心基础设施

**⚠️ 关键**: 在此阶段完成前，不能开始任何用户故事工作

- [x] T006 创建 backend/src/modules/volume-surge/volume-surge.module.ts 模块定义
- [x] T007 [P] 创建 backend/src/modules/volume-surge/entities/volume-surge-scan.entity.ts 扫描记录实体
- [x] T008 [P] 创建 backend/src/modules/volume-surge/entities/scan-result.entity.ts 扫描结果实体
- [x] T009 [P] 创建 backend/src/modules/volume-surge/dto/scan-request.dto.ts 请求DTO
- [x] T010 [P] 创建 backend/src/modules/volume-surge/dto/scan-response.dto.ts 响应DTO
- [x] T011 创建 backend/src/modules/volume-surge/volume-surge.controller.ts 控制器框架
- [x] T012 创建 backend/src/modules/volume-surge/volume-surge.service.ts 业务编排服务框架
- [x] T013 在 backend/src/app.module.ts 中注册 VolumeSurgeModule

**检查点**: 基础设施就绪 - 用户故事实现现在可以并行开始

---

## Phase 3: User Story 1 - 识别早期启动信号 (Priority: P1) 🎯 MVP

**目标**: 实现核心扫描逻辑，识别成交量从萎缩到放大、均线开始向上的股票

**独立测试**: 通过输入特定股票代码（如比亚迪SZ002594），验证系统能否识别出成交量转折点和均线状态

### 测试 for User Story 1 ⚠️

> **注意: 先编写这些测试，确保它们失败后再实现功能**

- [x] T014 [P] [US1] 编写成交量模式识别单元测试 backend/tests/volume-surge/pattern-detector.service.spec.ts
- [x] T015 [P] [US1] 编写均线计算单元测试 backend/tests/volume-surge/moving-average.service.spec.ts
- [x] T016 [P] [US1] 编写扫描执行器集成测试 backend/tests/volume-surge/scan-executor.service.spec.ts
- [x] T017 [P] [US1] 编写 POST /scan API契约测试 backend/tests/volume-surge/volume-surge.controller.spec.ts

### 实现 for User Story 1

#### 后端核心服务

- [x] T018 [P] [US1] 实现 backend/src/modules/volume-surge/services/moving-average.service.ts - 均线计算服务
- [x] T019 [P] [US1] 实现 backend/src/modules/volume-surge/services/pattern-detector.service.ts - 成交量模式识别服务
- [x] T020 [US1] 实现 backend/src/modules/volume-surge/services/scan-executor.service.ts - 扫描执行器（依赖T018, T019）
- [x] T021 [US1] 在 volume-surge.service.ts 中实现 scan() 方法 - 扫描入口逻辑（依赖T020）
- [x] T022 [US1] 在 volume-surge.controller.ts 中实现 POST /scan 端点
- [x] T023 [US1] 实现 GET /scans/:scanId 端点 - 查询扫描状态
- [x] T024 [US1] 添加扫描日志记录（跳过的股票、数据缺失等）
- [x] T025 [US1] 实现数据质量检查逻辑（处理停牌、数据缺失场景）

#### 算法细节

**成交量模式识别** (pattern-detector.service.ts):
- 滑动窗口识别萎缩期（5天低于前20天均值70%）
- 识别放大点（超过萎缩期均值150%）
- 支持auto和manual两种模式

**均线计算** (moving-average.service.ts):
- 计算50日和150日简单移动平均（SMA）
- 计算最近5日的50日均线线性回归斜率
- 判断50日均线是否低于150日均线

**扫描执行器** (scan-executor.service.ts):
- 使用p-limit控制并发（10个股票）
- 批量查询K线数据
- 组合模式识别和均线计算结果
- 持久化扫描结果到数据库

**检查点**: 此时用户故事1应完全可用，可独立测试。用户能够通过API触发扫描并查询结果。

---

## Phase 4: User Story 2 - 验证买量支撑 (Priority: P2)

**目标**: 增强扫描结果，计算并显示上涨日/下降日成交量对比，验证买方力量

**独立测试**: 通过已识别的早期启动股票，验证系统能否正确统计上涨日和下降日成交量，并计算买量支撑比率

### 测试 for User Story 2 ⚠️

- [x] T026 [P] [US2] 编写买量支撑计算单元测试 backend/tests/volume-surge/volume-support-calculator.service.spec.ts
- [x] T027 [P] [US2] 编写上涨日/下降日识别测试（边缘案例：全是上涨日、全是下降日）

### 实现 for User Story 2

- [x] T028 [P] [US2] 创建 backend/src/modules/volume-surge/services/volume-support-calculator.service.ts 买量支撑计算服务
- [x] T029 [US2] 在 scan-executor.service.ts 中集成买量支撑计算（依赖T028）
- [x] T030 [US2] 在 ScanResult 实体中添加上涨日/下降日成交量字段（upDayAvgVolume, downDayAvgVolume, volumeSupportRatio）
- [x] T031 [US2] 实现 GET /scans/:scanId/results 端点 - 查询扫描结果列表（支持filter参数）
- [x] T032 [US2] 添加结果筛选逻辑（meetsAllCriteria, meetsSupportCriteria）
- [x] T033 [US2] 处理边缘案例：全是上涨日（视为符合）、全是下降日（跳过）

**检查点**: 用户故事1和2都应独立工作。扫描结果现在包含买量支撑指标，用户可以筛选有真实买方支撑的股票。

---

## Phase 5: User Story 3 - 浏览和对比候选股票 (Priority: P3)

**目标**: 提供完整的用户界面（Web + CLI），支持结果查看、详情展示、历史对比、导出功能

**独立测试**: 验证Web界面能清晰展示股票列表、支持点击查看详情、对比多只股票、导出CSV/Markdown

### 测试 for User Story 3 ⚠️

#### 后端测试

- [x] T034 [P] [US3] 编写导出服务单元测试 backend/tests/volume-surge/export.service.spec.ts
- [x] T035 [P] [US3] 编写对比服务单元测试 backend/tests/volume-surge/comparison.service.spec.ts
- [x] T036 [P] [US3] 编写历史查询API测试 backend/tests/volume-surge/history-api.spec.ts

#### 前端测试

- [x] T037 [P] [US3] 编写扫描配置组件测试 frontend/tests/pages/VolumeSurgeScan/ScanConfig.test.tsx
- [x] T038 [P] [US3] 编写结果列表组件测试 frontend/tests/pages/VolumeSurgeScan/ScanResults.test.tsx
- [x] T039 [P] [US3] 编写股票详情组件测试 frontend/tests/pages/VolumeSurgeScan/StockDetail.test.tsx

### 实现 for User Story 3

#### 后端API实现

- [x] T040 [P] [US3] 创建 backend/src/modules/volume-surge/services/export.service.ts - 导出服务（CSV + Markdown）
- [x] T041 [P] [US3] 创建 backend/src/modules/volume-surge/services/comparison.service.ts - 对比服务
- [x] T042 [US3] 实现 GET /scans 端点 - 查询历史扫描列表（支持分页、过滤）
- [x] T043 [US3] 实现 GET /scans/:scanId/export 端点 - 导出结果（依赖T040）
- [x] T044 [US3] 实现 POST /compare 端点 - 对比两次扫描（依赖T041）
- [x] T045 [US3] 实现 POST /scans/:scanId/cancel 端点 - 取消扫描

#### 前端界面实现

- [x] T046 [P] [US3] 创建 frontend/src/services/volumeSurgeScanApi.ts - API调用封装
- [x] T047 [P] [US3] 安装ECharts依赖: npm install echarts echarts-for-react
- [x] T048 [US3] 创建 frontend/src/pages/VolumeSurgeScan/index.tsx - 扫描器主页面
- [x] T049 [P] [US3] 创建 frontend/src/pages/VolumeSurgeScan/ScanConfig.tsx - 扫描参数配置组件
- [x] T050 [P] [US3] 创建 frontend/src/pages/VolumeSurgeScan/ScanResults.tsx - 结果列表组件
- [x] T051 [P] [US3] 创建 frontend/src/pages/VolumeSurgeScan/StockDetail.tsx - 股票详情组件
- [x] T052 [P] [US3] 创建 frontend/src/pages/VolumeSurgeScan/HistoryComparison.tsx - 历史对比组件
- [x] T053 [P] [US3] 创建 frontend/src/components/VolumeSurgeChart.tsx - ECharts可视化图表组件
- [x] T054 [US3] 在 frontend/src/App.tsx 中添加路由 /volume-surge-scan（依赖T048）
- [x] T055 [US3] 实现扫描进度条显示（Web界面实时更新）
- [x] T056 [US3] 实现结果排序和过滤功能（按买量支撑比率、成交量放大倍数等）
- [x] T057 [US3] 实现股票多选和对比功能
- [x] T058 [US3] 实现CSV和Markdown导出按钮

#### CLI工具实现

- [x] T059 [US3] 安装yargs依赖: npm install yargs @types/yargs
- [x] T060 [US3] 创建 backend/src/scripts/scan-cli.ts - CLI工具入口
- [x] T061 [US3] 在 backend/package.json 中添加 scan:volume-surge 脚本命令
- [x] T062 [US3] 实现CLI参数解析（--date, --export, --verbose）
- [x] T063 [US3] 实现CLI进度显示（百分比输出）
- [x] T064 [US3] 实现CLI结果格式化输出（表格形式）
- [x] T065 [US3] 实现Ctrl+C信号处理（安全取消扫描）

**检查点**: 所有用户故事现在都应独立可用。用户可通过Web界面或CLI工具使用完整功能。

---

## Phase 6: Polish & Cross-Cutting Concerns

**目的**: 影响多个用户故事的改进

- [x] T066 [P] 性能优化：调整p-limit并发数（测试10-20之间最优值）
- [x] T067 [P] 添加详细日志：在所有服务中添加结构化日志（NestJS Logger）
- [x] T068 [P] 错误处理增强：统一错误码和错误消息格式
- [x] T069 前端UI优化：使用 frontend-design 技能优化扫描器页面设计
- [x] T070 [P] 添加单元测试覆盖剩余边缘案例（非交易日处理、数据缺失等）
- [x] T071 [P] 性能测试：验证3000只股票扫描是否 < 30秒
- [x] T072 代码审查：检查TypeScript strict模式合规性
- [x] T073 [P] 文档更新：在 docs/ 中添加功能使用说明（如果需要）
- [x] T074 运行 quickstart.md 中的所有验证步骤，确保环境配置正确
- [x] T075 [P] ESLint修复：运行 npm run lint:fix 修复代码风格问题

---

## 依赖与执行顺序

### 阶段依赖

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-5)**: 所有依赖Foundational完成
  - 用户故事可并行进行（如有团队资源）
  - 或按优先级顺序进行（P1 → P2 → P3）
- **Polish (Phase 6)**: 依赖所有期望的用户故事完成

### 用户故事依赖

- **User Story 1 (P1)**: 可在Foundational (Phase 2) 后开始 - 无其他故事依赖
- **User Story 2 (P2)**: 可在Foundational (Phase 2) 后开始 - 扩展US1但可独立测试
- **User Story 3 (P3)**: 可在Foundational (Phase 2) 后开始 - 集成US1/US2但可独立测试

### 每个用户故事内部

- 测试必须先编写并失败
- 模型在服务之前
- 服务在端点之前
- 核心实现在集成之前
- 故事完成后再进入下一优先级

### 并行机会

- 所有Setup任务标记[P]可并行运行
- 所有Foundational任务标记[P]可并行运行（Phase 2内）
- Foundational完成后，所有用户故事可并行开始（如团队资源允许）
- 每个用户故事内的测试标记[P]可并行运行
- 每个用户故事内的模型标记[P]可并行运行
- 不同用户故事可由不同团队成员并行开发

---

## 并行示例：User Story 1

```bash
# 启动User Story 1的所有测试（步骤1）:
Task: "编写成交量模式识别单元测试 backend/tests/volume-surge/pattern-detector.service.spec.ts"
Task: "编写均线计算单元测试 backend/tests/volume-surge/moving-average.service.spec.ts"
Task: "编写扫描执行器集成测试 backend/tests/volume-surge/scan-executor.service.spec.ts"
Task: "编写 POST /scan API契约测试 backend/tests/volume-surge/volume-surge.controller.spec.ts"

# 启动User Story 1的核心服务（步骤2，测试通过后）:
Task: "实现 moving-average.service.ts - 均线计算服务"
Task: "实现 pattern-detector.service.ts - 成交量模式识别服务"
```

---

## 并行示例：User Story 3

```bash
# 启动User Story 3的后端API和前端界面（可并行）:

# 后端团队:
Task: "创建 export.service.ts - 导出服务"
Task: "创建 comparison.service.ts - 对比服务"

# 前端团队:
Task: "创建 ScanConfig.tsx - 扫描参数配置组件"
Task: "创建 ScanResults.tsx - 结果列表组件"
Task: "创建 StockDetail.tsx - 股票详情组件"
Task: "创建 VolumeSurgeChart.tsx - 可视化图表组件"
```

---

## 实现策略

### MVP优先（仅User Story 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 - 阻塞所有故事）
3. 完成 Phase 3: User Story 1
4. **停止并验证**: 独立测试User Story 1
5. 如果就绪，部署/演示

**MVP价值**: 用户可以通过API触发扫描，识别早期启动信号的股票，查询扫描状态和结果。虽然没有UI和导出功能，但核心算法已可用且可验证。

### 增量交付

1. 完成 Setup + Foundational → 基础就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示（MVP！）
3. 添加 User Story 2 → 独立测试 → 部署/演示（增强版）
4. 添加 User Story 3 → 独立测试 → 部署/演示（完整版）
5. 每个故事添加价值而不破坏之前的故事

### 并行团队策略

如有多名开发者：

1. 团队一起完成 Setup + Foundational
2. Foundational完成后：
   - 开发者A: User Story 1（后端核心算法）
   - 开发者B: User Story 2（买量支撑增强）
   - 开发者C: User Story 3（前端界面 + CLI）
3. 故事独立完成并集成

**注意**: User Story 3需要US1和US2的API支持，但可以先mock API独立开发UI。

---

## 任务统计

### 总任务数：75个任务

| 阶段 | 任务数 | 可并行任务 |
|------|--------|-----------|
| Phase 1: Setup | 5 | 2 |
| Phase 2: Foundational | 8 | 5 |
| Phase 3: User Story 1 (P1) | 12 | 7 |
| Phase 4: User Story 2 (P2) | 8 | 4 |
| Phase 5: User Story 3 (P3) | 32 | 16 |
| Phase 6: Polish | 10 | 7 |

### 按用户故事分组

- **User Story 1**: 12个任务（测试4 + 实现8）
- **User Story 2**: 8个任务（测试2 + 实现6）
- **User Story 3**: 32个任务（测试6 + 后端8 + 前端10 + CLI8）

### 并行机会

- **Setup阶段**: 2个任务可并行（T004, T005）
- **Foundational阶段**: 5个任务可并行（T007-T010）
- **User Story 1**: 7个任务可并行（4个测试 + 3个核心服务）
- **User Story 2**: 4个任务可并行（2个测试 + 2个独立功能）
- **User Story 3**: 16个任务可并行（6个测试 + 2个后端服务 + 8个前端组件）
- **Polish阶段**: 7个任务可并行

**总并行机会**: 41个任务可并行执行（占总数的55%）

---

## MVP范围建议

**最小可行产品（MVP）**: Phase 1 + Phase 2 + Phase 3（仅User Story 1）

**MVP交付内容**:
- ✅ 核心扫描算法（成交量模式识别 + 均线计算）
- ✅ REST API（触发扫描、查询状态、查询结果）
- ✅ 数据持久化（扫描记录和结果存储）
- ✅ 性能优化（并行处理、批量查询）
- ✅ 边缘案例处理（数据缺失、停牌等）

**MVP验证方式**:
```bash
# 使用curl测试API
curl -X POST http://localhost:3000/api/volume-surge/scan \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto", "source": "api"}'

# 查询结果
curl http://localhost:3000/api/volume-surge/scans/{scanId}/results?filter=matched
```

**MVP后续扩展**:
- Phase 4: 添加买量支撑验证（User Story 2）
- Phase 5: 添加完整UI和导出功能（User Story 3）

---

## 格式验证

✅ **所有任务遵循checklist格式**: `- [ ] [TaskID] [P?] [Story?] 描述 + 文件路径`  
✅ **任务ID**: 顺序编号 T001-T075  
✅ **[P]标记**: 41个可并行任务已标记  
✅ **[Story]标签**: 所有用户故事任务已标记（US1, US2, US3）  
✅ **文件路径**: 所有任务包含具体文件路径  
✅ **独立测试**: 每个用户故事定义了独立测试标准

---

## 注意事项

- [P] 任务 = 不同文件，无依赖
- [Story] 标签将任务映射到特定用户故事，便于追踪
- 每个用户故事应可独立完成和测试
- 实现前验证测试失败
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、文件冲突、破坏独立性的跨故事依赖

---

## 下一步

**建议执行顺序**:

1. **立即开始 MVP**:
   ```bash
   # 完成所有Setup和Foundational任务（T001-T013）
   # 然后完成User Story 1的所有任务（T014-T025）
   ```

2. **验证 MVP**:
   - 运行所有测试确保通过
   - 使用curl测试API端点
   - 验证扫描性能 < 30秒

3. **增量添加功能**:
   - 添加User Story 2（买量支撑）
   - 添加User Story 3（UI + CLI + 导出）

4. **Polish**: 
   - 完成Phase 6的所有优化任务

**准备开始实现**: 使用 `/speckit.implement` 或手动按任务列表执行
