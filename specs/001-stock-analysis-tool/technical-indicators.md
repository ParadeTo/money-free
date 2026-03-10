# 技术指标配置说明

**功能**: 股票分析工具  
**日期**: 2026-02-28  
**状态**: 技术指标定义

## 概述

本文档定义股票分析工具支持的所有技术指标、参数配置和计算方法。系统仅支持5种核心技术指标，使用行业标准参数。

---

## 支持的技术指标

### 1. MA (移动平均线)

**类型**: 主图叠加指标

**用途**: 判断趋势方向和支撑/阻力位

**参数配置**:

| K线周期 | MA周期 | 说明 |
|---------|--------|------|
| **日K线** | MA50, MA150, MA200 | 中长期均线，用于判断趋势 |
| **周K线** | MA10, MA30, MA40 | 对应日线的10周≈50日，30周≈150日，40周≈200日 |

**计算公式**:
```
MA(N) = (C1 + C2 + ... + CN) / N
其中 C 为收盘价，N 为周期
```

**显示方式**:
- 在K线主图上叠加显示
- 三条均线使用不同颜色区分
- 自动根据K线周期切换参数

**分析意义**:
- MA50/MA10: 短期趋势
- MA150/MA30: 中期趋势  
- MA200/MA40: 长期趋势
- 价格在均线上方为强势，下方为弱势
- 均线多头排列（短>中>长）为上升趋势

---

### 2. KDJ (随机指标)

**类型**: 副图指标

**用途**: 判断超买超卖和短期拐点

**参数配置**: K=9, D=3, J=3 (行业标准)

**计算公式**:
```
RSV = (收盘价 - 最近N日最低价) / (最近N日最高价 - 最近N日最低价) × 100

K值 = (2/3) × 前一日K值 + (1/3) × 当日RSV
D值 = (2/3) × 前一日D值 + (1/3) × 当日K值
J值 = 3 × 当日K值 - 2 × 当日D值

初始值: K=50, D=50
```

**显示方式**:
- 在独立副图中显示
- K线、D线、J线三条曲线
- 标注超买区（80以上）和超卖区（20以下）

**分析意义**:
- J值 > 80: 超买，可能回调
- J值 < 20: 超卖，可能反弹
- K线上穿D线: 金叉，买入信号
- K线下穿D线: 死叉，卖出信号

---

### 3. RSI (相对强弱指标)

**类型**: 副图指标

**用途**: 判断超买超卖状态和背离

**参数配置**: 周期=14 (行业标准)

**计算公式**:
```
上涨幅度平均值 = 最近N日上涨日的涨幅总和 / N
下跌幅度平均值 = 最近N日下跌日的跌幅总和 / N

RS = 上涨幅度平均值 / 下跌幅度平均值
RSI = 100 - (100 / (1 + RS))
```

**显示方式**:
- 在独立副图中显示
- 单条曲线，值域0-100
- 标注超买线（70）、超卖线（30）、中轴线（50）

**分析意义**:
- RSI > 70: 超买区，注意回调风险
- RSI < 30: 超卖区，注意反弹机会
- RSI = 50: 多空平衡
- 价格新高但RSI未新高: 顶背离，卖出信号
- 价格新低但RSI未新低: 底背离，买入信号

---

### 4. 成交量 (VOLUME)

**类型**: 副图指标

**用途**: 分析市场活跃度和趋势确认

**参数配置**: 带52周(1年)均量线

**计算方式**:
```
成交量: 当日成交量（单位：手）
52周均量 = 最近52周成交量的平均值
         = 最近260个交易日成交量的平均值
```

**显示方式**:
- 在独立副图中显示
- 柱状图显示成交量
- 叠加52周均量线
- 上涨日用红色，下跌日用绿色

**分析意义**:
- 量价齐升: 健康上涨
- 量价背离: 趋势可能反转
- 成交量 > 52周均量: 异常活跃，注意重大变化
- 成交量 < 52周均量: 市场观望

---

### 5. 成交额 (AMOUNT)

**类型**: 副图指标（可选，与成交量二选一）

**用途**: 分析资金活跃度（比成交量更能反映资金规模）

**参数配置**: 带52周(1年)均额线

