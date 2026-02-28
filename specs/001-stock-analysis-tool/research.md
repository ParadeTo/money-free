# 技术研究：股票分析工具

**Branch**: `001-stock-analysis-tool` | **Date**: 2026-02-28 | **Phase**: 0 (Research)

## 研究目标

本文档记录技术栈从 Python 迁移到 Node.js 的技术决策研究，特别关注：
1. Node.js 后端框架选择
2. 技术指标计算方案（Node.js 原生 vs Python bridge）
3. 数据源访问方案（Tushare/AkShare 的集成）
4. 数据库 ORM 选择
5. 异步任务系统
6. Python Bridge 架构设计

---

## 决策 1: Node.js 后端框架

### 选项对比

| 框架 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **Express** | 生态丰富、简单灵活、社区最大 | 无内置结构、需手动配置 | 快速原型、中小项目 |
| **Fastify** | 高性能、类型安全、插件系统 | 生态较小、学习曲线 | 高性能 API |
| **Nest.js** | 企业级架构、TypeScript优先、DI容器 | 较重、学习成本高 | 大型企业应用 |
| **Koa** | 轻量、中间件优雅、现代异步 | 生态较小、功能需插件 | 定制化需求 |

### 最终选择：**Nest.js**

**理由**:
1. **TypeScript 原生支持**: Constitution 要求 TypeScript 严格模式，Nest.js 完美契合
2. **模块化架构**: 自然支持 DDD 分层架构（Controller → Service → Repository）
3. **依赖注入**: 便于测试和 mock，符合 TDD 要求
4. **内置功能丰富**: 
   - 集成 TypeORM/Prisma（数据库）
   - 集成 Bull（任务队列）
   - 内置验证管道（class-validator）
   - 内置 Swagger 文档生成
5. **企业级最佳实践**: 内置 CORS、日志、错误处理、中间件
6. **活跃社区**: 持续维护，文档完善

**替代方案考虑**:
- Express: 太简单，需要大量手动配置，不符合企业级标准
- Fastify: 性能好但生态不如 Nest.js，缺少开箱即用的功能
- Koa: 太轻量，需要自建架构

---

## 决策 2: 技术指标计算方案

### 选项对比

| 方案 | 实现方式 | 优势 | 劣势 |
|------|---------|------|------|
| **Node.js 原生库** | technicalindicators, tulind | 纯 JS、部署简单 | 指标不全、精度可能有差异 |
| **Python Bridge (推荐)** | pandas-ta + child_process/microservice | 指标完整、行业标准、精度高 | 需要 Python 环境、复杂度高 |
| **混合方案** | 常用指标用 Node.js，复杂指标用 Python | 平衡性能和功能 | 维护两套代码 |

### 最终选择：**Python Bridge + Node.js 原生混合方案**

**理由**:
1. **需求分析**: 
   - 本项目需要5种指标：MA、KDJ、RSI、成交量均线、52周高低点
   - MA、RSI 是基础指标，Node.js 库完全支持
   - KDJ 需要验证精度（Node.js 库与行业标准的差异）

2. **Bridge 架构设计**:
   ```
   Node.js API (Nest.js)
        ↓
   Indicator Service (TypeScript)
        ↓
   ┌─────────────┬──────────────┐
   │             │              │
   Node.js       Python Bridge  │
   计算器        (可选)          │
   (MA, RSI)     (KDJ精度验证)  │
   ```

3. **Python Bridge 实现方案**:

   **方案 A: Child Process (推荐用于简单场景)**
   ```typescript
   // backend/src/services/python-bridge/index.ts
   import { exec } from 'child_process';
   import { promisify } from 'util';
   
   const execAsync = promisify(exec);
   
   export async function calculateKDJ(
     high: number[], 
     low: number[], 
     close: number[]
   ) {
     const input = JSON.stringify({ high, low, close });
     const { stdout } = await execAsync(
       `python3 bridge/calculate_kdj.py '${input}'`
     );
     return JSON.parse(stdout);
   }
   ```

   **方案 B: 微服务 (推荐用于生产)**
   ```
   Python FastAPI 微服务 (独立容器)
        ↑ HTTP
   Node.js Nest.js (主服务)
   ```

4. **决策**:
   - **开发阶段**: 使用 Node.js 原生库（technicalindicators），快速迭代
   - **生产阶段**: 如果发现精度问题，切换到 Python Bridge
   - **Bridge 实现**: 优先使用 Child Process（简单），如有性能问题再升级到微服务

