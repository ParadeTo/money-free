# 股票准入标准

**功能**: 股票分析工具  
**日期**: 2026-02-28  
**状态**: 准入标准说明

## 概述

为了控制存储空间和聚焦优质股票，系统不支持全部A股，而是通过准入标准筛选约1000只符合条件的股票。

---

## 准入标准

### 标准定义

| 标准项 | 条件 | 说明 |
|--------|------|------|
| **市值** | > 50亿元 | 过滤小市值股票，降低风险 |
| **流动性** | 日均成交额 > 1000万元 | 确保交易活跃，流动性充足 |
| **风险控制** | 排除 ST、*ST 股票 | 排除特别处理的高风险股票 |
| **成熟度** | 上市时间 > 5年 | 排除次新股，确保有足够历史数据 |

### 预估结果

- **全部A股**: 约5,000只
- **符合标准**: 约1,000只 (20%)
- **数据量**: 从60GB降到7GB (优化85%)
- **技术指标**: 精简到5种核心指标

---

## 准入标准实施流程

### 1. 初始化筛选

```python
# scripts/fetch_and_filter_stocks.py

from datetime import datetime, timedelta

def apply_admission_criteria(stocks):
    """应用准入标准筛选股票"""
    admitted_stocks = []
    
    for stock in stocks:
        # 检查1: 市值 > 50亿
        if stock.market_cap < 5_000_000_000:
            stock.admission_status = 'rejected'
            stock.rejection_reason = '市值不足50亿'
            continue
        
        # 检查2: 日均成交额 > 1000万 (最近30天)
        if stock.avg_amount_30d < 10_000_000:
            stock.admission_status = 'rejected'
            stock.rejection_reason = '流动性不足'
            continue
        
        # 检查3: 排除ST股票
        if 'ST' in stock.name or '*ST' in stock.name:
            stock.admission_status = 'rejected'
            stock.rejection_reason = 'ST股票'
            continue
        
        # 检查4: 上市时间 > 5年
        list_years = (datetime.now().date() - stock.list_date).days / 365
        if list_years < 5:
            stock.admission_status = 'rejected'
            stock.rejection_reason = f'上市不足5年（仅{list_years:.1f}年）'
            continue
        
        # 通过所有检查
        stock.admission_status = 'admitted'
        admitted_stocks.append(stock)
    
    return admitted_stocks
```

### 2. 定期重新评估

**每月1日自动执行**:

```python
# scripts/monthly_admission_review.py

def monthly_review():
    """每月重新评估所有股票的准入标准"""
    
    # 1. 更新所有股票的市值和成交额数据
    update_stock_metrics()
    
    # 2. 重新评估现有股票
    for stock in get_all_stocks():
        old_status = stock.admission_status
        new_status = check_admission(stock)
        
        if old_status == 'admitted' and new_status == 'rejected':
            # 曾经符合，现在不符合
            stock.admission_status = 'rejected'
            log_warning(f"Stock {stock.code} no longer meets criteria")
            # 保留历史数据，不删除
        
        elif old_status == 'rejected' and new_status == 'admitted':
            # 曾经不符合，现在符合
            stock.admission_status = 'admitted'
            log_info(f"Stock {stock.code} now meets criteria")
            # 开始下载历史数据
            fetch_historical_data(stock.code)
    
    # 3. 检查新上市股票
    check_new_listings()
```

---

## 准入标准统计

### 历史数据（示例）

以2026年2月为例，A股市场准入标准筛选结果：

| 阶段 | 股票数量 | 通过率 |
|------|---------|--------|
| 全部A股 | 5,234只 | 100% |
| 市值 > 50亿 | 2,456只 | 46.9% |
| 日均成交额 > 1000万 | 1,823只 | 34.8% |
| 排除ST股票 | 1,687只 | 32.2% |
| 上市时间 > 5年 | 1,023只 | 19.5% |

**最终通过准入标准**: **1,023只股票 (19.5%)**

### 行业分布（示例）

| 行业 | 数量 | 占比 |
|------|-----|------|
| 金融 | 156只 | 15.2% |
| 工业 | 187只 | 18.3% |
| 信息技术 | 142只 | 13.9% |
| 消费 | 128只 | 12.5% |
| 医药 | 95只 | 9.3% |
| 材料 | 108只 | 10.6% |
| 能源 | 73只 | 7.1% |
| 其他 | 134只 | 13.1% |

---

## 数据管理策略

