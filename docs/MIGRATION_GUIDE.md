# 脚本迁移指南

## 概述

本指南说明如何从旧的数据更新脚本迁移到新的优化脚本。新脚本将更新效率提升3-5倍，并提供更好的错误处理和监控能力。

## 核心改进

| 特性 | 旧脚本 | 新脚本 | 改进 |
|------|--------|--------|------|
| 增量更新时间 | 30-40分钟 | ≤15分钟 | **60%+ 性能提升** |
| 并发控制 | 无 | A股8并发, 港股/美股3并发 | API调用更快 |
| 批量写入 | 逐条insert | 100条/批次 | 数据库写入更快 |
| 断点续传 | 不支持 | 支持 | 可恢复中断任务 |
| 进度显示 | 无 | 实时显示 | 更好的可观测性 |
| 智能跳过 | 不支持 | 自动跳过最新股票 | 减少不必要API调用 |
| 错误重试 | 基础重试 | 指数退避+主备切换 | 更高成功率 |
| 任务互斥 | 不支持 | 互斥锁 | 防止并发冲突 |

## 命令映射

### 增量更新

**旧命令 (已废弃)**:
```bash
npm run update-hk-us              # 更新港股和美股
npm run update-hk                 # 更新港股
npm run update-us                 # 更新美股
ts-node src/scripts/incremental-update-all-markets.ts  # 更新所有市场
```

**新命令 (推荐)**:
```bash
npm run update:optimized          # 更新所有市场 (优化版)
npm run update:optimized -- --markets SH,SZ     # 只更新A股
npm run update:optimized -- --markets HK        # 只更新港股
npm run update:optimized -- --markets US        # 只更新美股
```

### 全量导入

**旧命令 (已废弃)**:
```bash
npm run import-hk                 # 导入港股
npm run import-us                 # 导入美股
ts-node src/scripts/quick-import-sample.ts      # 快速导入样本
```

**新命令 (推荐)**:
```bash
npm run import:optimized -- --market SH         # 导入A股(上海)
npm run import:optimized -- --market SZ         # 导入A股(深圳)
npm run import:optimized -- --market HK         # 导入港股
npm run import:optimized -- --market US         # 导入美股

# 支持断点续传
npm run import:optimized -- --market HK --resume task-id-123
```

### 任务管理

**新功能 (之前不存在)**:
```bash
# 查看当前运行的任务
npm run task:status

# 查看特定任务状态
npm run task:status -- --task-id abc-123

# 清理7天前的旧日志
npm run task:cleanup

# 清理30天前的旧日志
npm run task:cleanup -- --days 30
```

### 性能监控

**新功能 (之前不存在)**:
```bash
# 查看最近10次更新的性能指标
npm run perf:report

# 查看最近20次更新
npm run perf:report -- --last 20
```

## 迁移步骤

### 第一阶段: 并行运行 (1-2周)

1. **保留旧脚本**作为备份
2. **在测试环境**运行新脚本，验证功能
3. **比较性能和结果**，确保数据一致性
4. **逐步增加**新脚本的使用频率

### 第二阶段: 切换到新脚本 (2-4周)

1. **停止使用旧脚本**
2. **更新cron任务**使用新命令
3. **监控性能指标**，确保达到目标
4. **处理遗留问题**

### 第三阶段: 清理 (1周后)

1. **备份旧脚本**(移到`deprecated/`目录)
2. **从package.json删除**旧命令
3. **更新文档**和README

## 示例迁移

### 每日定时任务

**旧crontab**:
```cron
# 每天早上9:00更新所有股票
0 9 * * * cd /app/backend && npm run update-hk-us >> /var/log/stock-update.log 2>&1
```

**新crontab**:
```cron
# 每天早上9:00更新所有股票 (优化版,15分钟内完成)
0 9 * * * cd /app/backend && npm run update:optimized >> /var/log/stock-update.log 2>&1

# 每天早上9:30生成性能报告
30 9 * * * cd /app/backend && npm run perf:report >> /var/log/performance.log 2>&1

# 每周日凌晨3:00清理旧日志
0 3 * * 0 cd /app/backend && npm run task:cleanup -- --days 14
```

### CI/CD Pipeline

**旧配置** (`.github/workflows/update-data.yml`):
```yaml
- name: Update stock data
  run: |
    npm run update-hk-us
```

**新配置**:
```yaml
- name: Update stock data (optimized)
  run: |
    npm run update:optimized
    
- name: Check task status
  run: |
    npm run task:status
    
- name: Generate performance report
  run: |
    npm run perf:report
```

## 常见问题

### Q1: 新脚本是否兼容现有数据库schema?

**A**: 是的，新脚本使用相同的Prisma模型，完全兼容现有数据库结构。只是新增了`ImportCheckpoint`表用于断点续传。

### Q2: 如果新脚本失败，如何回退到旧脚本?

**A**: 旧脚本保留在代码库中，可以随时使用旧命令。只需在cron或CI/CD中切换回旧命令即可。

### Q3: 性能目标是什么?

**A**: 
- 增量更新1300只股票: ≤15分钟 (旧版30-40分钟)
- 成功率: ≥95%
- 全量导入单市场1000只股票: ≤2小时 (旧版4-6小时)

### Q4: 如何监控新脚本的性能?

**A**: 使用`npm run perf:report`查看历史性能数据，包括平均用时、成功率、吞吐量等指标。

### Q5: 新脚本如何处理API速率限制?

**A**: 新脚本内置:
- 指数退避重试 (1s → 2s → 4s)
- API速率限制检测 (429状态码)
- 主备数据源切换 (Tushare ↔ AkShare)
- 分市场并发控制 (A股8并发, 港股/美股3并发)

### Q6: 断点续传如何使用?

**A**: 如果任务中断，使用`npm run task:status`查看任务ID，然后使用`--resume`参数恢复:
```bash
npm run import:optimized -- --market HK --resume task-abc-123
```

### Q7: 旧脚本什么时候删除?

**A**: 建议在新脚本稳定运行1个月后，将旧脚本移到`src/scripts/deprecated/`目录备份，然后从package.json删除相关命令。

## 技术支持

如有问题，请:
1. 查看`specs/007-data-fetch-optimization/`目录的完整文档
2. 查看`backend/tests/integration/`的测试用例
3. 提交Issue到项目仓库

## 时间表

| 阶段 | 日期 | 状态 |
|------|------|------|
| 新脚本开发完成 | 2026-03-15 | ✅ 完成 |
| 测试环境验证 | 2026-03-16 - 2026-03-22 | 🔄 进行中 |
| 生产环境并行运行 | 2026-03-23 - 2026-04-05 | ⏳ 待开始 |
| 完全切换到新脚本 | 2026-04-06 | ⏳ 待开始 |
| 清理旧脚本 | 2026-05-06 | ⏳ 待开始 |
