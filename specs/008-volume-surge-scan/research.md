# 研究文档：成交量激增扫描器

**功能**: 008-volume-surge-scan | **日期**: 2026-03-18  
**目的**: 解决技术上下文中的未知项，为Phase 1设计提供依据

## 研究目标

从 `plan.md` 技术上下文中识别的5个关键决策点：

1. 成交量模式识别算法
2. 均线斜率计算方法
3. 扫描性能优化策略
4. CLI工具实现模式
5. 前端图表可视化库

---

## 1. 成交量模式识别算法

### 决策

**选择**: 滑动窗口 + 动态阈值（基于标准差）

### 理由

根据规格说明中的假设：
- 萎缩期定义：连续5天成交量低于前20天平均成交量的70%
- 放大期定义：成交量超过萎缩期平均成交量的150%

**技术方案**：
```typescript
interface VolumePattern {
  contractionPeriod: { start: Date; end: Date; avgVolume: number };
  expansionPoint: { date: Date; volume: number; multiplier: number };
}

// 算法步骤：
// 1. 从最近的日期向前扫描，寻找萎缩期
//    - 滑动窗口：5天成交量 < 前20天均值 * 0.7
// 2. 萎缩期确定后，向后寻找放大点
//    - 成交量 > 萎缩期均值 * 1.5
// 3. 验证放大是否持续（避免单日异常）
//    - 放大后3天内至少2天保持高量
```

### 考虑的替代方案

| 方案 | 优点 | 缺点 | 为何未选择 |
|------|------|------|------------|
| 固定阈值 | 简单实现 | 不适应不同股票的成交量特征 | 误判率高，难以通用 |
| 统计显著性检验（t-test） | 数学严谨 | 计算复杂，参数难调 | 性能开销大，过度设计 |
| 机器学习模型 | 适应性强 | 需要训练数据，黑盒 | 复杂度高，不符合TDD原则 |

### 实现细节

- 使用 `date-fns` 处理日期窗口
- 成交量数据从 `KLineData` 表获取
- 缓存前N天均值，避免重复计算

---

## 2. 均线斜率计算方法

### 决策

**选择**: 线性回归斜率（最近5个交易日的50日均线）

### 理由

规格要求：50日均线"开始向上"定义为最近5个交易日的50日均线呈现上升趋势（线性回归斜率为正）。

**技术方案**：
```typescript
interface MovingAverageTrend {
  ma50: number;
  ma150: number;
  ma50Slope: number;  // 线性回归斜率
  isTrendingUp: boolean;  // slope > 0
  ma50BelowMa150: boolean;
}

// 计算步骤：
// 1. 获取最近150个交易日的收盘价（计算150日均线需要）
// 2. 计算每日的50日和150日均线
// 3. 取最近5个交易日的50日均线值 [ma1, ma2, ma3, ma4, ma5]
// 4. 线性回归: y = ax + b，计算斜率a
// 5. 判断：a > 0 且 ma50 < ma150
```

**线性回归公式**：
```
斜率 a = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
其中: x = [1, 2, 3, 4, 5], y = [ma1, ma2, ma3, ma4, ma5]
```

### 考虑的替代方案

| 方案 | 优点 | 缺点 | 为何未选择 |
|------|------|------|------------|
| 均线交叉（50日均线上穿某短期均线） | 直观易懂 | 滞后性强，未明确"开始" | 不符合规格定义 |
| 简单差值（ma50[今] - ma50[昨]） | 计算简单 | 单日波动影响大 | 噪音敏感，不稳定 |
| 均值变化率 | 百分比直观 | 需要额外定义阈值 | 增加参数复杂度 |

### 实现细节

- 均线计算可能已存在于VCP模块，优先复用
- 如不存在，使用简单移动平均（SMA）算法
- 线性回归使用简单数学公式，无需引入额外库

---

## 3. 扫描性能优化策略

### 决策

**选择**: 并行处理 + 数据库查询优化 + 增量计算缓存

### 理由

性能目标：30秒内扫描3000只股票

**计算量估算**：
- 每只股票需要：
  - 查询150天K线数据（1次DB查询）
  - 计算成交量模式（O(n)，n=150）
  - 计算均线和斜率（O(n)）
  - 总计：约0.01秒/股票（单线程）
- 3000只股票 * 0.01秒 = 30秒（边界情况）

**优化策略**：

1. **并行处理**：
   ```typescript
   import pLimit from 'p-limit';
   
   const limit = pLimit(10);  // 并发10个股票
   const promises = stocks.map(stock => 
     limit(() => this.scanStock(stock))
   );
   await Promise.all(promises);
   ```
   - 预期提速：10倍（理论）→ 实际6-8倍
   - 目标时间：3-5秒

2. **数据库查询优化**：
   ```sql
   -- 一次性获取所有股票的最近150天数据
   SELECT * FROM KLineData 
   WHERE date >= DATE('now', '-150 days')
   ORDER BY stock_code, date;
   ```
   - 批量查询代替逐个查询
   - 使用索引：(stock_code, date)

3. **增量计算缓存**：
   - 缓存每只股票的均线数据（Redis或内存）
   - 只重新计算最近N天的数据
   - 适用于多次扫描场景

### 考虑的替代方案

| 方案 | 优点 | 缺点 | 为何未选择 |
|------|------|------|------------|
| 全量预计算（每日定时） | 查询极快 | 需要定时任务，不符合手动触发要求 | 违背FR-014 |
| 单线程顺序扫描 | 实现简单 | 性能不达标（30秒边界） | 风险高 |
| 多进程（Worker Threads） | 真正并行（绕过Node.js单线程） | 复杂度高，进程间通信开销 | 过度优化 |

