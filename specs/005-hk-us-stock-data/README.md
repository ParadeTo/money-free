# 港股和美股核心股票数据支持

**版本**: 1.0.0  
**状态**: MVP Ready  
**最后更新**: 2026-03-12

## 🎯 功能概述

为现有的A股VCP分析系统扩展港股和美股核心股票数据支持，实现跨市场技术分析能力。

### 核心特性

- ✅ **多市场支持**: A股(沪深) + 港股(恒指/恒科) + 美股(标普/纳指)
- ✅ **多数据源**: Yahoo Finance主，AkShare备，智能Fallback
- ✅ **历史数据**: 10年K线数据支持
- ✅ **断点续传**: ImportCheckpoint机制，支持导入中断恢复
- ✅ **跨语言搜索**: searchKeywords字段（待实现搜索逻辑）
- ✅ **货币显示**: 自动识别并显示货币符号（¥/HK$/$）
- ✅ **市场筛选**: 前端支持按市场筛选VCP结果

### 数据范围

| 市场 | 指数 | 股票数量 | 货币 |
|------|------|---------|------|
| 港股 | 恒生指数 + 恒生科技指数 | ~40只（去重） | HKD |
| 美股 | 标普500 + 纳斯达克100 | ~620只（去重） | USD |
| **总计** | | **~660只** | |

## 🚀 快速开始

### 1. 环境检查

```bash
# 确保Node 20和Python环境正常
cd backend
node --version  # 需要 v20.x

# 检查Python依赖
cd ../bridge
source venv/bin/activate
pip list | grep yfinance  # 应显示 yfinance 0.2.40+
```

### 2. 快速测试（推荐先执行）

```bash
cd backend

# 测试港股数据获取（3只股票，不写入数据库）
npm run test:import-hk

# 测试美股数据获取（3只股票，不写入数据库）
npm run test:import-us

# 快速导入示例数据（5港+5美，写入数据库）
npx ts-node src/scripts/quick-import-sample.ts
```

### 3. 完整数据导入

⚠️ **注意**: 完整导入需要较长时间和网络稳定性

```bash
cd backend

# 导入港股数据（~40只，10年历史，约1-2小时）
npm run import-hk

# 导入美股数据（~620只，10年历史，约10-12小时）
npm run import-us

# 建议：分批导入，使用screen或tmux保持会话
screen -S import-stocks
npm run import-hk
# Ctrl+A, D 分离会话
```

### 4. 运行VCP分析

```bash
cd backend

# 为所有股票运行VCP分析
npm run calculate-vcp

# 查看结果
npm run show-all-vcp
```

### 5. 前端验证

```bash
cd frontend
npm run dev

# 访问 http://localhost:3000
# 导航到 VCP Screener 页面
# 测试市场筛选器：全部市场 / A股 / 港股 / 美股
```

## 📚 命令参考

### 数据导入命令

```bash
# 港股导入
npm run import-hk [options]
  --index <HSI|HSTECH|all>  # 指定指数（默认：all）
  --years <number>          # 历史年数（默认：10）
  --resume                  # 从断点恢复
  --concurrency <number>    # 并发数（默认：3）
  --dry-run                 # 试运行
  --verbose                 # 详细日志

# 美股导入
npm run import-us [options]
  # 参数同上，index支持 SP500|NDX100|all

# 示例：只导入标普500，5年数据，并发5
npm run import-us -- --index SP500 --years 5 --concurrency 5
```

### 维护命令

```bash
# 更新指数成分股（手动触发）
npm run update-index --market <HK|US|all>

# 验证导入数据
npx ts-node src/scripts/verify-import.ts
```

## 🏗️ 架构设计

### 数据流向

```
                    ┌─────────────────┐
                    │  Import Scripts │
                    │  (TypeScript)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Import Manager  │
                    │  (Smart Switch) │
                    └────────┬────────┘
                             │
           ┌─────────────────┴─────────────────┐
           │                                   │
    ┌──────▼──────┐                    ┌──────▼──────┐
    │   AkShare   │                    │Yahoo Finance│
    │   Adapter   │                    │   Adapter   │
    └──────┬──────┘                    └──────┬──────┘
           │                                   │
    ┌──────▼──────┐                    ┌──────▼──────┐
    │Python Bridge│                    │Python Bridge│
    │ (AkShare)   │                    │ (yfinance)  │
    └──────┬──────┘                    └──────┬──────┘
           │                                   │
           └─────────────────┬─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  SQLite Database│
                    │   (stocks.db)   │
                    └─────────────────┘
```

