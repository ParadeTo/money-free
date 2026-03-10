# 快速开始指南：股票分析工具

**Branch**: `001-stock-analysis-tool` | **Date**: 2026-02-28 | **Phase**: 1 (Design)

## 概述

本指南帮助开发者快速搭建股票分析工具的开发环境。项目采用 Node.js (Nest.js) 后端 + Python Bridge + React 前端的混合架构。

**技术栈**:
- **后端**: Node.js 18+, Nest.js 10+, TypeScript, Prisma, SQLite
- **Python Bridge**: Python 3.11+, pandas-ta, akshare
- **前端**: React 18+, TypeScript, Vite, TradingView Lightweight Charts
- **任务队列**: Bull (Redis) 或 node-cron

---

## 前置要求

### 必需

- **Node.js**: >= 18.0.0 LTS
- **npm** 或 **pnpm**: >= 9.0.0
- **Python**: >= 3.11
- **pip**: >= 23.0
- **Git**: 最新版本

### 可选（生产环境推荐）

- **Redis**: >= 7.0（用于 Bull 任务队列）
- **Docker**: >= 20.10（用于容器化部署）

---

## 环境搭建

### 1. 克隆仓库

```bash
git clone <repository-url>
cd money-free
git checkout 001-stock-analysis-tool
```

---

### 2. 后端设置 (Node.js + Nest.js)

#### 2.1 安装依赖

```bash
cd backend
npm install
```

#### 2.2 配置环境变量

创建 `.env` 文件（基于 `.env.example`）:

```bash
cp .env.example .env
```

编辑 `.env`:

```env
# 数据库
DATABASE_URL="file:../data/stocks.db"

# JWT 认证
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Tushare Pro
TUSHARE_TOKEN="your-tushare-token-here"

# Redis（用于 Bull 任务队列，可选）
REDIS_URL="redis://localhost:6379"

# 日志级别
LOG_LEVEL="debug"

# API 端口
PORT=3000

# CORS 允许的前端域名
CORS_ORIGIN="http://localhost:5173"
```

#### 2.3 注册 Tushare Pro

**重要**: 数据获取依赖 Tushare Pro API