### 实现细节

- 使用 `p-limit` 控制并发数（10-20之间调优）
- Prisma查询使用 `findMany` 批量获取
- 考虑使用 `Promise.allSettled` 避免单个股票错误中断全局扫描

---

## 4. CLI工具实现模式

### 决策

**选择**: NestJS独立脚本 + yargs参数解析

### 理由

需求：命令行工具复用后端业务逻辑，支持参数配置和结果导出。

**技术方案**：
```typescript
// backend/src/scripts/scan-cli.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as yargs from 'yargs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const volumeSurgeService = app.get(VolumeSurgeService);
  
  const argv = yargs
    .option('date', {
      type: 'string',
      description: 'Reference date for contraction period (YYYY-MM-DD)',
    })
    .option('export', {
      type: 'string',
      choices: ['csv', 'markdown', 'both'],
      description: 'Export format',
    })
    .option('verbose', {
      type: 'boolean',
      description: 'Enable verbose logging',
    })
    .help()
    .argv;
  
  // 执行扫描逻辑
  const result = await volumeSurgeService.scan({
    referenceDate: argv.date,
    mode: argv.date ? 'manual' : 'auto',
  });
  
  // 导出结果
  if (argv.export) {
    await exportService.export(result, argv.export);
  }
  
  await app.close();
}

bootstrap();
```

**运行方式**：
```bash
# 自动模式
npm run scan:volume-surge

# 手动指定日期
npm run scan:volume-surge -- --date 2026-03-02 --export csv

# 详细日志
npm run scan:volume-surge -- --verbose
```

### 考虑的替代方案

| 方案 | 优点 | 缺点 | 为何未选择 |
|------|------|------|------------|
| nestjs-command库 | NestJS原生集成 | 需要额外依赖，学习成本 | 过度设计，简单脚本足够 |
| Commander.js | 功能强大 | 不如yargs类型安全 | TypeScript支持不如yargs |
| 纯参数解析（process.argv） | 零依赖 | 需要手写参数解析逻辑 | 重复造轮子 |

### 实现细节

- 在 `package.json` 中添加脚本：
  ```json
  "scripts": {
    "scan:volume-surge": "ts-node src/scripts/scan-cli.ts"
  }
  ```
- 使用 `NestFactory.createApplicationContext` 创建轻量级应用上下文
- 共享 `VolumeSurgeService` 业务逻辑，避免代码重复

---

## 5. 前端图表可视化库

### 决策

**选择**: Apache ECharts

### 理由

需求：展示K线图、成交量柱状图、均线叠加图。

**ECharts优势**：
- ✅ 内置K线图（candlestick）和成交量图支持
- ✅ 多系列叠加（K线 + 均线 + 成交量）
- ✅ 性能优异（Canvas渲染，支持数千数据点）
- ✅ 中文文档完善，社区活跃
- ✅ TypeScript类型支持良好

**技术方案**：
```typescript
import * as echarts from 'echarts';

const option = {
  xAxis: { type: 'category', data: dates },
  yAxis: [
    { type: 'value', name: 'Price' },
    { type: 'value', name: 'Volume', position: 'right' },
  ],
  series: [
    { name: 'K-Line', type: 'candlestick', data: klineData },
    { name: 'MA50', type: 'line', data: ma50Data },
    { name: 'MA150', type: 'line', data: ma150Data },
    { name: 'Volume', type: 'bar', yAxisIndex: 1, data: volumeData },
  ],
};
```

### 考虑的替代方案

| 方案 | 优点 | 缺点 | 为何未选择 |
|------|------|------|------------|
| TradingView Lightweight Charts | 专业金融图表，性能极佳 | 学习曲线陡，定制性较差 | 功能过于专业，超出需求 |
| Recharts | React友好，声明式 | K线图支持不佳，需自定义 | 不适合金融场景 |
| Chart.js | 轻量级，易用 | K线图需插件，生态较弱 | 功能不足 |
| D3.js | 完全可定制 | 需要大量手写代码 | 开发成本高 |

### 实现细节

- 安装依赖：`npm install echarts`
- 使用 `echarts-for-react` 封装为React组件
- 图表配置支持响应式（根据容器大小自适应）
- 考虑懒加载（仅在详情页展示图表时加载ECharts）

---

## 总结

### 关键决策矩阵

| 领域 | 决策 | 主要理由 | 替代方案被拒原因 |
|------|------|----------|------------------|
| 成交量识别 | 滑动窗口+动态阈值 | 符合规格定义，通用性强 | 固定阈值通用性差，ML过度设计 |
| 均线趋势 | 线性回归斜率 | 规格明确要求，数学严谨 | 简单差值噪音大，交叉滞后 |
| 扫描性能 | 并行+批量查询+缓存 | 达成30秒目标，可扩展 | 预计算违背手动触发，多进程过度优化 |
| CLI工具 | NestJS脚本+yargs | 复用业务逻辑，类型安全 | nestjs-command过度设计，纯参数解析重复造轮子 |
| 图表库 | ECharts | K线原生支持，性能优异 | TradingView过于专业，Recharts不适合金融 |

### 对Phase 1设计的影响

1. **数据模型**：需要设计成交量模式和均线状态的字段结构
2. **API契约**：扫描接口需要支持auto/manual两种模式
3. **测试策略**：算法逻辑需要充分的单元测试覆盖（TDD）

### 未解决问题（需要在实现中验证）

- 并发数（10）是否最优？需要性能测试调优
- 是否需要Redis缓存？内存缓存可能已足够
- ECharts图表在大数据量（1000+数据点）下的性能表现

---

**下一步**: 进入Phase 1，基于研究结论设计数据模型和API契约。
