# 脚本迁移指南

**Feature**: 007-data-fetch-optimization
**Date**: 2026-03-15
**目标**: 简化脚本结构,提供统一入口

## 概述

本次优化将现有的12个数据更新脚本整合为5个核心脚本,目的是:
- ✅ 减少维护负担 (12个→5个)
- ✅ 提供统一接口
- ✅ 避免用户困惑
- ✅ 集中优化核心功能

---

## 脚本映射表

### 增量更新类脚本

| 旧脚本 | 状态 | 新脚本 |
|--------|------|--------|
| `incremental-update-all-markets.ts` | ✅ 优化保留 | `incremental-update-all-markets.ts` (优化后) |
| `incremental-update-hk-us.ts` | ❌ 废弃 | `incremental-update-all-markets.ts --markets HK,US` |
| `incremental-update-latest.ts` | ❌ 废弃 | `incremental-update-all-markets.ts --limit <N>` |
| `batch-incremental-update-latest.ts` | ❌ 废弃 | `incremental-update-all-markets.ts` |

### 全量导入类脚本

| 旧脚本 | 状态 | 新脚本 |
|--------|------|--------|
| `import-stocks-from-akshare.ts` | ❌ 废弃 | `full-import-stocks.ts --market <M> --source akshare` |
| `import-hk-stocks.ts` | ❌ 废弃 | `full-import-stocks.ts --market HK` |
| `import-us-stocks.ts` | ❌ 废弃 | `full-import-stocks.ts --market US` |

### 测试和验证脚本

| 旧脚本 | 状态 | 新位置 |
|--------|------|--------|
| `test-import-hk.ts` | ❌ 移动 | `tests/integration/import-hk.spec.ts` |
| `test-import-us.ts` | ❌ 移动 | `tests/integration/import-us.spec.ts` |
| `quick-import-sample.ts` | ❌ 移动 | `tests/integration/quick-import.spec.ts` |
| `verify-import.ts` | ✅ 保留 | `verify-import.ts` (验证工具) |

### 其他脚本

| 旧脚本 | 状态 | 说明 |
|--------|------|------|
| `update-index-composition.ts` | ✅ 保留 | 独立功能,不与数据更新合并 |

---

## 迁移示例

### 示例 1: 增量更新港股和美股

**旧方式**:
```bash
npx ts-node src/scripts/incremental-update-hk-us.ts
```

**新方式**:
```bash
npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK,US
```

---

### 示例 2: 增量更新前100只股票

**旧方式**:
```bash
npx ts-node src/scripts/incremental-update-latest.ts 100 0
```

**新方式**:
```bash
npx ts-node src/scripts/incremental-update-all-markets.ts --limit 100
```

---

### 示例 3: 批量增量更新

**旧方式**:
```bash
npx ts-node src/scripts/batch-incremental-update-latest.ts
```

**新方式**:
```bash
npx ts-node src/scripts/incremental-update-all-markets.ts
```

---

### 示例 4: 导入港股历史数据

**旧方式**:
```bash
npx ts-node src/scripts/import-hk-stocks.ts
```

**新方式**:
```bash
npx ts-node src/scripts/full-import-stocks.ts --market HK
```

---

### 示例 5: 从AkShare导入A股数据

**旧方式**:
```bash
npx ts-node src/scripts/import-stocks-from-akshare.ts
```

**新方式**:
```bash
npx ts-node src/scripts/full-import-stocks.ts --market A --source akshare
```

---

## 新脚本的优势

### 1. 统一的参数规范

所有脚本使用一致的参数格式:

```bash
# 通用参数
--markets <list>      # 市场列表: SH,SZ,HK,US,A
--limit <number>      # 限制数量
--stocks <list>       # 指定股票
--dry-run             # 干运行模式
--verbose             # 详细日志
--resume <taskId>     # 恢复任务

# 全量导入特有参数
--market <market>     # 单个市场
--start-date <date>   # 开始日期
--end-date <date>     # 结束日期
--source <source>     # 数据源: tushare, akshare, yahoo_finance
```

### 2. 更强大的功能

新脚本包含所有旧脚本的功能,并增加了:
- 🔄 断点续传
- 📊 实时进度显示
- 🚦 智能重试和降级
- 📦 批量操作优化
- 🔒 任务互斥锁
- 📈 性能监控

