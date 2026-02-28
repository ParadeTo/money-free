# Phase 0: 技术研究

**日期**: 2026-02-28  
**目标**: 解决实施计划中标记为 "NEEDS CLARIFICATION" 的技术选型和设计问题

## 研究清单

1. ✅ 图表库选择：ECharts vs TradingView Lightweight Charts
2. ✅ 技术指标计算方案
3. ✅ 数据源集成模式（Tushare Pro + AkShare）
4. ✅ SQLite 性能优化策略
5. ✅ React 图表组件架构设计
6. ✅ 认证方案设计

---

## 1. 图表库选择

### 决策：TradingView Lightweight Charts

### 理由：

1. **专业性**：专为金融图表设计，K线图、技术指标展示是核心功能
2. **性能**：基于 Canvas 渲染，支持大量数据点（20年日K约5000根K线），性能优于 ECharts 的 SVG 渲染
3. **移动端优化**：触摸手势支持良好，适配响应式需求
4. **轻量级**：打包体积约 200KB，远小于 ECharts 完整包（>1MB）
5. **许可证**：Apache 2.0，商业友好

### 考虑的替代方案：

- **ECharts**：
  - 优点：功能丰富、文档齐全（中文）、社区活跃
  - 缺点：体积较大、金融图表非核心场景、性能在大数据量时不如专业金融图表库
  - 拒绝原因：虽然支持K线图，但在20年历史数据加载时性能表现不如 Lightweight Charts
  
- **Highcharts Stock**：
  - 优点：功能强大、金融图表专业
  - 缺点：商业许可证（个人免费但不适合潜在商业化）
  - 拒绝原因：许可证限制

- **D3.js + 自定义实现**：
  - 优点：完全可定制
  - 缺点：开发成本高、需要自己实现手势、缩放、性能优化
  - 拒绝原因：时间成本不可控

### 实施计划：

- 使用 `lightweight-charts` npm 包（v4.x）
- 主图：K线（Candlestick Series）+ MA 叠加（Line Series）
- 副图：独立 Chart 实例，堆叠布局（KDJ、RSI、成交量等）
- 自定义标记：使用 Markers API 标注52周高低点
- 绘图工具：使用 Price Line / Horizontal Line API 实现趋势线、水平线等

---

## 2. 技术指标计算方案

### 决策：使用 pandas-ta + 自定义补充

### 理由：

1. **pandas-ta**：
   - 提供 130+ 种技术指标，包括 MA、KDJ、RSI、成交量均线等
   - 基于 Pandas DataFrame，与现有数据处理流程无缝集成
   - MIT 许可证，可商用
   - 社区维护活跃，算法经过验证

2. **自定义补充**：
   - 52周最高/最低点标注：简单的 rolling max/min 计算，pandas-ta 未直接提供
   - KDJ 金叉/死叉判断：基于 pandas-ta 计算的 K、D 值，添加形态判断逻辑

### 考虑的替代方案：

- **TA-Lib**：
  - 优点：业界标准、算法权威、C实现性能高
  - 缺点：安装依赖复杂（需要编译）、部署困难（Docker镜像需预装）
  - 拒绝原因：部署复杂度高，pandas-ta 纯 Python 实现更易维护
  
- **自己实现所有指标**：
  - 优点：完全可控
  - 缺点：算法正确性需要验证、开发时间长、容易出错
  - 拒绝原因：重复造轮子，pandas-ta 已提供可靠实现

### 实施计划：

```python
# 使用 pandas-ta 计算指标
import pandas_ta as ta

# MA 指标
df['MA50'] = ta.sma(df['close'], length=50)
df['MA150'] = ta.sma(df['close'], length=150)
df['MA200'] = ta.sma(df['close'], length=200)

# KDJ 指标
stoch = ta.stoch(df['high'], df['low'], df['close'], k=9, d=3, smooth_k=3)
df['K'] = stoch['STOCHk_9_3_3']
df['D'] = stoch['STOCHd_9_3_3']
df['J'] = 3 * df['K'] - 2 * df['D']

# RSI 指标
df['RSI'] = ta.rsi(df['close'], length=14)

# 成交量52周均线
df['volume_ma52w'] = df['volume'].rolling(window=52*5).mean()  # 日K: 52周约260个交易日

# 自定义：52周最高/最低点
df['high_52w'] = df['high'].rolling(window=52*5).max()
df['low_52w'] = df['low'].rolling(window=52*5).min()
```

---

## 3. 数据源集成模式

### 决策：策略模式 + 自动降级

### 理由：

1. **策略模式**：将 Tushare Pro 和 AkShare 封装为统一接口（DataSource Protocol）
2. **自动降级**：主数据源失败时（API错误、积分不足、超时）自动切换到备用数据源
3. **数据标准化**：不同数据源返回的字段名、数据格式统一转换为内部标准格式

### 实施计划：