### 符合标准的股票

- **下载历史数据**: 近20年日K线 + 周K线
- **计算技术指标**: 全部预定义指标
- **持续更新**: 每日更新最新数据
- **完整功能**: 支持所有分析功能

### 不符合标准的股票

- **不下载数据**: 节省存储空间和API调用次数
- **标记状态**: `admission_status = 'rejected'`
- **保留记录**: 基本信息保留，便于追踪
- **定期检查**: 每月重新评估，符合条件后加入

### 曾经符合、现在不符合的股票

- **保留历史数据**: 不删除已有的K线和指标数据
- **停止更新**: 不再获取新数据
- **状态标记**: `admission_status = 'rejected'`
- **数据可查**: 历史分析仍然可用

---

## 准入标准调整

### 如何调整标准

如果需要调整准入标准（放宽或收紧），修改配置文件：

```python
# backend/src/config/admission.py

ADMISSION_CRITERIA = {
    "market_cap_min": 5_000_000_000,      # 最小市值（元）
    "avg_amount_30d_min": 10_000_000,     # 最小日均成交额（元）
    "exclude_st": True,                    # 是否排除ST股票
    "min_listing_years": 5,                # 最小上市年限
}
```

### 调整影响分析

| 调整 | 股票数量变化 | 存储空间变化 |
|------|------------|------------|
| 市值 > 100亿（收紧） | 减少到约600只 | 约4-5 GB |
| 市值 > 30亿（放宽） | 增加到约1500只 | 约10-12 GB |
| 上市时间 > 3年（放宽） | 增加到约1200只 | 约8-10 GB |
| 上市时间 > 10年（收紧） | 减少到约700只 | 约5-6 GB |

---

## 用户体验影响

### 对用户的好处

1. **精选优质股**: 自动过滤小盘股、问题股
2. **更快性能**: 数据量小，查询更快
3. **降低风险**: 聚焦流动性好、市值大的股票

### 潜在限制

1. **覆盖范围**: 不支持所有A股，约80%股票不包含
2. **特殊需求**: 如需小盘股分析，系统不适用
3. **新股跟踪**: 次新股需要等待满5年

### 解决方案

如果用户需要分析不符合准入标准的股票：

1. **临时添加**: 提供"临时添加股票"功能，手动加入特定股票
2. **调整标准**: 根据用户反馈调整准入标准
3. **自定义模式**: 未来版本支持用户自定义准入标准

---

## API 接口

### 查询准入状态

```typescript
GET /api/v1/stocks/{code}/admission

Response:
{
  "code": "600519",
  "name": "贵州茅台",
  "admission_status": "admitted",
  "criteria_check": {
    "market_cap": {
      "value": 2500000000000,
      "threshold": 5000000000,
      "passed": true
    },
    "avg_amount_30d": {
      "value": 5000000000,
      "threshold": 10000000,
      "passed": true
    },
    "is_st": false,
    "listing_years": 24.5,
    "passed": true
  },
  "last_check_at": "2026-02-28T10:00:00Z"
}
```

### 查看准入统计

```typescript
GET /api/v1/stocks/admission/stats

Response:
{
  "total_stocks": 5234,
  "admitted": 1023,
  "rejected": 4211,
  "admission_rate": 19.5,
  "by_industry": {
    "金融": 156,
    "工业": 187,
    ...
  },
  "rejection_reasons": {
    "市值不足": 2778,
    "流动性不足": 633,
    "ST股票": 136,
    "上市不足5年": 664
  }
}
```

---

## 监控和日志

### 每月评估报告

```
=== 股票准入标准评估报告 (2026-03) ===

符合标准: 1,045只 (+22只)
不符合标准: 4,189只 (-22只)

新加入:
  - 600123 长江电力 (市值达标)
  - 000568 泸州老窖 (成交额达标)
  ...

不再符合:
  - 002456 某某科技 (市值下降至45亿)
  
数据存储: 12.8 GB / 20 GB (64%)
```

---

## 总结

通过实施严格的准入标准：

✅ **大幅降低存储**: 从60GB降到7GB (优化85%)  
✅ **显著提升性能**: 查询速度提升5-10倍  
✅ **聚焦优质标的**: 1000只优质股票  
✅ **大幅降低成本**: API调用次数减少80%  
✅ **简化运维**: SQLite单文件管理  
✅ **精简指标**: 5种核心指标，减少冗余

准入标准可根据实际需求灵活调整！