### 3. 更好的错误处理

- 详细的错误信息
- 标准化的错误码
- 自动重试机制
- 失败股票列表

---

## 迁移时间表

### Phase 1: 实现新脚本 (Week 1-2)
- ✅ 实现优化后的 `incremental-update-all-markets.ts`
- ⏳ 实现新的 `full-import-stocks.ts`
- ⏳ 实现 `manage-tasks.ts` 工具

### Phase 2: 添加废弃警告 (Week 3)
- 在旧脚本中添加警告消息
- 创建迁移指南文档
- 更新README和文档

### Phase 3: 测试和验证 (Week 4)
- 运行集成测试
- 验证所有用例
- 性能基准测试

### Phase 4: 废弃脚本 (1个月后)
- 删除废弃的脚本
- 清理相关文档
- 发布更新日志

---

## 废弃脚本清单

以下脚本将在1个月后删除:

```
backend/src/scripts/
├── incremental-update-hk-us.ts           ❌ 删除
├── incremental-update-latest.ts          ❌ 删除
├── batch-incremental-update-latest.ts    ❌ 删除
├── import-hk-stocks.ts                   ❌ 删除
├── import-us-stocks.ts                   ❌ 删除
├── import-stocks-from-akshare.ts         ❌ 删除
├── test-import-hk.ts                     ❌ 移动到 tests/
├── test-import-us.ts                     ❌ 移动到 tests/
└── quick-import-sample.ts                ❌ 移动到 tests/
```

---

## 常见问题

### Q1: 为什么要整合脚本?

**A**: 
- 减少维护负担 (12个脚本→5个脚本)
- 避免功能重复和不一致
- 集中优化核心功能
- 提供统一的用户体验

### Q2: 旧脚本何时删除?

**A**: 1个月后删除。在此期间:
- Week 1-2: 实现新脚本
- Week 3: 添加废弃警告
- Week 4: 测试验证
- 1个月后: 删除旧脚本

### Q3: 如何处理现有的cron任务?

**A**: 更新crontab中的脚本路径:

```bash
# 旧的cron任务
30 9 * * * cd /path/to/backend && npx ts-node src/scripts/incremental-update-hk-us.ts

# 新的cron任务
30 9 * * * cd /path/to/backend && npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK,US
```

### Q4: 新脚本是否向后兼容?

**A**: 新脚本功能完全覆盖旧脚本,但参数格式不同。需要根据迁移示例更新命令。

### Q5: 测试脚本为什么移到tests目录?

**A**: 
- 更符合项目结构规范
- 使用标准测试框架(Jest)
- 便于CI/CD集成
- 与业务脚本分离

---

## 保留的核心脚本

最终保留的5个核心脚本:

```
backend/src/scripts/
├── incremental-update-all-markets.ts     # 增量更新统一入口 (优化后)
├── full-import-stocks.ts                 # 全量导入统一入口 (新建)
├── manage-tasks.ts                       # 任务管理工具 (新建)
├── update-index-composition.ts           # 指数成分更新 (保留)
└── verify-import.ts                      # 导入验证工具 (保留)

tests/integration/
├── import-hk.spec.ts                     # 港股导入测试 (移动)
├── import-us.spec.ts                     # 美股导入测试 (移动)
└── quick-import.spec.ts                  # 快速导入测试 (移动)
```

---

## 参考文档

- [CLI命令契约](./contracts/cli-commands.md) - 完整的命令参数和选项
- [快速开始指南](./quickstart.md) - 新脚本使用指南
- [研究文档](./research.md) - 脚本整合策略决策过程

---

## 技术支持

如果在迁移过程中遇到问题:

1. 查看新脚本的帮助信息: `--help`
2. 运行干运行模式: `--dry-run`
3. 查看详细日志: `--verbose`
4. 参考CLI契约文档
5. 联系开发团队

---

## 总结

脚本整合带来的好处:

✅ **简化**: 12个脚本→5个核心脚本  
✅ **统一**: 一致的参数格式和接口  
✅ **优化**: 集中优化核心功能  
✅ **可维护**: 降低维护负担  
✅ **可测试**: 标准化的测试框架  

迁移过程将分阶段进行,确保平滑过渡,不影响现有用户。
