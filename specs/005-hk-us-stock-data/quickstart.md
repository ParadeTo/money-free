# 快速开始指南：港股和美股数据支持

**功能**: 005-hk-us-stock-data  
**日期**: 2026-03-12  
**目标用户**: 开发者、系统管理员

## 概述

本指南帮助您快速设置和使用港股和美股数据导入功能。完成本指南后，您将能够：

✅ 导入港股和美股核心股票数据  
✅ 查询和展示港股和美股信息  
✅ 对港股和美股执行VCP分析  
✅ 执行增量数据更新  

**预计时间**: 30分钟设置 + 2-6小时数据导入

## 前置条件

### 系统要求

- ✅ Node.js 20.x (后端必需)
- ✅ Python 3.8+ (数据源bridge必需)
- ✅ SQLite 3.40+ (已有)
- ✅ 磁盘空间: 至少5GB可用空间

### 检查当前环境

```bash
# 检查Node.js版本（后端需要20.x）
node --version  # 应显示 v20.x.x

# 如果不是Node 20，切换版本
nvm use 20

# 检查Python版本
python3 --version  # 应显示 3.8 或更高

# 检查磁盘空间
df -h .  # 确保有5GB以上可用空间
```

## 第1步: 环境准备 (5分钟)

### 1.1 安装Python依赖

```bash
cd bridge

# 如果还没有虚拟环境，创建一个
python3 -m venv venv
source venv/bin/activate

# 安装新增的依赖
pip install yfinance>=0.2.28

# 验证安装
python3 -c "import yfinance; print('Yahoo Finance OK')"
python3 -c "import akshare; print('AkShare OK')"
```

### 1.2 更新数据库Schema

```bash
cd ../backend

# 切换到Node 20（重要！）
nvm use 20

# 生成Prisma Client
npx prisma generate

# 应用数据库迁移
npx prisma db push

# 验证迁移成功
npx prisma studio
# 在Prisma Studio中检查Stock表是否有currency和searchKeywords字段
```

### 1.3 验证现有数据完整性

```bash
# 运行验证脚本（确保A股数据不受影响）
ts-node src/scripts/validate-database.ts

# 预期输出:
# ✅ A股股票数: 3,856只
# ✅ A股K线记录: 4,856,234条
# ✅ currency字段已设置: 3,856只 (100%)
```

## 第2步: 导入港股数据 (1-2小时)

### 2.1 首次导入港股

```bash
cd backend

# 导入所有港股核心股票（恒生指数 + 恒生科技指数）
ts-node src/scripts/import-hk-stocks.ts --verbose

# 或者先测试少量数据
ts-node src/scripts/import-hk-stocks.ts --index hsi --years 1 --dry-run
```

**导入进度示例**:
```
🌍 导入港股核心股票数据
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 导入配置:
  • 指数: 恒生指数 + 恒生科技指数
  • 历史数据: 10年 (2016-01-01 至 2026-03-12)
  • 并发数: 3
  • 数据源: AkShare (主) → Yahoo Finance (备)

⏳ 进度: 45/110 (40.9%) | 已用时: 18m25s | 预计剩余: 26m10s
```

### 2.2 处理失败和重试

如果导入过程中有失败：

```bash
# 查看失败详情
cat logs/import-hk-stocks-2026-03-12-*.log | grep ERROR

# 从断点续传（自动跳过已导入的股票）
ts-node src/scripts/import-hk-stocks.ts --resume

# 或者强制重新导入失败的股票
ts-node src/scripts/import-hk-stocks.ts --force --verbose
```

### 2.3 验证导入结果

```bash
# 在Prisma Studio中查看
npx prisma studio

# 或使用SQL查询
sqlite3 data/stock_analysis.db "SELECT COUNT(*) FROM stocks WHERE market='HK';"
# 预期: 约110只

sqlite3 data/stock_analysis.db "SELECT COUNT(*) FROM kline_data WHERE stock_code LIKE '%.HK';"
# 预期: 约275,000条 (110 × 2500)
```

## 第3步: 导入美股数据 (2-4小时)

### 3.1 首次导入美股

```bash
cd backend

# 导入所有美股核心股票（标普500 + 纳斯达克100）
ts-node src/scripts/import-us-stocks.ts --verbose

# 推荐：分批导入（先导入标普500）
ts-node src/scripts/import-us-stocks.ts --index sp500 --verbose
```