**计算方式**:
```
成交额: 当日成交额（单位：元）
52周均额 = 最近52周成交额的平均值
         = 最近260个交易日成交额的平均值
```

**显示方式**:
- 在独立副图中显示
- 柱状图显示成交额
- 叠加52周均额线
- 上涨日用红色，下跌日用绿色

**分析意义**:
- 与成交量类似，但更能反映资金流入流出
- 成交额 > 52周均额: 大资金关注度高

---

### 6. 52周最高/最低点标注 (WEEK52_HIGHLOW)

**类型**: 主图标注

**用途**: 快速识别年度高低点，判断相对位置

**参数配置**: 无参数，自动计算最近52周(260个交易日)的最高价和最低价

**计算方式**:
```
52周最高价 = max(最近260个交易日的最高价)
52周最低价 = min(最近260个交易日的最低价)

记录对应的日期，便于标注
```

**显示方式**:
- 在K线主图上标注
- 最高点用红色标记 (↑) + 价格 + 日期
- 最低点用绿色标记 (↓) + 价格 + 日期
- 当前价格创52周新高/新低时高亮提示

**分析意义**:
- 接近52周最高点: 强势，但注意阻力
- 接近52周最低点: 弱势，但可能支撑
- 突破52周最高点: 创新高，关注突破有效性
- 跌破52周最低点: 创新低，注意风险

---

## 指标组合建议

### 推荐组合1: 趋势分析

- **主图**: K线 + MA (50/150/200)
- **副图1**: 成交量 (带52周均量)
- **标注**: 52周高低点

**适用场景**: 中长期投资者，关注趋势方向

---

### 推荐组合2: 短期交易

- **主图**: K线 + MA (50/150/200)
- **副图1**: KDJ (9-3-3)
- **副图2**: RSI (14)
- **标注**: 52周高低点

**适用场景**: 短期交易者，关注超买超卖

---

### 推荐组合3: 量价分析

- **主图**: K线 + MA (50/150/200)
- **副图1**: 成交量 (带52周均量)
- **副图2**: 成交额 (带52周均额)
- **标注**: 52周高低点

**适用场景**: 关注资金流向的投资者

---

## 指标计算顺序

### 日K线指标计算

```python
for stock in admitted_stocks:
    # 1. 获取日K线数据
    daily_klines = get_daily_klines(stock.code, last_20_years)
    
    # 2. 计算MA指标 (需要至少200天数据)
    ma50 = calculate_ma(daily_klines, period=50)
    ma150 = calculate_ma(daily_klines, period=150)
    ma200 = calculate_ma(daily_klines, period=200)
    
    # 3. 计算KDJ (需要至少9天数据)
    kdj = calculate_kdj(daily_klines, k=9, d=3, j=3)
    
    # 4. 计算RSI (需要至少14天数据)
    rsi = calculate_rsi(daily_klines, period=14)
    
    # 5. 计算成交量52周均线 (需要至少260天数据)
    volume_ma52w = calculate_ma(daily_klines.volume, period=260)
    
    # 6. 计算成交额52周均线
    amount_ma52w = calculate_ma(daily_klines.amount, period=260)
    
    # 7. 计算52周高低点 (需要至少260天数据)
    high_52w = max(daily_klines.high[-260:])
    low_52w = min(daily_klines.low[-260:])
```

### 周K线指标计算

```python
for stock in admitted_stocks:
    # 1. 基于日K线聚合周K线
    weekly_klines = aggregate_to_weekly(daily_klines)
    
    # 2. 计算MA指标
    ma10 = calculate_ma(weekly_klines, period=10)
    ma30 = calculate_ma(weekly_klines, period=30)
    ma40 = calculate_ma(weekly_klines, period=40)
    
    # 3. 计算KDJ
    kdj = calculate_kdj(weekly_klines, k=9, d=3, j=3)
    
    # 4. 计算RSI
    rsi = calculate_rsi(weekly_klines, period=14)
    
    # 5. 成交量和成交额的52周均线
    volume_ma52w = calculate_ma(weekly_klines.volume, period=52)
    amount_ma52w = calculate_ma(weekly_klines.amount, period=52)
    
    # 6. 52周高低点（直接从周K线计算）
    high_52w = max(weekly_klines.high[-52:])
    low_52w = min(weekly_klines.low[-52:])
```