1. 访问 [https://tushare.pro/register](https://tushare.pro/register) 注册账户
2. 实名认证后获取 **token**
3. 将 token 填入 `.env` 文件的 `TUSHARE_TOKEN`
4. 免费版额度限制：每分钟200次，每天10000次

**验证 token**:
```bash
npm run test:tushare
```

#### 2.4 数据库初始化

```bash
# 生成 Prisma Client
npx prisma generate

# 创建并应用迁移
npx prisma migrate dev --name init

# 初始化管理员用户
npm run seed
```

**验证数据库**:
```bash
npx prisma studio
# 打开浏览器查看 http://localhost:5555
```

---

### 3. Python Bridge 设置

#### 3.1 创建虚拟环境

```bash
cd bridge
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

#### 3.2 安装 Python 依赖

```bash
pip install -r requirements.txt
```

**requirements.txt** 内容:

```txt
pandas==2.1.0
pandas-ta==0.3.14b
akshare==1.12.0
tushare==1.2.89
```

#### 3.3 验证 Python Bridge

```bash
# 测试 KDJ 计算
python calculate_kdj.py '{"high":[10,11,12,11,10],"low":[9,10,11,10,9],"close":[9.5,10.5,11.5,10.5,9.5]}'

# 测试 AkShare 数据获取（需要网络）
python akshare_fetcher.py '{"code":"600519","start":"2024-01-01","end":"2024-12-31"}'
```

---

### 4. 前端设置 (React + Vite)

#### 4.1 安装依赖

```bash
cd frontend
npm install
```

#### 4.2 配置环境变量

创建 `.env.local`:

```bash
cp .env.example .env.local
```

编辑 `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 数据初始化

### 1. 股票列表初始化

获取符合准入标准的股票（约1000只）:

```bash
cd backend
npm run script:init-stocks
```

**预计时间**: 2-3分钟

**输出示例**:
```
✓ Fetched 5000 stocks from Tushare
✓ Applied admission criteria
✓ 1023 stocks admitted
✓ Saved to database
```

---

### 2. 历史K线数据下载（推荐使用自动化工具）

#### 方式 1: 自动化批量初始化（推荐）⭐

**功能特点**:
- ✅ 自动断点续传（中断后可继续）
- ✅ 实时进度监控
- ✅ API限流控制
- ✅ 一键完成K线下载和指标计算

**步骤**:

1. **获取股票列表**:
```bash
npx ts-node src/scripts/fetch-all-stocks.ts
```
预期结果：约3665只A股股票导入数据库

2. **批量初始化（自动化）**:
```bash
npx ts-node src/scripts/batch-init-all-klines-simple.ts
```

**预计时间**: 约2小时（3665只股票）  
**处理速度**: 约32只/分钟  
**批次配置**: 500只/批，批次间暂停30秒

3. **监控进度**（另开终端）:
```bash
# 查看一次进度
npx ts-node src/scripts/check-progress.ts

# 持续监控（每30秒刷新）
npx ts-node src/scripts/check-progress.ts --watch
```

**进度示例**:
```
股票进度:
  总数: 3665 只
  已处理: 660 只
  待处理: 3005 只
  完成度: 18.0%

  [█████████░░░░░░░...] 18.0%

数据统计:
  K线数据: 413,066 条
    - 日线: 342,532 条
    - 周线: 70,534 条
  技术指标: 1,745,571 条
```

**中断恢复**:
如果脚本中断，直接重新运行相同命令即可自动从断点继续：
```bash
npx ts-node src/scripts/batch-init-all-klines-simple.ts
```

---

#### 方式 2: 手动分批处理

如果需要更精细的控制，可以手动指定范围：

```bash
# 处理第1-500只股票
npx ts-node src/scripts/fetch-batch-klines.ts 500 0

# 处理第501-1000只股票
npx ts-node src/scripts/fetch-batch-klines.ts 500 500

# 以此类推...
```

**参数说明**:
- 第一个参数：批次大小（limit）
- 第二个参数：起始偏移量（offset）

---

#### 方式 3: Shell脚本自动化

```bash
# 使用Shell脚本循环执行
./src/scripts/batch-init-all-klines.sh
```

---

### 3. 技术指标说明

**注意**: 使用方式1（自动化工具）时，技术指标会自动计算，无需单独运行。

**已集成的指标**:
1. MA (移动平均线): ma50, ma150, ma200
2. KDJ (随机指标): k, d, j
3. RSI (相对强弱指标): 14周期
4. Volume MA (成交量52周均线)
5. Amount MA (成交额52周均线)
6. Week 52 Markers (52周高低点)

**验证数据**:
```bash
# 打开数据库浏览器
npx prisma studio

# 或查看进度
npx ts-node src/scripts/check-progress.ts
```

---

### 4. 快速测试（仅初始化少量数据）

如果只是测试功能，可以只初始化少量股票：

```bash
# 方式1: 使用现有的测试数据脚本
npx ts-node src/scripts/fetch-sample-klines.ts

# 方式2: 手动指定少量股票
npx ts-node src/scripts/fetch-batch-klines.ts 10 0
```

这将只处理前10只股票，足够测试所有功能。

---

## 运行开发环境

### 方式 1: 手动启动（推荐用于开发）

#### 1. 启动 Redis（如果使用 Bull）

```bash
# macOS (Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

#### 2. 启动后端服务

```bash
cd backend
npm run start:dev
```

**访问**: `http://localhost:3000`

**Swagger 文档**: `http://localhost:3000/api-docs`

#### 3. 启动前端服务

```bash
cd frontend
npm run dev
```

**访问**: `http://localhost:5173`

---

### 方式 2: Docker Compose（推荐用于生产）

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/stocks.db
      - TUSHARE_TOKEN=${TUSHARE_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
      - ./bridge:/app/bridge
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=http://localhost:3000/api/v1

volumes:
  redis-data:
```

---

## 测试

### 后端测试

#### 单元测试

```bash
cd backend
npm run test
```

#### 集成测试

```bash
npm run test:e2e
```

#### 测试覆盖率

```bash
npm run test:cov
```

**目标**: 核心业务逻辑覆盖率 > 80%

---

### 前端测试

#### 组件测试

```bash
cd frontend
npm run test
```

#### E2E 测试（Playwright）

```bash
npm run test:e2e
```

---

## 常见问题

### 1. Tushare API 限额超出

**问题**: `Error: Tushare API limit exceeded`

**解决方案**:
```bash
# 使用 AkShare 备用数据源
export USE_AKSHARE=true
npm run script:fetch-klines
```

或者在代码中配置降级策略（已内置）

---

### 2. Python Bridge 找不到

**问题**: `Error: Python script not found`

**解决方案**:
```bash
# 检查 Python 路径
which python3

# 检查 bridge 脚本权限
cd bridge
chmod +x *.py

# 测试 bridge
npm run test:bridge
```

---

### 3. SQLite 数据库锁定

**问题**: `database is locked`

**解决方案**:
```bash
# 检查 WAL 模式是否启用
sqlite3 data/stocks.db "PRAGMA journal_mode;"

# 应该返回 "wal"

# 如果不是，手动启用
sqlite3 data/stocks.db "PRAGMA journal_mode=WAL;"
```

---

### 4. 前端无法连接后端

**问题**: `Network Error` 或 `CORS Error`

**解决方案**:

1. 检查后端是否运行:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

2. 检查 CORS 配置:
   ```typescript
   // backend/src/main.ts
   app.enableCors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
     credentials: true
   });
   ```

3. 检查前端 API URL:
   ```typescript
   // frontend/src/services/api.ts
   const baseURL = import.meta.env.VITE_API_BASE_URL;
   console.log('API Base URL:', baseURL);
   ```

---

### 5. Redis 连接失败

**问题**: `Error connecting to Redis`

**解决方案**:

如果不想使用 Redis，可以切换到 node-cron（简化方案）:

```typescript
// backend/src/config/queue.config.ts
export const useRedis = process.env.USE_REDIS === 'true';

