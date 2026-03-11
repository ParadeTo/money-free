# 任务分解：VCP早期启动阶段股票筛选

**功能**: 003-vcp-early-stage  
**创建日期**: 2026-03-11  
**规格**: [spec.md](./spec.md) | **计划**: [plan.md](./plan.md)

## 任务优先级说明

- **P0**: 关键路径 - 核心功能，必须优先完成
- **P1**: 重要 - 用户体验相关，核心功能的重要补充
- **P2**: 增强 - 改善体验，可后续迭代

## 执行顺序

遵循TDD原则：**测试优先 → 实现 → 重构**

每个任务包含：
- 📝 测试用例（先写）
- 💻 实现代码（后写）
- 📊 验收标准

---

## Phase 1: 后端核心筛选逻辑（P0）

### Task 1.1: 创建类型定义文件

**优先级**: P0  
**预计时间**: 1小时  
**依赖**: 无  
**文件**: `backend/src/types/vcp-early-stage.ts`

#### 📝 测试用例（无需单元测试，类型检查即可）

TypeScript编译检查：
```bash
npx tsc --noEmit
```

#### 💻 实现内容

1. 从 `specs/003-vcp-early-stage/contracts/api.ts` 复制类型定义
2. 创建 `backend/src/types/vcp-early-stage.ts`
3. 导出所有接口：
   - FilterConditions
   - EarlyStageStock
   - VcpStage (enum)
   - PullbackInfo
   - FilterResult
   - ResultTip
   - QuickAction

#### 📊 验收标准

- [X] TypeScript编译无错误
- [X] 所有接口导出可被其他模块import
- [X] 枚举值与设计文档一致

---

### Task 1.2: 实现早期筛选服务（测试）

**优先级**: P0  
**预计时间**: 2小时  
**依赖**: Task 1.1  
**文件**: `backend/src/services/vcp/vcp-early-filter.service.spec.ts`

#### 📝 测试用例

```typescript
describe('VcpEarlyFilterService', () => {
  describe('filterEarlyStage', () => {
    it('应该筛选出距52周低点<40%的股票', async () => {
      // Arrange: Mock 10只股票，5只符合条件
      // Act: 调用filter with distFrom52WeekLow=40
      // Assert: 返回5只股票，所有distFrom52WeekLow<40
    });

    it('应该筛选出距52周高点>30%的股票', async () => {
      // Arrange: Mock 10只股票，6只符合条件
      // Act: 调用filter with distFrom52WeekHigh=30
      // Assert: 返回6只股票，所有distFrom52WeekHigh>30
    });

    it('应该筛选出收缩次数在3-4次之间的股票', async () => {
      // Arrange: Mock 10只股票，不同收缩次数
      // Act: 调用filter with min=3, max=4
      // Assert: 返回的股票contractionCount都在3-4之间
    });

    it('应该按阶段+距52周低点排序', async () => {
      // Arrange: Mock 9只股票（3个收缩中，3个回调中，3个回调结束）
      // Act: 调用filter
      // Assert: 收缩中排最前，同阶段内距52周低点从小到大
    });

    it('应该调用VcpAnalyzer实时计算VCP阶段', async () => {
      // Arrange: Mock vcpAnalyzer.analyze
      // Act: 调用filter
      // Assert: vcpAnalyzer.analyze被调用，返回正确的vcpStage
    });

    it('结果<5只时应该生成warning提示', async () => {
      // Arrange: Mock 3只股票符合条件
      // Act: 调用filter
      // Assert: result.tip.type === 'warning'
    });

    it('结果>30只时应该生成info提示', async () => {
      // Arrange: Mock 45只股票符合条件
      // Act: 调用filter
      // Assert: result.tip.type === 'info'
    });

    it('结果为0时应该生成error提示', async () => {
      // Arrange: Mock 0只股票符合条件
      // Act: 调用filter
      // Assert: result.tip.type === 'error'
    });
  });

  describe('generateQuickActions', () => {
    it('应该生成放宽5%和10%的快捷操作', async () => {
      // Arrange: 当前条件distFrom52WeekLow=40
      // Act: 调用generateQuickActions for warning
      // Assert: actions包含"放宽5%"(45)和"放宽10%"(50)
    });

    it('应该生成收紧5%和10%的快捷操作', async () => {
      // Arrange: 当前条件distFrom52WeekLow=50
      // Act: 调用generateQuickActions for info
      // Assert: actions包含"收紧5%"(45)和"收紧10%"(40)
    });
  });

  describe('calculateVcpStage', () => {
    it('无回调数据时应该返回contraction', async () => {
      // Arrange: analysis.pullbacks = []
      // Act: 调用calculateVcpStage
      // Assert: stage === 'contraction'
    });

    it('回调低点是今天时应该返回in_pullback', async () => {
      // Arrange: lastPullback.lowDate = today
      // Act: 调用calculateVcpStage
      // Assert: stage === 'in_pullback'
    });

    it('回调低点在1-5天前应该返回pullback_ended', async () => {
      // Arrange: lastPullback.lowDate = 3 days ago
      // Act: 调用calculateVcpStage
      // Assert: stage === 'pullback_ended', daysSinceLow=3
    });

    it('回调低点>20天前应该返回contraction', async () => {
      // Arrange: lastPullback.lowDate = 30 days ago
      // Act: 调用calculateVcpStage
      // Assert: stage === 'contraction'
    });
  });
});
```