### 核心组件

1. **数据源适配器** (`backend/src/modules/market-data/data-source/`)
   - `IDataSourceAdapter`: 统一接口
   - `AkShareAdapter`: AkShare数据源
   - `YahooFinanceAdapter`: Yahoo Finance数据源
   - `errors.ts`: 统一错误处理

2. **导入管理** (`backend/src/modules/market-data/import/`)
   - `ImportManager`: 智能数据源切换
   - `CheckpointTracker`: 断点续传
   - `IndexCompositionService`: 指数成分股管理

3. **工具函数** (`backend/src/modules/market-data/utils/`)
   - `retry.ts`: 指数退避重试
   - `rate-limiter.ts`: 并发和速率控制

4. **Python Bridge** (`bridge/`)
   - 港股数据脚本: `fetch_hk_*.py`
   - 美股数据脚本: `fetch_us_*.py`, `yahoo_finance_*.py`
   - 通用模板: `bridge_template.py`

## 🔍 故障排查

### Python脚本执行失败

**问题**: `Python script error: Unknown error`

**检查**:
1. Python环境是否激活
2. yfinance是否已安装
3. 手动测试Python脚本:
   ```bash
   cd bridge
   source venv/bin/activate
   echo '{"symbol":"AAPL", "market":"US"}' | python yahoo_finance_stock_info.py
   ```

### Yahoo Finance 404错误

**问题**: `Quote not found for symbol`

**原因**: 股票代码格式不正确或股票已退市

**解决**:
- 港股：确保使用4位数字格式（"0700.HK"）
- 美股：确保使用正确的股票代码
- 检查股票是否仍在指数中

### 导入中断

**问题**: 导入过程中网络中断或进程终止

**解决**:
```bash
# 使用 --resume 参数从断点恢复
npm run import-hk -- --resume
npm run import-us -- --resume
```

### VCP分析没有港股/美股结果

**原因**: 
1. 数据未导入
2. VCP标准严格（正常现象）
3. 数据量不足（1年数据可能不足以形成VCP）

**检查**:
```bash
# 验证数据
npx ts-node src/scripts/verify-import.ts

# 查看某只股票的K线数量
npx prisma studio
# 打开 KLineData 表，筛选 stockCode
```

## 📖 相关文档

- [功能规格](./spec.md) - 详细需求和澄清
- [实施计划](./plan.md) - 技术架构和实施步骤
- [数据模型](./data-model.md) - 数据结构和设计
- [API契约](./contracts/) - 接口定义和规范
- [研究文档](./research.md) - 技术调研和决策依据
- [任务清单](./tasks.md) - 80个细分任务
- [实施进度](./PROGRESS.md) - 当前完成状态

## 🤝 贡献

### 添加新的数据源

1. 实现 `IDataSourceAdapter` 接口
2. 添加对应的Python脚本
3. 在ImportManager中配置适配器
4. 添加单元测试

### 添加新的市场

1. 扩展 `MarketType` 枚举
2. 添加 `MARKET_CURRENCY_MAP` 映射
3. 创建对应的Python数据获取脚本
4. 更新前端类型和UI组件

## ⚡ 性能优化建议

### 导入性能
- 调整并发数: `--concurrency 5`（根据网络和API限制）
- 使用代理: 设置环境变量 `HTTP_PROXY`
- 分批导入: 先导入部分股票验证，再完整导入

### 数据库性能
- 定期执行 `VACUUM`
- 监控WAL文件大小
- 适时执行 `PRAGMA optimize`

## 📧 支持

如遇问题，请查看：
1. 导入日志: `backend/logs/import-*.json`
2. 数据库状态: `npx prisma studio`
3. 进度文档: [PROGRESS.md](./PROGRESS.md)