if (!useRedis) {
  // 使用 node-cron
  import * as cron from 'node-cron';
  // ...
}
```

---

## 开发工作流

### 1. 创建新功能

```bash
# 创建功能分支
git checkout -b feature/your-feature

# 后端：生成模块
cd backend
nest g module features/your-feature
nest g service features/your-feature
nest g controller features/your-feature

# 前端：创建组件
cd frontend
mkdir src/components/YourFeature
```

### 2. 代码规范

**后端**:
```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

**前端**:
```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

### 3. 提交代码

```bash
# 添加更改
git add .

# 提交
git commit -m "feat: add your feature"

# 推送
git push origin feature/your-feature
```

---

## 性能优化

### 1. 后端优化

#### 启用查询缓存

```typescript
// backend/src/config/cache.config.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5分钟缓存
      max: 100
    })
  ]
})
```

#### 数据库连接池

```typescript
// backend/src/config/database.config.ts
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=20'
    }
  }
});
```

---

### 2. 前端优化

#### 代码分割

```typescript
// frontend/src/router/index.tsx
const KLineChartPage = lazy(() => import('@/pages/KLineChartPage'));
const FilterPage = lazy(() => import('@/pages/FilterPage'));
```

#### Bundle 分析

```bash
npm run build
npm run analyze
```

---

## 部署

### 开发环境

```bash
# 后端
cd backend
npm run start:dev

# 前端
cd frontend
npm run dev
```

### 生产环境

```bash
# 构建后端
cd backend
npm run build
npm run start:prod

# 构建前端
cd frontend
npm run build
# 产物在 dist/ 目录，使用 nginx 或其他静态服务器
```

### Docker 部署

```bash
# 构建镜像
docker build -t stock-analysis-backend ./backend
docker build -t stock-analysis-frontend ./frontend

# 运行
docker-compose up -d
```

---

## 监控和日志

### 后端日志

```bash
# 查看实时日志
tail -f backend/logs/app.log

# 查看错误日志
tail -f backend/logs/error.log
```

### 健康检查

```bash
# 后端健康检查
curl http://localhost:3000/api/v1/health

# 响应示例
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600
}
```

---

## 下一步

✅ **开发环境搭建完成**

**建议顺序**:

1. **验证环境**: 运行所有测试，确保通过
2. **数据初始化**: 至少初始化10只股票的数据用于开发
3. **功能开发**: 按照 tasks.md 中的 Phase 顺序开发
4. **测试驱动**: 先写测试，再实现功能（TDD）
5. **集成测试**: 每个功能完成后进行集成测试

**资源**:
- [Nest.js 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- [Tushare Pro API](https://tushare.pro/document/2)

---

## 联系方式

如有问题，请参考：
- 项目 README.md
- API 文档: `http://localhost:3000/api-docs`
- 数据模型: `specs/001-stock-analysis-tool/data-model.md`
- 任务清单: `specs/001-stock-analysis-tool/tasks.md`