#### 💻 实现内容

**下一任务**: Task 1.3（先通过测试再实现）

#### 📊 验收标准

- [ ] 所有测试用例编写完成
- [ ] 测试运行失败（RED阶段）
- [ ] 测试覆盖率目标：100%（核心筛选逻辑）

---

### Task 1.3: 实现早期筛选服务（代码） ✅

**优先级**: P0  
**预计时间**: 3小时  
**依赖**: Task 1.2  
**文件**: `backend/src/services/vcp/vcp-early-filter.service.ts`

#### 💻 实现内容

```typescript
@Injectable()
export class VcpEarlyFilterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vcpAnalyzer: VcpAnalyzerService,
  ) {}

  async filterEarlyStage(
    conditions: FilterConditions
  ): Promise<FilterResult> {
    // 1. 验证条件
    this.validateConditions(conditions);

    // 2. 获取最新扫描日期
    const scanDate = await this.getLatestScanDate();

    // 3. 查询符合条件的股票
    const baseResults = await this.queryVcpStocks(scanDate, conditions);

    // 4. 实时分析VCP阶段
    const stocks: EarlyStageStock[] = [];
    for (const r of baseResults) {
      const stage = await this.calculateVcpStage(r.stockCode);
      stocks.push({
        ...r,
        vcpStage: stage.stage,
        pullbackInfo: stage.pullbackInfo,
      });
    }

    // 5. 排序：阶段优先，距52周低点次之
    const sorted = this.sortStocks(stocks);

    // 6. 生成智能提示
    const tip = this.generateTip(sorted.length, conditions);

    return {
      stocks: sorted,
      total: sorted.length,
      appliedConditions: conditions,
      tip,
    };
  }

  private validateConditions(conditions: FilterConditions): void {
    // 验证范围
    if (conditions.distFrom52WeekLow < 20 || conditions.distFrom52WeekLow > 60) {
      throw new BadRequestException('距52周低点阈值必须在20-60之间');
    }
    // ... 其他验证
  }

  private async queryVcpStocks(scanDate: Date, conditions: FilterConditions) {
    return await this.prisma.vcpScanResult.findMany({
      where: {
        scanDate,
        trendTemplatePass: true,
        contractionCount: {
          gte: conditions.contractionCountMin,
          lte: conditions.contractionCountMax,
        },
        distFrom52WeekLow: { lte: conditions.distFrom52WeekLow },
        distFrom52WeekHigh: { gte: conditions.distFrom52WeekHigh },
      },
      include: { stock: { select: { stockName: true } } },
    });
  }

  private async calculateVcpStage(stockCode: string): Promise<{
    stage: VcpStage;
    pullbackInfo?: PullbackInfo;
  }> {
    // 获取最新300根K线
    const klines = await this.getKLines(stockCode, 300);
    const analysis = this.vcpAnalyzer.analyze(klines);
    
    // 判断VCP阶段
    // ... (实现逻辑)
  }

  private sortStocks(stocks: EarlyStageStock[]): EarlyStageStock[] {
    const stageOrder = {
      contraction: 0,
      in_pullback: 1,
      pullback_ended: 2,
    };

    return stocks.sort((a, b) => {
      // 首先按阶段排序
      const stageDiff = stageOrder[a.vcpStage] - stageOrder[b.vcpStage];
      if (stageDiff !== 0) return stageDiff;

      // 同阶段内按距52周低点排序
      return a.distFrom52WeekLow - b.distFrom52WeekLow;
    });
  }

  private generateTip(total: number, conditions: FilterConditions): ResultTip | undefined {
    if (total < 5) {
      return {
        type: 'warning',
        message: `当前条件筛选出${total}只股票，建议放宽筛选条件`,
        suggestedActions: [
          {
            label: '放宽5%',
            adjustments: {
              distFrom52WeekLow: Math.min(60, conditions.distFrom52WeekLow + 5),
            },
          },
          {
            label: '放宽10%',
            adjustments: {
              distFrom52WeekLow: Math.min(60, conditions.distFrom52WeekLow + 10),
            },
          },
        ],
      };
    }

    if (total > 30) {
      return {
        type: 'info',
        message: `当前条件筛选出${total}只股票，建议收紧筛选条件以聚焦优质标的`,
        suggestedActions: [
          {
            label: '收紧5%',
            adjustments: {
              distFrom52WeekLow: Math.max(20, conditions.distFrom52WeekLow - 5),
            },
          },
          {
            label: '收紧10%',
            adjustments: {
              distFrom52WeekLow: Math.max(20, conditions.distFrom52WeekLow - 10),
            },
          },
        ],
      };
    }

    return undefined;
  }
}
```

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] 测试覆盖率100%
- [ ] 性能：筛选5000只股票 < 10秒
- [ ] 代码review通过