---

## 数据存储策略

### 每只股票的指标配置数

**日K线** (每个交易日):
1. MA_DAILY (1条记录，包含ma50/150/200三个值)
2. KDJ (1条记录，包含k/d/j三个值)
3. RSI (1条记录，包含rsi值)
4. VOLUME (1条记录，包含volume和volume_ma52w)
5. AMOUNT (1条记录，包含amount和amount_ma52w)
6. WEEK52_HIGHLOW (1条记录，包含52周高低点)

**每日6条指标记录/股票**

**周K线** (每周):
- 同样6种指标配置

**每周6条指标记录/股票**

---

## 存储空间优化后估算

### 详细计算

```
1000只股票 × 20年数据:

日K线:
- K线数据: 1000 × 20年 × 250天 = 5,000,000条
- 指标数据: 5,000,000 × 6种 = 30,000,000条

周K线:
- K线数据: 1000 × 20年 × 52周 = 1,040,000条
- 指标数据: 1,040,000 × 6种 = 6,240,000条

技术指标总记录: 36,240,000条 (3624万)

存储大小:
- K线: 0.544 GB
- 技术指标: 3.624 GB  
- 索引: 1.04 GB
- 其他: 0.005 GB
-------
总计: 5.2 GB
实际(含SQLite开销): ~7 GB
推荐预留: 15 GB
```

**对比优化前**:
- 指标类型: 从10种降到6种配置
- 指标记录: 从6040万降到3624万（减少40%）
- 存储空间: 从12GB降到7GB（减少42%）

---

## 技术指标依赖

### 最小数据要求

| 指标 | 最少需要的K线数据 | 说明 |
|------|-----------------|------|
| MA50 | 50条 | 日K需要50天数据 |
| MA150 | 150条 | 日K需要150天数据 |
| MA200 | 200条 | 日K需要200天数据，约10个月 |
| MA10 (周) | 10条 | 周K需要10周数据，约2.5个月 |
| MA30 (周) | 30条 | 周K需要30周数据，约7.5个月 |
| MA40 (周) | 40条 | 周K需要40周数据，约10个月 |
| KDJ | 9条 | 需要9个周期数据 |
| RSI | 14条 | 需要14个周期数据 |
| 52周均量/均额 | 260条(日K) / 52条(周K) | 需要1年数据 |
| 52周高低点 | 260条(日K) / 52条(周K) | 需要1年数据 |

### 数据不足处理

对于上市时间不足的股票：
- 少于10个月: 无法计算MA200，显示"数据不足"
- 少于1年: 无法计算52周相关指标，显示"上市不足1年"
- 优先级: MA50 > RSI/KDJ > MA150 > MA200/52周指标

---

## 选股筛选支持的条件

基于以上5种指标，系统支持的筛选条件包括：

### MA相关条件

- 价格突破MA50 / MA150 / MA200
- 价格跌破MA50 / MA150 / MA200
- MA50 > MA150 > MA200 (多头排列)
- MA50 < MA150 < MA200 (空头排列)

### KDJ相关条件

- K值 > 80 (超买)
- K值 < 20 (超卖)
- KDJ金叉 (K上穿D)
- KDJ死叉 (K下穿D)

### RSI相关条件

- RSI > 70 (超买)
- RSI < 30 (超卖)
- RSI 突破50 (多空转换)

### 成交量/额相关条件

- 成交量 > 52周均量 × 1.5 (放量)
- 成交量 < 52周均量 × 0.5 (缩量)
- 成交额 > 52周均额 × 2 (大资金介入)

### 高低点相关条件

- 创52周新高
- 创52周新低
- 距离52周最高点 < 5%
- 距离52周最低点 < 5%

---

## 计算性能优化

### Node.js 原生库实现（推荐）