**Python Bridge 脚本示例**:
```python
# bridge/calculate_kdj.py
import sys
import json
import pandas as pd
import pandas_ta as ta

def calculate_kdj(high, low, close, k=9, d=3, j=3):
    df = pd.DataFrame({'high': high, 'low': low, 'close': close})
    stoch = ta.stoch(df['high'], df['low'], df['close'], k=k, d=d)
    k_values = stoch[f'STOCHk_{k}_{d}_{j}'].tolist()
    d_values = stoch[f'STOCHd_{k}_{d}_{j}'].tolist()
    j_values = [3 * k - 2 * d for k, d in zip(k_values, d_values)]
    return {'k': k_values, 'd': d_values, 'j': j_values}

if __name__ == '__main__':
    input_data = json.loads(sys.argv[1])
    result = calculate_kdj(input_data['high'], input_data['low'], input_data['close'])
    print(json.dumps(result))
```

**Node.js 原生库（fallback）**:
```typescript
// backend/src/services/indicators/technical-indicators.service.ts
import { SMA, RSI, Stochastic } from 'technicalindicators';

export class TechnicalIndicatorsService {
  calculateMA(data: number[], period: number) {
    return SMA.calculate({ period, values: data });
  }

  calculateRSI(data: number[], period: number = 14) {
    return RSI.calculate({ period, values: data });
  }

  calculateKDJ(high: number[], low: number[], close: number[]) {
    // Stochastic 即 KDJ 的基础
    return Stochastic.calculate({ 
      high, low, close, 
      period: 9, signalPeriod: 3 
    });
  }
}
```

---

## 决策 3: 数据源访问方案（Tushare/AkShare）

### 挑战
- Tushare Pro 和 AkShare 都是 Python SDK
- 没有官方的 Node.js SDK

### 选项对比

| 方案 | 实现方式 | 优势 | 劣势 |
|------|---------|------|------|
| **HTTP 直接调用** | 用 axios 调用 Tushare API | 无需 Python、纯 Node.js | AkShare 无 HTTP API |
| **Python Bridge** | Python 脚本 + Node.js 调用 | 完整支持两个数据源 | 需要 Python 环境 |
| **第三方 Node.js 封装** | 社区库 | 开箱即用 | 维护不稳定、功能不全 |

### 最终选择：**混合方案**

1. **Tushare Pro**: 使用 HTTP 直接调用（推荐）
   ```typescript
   // backend/src/services/datasource/tushare.service.ts
   import axios from 'axios';
   
   export class TushareService {
     private token: string;
     private baseURL = 'http://api.waditu.com';
   
     async getDailyKLine(stockCode: string, startDate: string, endDate: string) {
       const response = await axios.post(`${this.baseURL}`, {
         api_name: 'daily',
         token: this.token,
         params: { ts_code: stockCode, start_date: startDate, end_date: endDate },
         fields: 'ts_code,trade_date,open,high,low,close,vol,amount'
       });
       return response.data.data;
     }
   }
   ```

2. **AkShare (备用)**: 使用 Python Bridge
   ```python
   # bridge/akshare_fetcher.py
   import sys
   import json
   import akshare as ak
   
   def fetch_daily_kline(stock_code, start_date, end_date):
       df = ak.stock_zh_a_hist(
           symbol=stock_code, 
           period="daily", 
           start_date=start_date, 
           end_date=end_date
       )
       return df.to_dict('records')
   
   if __name__ == '__main__':
       args = json.loads(sys.argv[1])
       result = fetch_daily_kline(args['code'], args['start'], args['end'])
       print(json.dumps(result))
   ```

   ```typescript
   // backend/src/services/datasource/akshare.service.ts
   import { exec } from 'child_process';
   import { promisify } from 'util';
   
   const execAsync = promisify(exec);
   
   export class AkShareService {
     async getDailyKLine(stockCode: string, startDate: string, endDate: string) {
       const input = JSON.stringify({ 
         code: stockCode, 
         start: startDate, 
         end: endDate 
       });
       const { stdout } = await execAsync(
         `python3 bridge/akshare_fetcher.py '${input}'`
       );
       return JSON.parse(stdout);
     }
   }
   ```

**数据源降级策略**:
```typescript
// backend/src/services/datasource/datasource-manager.service.ts
@Injectable()
export class DataSourceManagerService {
  constructor(
    private readonly tushare: TushareService,
    private readonly akshare: AkShareService,
  ) {}

  async getDailyKLine(stockCode: string, start: string, end: string) {
    try {
      // 优先使用 Tushare (HTTP 调用，更快)
      return await this.tushare.getDailyKLine(stockCode, start, end);
    } catch (error) {
      this.logger.warn('Tushare failed, fallback to AkShare');
      // 降级到 AkShare (Python bridge)
      return await this.akshare.getDailyKLine(stockCode, start, end);
    }
  }
}
```