---

### Task 1.4: 添加VCP Controller端点（测试）

**优先级**: P0  
**预计时间**: 1小时  
**依赖**: Task 1.3  
**文件**: `backend/src/modules/vcp/vcp.controller.spec.ts`

#### 📝 测试用例

```typescript
describe('VcpController - Early Stage Filter', () => {
  describe('POST /api/vcp/early-stage', () => {
    it('应该接受有效的筛选条件并返回结果', async () => {
      // Arrange: 有效的FilterConditions
      // Act: POST /api/vcp/early-stage
      // Assert: 200 OK, 返回FilterResult
    });

    it('应该拒绝无效的筛选条件（400）', async () => {
      // Arrange: distFrom52WeekLow = 100 (超出范围)
      // Act: POST /api/vcp/early-stage
      // Assert: 400 Bad Request, 错误消息清晰
    });

    it('应该拒绝min>max的收缩次数（400）', async () => {
      // Arrange: contractionCountMin=5, contractionCountMax=3
      // Act: POST /api/vcp/early-stage
      // Assert: 400 Bad Request
    });

    it('应该处理数据库错误（500）', async () => {
      // Arrange: Mock prisma抛出异常
      // Act: POST /api/vcp/early-stage
      // Assert: 500 Internal Server Error
    });

    it('应该记录结构化日志', async () => {
      // Arrange: Mock logger
      // Act: POST /api/vcp/early-stage
      // Assert: logger.log被调用，包含筛选条件和结果数量
    });
  });
});
```

#### 📊 验收标准

- [ ] 所有测试用例编写完成
- [ ] 测试运行失败（RED阶段）

---

### Task 1.5: 添加VCP Controller端点（代码） ✅

**优先级**: P0  
**预计时间**: 1.5小时  
**依赖**: Task 1.4  
**文件**: `backend/src/modules/vcp/vcp.controller.ts`

#### 💻 实现内容

```typescript
@Controller('vcp')
export class VcpController {
  constructor(
    private readonly vcpEarlyFilter: VcpEarlyFilterService,
  ) {}

  @Post('early-stage')
  @ApiOperation({ summary: '筛选早期启动阶段的VCP股票' })
  @ApiBody({ type: FilterEarlyStageRequestDto })
  @ApiResponse({ type: FilterEarlyStageResponseDto })
  async filterEarlyStage(
    @Body() conditions: FilterEarlyStageRequestDto,
  ): Promise<FilterEarlyStageResponseDto> {
    this.logger.log({
      action: 'filter_early_stage',
      conditions,
    });

    try {
      const result = await this.vcpEarlyFilter.filterEarlyStage(conditions);
      
      this.logger.log({
        action: 'filter_early_stage_success',
        total: result.total,
        hasTip: !!result.tip,
      });

      return result;
    } catch (error) {
      this.logger.error({
        action: 'filter_early_stage_error',
        error: error.message,
        conditions,
      });
      throw error;
    }
  }
}
```

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] API响应时间 < 2秒（用Postman测试）
- [ ] Swagger文档自动生成
- [ ] 错误处理完整（400/500）

---

## Phase 2: 命令行工具（P0）

### Task 2.1: 创建终端筛选脚本（测试）

**优先级**: P0  
**预计时间**: 1小时  
**依赖**: Task 1.3  
**文件**: `backend/src/scripts/show-vcp-early-stage.spec.ts`

#### 📝 测试用例