```python
# backend/src/services/data_source_service.py

from abc import ABC, abstractmethod
from typing import Protocol, List
import pandas as pd

class DataSourceProtocol(Protocol):
    def fetch_kline(self, stock_code: str, start_date: str, end_date: str) -> pd.DataFrame:
        """获取K线数据"""
        ...
    
    def fetch_stock_basic(self) -> pd.DataFrame:
        """获取股票基本信息"""
        ...

class TushareDataSource:
    def __init__(self, token: str):
        import tushare as ts
        self.pro = ts.pro_api(token)
    
    def fetch_kline(self, stock_code: str, start_date: str, end_date: str) -> pd.DataFrame:
        # Tushare Pro API 调用
        df = self.pro.daily(ts_code=stock_code, start_date=start_date, end_date=end_date)
        # 标准化字段名：trade_date -> date, open -> open, ...
        return self._normalize(df)
    
    def _normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        # 统一字段名
        rename_map = {'trade_date': 'date', 'vol': 'volume', 'amount': 'turnover'}
        return df.rename(columns=rename_map)

class AkShareDataSource:
    def fetch_kline(self, stock_code: str, start_date: str, end_date: str) -> pd.DataFrame:
        import akshare as ak
        # AkShare API 调用
        df = ak.stock_zh_a_hist(symbol=stock_code, start_date=start_date, end_date=end_date)
        return self._normalize(df)
    
    def _normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        # AkShare 字段名映射
        rename_map = {'日期': 'date', '开盘': 'open', '收盘': 'close', ...}
        return df.rename(columns=rename_map)

class DataSourceManager:
    def __init__(self):
        self.primary = TushareDataSource(token=config.TUSHARE_TOKEN)
        self.fallback = AkShareDataSource()
        self.current_source = 'tushare'
    
    def fetch_kline(self, stock_code: str, start_date: str, end_date: str) -> pd.DataFrame:
        try:
            df = self.primary.fetch_kline(stock_code, start_date, end_date)
            self.current_source = 'tushare'
            return df
        except Exception as e:
            logger.warning(f"Tushare failed: {e}, falling back to AkShare")
            df = self.fallback.fetch_kline(stock_code, start_date, end_date)
            self.current_source = 'akshare'
            return df
```

---

## 4. SQLite 性能优化策略

### 决策：多层索引 + 分区查询 + WAL模式

### 理由：

1. **数据规模**：
   - 约1000只股票
   - 20年历史数据（日K），每只股票约 5000 条记录
   - 总记录数：500万条 K线数据 + 500万条技术指标数据
   - 存储空间：12-15GB

2. **查询场景**：
   - 单只股票日K/周K查询（按日期范围）：高频，需 <100ms
   - 技术指标查询（特定股票 + 日期范围）：高频，需 <100ms
   - 选股筛选（多条件AND组合，全表扫描1000只股票最新数据）：中频，需 <3s
   - 批量更新（每日增量更新K线和指标）：低频，夜间执行

### 实施计划：

#### 索引设计

```sql
-- K线数据表
CREATE TABLE kline_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    turnover REAL,
    period TEXT NOT NULL,  -- 'daily' or 'weekly'
    created_at TEXT,
    UNIQUE(stock_code, date, period)
);

-- 复合索引：股票代码 + 日期（支持范围查询）
CREATE INDEX idx_kline_stock_date ON kline_data(stock_code, date DESC);

-- 单独索引：日期（支持按日期筛选所有股票）
CREATE INDEX idx_kline_date ON kline_data(date DESC);

-- 技术指标表
CREATE TABLE indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    date TEXT NOT NULL,
    period TEXT NOT NULL,
    indicator_type TEXT NOT NULL,  -- 'MA50', 'MA150', 'MA200', 'KDJ_K', 'KDJ_D', 'KDJ_J', 'RSI', ...
    value REAL,
    created_at TEXT,
    UNIQUE(stock_code, date, period, indicator_type)
);

-- 复合索引：股票代码 + 日期 + 指标类型
CREATE INDEX idx_indicator_stock_date_type ON indicators(stock_code, date DESC, indicator_type);

-- 选股筛选优化：最新日期索引（筛选时只查最新一天的数据）
CREATE INDEX idx_indicator_latest ON indicators(date DESC, indicator_type, value);
```

#### WAL 模式

```python
# backend/src/core/database.py

import sqlite3

def init_db():
    conn = sqlite3.connect('data/stocks.db')
    # 启用 WAL 模式（Write-Ahead Logging）
    conn.execute('PRAGMA journal_mode=WAL;')
    # 增加缓存大小（默认2000页，增加到10000页，约40MB）
    conn.execute('PRAGMA cache_size=-40000;')  # 负数表示KB
    # 启用内存临时存储
    conn.execute('PRAGMA temp_store=MEMORY;')
    return conn
```

#### 查询优化

