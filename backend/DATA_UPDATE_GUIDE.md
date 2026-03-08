# 数据更新指南

## 📊 当前数据状态

- **已有数据**: 3025只股票（82.5%）
- **数据时间**: 2022-01-04 至 2024-02-28（仅2年）
- **K线数据**: 189万条
- **技术指标**: 800万条

---

## ❗ 问题说明

### 问题1: 时间范围不足
- **当前**: 2年数据（2022-2024）
- **规格要求**: 10-20年数据
- **推荐**: 20年数据（2006-2026）

### 问题2: 数据不是最新
- **当前最新**: 2024-02-28
- **今天日期**: 2026-03-01
- **缺失**: 2024年3月至2026年3月（约2年）

---

## 🎯 解决方案

### 方案1: 智能增量更新（推荐）⭐

**优点**:
- ✅ 保留已有的82.5%数据
- ✅ 只补充缺失的时间段
- ✅ 自动检测每只股票的数据缺口
- ✅ 支持后续定期更新

**操作步骤**:

```bash
cd backend

# 步骤1: 停止当前运行的批量初始化（如果还在运行）
# 查看运行中的进程
ps aux | grep batch-init-all-klines-simple

# 停止进程（替换 PID）
kill <PID>

# 步骤2: 运行增量更新脚本
npx ts-node src/scripts/incremental-update-klines.ts

# 或分批处理
npx ts-node src/scripts/batch-incremental-update.ts
```

**会自动处理**:
- 对于660只已处理股票：补充2016-2022和2024-2026的数据
- 对于640只未处理股票：获取完整10年数据
- 自动跳过已完整的股票

**预计时间**: 1-2小时（取决于网络和API限额）

---

### 方案2: 清空重来（全量重新初始化）

**优点**:
- ✅ 数据一致性更好
- ✅ 不会有数据缺口

**缺点**:
- ❌ 已有82.5%的工作需要重做
- ❌ 需要更长时间（约3-4小时）

**操作步骤**:

```bash
cd backend

# 步骤1: 备份当前数据库
cp data/stocks.db data/stocks.db.backup-$(date +%Y%m%d)

# 步骤2: 清空K线和指标数据
sqlite3 data/stocks.db << EOF
DELETE FROM technical_indicators;
DELETE FROM kline_data;
VACUUM;
EOF

# 步骤3: 确认日期已更新（查看 fetch-batch-klines.ts）
# 应该看到：2016-03-01 to 2026-03-01

# 步骤4: 重新运行批量初始化
npx ts-node src/scripts/batch-init-all-klines-simple.ts
```

---

## 💡 推荐方案对比

| 项目 | 方案1（增量更新） | 方案2（清空重来） |
|------|------------------|------------------|
| 保留已有数据 | ✅ 是 | ❌ 否 |
| 处理时间 | 1-2小时 | 3-4小时 |
| 数据完整性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| API调用量 | 较少 | 较多 |
| 后续可用性 | ✅ 支持定期增量 | ❌ 每次都要全量 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚀 执行增量更新（推荐）

### 步骤详解

#### 1. 停止当前脚本
```bash
# 查看正在运行的进程
ps aux | grep ts-node | grep batch-init

# 找到 PID，然后停止（例如 PID=12345）
kill 12345
```

#### 2. 测试增量更新（先测试10只）
```bash
cd backend

# 测试前10只股票的增量更新
npx ts-node src/scripts/incremental-update-klines.ts 10 0
```

**预期输出**:
```
--- Checking 000001 平安银行 ---
📊 Gap detected: before
   Need: 2016-03-01 to 2021-12-31
📈 Fetching daily K-line data...
✅ Fetched 1450 daily records from tushare
🔢 Recalculating daily indicators...
✅ Successfully updated 000001 (added 1450 daily records)
```

#### 3. 全量运行增量更新
```bash
# 自动分批处理所有股票
npx ts-node src/scripts/batch-incremental-update.ts

# 或手动控制（单批100只）
npx ts-node src/scripts/incremental-update-klines.ts 100 0
npx ts-node src/scripts/incremental-update-klines.ts 100 100
# ...以此类推
```

#### 4. 监控进度
```bash
# 另开终端，持续监控
npx ts-node src/scripts/check-progress.ts --watch
```

---

## 📅 后续定期更新

### 场景: 每周/每月更新最新数据

使用增量更新脚本，它会自动：
- 检测每只股票的最新数据日期
- 只获取该日期之后的新交易日数据
- 重新计算受影响的技术指标

```bash
cd backend

# 一键更新所有股票的最新数据
npx ts-node src/scripts/incremental-update-klines.ts

# 或通过API触发（已实现的手动更新功能）
curl -X POST http://localhost:3000/api/v1/data/update \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ 配置说明

### 修改目标日期范围

编辑 `src/scripts/incremental-update-klines.ts`:

```typescript
// 修改这两行
const TARGET_START_DATE = new Date('2016-03-01'); // 往前推10年
const TARGET_END_DATE = new Date('2026-03-01');   // 更新到最新
```

### 修改批量初始化脚本

编辑 `src/scripts/fetch-batch-klines.ts` 第308-310行:

```typescript
// 改为10年数据
const endDate = new Date('2026-03-01');
const startDate = new Date();
startDate.setFullYear(endDate.getFullYear() - 10);
```

---

## 🎓 工作原理

### 全量模式 (fetch-batch-klines.ts)
```
对每只股票:
  1. 删除该股票所有K线数据
  2. 下载整个日期范围的数据
  3. 计算所有指标
  4. 保存
```

### 增量模式 (incremental-update-klines.ts) ⭐
```
对每只股票:
  1. 查询现有数据的日期范围
  2. 检测缺口:
     - 需要补充早期数据? (2016-2022)
     - 需要补充最新数据? (2024-2026)
     - 数据已完整? 跳过
  3. 只下载缺失日期段的数据
  4. 使用 skipDuplicates 避免重复
  5. 重新计算指标（因为MA等需要完整数据）
```

---

## 📊 数据量预估

### 10年数据
- **每只股票日线**: 约2400条（10年 × 240交易日）
- **3665只股票**: 约880万条日线
- **周线**: 约176万条
- **技术指标**: 约5300万条
- **数据库大小**: 约6-8GB

### API调用量
- **全量**: 3665 × 2 = 7330次（日线+周线）
- **增量（660只补充）**: 660 × 2 = 1320次
- **Tushare限额**: 免费版每天10000次 ✅ 足够

---

## 🎯 我的建议

### 立即执行（推荐）

```bash
cd backend

# 1. 测试10只股票看效果
npx ts-node src/scripts/incremental-update-klines.ts 10 0

# 2. 确认无误后，运行全量增量更新
npx ts-node src/scripts/batch-incremental-update.ts
```

这样你可以：
- ✅ 保留已有82.5%的工作成果
- ✅ 补充缺失的2016-2022和2024-2026数据
- ✅ 以后每天/每周轻松增量更新
- ✅ 大约1-2小时完成

---

## 📝 注意事项

1. **API限额**: Tushare免费版每天10000次，足够完成增量更新
2. **数据一致性**: 增量更新会重新计算指标，确保数据准确
3. **中断恢复**: 增量脚本支持断点续传，可以随时中断继续
4. **后续维护**: 建议每周运行一次增量更新保持数据最新

---

**创建时间**: 2026-03-02  
**维护者**: Development Team