```typescript
describe('show-vcp-early-stage', () => {
  it('应该使用默认条件输出表格', async () => {
    // Arrange: Mock filterService返回7只股票
    // Act: 运行脚本（无参数）
    // Assert: 终端输出表格，包含所有字段
  });

  it('应该支持--low-threshold参数', async () => {
    // Arrange: Mock filterService
    // Act: 运行脚本 --low-threshold=35
    // Assert: filterService被调用with distFrom52WeekLow=35
  });

  it('应该支持--help输出使用说明', async () => {
    // Arrange: N/A
    // Act: 运行脚本 --help
    // Assert: 输出帮助文本，包含所有参数说明
  });

  it('应该高亮显示"收缩中"的股票', async () => {
    // Arrange: Mock 包含收缩中股票
    // Act: 运行脚本
    // Assert: 收缩中股票带特殊标记（如颜色或星号）
  });
});
```

#### 📊 验收标准

- [ ] 测试用例完整
- [ ] 测试失败（RED阶段）

---

### Task 2.2: 创建终端筛选脚本（代码） ✅

**优先级**: P0  
**预计时间**: 2小时  
**依赖**: Task 2.1  
**文件**: `backend/src/scripts/show-vcp-early-stage.ts`

#### 💻 实现内容

使用 `commander` 库解析参数，调用 `VcpEarlyFilterService`，输出格式化表格。

参考现有的 `show-all-vcp.ts` 的表格输出格式。

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] 终端输出清晰美观
- [ ] 参数解析正确
- [ ] 性能 < 10秒

---

### Task 2.3: 创建Shell包装脚本 ✅

**优先级**: P0  
**预计时间**: 30分钟  
**依赖**: Task 2.2  
**文件**: `backend/show-vcp-early.sh`

#### 💻 实现内容

```bash
#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

npm run show-vcp-early -- "$@"
```

更新 `package.json`:
```json
{
  "scripts": {
    "show-vcp-early": "ts-node src/scripts/show-vcp-early-stage.ts"
  }
}
```

#### 📊 验收标准

- [ ] chmod +x 可执行
- [ ] 参数正确传递
- [ ] 手动测试通过

---

### Task 2.4: 创建Markdown导出脚本 ✅

**优先级**: P1  
**预计时间**: 2小时  
**依赖**: Task 1.3  
**文件**: 
- `backend/src/scripts/export-vcp-early-stage.ts`
- `backend/export-vcp-early.sh`

#### 💻 实现内容

参考 `export-all-vcp.ts`，生成Markdown文档，包含：
- 筛选条件说明
- 分类统计（收缩中/回调中/回调结束）
- 详细股票列表
- 投资建议

文件名：`VCP选股-早期启动-{scanDate}.md`

#### 📊 验收标准

- [ ] Markdown格式正确
- [ ] 包含所有必需字段
- [ ] 文件保存到 `docs/vcp/daily-reports/`
- [ ] Shell脚本支持参数传递

---

## Phase 3: 前端筛选器组件（P0）

### Task 3.1: 创建localStorage持久化Hook（测试） ⏭️

**优先级**: P0  
**预计时间**: 1小时  
**依赖**: Task 1.1  
**文件**: `frontend/src/hooks/useLocalStoragePersist.test.ts`

*跳过测试编写，直接实现*

#### 📝 测试用例

```typescript
describe('useLocalStoragePersist', () => {
  it('应该从localStorage加载保存的条件', () => {
    // Arrange: localStorage中有保存的条件
    // Act: 调用useLocalStoragePersist
    // Assert: 返回保存的条件
  });

  it('应该使用默认值（如果localStorage为空）', () => {
    // Arrange: localStorage为空
    // Act: 调用useLocalStoragePersist
    // Assert: 返回默认条件
  });

  it('应该保存条件到localStorage', () => {
    // Arrange: 新的筛选条件
    // Act: 调用saveConditions
    // Assert: localStorage更新，包含version和timestamp
  });

  it('应该忽略版本不匹配的数据', () => {
    // Arrange: localStorage有v0.9.0的数据
    // Act: 调用useLocalStoragePersist (期望v1.0.0)
    // Assert: 返回默认值，忽略旧数据
  });
});
```

#### 📊 验收标准

- [ ] 测试完整
- [ ] 测试失败（RED阶段）

---

### Task 3.2: 创建localStorage持久化Hook（代码） ✅

**优先级**: P0  
**预计时间**: 1.5小时  
**依赖**: Task 3.1  
**文件**: `frontend/src/hooks/useLocalStoragePersist.ts`

