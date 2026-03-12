# VCP 选股日报

## 目录结构

每日的VCP分析报告按日期分组到独立的子目录中：

```
daily-reports/
├── 2026-03-10/
│   ├── VCP选股-全览-2026-03-10.md
│   ├── VCP选股-浅回调-2026-03-10.md
│   └── VCP选股-综合分析-2026-03-10.md
├── 2026-03-11/
│   └── VCP选股-早期启动-2026-03-11.md
├── 2026-03-12/
│   ├── VCP选股-全览-2026-03-12.md
│   └── VCP选股-早期启动-2026-03-12.md
└── README.md (本文件)
```

## 报告类型

### 1. VCP选股-全览
**文件命名**: `VCP选股-全览-{日期}.md`

包含所有符合VCP形态的股票，分为三类：
- ⚡ **回调中**: 今天可能是买点的股票
- ✅ **回调结束**: 1-20天内到达低点，正在反弹
- 📊 **收缩中**: 等待回调时机的股票

**生成命令**:
```bash
cd backend
npx ts-node src/scripts/export-all-vcp.ts
```

### 2. VCP选股-早期启动
**文件命名**: `VCP选股-早期启动-{日期}.md`

筛选处于早期启动阶段的股票：
- 距52周低点 ≤ 50%
- 距52周高点 ≤ 10%
- 收缩次数 3-4次

**生成命令**:
```bash
cd backend
npx ts-node src/scripts/export-vcp-early-stage.ts
```

### 3. VCP选股-浅回调
**文件命名**: `VCP选股-浅回调-{日期}.md`

筛选回调幅度较浅（< 10%）的股票，适合追涨或短线交易。

**生成命令**:
```bash
cd backend
npx ts-node src/scripts/export-vcp-pullback.ts
```

## 使用说明

### 查看最新报告
进入最新日期的目录，查看当日生成的各类报告。

### 生成新报告
运行相应的导出脚本，报告会自动生成到当天日期的子目录中。

### 历史报告
历史报告保存在对应日期的目录中，便于回顾和对比。

## 数据来源

所有报告基于以下数据：
- **K线数据**: SQLite数据库（每日增量更新）
- **VCP扫描**: 每日自动扫描所有股票的VCP形态
- **技术指标**: MA、KDJ、RSI、成交量等

## 更新周期

建议每个交易日运行以下流程：

1. **增量更新K线数据**:
   ```bash
   cd backend
   npx ts-node src/scripts/batch-incremental-update-latest.ts
   ```

2. **重新计算VCP扫描**:
   ```bash
   npx ts-node src/scripts/calculate-vcp.ts
   ```

3. **生成日报**:
   ```bash
   npx ts-node src/scripts/export-all-vcp.ts
   npx ts-node src/scripts/export-vcp-early-stage.ts
   ```

## 注意事项

- 报告中的数据基于历史K线，不代表投资建议
- 建议结合其他技术分析工具综合判断
- 回调中的股票需要观察次日是否企稳反弹
- RS评分越高，相对市场表现越强

---

**最后更新**: 2026-03-12