```typescript
// backend/src/services/indicators/technical-indicators.service.ts
import { SMA, RSI, Stochastic } from 'technicalindicators';

@Injectable()
export class TechnicalIndicatorsService {
  // MA 计算
  calculateMA(closePrices: number[], period: number): number[] {
    return SMA.calculate({ period, values: closePrices });
  }

  // KDJ 计算
  calculateKDJ(high: number[], low: number[], close: number[]) {
    const stochastic = Stochastic.calculate({
      high,
      low,
      close,
      period: 9,
      signalPeriod: 3
    });
    
    // 计算 J 值
    return stochastic.map(item => ({
      k: item.k,
      d: item.d,
      j: 3 * item.k - 2 * item.d
    }));
  }

  // RSI 计算
  calculateRSI(closePrices: number[], period: number = 14): number[] {
    return RSI.calculate({ period, values: closePrices });
  }

  // 52周高低点
  calculate52WeekMarkers(high: number[], low: number[], dates: string[]) {
    const window = 260; // 52周 ≈ 260个交易日
    
    let highMax = -Infinity;
    let lowMin = Infinity;
    let highDate = '';
    let lowDate = '';
    
    for (let i = Math.max(0, high.length - window); i < high.length; i++) {
      if (high[i] > highMax) {
        highMax = high[i];
        highDate = dates[i];
      }
      if (low[i] < lowMin) {
        lowMin = low[i];
        lowDate = dates[i];
      }
    }
    
    return { high: highMax, low: lowMin, highDate, lowDate };
  }
}
```

### Python Bridge 实现（可选 - 用于精度验证）

```python
# bridge/calculate_indicators.py
import pandas as pd
import pandas_ta as ta

def calculate_ma(close_prices, periods=[50, 150, 200]):
    df = pd.DataFrame({'close': close_prices})
    result = {}
    for period in periods:
        result[f'ma{period}'] = df['close'].rolling(window=period).mean().tolist()
    return result

def calculate_kdj(high, low, close):
    df = pd.DataFrame({'high': high, 'low': low, 'close': close})
    stoch = ta.stoch(df['high'], df['low'], df['close'], k=9, d=3)
    k_values = stoch[f'STOCHk_9_3_3'].tolist()
    d_values = stoch[f'STOCHd_9_3_3'].tolist()
    j_values = [3 * k - 2 * d for k, d in zip(k_values, d_values)]
    return {'k': k_values, 'd': d_values, 'j': j_values}

def calculate_rsi(close_prices, period=14):
    df = pd.DataFrame({'close': close_prices})
    rsi_values = ta.rsi(df['close'], length=period).tolist()
    return {'rsi': rsi_values}
```

**调用 Python Bridge**:

```typescript
// 仅在需要精度验证时使用
const result = await this.pythonBridge.execute('calculate_indicators.py', {
  high: highPrices,
  low: lowPrices,
  close: closePrices
});
```

---

## 前端展示配置

### 默认显示

用户首次打开图表时的默认配置：

```yaml
主图:
  - K线图
  - MA50/150/200 (或周线的MA10/30/40)
  - 52周高低点标注

副图1:
  - 成交量 (带52周均量线)

副图2:
  - 无 (用户可选择添加KDJ或RSI)
```

### 用户可选指标

- **主图可添加**: 无（MA固定显示）
- **副图可选择**: KDJ、RSI、成交量、成交额（最多2个副图）

---

## 总结

### 指标配置总览

| 指标 | 位置 | 参数 | 数据要求 |
|------|------|------|---------|
| MA | 主图 | 日:50/150/200 周:10/30/40 | 200天(日K) / 40周(周K) |
| KDJ | 副图 | 9-3-3 | 9个周期 |
| RSI | 副图 | 14 | 14个周期 |
| 成交量 | 副图 | 52周均线 | 260天 / 52周 |
| 成交额 | 副图 | 52周均线 | 260天 / 52周 |
| 52周高低点 | 主图标注 | 无 | 260天 / 52周 |

### 优化效果

✅ **指标精简**: 只保留5种核心指标  
✅ **参数明确**: 所有参数确定，无歧义  
✅ **存储优化**: 从12GB降到7GB  
✅ **聚焦分析**: 偏向中长期趋势分析  
✅ **计算高效**: 减少40%计算量

---

## 参考资源

- [TA-Lib 指标文档](https://ta-lib.github.io/ta-lib-python/doc_index.html)
- [同花顺技术指标说明](https://www.10jqka.com.cn/school/)
- [东方财富指标公式](http://www.eastmoney.com/)