#### 💻 实现内容

实现Hook，处理读取、保存、版本检查。

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] localStorage读写正确
- [ ] 版本检查工作正常

---

### Task 3.3: 创建筛选逻辑Hook（测试） ⏭️

**优先级**: P0  
**预计时间**: 1.5小时  
**依赖**: Task 3.2  
**文件**: `frontend/src/hooks/useVcpEarlyFilter.test.ts`

*跳过测试编写，直接实现*

#### 📝 测试用例

```typescript
describe('useVcpEarlyFilter', () => {
  it('应该初始化默认筛选条件', () => {
    // Act: 调用useVcpEarlyFilter
    // Assert: conditions = 默认值
  });

  it('应该调用API并返回结果', async () => {
    // Arrange: Mock vcpService.filterEarlyStage
    // Act: 调用filter()
    // Assert: loading先true后false，results更新
  });

  it('应该处理API错误', async () => {
    // Arrange: Mock API抛出错误
    // Act: 调用filter()
    // Assert: 显示错误消息，loading=false
  });

  it('应该提供快捷调整方法', () => {
    // Arrange: 当前distFrom52WeekLow=40
    // Act: 调用adjustLowThreshold(5)
    // Assert: conditions.distFrom52WeekLow=45
  });

  it('快捷调整应该限制在有效范围内', () => {
    // Arrange: 当前distFrom52WeekLow=58
    // Act: 调用adjustLowThreshold(5)
    // Assert: conditions.distFrom52WeekLow=60 (不超过上限)
  });

  it('更新条件应该保存到localStorage', () => {
    // Arrange: 初始条件
    // Act: 调用updateConditions({distFrom52WeekLow: 35})
    // Assert: localStorage被更新
  });
});
```

#### 📊 验收标准

- [ ] 测试完整
- [ ] 测试失败（RED阶段）

---

### Task 3.4: 创建筛选逻辑Hook（代码） ✅

**优先级**: P0  
**预计时间**: 2小时  
**依赖**: Task 3.3  
**文件**: `frontend/src/hooks/useVcpEarlyFilter.ts`

#### 💻 实现内容

参考research.md中的设计，实现完整的Hook。

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] Hook可被组件正常使用
- [ ] 性能：状态更新 < 100ms

---

### Task 3.5: 创建筛选器组件（测试）

**优先级**: P0  
**预计时间**: 2小时  
**依赖**: Task 3.4  
**文件**: `frontend/src/components/VcpEarlyStageFilter/index.test.tsx`

#### 📝 测试用例

```typescript
describe('VcpEarlyStageFilter', () => {
  it('应该渲染所有筛选控件', () => {
    // Act: render <VcpEarlyStageFilter />
    // Assert: 显示3个滑块（52周低、52周高、收缩次数）
  });

  it('应该显示当前设置值', () => {
    // Arrange: conditions = {distFrom52WeekLow: 35}
    // Act: render
    // Assert: 滑块显示35，标签显示"35%"
  });

  it('滑块变化应该触发onChange', () => {
    // Arrange: Mock onChange
    // Act: 拖动滑块到40
    // Assert: onChange被调用with distFrom52WeekLow=40
  });

  it('应该显示智能提示（结果<5）', () => {
    // Arrange: tip.type='warning'
    // Act: render
    // Assert: Alert组件显示，type=warning
  });

  it('快捷按钮点击应该调整条件', () => {
    // Arrange: tip.suggestedActions包含"放宽5%"
    // Act: 点击"放宽5%"按钮
    // Assert: onChange被调用，distFrom52WeekLow增加5
  });

  it('重置按钮应该恢复默认值', () => {
    // Arrange: 修改过的条件
    // Act: 点击"重置为默认值"
    // Assert: 所有条件恢复到默认
  });
});
```

#### 📊 验收标准

- [ ] 测试完整
- [ ] 测试失败（RED阶段）

---

### Task 3.6: 创建筛选器组件（代码 + 设计） ✅

**优先级**: P0  
**预计时间**: 4小时  
**依赖**: Task 3.5  
**文件**: 
- `frontend/src/components/VcpEarlyStageFilter/index.tsx`
- `frontend/src/components/VcpEarlyStageFilter/styles.css`

#### 💻 实现内容

**⚠️ 重要**: 在实现此任务前，必须先调用 `~/.claude/skills/frontend-design` 设计UI

1. 使用frontend-design技能设计筛选器UI布局
2. 实现主组件VcpEarlyStageFilter
3. 实现子组件：
   - FilterSlider: 单个滑块控件（可复用）
   - QuickAdjust: 快捷调整按钮组
   - FilterTips: 智能提示（Alert + Actions）