```python
# 选股筛选优化：先获取最新日期，再筛选
def filter_stocks(conditions: List[FilterCondition]) -> List[str]:
    # 1. 获取最新交易日
    latest_date = db.execute("SELECT MAX(date) FROM kline_data WHERE period='daily'").fetchone()[0]
    
    # 2. 只查询最新日期的指标数据（避免全表扫描）
    query = """
        SELECT DISTINCT stock_code FROM indicators
        WHERE date = ? AND period = 'daily'
    """
    
    # 3. 逐个条件过滤（AND逻辑）
    for condition in conditions:
        query += f" AND indicator_type = '{condition.indicator}' AND value {condition.operator} {condition.value}"
    
    # 4. 限制结果数量
    query += " LIMIT 100"
    
    return db.execute(query, (latest_date,)).fetchall()
```

---

## 5. React 图表组件架构设计

### 决策：容器组件 + 展示组件分离，Hooks 管理数据

### 理由：

1. **关注点分离**：数据获取逻辑与UI展示逻辑解耦
2. **可测试性**：展示组件纯函数，易于单元测试
3. **性能优化**：使用 React.memo、useMemo、useCallback 避免不必要的重渲染

### 实施计划：

```typescript
// frontend/src/components/KLineChart/index.tsx

// 容器组件：负责数据获取和状态管理
export const KLineChartContainer: React.FC<{ stockCode: string }> = ({ stockCode }) => {
  const { data, loading, error } = useKLineData(stockCode);
  const { indicators } = useIndicators(stockCode);
  
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <KLineChart
      data={data}
      indicators={indicators}
      onPeriodChange={handlePeriodChange}
    />
  );
};

// 展示组件：纯UI渲染（使用 React.memo 优化）
export const KLineChart = React.memo<KLineChartProps>(({ data, indicators, onPeriodChange }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  
  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;
    
    chartInstanceRef.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 600,
      layout: { textColor: '#333', background: { color: '#fff' } },
    });
    
    return () => {
      chartInstanceRef.current?.remove();
    };
  }, []);
  
  // 更新数据
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    
    const candlestickSeries = chartInstanceRef.current.addCandlestickSeries();
    candlestickSeries.setData(data);
    
    // 添加MA指标
    if (indicators.MA50) {
      const ma50Series = chartInstanceRef.current.addLineSeries({ color: 'blue' });
      ma50Series.setData(indicators.MA50);
    }
  }, [data, indicators]);
  
  return <div ref={chartRef} />;
});

// 自定义 Hook：数据获取
function useKLineData(stockCode: string) {
  const [data, setData] = useState<KLineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    klineService.getKLineData(stockCode, 'daily')
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [stockCode]);
  
  return { data, loading, error };
}
```

### 性能优化要点：

1. **懒加载图表**：K线图页面使用 `React.lazy()` 懒加载
2. **虚拟滚动**：股票列表、筛选结果列表使用 `react-window` 虚拟滚动
3. **防抖**：搜索输入框使用 `debounce` 减少API请求
4. **缓存**：使用 SWR 或 React Query 缓存 API 响应（K线数据、技术指标）

---

## 6. 认证方案设计

### 决策：JWT Token + HttpOnly Cookie

### 理由：

1. **简单性**：预设 admin 账户，无需复杂的用户注册、密码重置流程
2. **安全性**：JWT Token 存储在 HttpOnly Cookie 中，防止 XSS 攻击
3. **无状态**：后端无需维护 Session，易于扩展

### 实施计划：

```python
# backend/src/api/auth.py

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPBearer
from datetime import datetime, timedelta
import jwt

router = APIRouter()
security = HTTPBearer()

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"  # 实际部署时应使用环境变量+哈希
SECRET_KEY = "your-secret-key"  # 实际部署时使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24小时

@router.post("/login")
def login(username: str, password: str, response: Response):
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="账户名或密码错误，请重试")
    
    # 生成 JWT Token
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
    
    # 设置 HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    
    return {"message": "登录成功"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "退出成功"}

def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username != ADMIN_USERNAME:
            raise HTTPException(status_code=401, detail="无效的认证令牌")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="无效的认证令牌")
```

```typescript
// frontend/src/services/authService.ts

export const authService = {
  async login(username: string, password: string): Promise<void> {
    const response = await api.post('/auth/login', { username, password });
    // Token 存储在 HttpOnly Cookie 中，前端无需手动处理
  },
  
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
  
  // Axios 拦截器自动处理 401 错误，跳转到登录页
  setupInterceptors() {
    api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
};
```

---

## 研究结果总结

| 决策点 | 选择方案 | 关键理由 |
|--------|---------|---------|
| 图表库 | TradingView Lightweight Charts | 专业金融图表、性能优秀、轻量级 |
| 技术指标计算 | pandas-ta + 自定义补充 | 功能齐全、易维护、无部署依赖 |
| 数据源集成 | 策略模式 + 自动降级 | 容错性高、数据标准化 |
| SQLite 优化 | 多层索引 + WAL模式 | 查询性能、并发支持 |
| React 组件架构 | 容器/展示分离 + Hooks | 关注点分离、可测试性、性能优化 |
| 认证方案 | JWT + HttpOnly Cookie | 简单、安全、无状态 |

**Phase 0 完成**，所有 NEEDS CLARIFICATION 项已解决，可进入 Phase 1 设计阶段。