---

## 决策 4: 数据库 ORM

### 选项对比

| ORM | 优势 | 劣势 | 适用场景 |
|-----|------|------|---------|
| **TypeORM** | Nest.js 官方集成、装饰器风格、成熟 | 性能一般、复杂查询繁琐 | 中小项目 |
| **Prisma** | 类型安全极强、查询性能好、迁移工具优秀 | 学习曲线、生成代码 | 现代化项目 |
| **Sequelize** | 老牌稳定、功能全 | TypeScript 支持弱、代码冗长 | 传统项目 |

### 最终选择：**Prisma**

**理由**:
1. **类型安全**: 自动生成的 TypeScript 类型，完美契合 Constitution 要求
2. **Prisma Schema**: 声明式定义数据模型，清晰易读
   ```prisma
   model Stock {
     stock_code  String  @id
     stock_name  String
     market      String
     list_date   DateTime
     market_cap  Float
     status      String
     klines      KLineData[]
     favorites   Favorite[]
   }
   
   model KLineData {
     id          Int      @id @default(autoincrement())
     stock_code  String
     date        DateTime
     period      String
     open        Float
     high        Float
     low         Float
     close       Float
     volume      Float
     amount      Float
     stock       Stock    @relation(fields: [stock_code], references: [stock_code])
     
     @@index([stock_code, date, period])
   }
   ```

3. **Prisma Migrate**: 迁移工具优秀，支持 SQLite
4. **性能**: 查询优化器比 TypeORM 好
5. **Nest.js 集成**: `@nestjs/prisma` 官方支持

**替代方案考虑**:
- TypeORM: 装饰器风格不错，但查询性能和类型推断不如 Prisma
- Sequelize: 太老旧，TypeScript 支持不好

---

## 决策 5: 异步任务系统

### 选项对比

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **Bull (Redis)** | 成熟稳定、Nest.js 官方集成、持久化 | 需要 Redis | 生产环境 |
| **Agenda (MongoDB)** | 轻量、持久化 | 需要 MongoDB | 中小项目 |
| **node-cron + SQLite** | 无额外依赖、简单 | 功能简单、无分布式 | 简单场景 |

### 最终选择：**Bull + Redis** (推荐) 或 **node-cron + SQLite** (简化方案)

**方案 A: Bull + Redis (生产推荐)**
```typescript
// backend/src/jobs/data-update.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('data-update')
export class DataUpdateProcessor {
  @Process('incremental-update')
  async handleIncrementalUpdate(job: Job<{ taskId: string }>) {
    const { taskId } = job.data;
    
    // 更新进度
    await job.progress(0);
    
    // 执行增量更新
    for (let i = 0; i < totalStocks; i++) {
      await this.updateStock(stocks[i]);
      await job.progress((i / totalStocks) * 100);
    }
    
    return { success: true, taskId };
  }
}
```

**方案 B: node-cron + SQLite (简化方案)**
```typescript
// backend/src/jobs/scheduler.service.ts
import * as cron from 'node-cron';

@Injectable()
export class SchedulerService implements OnModuleInit {
  onModuleInit() {
    // 每天 17:00 执行数据更新
    cron.schedule('0 17 * * *', async () => {
      await this.dataUpdateService.triggerUpdate();
    });
  }
}
```

**决策**: 
- **MVP 阶段**: 使用 node-cron + SQLite（简单部署）
- **生产阶段**: 升级到 Bull + Redis（分布式、可靠性）

---

## 决策 6: 前端技术栈

### 最终选择：**保持不变**

- **框架**: React 18+ with TypeScript
- **构建工具**: Vite
- **图表库**: TradingView Lightweight Charts
- **UI库**: Ant Design
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **测试**: Vitest + React Testing Library

**理由**: 前端技术栈无需变更，已经符合 Constitution 要求

---

## Python Bridge 架构总览

### 目录结构

```
project-root/
├── backend/                    # Node.js 主服务
│   ├── src/
│   │   ├── services/
│   │   │   ├── python-bridge/ # Python bridge 调用封装
│   │   │   ├── indicators/    # 技术指标服务
│   │   │   └── datasource/    # 数据源服务
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── bridge/                     # Python bridge 脚本
│   ├── calculate_kdj.py        # KDJ 计算（可选）
│   ├── akshare_fetcher.py      # AkShare 数据获取
│   ├── requirements.txt        # pandas-ta, akshare
│   └── README.md
├── frontend/                   # React 前端（不变）
└── scripts/                    # 数据初始化脚本
```