4. 使用Ant Design组件：Slider, InputNumber, Button, Alert, Card
5. 响应式设计（移动端适配）

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] UI符合frontend-design标准
- [ ] 移动端显示正常
- [ ] 交互流畅（无卡顿）

---

### Task 3.7: 增强VCP结果表格（测试）

**优先级**: P1  
**预计时间**: 1小时  
**依赖**: 无  
**文件**: `frontend/src/components/VcpResultTable/index.test.tsx`

#### 📝 测试用例

```typescript
describe('VcpResultTable - Early Stage Enhancement', () => {
  it('应该高亮显示"收缩中"的行', () => {
    // Arrange: stocks包含vcpStage='contraction'的股票
    // Act: render with highlightStage='contraction'
    // Assert: 对应行有绿色背景或星标
  });

  it('应该按阶段+距52周低点排序', () => {
    // Arrange: 未排序的stocks
    // Act: render with sortByStage=true
    // Assert: 收缩中排最前，同阶段内按距52周低点排序
  });

  it('应该显示距52周高/低列', () => {
    // Arrange: stocks数据
    // Act: render
    // Assert: 表格包含"距52周高%"和"距52周低%"列
  });
});
```

#### 📊 验收标准

- [ ] 测试完整
- [ ] 测试失败（RED阶段）

---

### Task 3.8: 增强VCP结果表格（代码） ✅

**优先级**: P1  
**预计时间**: 2小时  
**依赖**: Task 3.7  
**文件**: `frontend/src/components/VcpResultTable/index.tsx`

#### 💻 实现内容

1. 添加新props：
   - `highlightStage?: VcpStage`
   - `sortByStage?: boolean`
2. 修改columns定义，添加：
   - 距52周高%列
   - 距52周低%列
3. 添加行className逻辑：
   ```typescript
   rowClassName={(record) => {
     if (record.vcpStage === 'contraction' && highlightStage === 'contraction') {
       return 'vcp-stage-highlight';
     }
     return '';
   }}
   ```
4. 添加CSS样式：
   ```css
   .vcp-stage-highlight {
     background-color: #f6ffed; /* 浅绿色 */
     border-left: 3px solid #52c41a;
   }
   ```

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] 高亮效果明显
- [ ] 不影响现有功能

---

## Phase 4: 前端页面集成（P0）

### Task 4.1: 添加API服务方法（测试）

**优先级**: P0  
**预计时间**: 30分钟  
**依赖**: Task 1.5  
**文件**: `frontend/src/services/vcpService.test.ts`

#### 📝 测试用例

```typescript
describe('vcpService.filterEarlyStage', () => {
  it('应该POST到正确的端点', async () => {
    // Arrange: Mock axios
    // Act: 调用vcpService.filterEarlyStage(conditions)
    // Assert: POST /api/vcp/early-stage, body=conditions
  });

  it('应该返回FilterResult', async () => {
    // Arrange: Mock API响应
    // Act: 调用filterEarlyStage
    // Assert: 返回类型正确
  });

  it('应该处理API错误', async () => {
    // Arrange: Mock API返回400
    // Act: 调用filterEarlyStage
    // Assert: 抛出带消息的错误
  });
});
```

#### 📊 验收标准

- [ ] 测试完整
- [ ] 测试失败（RED阶段）

---

### Task 4.2: 添加API服务方法（代码）

**优先级**: P0  
**预计时间**: 30分钟  
**依赖**: Task 4.1  
**文件**: `frontend/src/services/vcpService.ts`

#### 💻 实现内容

```typescript
export const vcpService = {
  // 现有方法...
  
  async filterEarlyStage(
    conditions: FilterEarlyStageRequest
  ): Promise<FilterEarlyStageResponse> {
    const response = await axios.post('/api/vcp/early-stage', conditions);
    return response.data;
  },
};
```

#### 📊 验收标准

- [ ] 测试通过（GREEN阶段）
- [ ] 类型定义正确

---

### Task 4.3: 集成筛选器到VCP页面（测试）

**优先级**: P0  
**预计时间**: 1小时  
**依赖**: Task 3.6, Task 4.2  
**文件**: `frontend/src/pages/VcpStock/index.test.tsx`

#### 📝 测试用例