**注意事项**:
- 美股股票较多（约550只），预计耗时2-4小时
- 建议在非工作时间或后台运行
- 如果网络不稳定，建议降低并发数: `--concurrency 2`

### 3.2 后台运行（可选）

```bash
# 使用nohup在后台运行
nohup ts-node src/scripts/import-us-stocks.ts --verbose > import-us.log 2>&1 &

# 查看进度
tail -f import-us.log

# 查看PID
ps aux | grep import-us-stocks
```

### 3.3 验证美股导入

```bash
sqlite3 data/stock_analysis.db "SELECT COUNT(*) FROM stocks WHERE market='US';"
# 预期: 约550只

sqlite3 data/stock_analysis.db "SELECT stockCode, stockName, currency FROM stocks WHERE market='US' LIMIT 5;"
# 验证股票名称和货币单位正确
```

## 第4步: 前端验证 (10分钟)

### 4.1 启动前端开发服务器

```bash
cd frontend
npm run dev
```

### 4.2 测试多市场功能

1. **打开股票列表页面**:
   - 访问 http://localhost:5173/stocks
   - 应该看到A股、港股、美股混合列表

2. **测试市场筛选器**:
   - 点击"港股"筛选器
   - 列表应该只显示市场标识为"HK"的股票

3. **测试搜索功能**:
   - 搜索"腾讯" → 应该返回"腾讯控股 (00700.HK)"
   - 搜索"00700" → 应该返回"腾讯控股 (00700.HK)"
   - 搜索"Apple" → 应该返回"Apple Inc. (AAPL.US)"

4. **测试K线图查看**:
   - 点击任意港股或美股
   - 打开K线图页面
   - 验证价格轴显示正确的货币单位（HKD或USD）

5. **测试VCP分析**:
   - 在K线图页面点击"生成VCP分析报告"
   - 验证分析结果正确显示货币单位
   - 验证收缩阶段、回调阶段数据正确

## 第5步: 增量更新设置 (5分钟)

### 5.1 测试手动增量更新

```bash
cd backend

# 为港股和美股执行增量更新
ts-node src/scripts/incremental-update-latest.ts --market HK
ts-node src/scripts/incremental-update-latest.ts --market US

# 或一次性更新所有市场
ts-node src/scripts/incremental-update-latest.ts --market all
```

### 5.2 设置自动化更新 (可选)

使用cron定时任务每日更新（收盘后执行）：

```bash
# 编辑crontab
crontab -e

# 添加以下行（每天17:00执行A股更新，18:00港股，6:00美股）
0 17 * * 1-5 cd /Users/youxingzhi/ayou/money-free/backend && ts-node src/scripts/incremental-update-latest.ts --market SH,SZ
0 18 * * 1-5 cd /Users/youxingzhi/ayou/money-free/backend && ts-node src/scripts/incremental-update-latest.ts --market HK
0 6 * * 1-5 cd /Users/youxingzhi/ayou/money-free/backend && ts-node src/scripts/incremental-update-latest.ts --market US
```

## 常见问题

### Q1: 导入速度太慢怎么办？

**A**: 尝试以下优化：
```bash
# 增加并发数（注意API限流）
ts-node src/scripts/import-us-stocks.ts --concurrency 5

# 减少历史数据年限
ts-node src/scripts/import-us-stocks.ts --years 5

# 分批导入
ts-node src/scripts/import-us-stocks.ts --index sp500
ts-node src/scripts/import-us-stocks.ts --index ndx100
```

### Q2: 遇到"网络超时"错误？

**A**: 检查网络连接和数据源可用性：
```bash
# 测试Python环境
cd bridge
source venv/bin/activate
python3 -c "import yfinance; ticker = yfinance.Ticker('AAPL'); print(ticker.info['shortName'])"

# 如果Yahoo Finance不可用，尝试只用AkShare
# 或降低并发数减少网络压力
ts-node src/scripts/import-us-stocks.ts --concurrency 2
```

### Q3: 数据库空间不足？

**A**: 清理旧数据或扩展存储：
```bash
# 检查数据库大小
du -h backend/data/stock_analysis.db

# 清理超过2年的K线数据（可选）
sqlite3 backend/data/stock_analysis.db "DELETE FROM kline_data WHERE date < date('now', '-2 years');"

# 重建数据库（压缩空间）
sqlite3 backend/data/stock_analysis.db "VACUUM;"
```