### Bridge 调用流程

```
1. Node.js API 接收请求
   ↓
2. Service 层判断是否需要 Python
   ↓ (需要)
3. PythonBridgeService 构造命令
   ↓
4. exec() 执行 Python 脚本
   ↓
5. Python 脚本通过 stdout 返回 JSON
   ↓
6. Node.js 解析 JSON 并返回
```

### 错误处理

```typescript
// backend/src/services/python-bridge/python-bridge.service.ts
@Injectable()
export class PythonBridgeService {
  async execute(script: string, args: any): Promise<any> {
    try {
      const input = JSON.stringify(args);
      const { stdout, stderr } = await execAsync(
        `python3 bridge/${script} '${input}'`
      );
      
      if (stderr) {
        this.logger.error(`Python stderr: ${stderr}`);
      }
      
      return JSON.parse(stdout);
    } catch (error) {
      this.logger.error(`Python bridge error: ${error.message}`);
      throw new InternalServerErrorException('Python bridge failed');
    }
  }
}
```

---

## 技术栈总结

### 后端 (Node.js)

| 组件 | 技术选择 | 版本 |
|------|---------|------|
| 运行时 | Node.js | 18+ LTS |
| 框架 | Nest.js | 10+ |
| 语言 | TypeScript | 5+ |
| ORM | Prisma | 5+ |
| 数据库 | SQLite | 3.40+ |
| 任务队列 | Bull (Redis) 或 node-cron | - |
| 技术指标 | technicalindicators + Python bridge | - |
| 数据源 | HTTP (Tushare) + Python bridge (AkShare) | - |
| 测试 | Jest + Supertest | - |
| 验证 | class-validator + class-transformer | - |
| 文档 | @nestjs/swagger | - |

### Python Bridge

| 组件 | 技术选择 |
|------|---------|
| 运行时 | Python 3.11+ |
| 指标计算 | pandas-ta |
| 数据获取 | AkShare |
| 通信方式 | child_process (stdout/stdin) |

### 前端 (保持不变)

| 组件 | 技术选择 |
|------|---------|
| 框架 | React 18+ |
| 语言 | TypeScript 5+ |
| 构建 | Vite |
| 图表 | TradingView Lightweight Charts |
| UI | Ant Design |
| 状态 | Zustand |
| HTTP | Axios |
| 测试 | Vitest + RTL |

---

## 部署考虑

### 开发环境
```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装 Python（用于 bridge）
RUN apk add --no-cache python3 py3-pip

# 安装 Python 依赖
COPY bridge/requirements.txt /app/bridge/
RUN pip3 install -r /app/bridge/requirements.txt

# 安装 Node.js 依赖
COPY backend/package.json backend/package-lock.json /app/backend/
WORKDIR /app/backend
RUN npm ci

COPY . /app
RUN npm run build

CMD ["npm", "run", "start:prod"]
```

### 生产环境（可选优化）
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:../data/stocks.db
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
  
  python-bridge:  # 可选：独立的 Python 微服务
    build: ./bridge
    ports:
      - "5000:5000"
  
  redis:  # 用于 Bull 任务队列
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
```

---

## 迁移路径

### Phase 1: MVP (纯 Node.js)
- 使用 technicalindicators 库计算所有指标
- 使用 Tushare HTTP API 获取数据
- 使用 node-cron 定时任务
- **目标**: 快速验证核心功能

### Phase 2: 精度优化（引入 Python Bridge）
- 对比 KDJ 指标精度
- 如有偏差，引入 pandas-ta bridge
- **目标**: 保证行业标准精度

### Phase 3: 稳定性提升
- 引入 AkShare bridge 作为数据源备份
- 升级到 Bull + Redis 任务队列
- **目标**: 生产级可靠性

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| Python bridge 性能瓶颈 | 异步调用 + 缓存结果 |
| Python 环境部署复杂 | Docker 镜像预装 Python |
| 跨语言调试困难 | 完善日志 + 单元测试覆盖 |
| Node.js 指标精度问题 | 对比测试 + Python bridge fallback |

---

## 下一步行动

✅ **Phase 0 研究完成**

**进入 Phase 1**:
1. 生成 `data-model.md` (使用 Prisma schema)
2. 生成 `contracts/api-spec.md` (REST API 定义)
3. 生成 `quickstart.md` (Node.js + Python 混合环境搭建)
4. 更新 Constitution Check (验证 Nest.js 是否符合所有原则)