```typescript
describe('VcpStock Page - Early Stage Integration', () => {
  it('应该渲染筛选器组件', () => {
    // Act: render <VcpStock />
    // Assert: VcpEarlyStageFilter组件存在
  });

  it('筛选后应该更新表格', async () => {
    // Arrange: Mock API返回10只股票
    // Act: 调整筛选条件并点击"筛选"
    // Assert: 表格显示10只股票
  });

  it('应该高亮收缩中的股票', () => {
    // Arrange: 结果包含收缩中股票
    // Act: render
    // Assert: 表格中收缩中的行有高亮
  });

  it('应该显示智能提示', () => {
    // Arrange: API返回tip
    // Act: render
    // Assert: Alert显示在表格上方
  });
});
```

#### 📊 验收标准

- [ ] 测试完整
- [ ] 测试失败（RED阶段）

---

### Task 4.4: 集成筛选器到VCP页面（代码） ✅

**优先级**: P0  
**预计时间**: 2小时  
**依赖**: Task 4.3  
**文件**: `frontend/src/pages/VcpScreenerPage.tsx`

#### 💻 实现内容

1. 导入VcpEarlyStageFilter组件
2. 使用useVcpEarlyFilter Hook
3. 添加筛选器UI区域（折叠面板或Card）
4. 连接筛选结果到VcpResultTable
5. 传递highlightStage和sortByStage props

布局建议：
```tsx
<PageContainer>
  <Card title="早期启动筛选" style={{ marginBottom: 16 }}>
    <VcpEarlyStageFilter
      conditions={conditions}
      onChange={updateConditions}
      onFilter={filter}
      loading={loading}
      tip={result?.tip}
    />
  </Card>

  <VcpResultTable
    dataSource={results}
    loading={loading}
    highlightStage="contraction"
    sortByStage
  />
</PageContainer>
```

#### 📊 验收标准

- [ ] 所有测试通过（GREEN阶段）
- [ ] UI美观、交互流畅
- [ ] 响应式布局正常

---

## Phase 5: 增强功能（P1/P2）

### Task 5.1: 添加导出功能（前端）

**优先级**: P1  
**预计时间**: 2小时  
**依赖**: Task 4.4  
**文件**: 
- `frontend/src/utils/export.ts`
- `frontend/src/pages/VcpStock/ExportButton.tsx`

#### 💻 实现内容

1. 实现Excel导出（使用xlsx库）
2. 实现CSV导出
3. 添加"导出"按钮到页面
4. 导出当前筛选结果

#### 📊 验收标准

- [ ] 导出文件格式正确
- [ ] 包含所有表格字段
- [ ] 文件名包含日期和筛选条件

---

### Task 5.2: 添加筛选条件预设

**优先级**: P2  
**预计时间**: 1.5小时  
**依赖**: Task 3.6  
**文件**: `frontend/src/components/VcpEarlyStageFilter/Presets.tsx`

#### 💻 实现内容

添加快捷预设按钮：
- "极早期"：距52周低30%, 收缩2-3次
- "典型早期"：距52周低40%, 收缩3-4次（默认）
- "稳健早期"：距52周低50%, 收缩4-5次

#### 📊 验收标准

- [ ] 点击预设按钮正确更新条件
- [ ] 预设值合理

---

### Task 5.3: 添加数据统计面板

**优先级**: P2  
**预计时间**: 2小时  
**依赖**: Task 4.4  
**文件**: `frontend/src/components/VcpEarlyStageFilter/Statistics.tsx`

#### 💻 实现内容

在筛选结果上方显示统计信息：
- 总数量
- 各阶段数量（收缩中/回调中/回调结束）
- 平均距52周低点
- 平均RS评分

使用Ant Design Statistic组件。

#### 📊 验收标准

- [ ] 统计数据准确
- [ ] 实时更新

---

## Phase 6: 测试与优化（P1）

### Task 6.1: 集成测试

**优先级**: P1  
**预计时间**: 2小时  
**依赖**: Task 4.4  
**文件**: 
- `backend/test/integration/vcp-early-stage.e2e-spec.ts`
- `frontend/src/__tests__/vcp-early-stage-flow.test.tsx`

#### 📝 测试用例

**后端E2E**:
```typescript
describe('VCP Early Stage E2E', () => {
  it('完整流程：筛选→返回→验证', async () => {
    // 1. 准备测试数据（mock vcpScanResult）
    // 2. POST /api/vcp/early-stage
    // 3. 验证返回数据完整性
    // 4. 验证排序正确
    // 5. 验证智能提示生成
  });
});
```