### Q4: 如何只导入特定股票？

**A**: 修改脚本或使用自定义列表：
```typescript
// 创建自定义导入脚本
const customStocks = [
  { code: '00700', name: '腾讯控股' },
  { code: '09988', name: '阿里巴巴-SW' }
];

await importStocks(customStocks, { market: 'HK', years: 10 });
```

### Q5: 搜索关键词如何更新？

**A**: 手动更新searchKeywords字段：
```bash
# 打开Prisma Studio
npx prisma studio

# 找到目标股票，编辑searchKeywords字段
# 格式: {"zh": ["苹果", "苹果公司"], "en": ["Apple", "AAPL"]}
```

或使用脚本批量更新：
```typescript
// 更新苹果公司的搜索关键词
await prisma.stock.update({
  where: { stockCode: 'AAPL.US' },
  data: {
    searchKeywords: JSON.stringify({
      zh: ['苹果', '苹果公司'],
      en: ['Apple', 'AAPL']
    })
  }
});
```

## 验证检查清单

完成以上步骤后，使用此清单验证功能：

- [ ] 数据库Schema已更新（currency和searchKeywords字段存在）
- [ ] 港股数据已导入（约110只，验证：`SELECT COUNT(*) FROM stocks WHERE market='HK'`）
- [ ] 美股数据已导入（约550只，验证：`SELECT COUNT(*) FROM stocks WHERE market='US'`）
- [ ] K线数据完整（每只股票约2500条，总计约165万条新记录）
- [ ] 前端可以查看港股和美股列表
- [ ] 市场筛选器正常工作
- [ ] 货币单位正确显示（港股HKD，美股USD）
- [ ] 搜索功能正常（支持股票代码和名称）
- [ ] VCP分析支持港股和美股
- [ ] 增量更新脚本正常运行

## 下一步

### 日常维护

**每日任务**:
```bash
# 增量更新所有市场数据（自动化或手动）
cd backend
ts-node src/scripts/incremental-update-latest.ts --market all
```

**每月任务**:
```bash
# 更新指数成分股列表（如有变动）
ts-node src/scripts/update-index-composition.ts --market all --import-new
```

### 数据质量监控

```bash
# 检查数据新鲜度
sqlite3 data/stock_analysis.db "
  SELECT market, MAX(date) as latest_date, COUNT(*) as stocks
  FROM stocks s
  LEFT JOIN kline_data k ON s.stock_code = k.stock_code
  WHERE k.period = 'daily'
  GROUP BY market;
"

# 检查数据源分布
sqlite3 data/stock_analysis.db "
  SELECT source, COUNT(DISTINCT stock_code) as stocks
  FROM kline_data
  WHERE stock_code LIKE '%.HK' OR stock_code LIKE '%.US'
  GROUP BY source;
"
```

### 性能优化

如果查询速度变慢：

```bash
# 重建索引
sqlite3 data/stock_analysis.db "REINDEX;"

# 分析查询性能
sqlite3 data/stock_analysis.db "ANALYZE;"

# 检查慢查询（在应用日志中）
grep "query took" backend/logs/*.log | sort -rn | head -10
```

## 故障排除

### 导入失败排查步骤

1. **检查日志文件**:
```bash
ls -lt backend/logs/import-*.log | head -5
cat backend/logs/import-hk-stocks-最新文件.log | grep ERROR
```

2. **验证数据源可用性**:
```bash
# 测试AkShare
cd bridge
source venv/bin/activate
python3 -c "import akshare as ak; print(ak.stock_hk_spot_em().head())"

# 测试Yahoo Finance
python3 -c "import yfinance as yf; print(yf.Ticker('0700.HK').history(period='5d'))"
```

3. **检查数据库连接**:
```bash
cd backend
sqlite3 data/stock_analysis.db "SELECT 1;"
# 应返回: 1
```

