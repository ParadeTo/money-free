# 增量更新数据指南

## 📋 概述

本项目现在支持真正的**增量数据更新**，大幅提升更新效率。

## 🔄 两种更新方式对比

### 1. 全量更新（fetch-batch-klines.ts）

**用途：** 初始化数据或完全重建数据库

**特点：**
- ❌ 删除旧数据
- ❌ 重新获取完整20年数据（~4700条/只）
- ❌ 慢：约6.5秒/只
- ❌ 耗时：3665只 × 6.5秒 ≈ 6.6小时

**适用场景：**
- 首次初始化数据
- 数据损坏需要重建
- 更换数据源

**命令：**
```bash
# 处理指定范围
npx ts-node src/scripts/fetch-batch-klines.ts 500 0

# 批量处理全部
npx ts-node src/scripts/batch-init-all-klines-simple.ts
```

---

### 2. 增量更新（incremental-update-latest.ts）✨ 推荐

**用途：** 日常更新最新数据

**特点：**
- ✅ 保留旧数据
- ✅ 只获取增量数据（几条新记录）
- ✅ 快：约5.8秒/只
- ✅ 高效：只传输必要数据

**工作原理：**
```typescript
1. 查询每只股票的最新日期
2. 只获取从最新日期+1到今天的数据
3. 使用 upsert 插入新数据（不删除旧数据）
4. 重新计算技术指标（基于完整历史）
```

**性能表现：**
```
数据更新：2-5天 → 获取2-5条记录
网络传输：减少99.9%（从4700条降至2-5条）
处理速度：5.8秒/只（含指标重算）
总耗时：3607只 × 5.8秒 ≈ 5.8小时
```

**命令：**
```bash
# 测试前5只
npx ts-node src/scripts/incremental-update-latest.ts 5 0

# 更新指定范围
npx ts-node src/scripts/incremental-update-latest.ts 500 0

# 批量更新全部（推荐）
npx ts-node src/scripts/batch-incremental-update-latest.ts
```

---

## 📊 典型使用场景

### 场景1：首次部署
```bash
cd backend

# 1. 导入股票列表
npx ts-node src/scripts/import-stocks.ts

# 2. 初始化历史数据（20年）
npx ts-node src/scripts/batch-init-all-klines-simple.ts
```

### 场景2：日常更新（推荐）⭐
```bash
cd backend

# 增量更新到最新（每天运行一次）
npx ts-node src/scripts/batch-incremental-update-latest.ts
```

### 场景3：数据修复
```bash
cd backend

# 重新获取特定股票的完整数据
npx ts-node src/scripts/fetch-batch-klines.ts 100 0
```

---

## 🎯 最佳实践

### 1. 定时任务设置

**推荐：每天早上9点自动更新**

```bash
# Linux/Mac crontab
0 9 * * * cd /path/to/backend && npx ts-node src/scripts/batch-incremental-update-latest.ts

# 或使用系统服务
```

### 2. 监控脚本

```bash
# 查看最新数据日期
cd backend
sqlite3 data/stocks.db "SELECT datetime(MAX(date)/1000, 'unixepoch') FROM kline_data WHERE period='daily';"

# 统计数据量
sqlite3 data/stocks.db "SELECT COUNT(DISTINCT stock_code) FROM kline_data WHERE period='daily';"
```

### 3. 错误处理

如果增量更新失败：
1. 检查API限额是否用尽
2. 查看错误日志
3. 必要时使用全量更新修复

---

## 🔧 技术细节

### API限流处理

两个脚本都实现了API限流保护：
- 每只股票处理后等待2秒
- Tushare免费版限制：50次/分钟
- 实际速率：约30次/分钟（安全）

### 技术指标重算

**为什么增量更新也要重算指标？**

技术指标（如MA、KDJ）依赖历史数据窗口：
- MA50 = 最近50天的平均价
- 新增1天数据 → 影响所有基于窗口的指标

**解决方案：**
- K线数据：增量插入（高效）
- 技术指标：全量重算（准确）

计算速度：~0.1秒/只（可忽略）

### 数据一致性

增量更新使用 `upsert` 策略：
```typescript
await prisma.kLineData.upsert({
  where: { stockCode_date_period },
  update: { /* 更新数据 */ },
  create: { /* 创建数据 */ },
});
```

保证：
- ✅ 不会重复插入
- ✅ 可以修正旧数据
- ✅ 幂等性（可重复执行）

---

## 📈 性能对比总结

| 维度 | 全量更新 | 增量更新 |
|------|---------|---------|
| 获取记录数 | ~4,700条 | ~2-5条 |
| 网络传输 | 大 | 极小 |
| 处理速度 | 6.5秒/只 | 5.8秒/只 |
| 总耗时 | 6.6小时 | 5.8小时 |
| 数据库操作 | DELETE + INSERT | UPSERT |
| 适用场景 | 初始化 | 日常更新 |

---

## 🚀 快速开始

**今天就开始使用增量更新：**

```bash
cd backend

# 一行命令搞定
npx ts-node src/scripts/batch-incremental-update-latest.ts
```

**预期结果：**
- 处理3,607只股票
- 新增约7,000-18,000条K线（2-5天数据）
- 耗时约5.8小时
- 数据更新到最新

---

## 📝 注意事项

1. **首次使用**：必须先有历史数据，否则使用全量初始化
2. **API限额**：注意Tushare API的每日限额（10,000次）
3. **网络稳定**：确保网络连接稳定
4. **磁盘空间**：SQLite数据库会增长，定期检查空间

---

## 🔗 相关文件

- `src/scripts/incremental-update-latest.ts` - 单批次增量更新
- `src/scripts/batch-incremental-update-latest.ts` - 批量增量更新
- `src/scripts/fetch-batch-klines.ts` - 全量更新（初始化用）
- `src/scripts/batch-init-all-klines-simple.ts` - 批量全量初始化

---

**最后更新：** 2026-03-03  
**版本：** v1.0