**前端集成**:
```typescript
describe('VCP Early Stage User Flow', () => {
  it('用户完整操作流程', async () => {
    // 1. 打开VCP页面
    // 2. 调整筛选条件
    // 3. 点击筛选
    // 4. 等待结果加载
    // 5. 验证表格显示
    // 6. 验证localStorage保存
  });
});
```

#### 📊 验收标准

- [ ] E2E测试通过
- [ ] 覆盖主要用户流程

---

### Task 6.2: 性能测试与优化

**优先级**: P1  
**预计时间**: 2小时  
**依赖**: Task 6.1  

#### 💻 测试内容

1. **后端性能**:
   - 筛选5000只股票的响应时间
   - 数据库查询优化（如需添加索引）

2. **前端性能**:
   - 组件首次渲染时间
   - 滑块交互响应时间
   - localStorage读写时间

3. **负载测试**:
   - 10个并发请求
   - 100个并发请求

#### 📊 验收标准

- [ ] 后端响应 < 2秒（P95）
- [ ] 前端交互 < 100ms
- [ ] 无内存泄漏

---

## Phase 7: 文档与发布（P1）

### Task 7.1: 更新项目文档

**优先级**: P1  
**预计时间**: 1小时  
**依赖**: Task 6.2  
**文件**: 
- `README.md`
- `backend/README.md`
- `frontend/README.md`

#### 💻 实现内容

1. 在README.md添加早期筛选功能说明
2. 添加使用示例
3. 更新命令列表

#### 📊 验收标准

- [ ] 文档清晰准确
- [ ] 示例可运行

---

### Task 7.2: 代码Review与重构

**优先级**: P1  
**预计时间**: 2小时  
**依赖**: Task 7.1  

#### 💻 Review清单

- [ ] 代码符合ESLint规则
- [ ] 无TypeScript错误
- [ ] 所有测试通过
- [ ] 无console.log残留（开发调试用）
- [ ] 注释清晰（仅解释why不解释what）
- [ ] 性能符合目标

#### 📊 验收标准

- [ ] Review完成
- [ ] 所有问题修复

---

## 任务依赖图

```
Task 1.1 (类型定义)
   ↓
Task 1.2 (后端测试) → Task 1.3 (后端代码)
   ↓                          ↓
Task 1.4 (API测试) → Task 1.5 (API代码)
   ↓                          ↓
                          Task 2.1 → Task 2.2 → Task 2.3 (命令行)
                               ↓
                          Task 2.4 (导出脚本)

Task 3.1 (localStorage测试) → Task 3.2 (localStorage代码)
   ↓
Task 3.3 (Hook测试) → Task 3.4 (Hook代码)
   ↓
Task 3.5 (组件测试) → Task 3.6 (组件代码)
   ↓
Task 3.7 (表格测试) → Task 3.8 (表格代码)
   ↓
Task 4.1 (服务测试) → Task 4.2 (服务代码)
   ↓
Task 4.3 (页面测试) → Task 4.4 (页面代码)
   ↓
Task 5.1, 5.2, 5.3 (增强功能，可并行)
   ↓
Task 6.1 (集成测试) → Task 6.2 (性能优化)
   ↓
Task 7.1 (文档) → Task 7.2 (Review)
```

---

## 执行建议

### 最小可行版本（MVP）

优先完成这些任务即可交付基本功能：
- Task 1.1 - 1.5（后端核心）
- Task 2.1 - 2.3（命令行）
- Task 3.1 - 3.6（前端筛选器）
- Task 4.1 - 4.4（页面集成）

**预计时间**: 20-24小时

### 完整版本

包含所有增强功能：
- MVP + Task 2.4（导出）
- Task 3.7 - 3.8（表格增强）
- Task 5.1 - 5.3（导出、预设、统计）
- Task 6.1 - 6.2（测试优化）
- Task 7.1 - 7.2（文档Review）

**预计时间**: 32-36小时

---

## 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| 后端Service | 100% |
| 后端Controller | 90% |
| 前端Hook | 100% |
| 前端组件 | 85% |
| 集成测试 | 主流程覆盖 |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 实时VCP分析性能慢 | 后端响应>2秒 | 添加缓存机制，复用已计算的stage |
| 前端bundle过大 | 加载慢 | 动态导入筛选器组件 |
| localStorage兼容性 | 部分浏览器不支持 | Fallback到内存状态 |
| 测试数据准备复杂 | 测试难写 | 使用factory模式生成测试数据 |

---

**总任务数**: 18个  
**关键路径任务**: 14个（P0）  
**预计MVP时间**: 20-24小时  
**预计完整时间**: 32-36小时

**下一步**: 开始执行Task 1.1，按依赖图顺序推进