4. **检查磁盘空间**:
```bash
df -h backend/data/
# 确保有足够空间
```

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Error: Cannot find module '@prisma/client'` | Prisma Client未生成 | 运行`npx prisma generate` |
| `ECONNREFUSED` | Python bridge未运行或端口错误 | 检查bridge脚本路径和Python环境 |
| `P2002: Unique constraint failed` | 重复导入 | 使用`--force`标志或先清理数据 |
| `SQLITE_FULL` | 磁盘空间不足 | 清理磁盘空间或移动数据库到更大的分区 |
| `429 Too Many Requests` | API限流 | 降低并发数: `--concurrency 2` |

## 快速参考

### 常用命令

```bash
# === 数据导入 ===
# 导入港股（完整）
ts-node src/scripts/import-hk-stocks.ts

# 导入美股（完整）
ts-node src/scripts/import-us-stocks.ts

# 增量更新所有市场
ts-node src/scripts/incremental-update-latest.ts --market all

# === 数据查询 ===
# 查看港股列表
sqlite3 data/stock_analysis.db "SELECT stockCode, stockName, currency FROM stocks WHERE market='HK' LIMIT 10;"

# 查看美股列表
sqlite3 data/stock_analysis.db "SELECT stockCode, stockName, currency FROM stocks WHERE market='US' LIMIT 10;"

# === 数据验证 ===
# 检查数据完整性
ts-node src/scripts/validate-database.ts

# 查看数据源分布
sqlite3 data/stock_analysis.db "SELECT source, COUNT(*) FROM kline_data GROUP BY source;"

# === 维护 ===
# 更新指数成分股
ts-node src/scripts/update-index-composition.ts --market all

# 清理旧日志
rm backend/logs/import-*-$(date -d '30 days ago' +%Y-%m-*).log
```

### 性能基准参考

| 操作 | 预期耗时 | 实际测量 |
|------|---------|---------|
| 导入110只港股 (10年) | 1-2小时 | _____ |
| 导入550只美股 (10年) | 2-4小时 | _____ |
| 增量更新200只股票 | 5-10分钟 | _____ |
| 查询单只股票 | <100ms | _____ |
| VCP分析（港股/美股） | <5秒 | _____ |

建议在首次完成导入后填写"实际测量"列，作为性能基准参考。

## 开发提示

### 添加新的数据源

如果需要添加新的数据源（如Bloomberg, IEX Cloud）：

1. 创建新适配器实现`IDataSourceAdapter`接口
2. 添加对应的Python bridge脚本
3. 在ImportManager中注册新适配器
4. 编写单元测试验证接口契约

### 添加新的市场

如果需要添加新市场（如英股、日股）：

1. 扩展MarketType枚举: `'UK'`, `'JP'`
2. 扩展CurrencyType枚举: `'GBP'`, `'JPY'`
3. 为新市场实现数据源适配器
4. 创建对应的导入脚本
5. 更新前端市场筛选器选项

## 技术支持

### 相关文档

- [功能规格](./spec.md) - 功能需求和用户场景
- [实施计划](./plan.md) - 技术架构和实施策略
- [数据模型](./data-model.md) - 数据库schema和实体关系
- [数据源API契约](./contracts/data-source-api.md) - 数据源接口规范
- [导入脚本契约](./contracts/import-script-interface.md) - 命令行接口规范

### 调试技巧

**启用详细日志**:
```bash
# 导入时启用verbose模式
ts-node src/scripts/import-hk-stocks.ts --verbose

# 查看Python bridge输出
cd bridge
source venv/bin/activate
python3 fetch_hk_klines.py '{"symbol": "00700", "start": "2024-01-01", "end": "2024-12-31"}'
```

**检查数据质量**:
```sql
-- 查找异常价格数据
SELECT stock_code, date, open, high, low, close
FROM kline_data
WHERE high < low OR open > high OR close > high
LIMIT 10;

-- 查找成交量异常数据
SELECT stock_code, date, volume, amount
FROM kline_data
WHERE volume < 0 OR amount < 0
LIMIT 10;
```

## 完成确认

完成所有步骤后，您应该能够：

✅ 在前端股票列表中看到约660只港股和美股  
✅ 通过市场筛选器快速过滤港股或美股  
✅ 使用中英文搜索功能查找股票  
✅ 查看港股和美股的K线图（货币单位正确）  
✅ 对港股和美股执行VCP分析  
✅ 运行增量更新脚本保持数据新鲜  

恭喜！您已成功完成港股和美股数据支持功能的设置。

如有问题，请查看相关文档或检查日志文件。
