# Quick Start Guide: 单股票VCP分析查询

**Feature**: 004-stock-vcp-analysis  
**Date**: 2026-03-11  
**Target Audience**: Developers implementing this feature

## Overview

本指南帮助开发者快速上手实现单股票VCP分析查询功能。包括环境配置、开发流程、测试步骤和常见问题。

---

## Prerequisites

### Required Software

- **Node.js 20.x** (后端) - ⚠️ 必须使用此版本
- **Node.js 18+** (前端)
- **npm** 或 **pnpm**
- **SQLite 3.40+**
- **Git**

### Check Versions

```bash
# 检查 Node.js 版本
node --version  # 应该是 v20.x.x (backend) 或 v18.x.x+ (frontend)

# 检查 npm 版本
npm --version

# 检查 SQLite 版本
sqlite3 --version
```

### Switch Node Version (Backend)

```bash
# 使用 nvm 切换到 Node.js 20
cd backend
nvm use 20

# 或手动设置 PATH
export PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH"
```

---

## Development Environment Setup

### 1. Clone and Install Dependencies

```bash
# 进入项目根目录
cd /Users/youxingzhi/ayou/money-free

# 安装后端依赖（使用 Node 20）
cd backend
nvm use 20
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# 后端目录
cd backend

# 生成 Prisma Client
npx prisma generate

# 同步数据库 Schema（如果需要）
npx prisma db push

# 查看数据库（可选）
npx prisma studio
```

### 3. Start Development Servers

```bash
# 终端1: 启动后端服务
cd backend
nvm use 20
npm run start:dev
# 后端运行在 http://localhost:3000

# 终端2: 启动前端服务
cd frontend
npm run dev
# 前端运行在 http://localhost:5173
```

---

## Development Workflow

### Phase 0: Read Design Documents ✅ (Already Done)

- [x] `spec.md` - 功能规格说明
- [x] `plan.md` - 实施计划
- [x] `research.md` - 技术决策
- [x] `data-model.md` - 数据模型
- [x] `contracts/vcp-analysis-api.md` - API合约

### Phase 1: Backend Implementation (TDD)

#### Step 1.1: Write Tests First

```bash
cd backend

# 创建测试文件
touch src/modules/vcp/vcp.service.spec.ts
touch src/services/vcp/vcp-formatter.service.spec.ts
touch test/integration/vcp-analysis.e2e.spec.ts
```

**Test Structure**:
```typescript
// src/modules/vcp/vcp.service.spec.ts
describe('VcpService.generateAnalysis', () => {
  it('should return cached analysis when available', async () => {
    // Arrange: 准备测试数据
    // Act: 调用 generateAnalysis
    // Assert: 验证 cached: true 和数据正确性
  });
  
  it('should perform real-time analysis when forceRefresh=true', async () => {
    // 测试实时计算逻辑
  });
  
  it('should throw NotFoundException when stock not found', async () => {
    // 测试股票不存在的错误处理
  });
  
  it('should throw BadRequestException when K-line data insufficient', async () => {
    // 测试K线数据不足的错误处理
  });
});
```

**Run Tests** (应该全部失败 - Red):
```bash
npm run test:watch vcp.service.spec
```

#### Step 1.2: Implement Backend Code

```bash
# 创建实现文件
touch src/modules/vcp/dto/generate-vcp-analysis.dto.ts
touch src/modules/vcp/dto/vcp-analysis-response.dto.ts
touch src/services/vcp/vcp-formatter.service.ts
touch src/scripts/generate-vcp-analysis.ts
```

**Implementation Order**:
1. DTO 定义 (`generate-vcp-analysis.dto.ts`, `vcp-analysis-response.dto.ts`)
2. Formatter Service (`vcp-formatter.service.ts`)
3. VcpService 扩展 (`vcp.service.ts` - 添加 `generateAnalysis()` 方法)
4. Controller 扩展 (`vcp.controller.ts` - 添加新的路由)
5. 命令行脚本 (`generate-vcp-analysis.ts`)

**Run Tests** (应该全部通过 - Green):
```bash
npm run test
```

#### Step 1.3: Verify API Manually

```bash
# 启动后端服务
npm run start:dev

# 测试API（使用curl或Postman）
curl http://localhost:3000/api/vcp/605117/analysis

# 查看Swagger文档
open http://localhost:3000/api-docs
```

---

### Phase 2: Frontend Implementation (TDD)

#### Step 2.1: Write Tests First

```bash
cd frontend

# 创建测试文件
touch src/components/VcpGenerateButton/index.test.tsx
touch src/components/ContractionList/index.test.tsx
touch src/components/PullbackList/index.test.tsx
touch src/components/KLineDataTable/index.test.tsx
touch src/pages/VcpAnalysisPage.test.tsx
touch test/integration/vcp-analysis-flow.test.tsx
```

**Test Structure**:
```typescript
// src/components/VcpGenerateButton/index.test.tsx
describe('VcpGenerateButton', () => {
  it('should render button with correct text', () => {
    // 测试按钮渲染
  });
  
  it('should call onClick when clicked', () => {
    // 测试点击事件
  });
  
  it('should show loading state when generating', () => {
    // 测试loading状态
  });
});
```

**Run Tests** (应该全部失败 - Red):
```bash
npm run test:watch
```

#### Step 2.2: Implement Frontend Code

```bash
# 创建组件文件
mkdir -p src/components/VcpGenerateButton
mkdir -p src/components/ContractionList
mkdir -p src/components/PullbackList
mkdir -p src/components/KLineDataTable
touch src/pages/VcpAnalysisPage.tsx
```

**Implementation Order**:
1. 类型定义扩展 (`src/types/vcp.ts`)
2. Service 扩展 (`src/services/vcp.service.ts`)
3. Hooks (`src/hooks/useVcpAnalysis.ts`)
4. Presentation 组件 (按钮、列表、表格)
5. Container 页面 (`VcpAnalysisPage.tsx`)
6. 路由配置 (`src/App.tsx`)
7. K线图页面集成 (`KLineChartPage.tsx`)

**Run Tests** (应该全部通过 - Green):
```bash
npm run test
```

#### Step 2.3: Verify UI Manually

```bash
# 启动前端服务
npm run dev

# 浏览器访问
# 1. 打开 http://localhost:5173/chart/605117
# 2. 点击"生成VCP分析"按钮
# 3. 查看新打开的分析报告页面
```

---

### Phase 3: Command-Line Script

#### Step 3.1: Implement Script

```bash
cd backend

# 创建脚本文件
touch src/scripts/generate-vcp-analysis.ts
```

**Script Template**:
```typescript
// src/scripts/generate-vcp-analysis.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VcpService } from '../modules/vcp/vcp.service';
import { VcpFormatterService } from '../services/vcp/vcp-formatter.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vcpService = app.get(VcpService);
  const formatter = app.get(VcpFormatterService);
  
  const stockCode = process.argv[2];
  if (!stockCode) {
    console.error('用法: npm run generate-vcp-analysis <股票代码>');
    process.exit(1);
  }
  
  console.log(`\n正在生成 ${stockCode} 的VCP分析报告...\n`);
  
  try {
    const analysis = await vcpService.generateAnalysis(stockCode);
    const report = formatter.formatToText(analysis);
    console.log(report);
  } catch (error) {
    console.error(`\n❌ 生成失败: ${error.message}\n`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
```

#### Step 3.2: Add npm Script

```json
// backend/package.json
{
  "scripts": {
    "generate-vcp-analysis": "ts-node src/scripts/generate-vcp-analysis.ts"
  }
}
```

#### Step 3.3: Test Script

```bash
cd backend
nvm use 20

# 测试脚本
npm run generate-vcp-analysis 605117

# 应该输出格式化的中文VCP分析报告
```

---

## Testing Guide

### Unit Tests

```bash
# 后端单元测试
cd backend
npm run test

# 前端单元测试
cd frontend
npm run test

# 监视模式（开发时使用）
npm run test:watch
```

### Integration Tests

```bash
# 后端集成测试（需要数据库）
cd backend
npm run test:e2e

# 前端集成测试
cd frontend
npm run test:integration
```

### Manual Testing Checklist

#### Backend API Testing

- [ ] 调用 `/api/vcp/:stockCode/analysis` 返回缓存数据
- [ ] 调用 `/api/vcp/:stockCode/analysis?forceRefresh=true` 返回实时数据
- [ ] 查询不存在的股票返回404错误
- [ ] 查询K线数据不足的股票返回400错误
- [ ] 响应时间 < 3秒（实时计算）
- [ ] 响应时间 < 500ms（缓存数据）

#### Frontend UI Testing

- [ ] K线图页面显示"生成VCP分析"按钮
- [ ] 点击按钮显示loading状态
- [ ] 生成完成后自动打开新页面
- [ ] 新页面正确显示所有VCP分析数据（摘要、收缩、回调、K线）
- [ ] 过期数据显示警告标识
- [ ] 所有文本使用中文
- [ ] 数值格式符合中国用户习惯（百分比、千位分隔符、成交量"手"）
- [ ] 涨跌幅颜色正确（涨绿跌红）

#### Command-Line Script Testing

- [ ] 命令 `npm run generate-vcp-analysis 605117` 输出格式化报告
- [ ] 报告包含所有必要部分（收缩、回调、K线、趋势模板）
- [ ] 查询不存在的股票显示错误提示
- [ ] 输出文本使用中文
- [ ] 表格对齐正确，易于阅读

---

## Common Issues & Solutions

### Issue 1: Backend 启动失败 - Node版本不对

**Symptom**:
```
Error: The module '...' was compiled against a different Node.js version
```

**Solution**:
```bash
cd backend
nvm use 20
rm -rf node_modules package-lock.json
npm install
npm run start:dev
```

---

### Issue 2: Prisma Client 未生成

**Symptom**:
```
Error: Cannot find module '@prisma/client'
```

**Solution**:
```bash
cd backend
npx prisma generate
```

---

### Issue 3: K线数据不足导致分析失败

**Symptom**:
API返回400错误："该股票暂无足够的K线数据进行VCP分析"

**Solution**:
```bash
# 检查数据库中的K线数据
cd backend
npx prisma studio

# 如果数据不足，运行数据同步脚本（假设有）
npm run sync-kline-data
```

---

### Issue 4: 前端请求跨域错误

**Symptom**:
```
CORS error: No 'Access-Control-Allow-Origin' header is present
```

**Solution**:
```bash
# 检查 backend/src/main.ts 是否启用了CORS
# 应该有这行代码：
# app.enableCors();

# 或在前端配置代理（vite.config.ts）
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

---

### Issue 5: 测试失败 - Mock数据问题

**Symptom**:
测试运行时找不到数据库或服务依赖

**Solution**:
```typescript
// 在测试文件中正确mock服务
const mockVcpService = {
  generateAnalysis: jest.fn().mockResolvedValue(mockAnalysisData),
};

const module = await Test.createTestingModule({
  providers: [
    { provide: VcpService, useValue: mockVcpService },
  ],
}).compile();
```

---

## Development Best Practices

### 1. Always Write Tests First (TDD)

```bash
# ✅ Correct workflow
1. Write test → 2. Run test (fail) → 3. Implement → 4. Run test (pass) → 5. Refactor

# ❌ Wrong workflow
1. Implement → 2. Write test (as afterthought)
```

### 2. Use TypeScript Strictly

```typescript
// ✅ Good: 明确类型
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ❌ Bad: 使用 any
function formatPercent(value: any): any {
  return `${value.toFixed(2)}%`;
}
```

### 3. Component Reusability

```typescript
// ✅ Good: 可复用的Presentation组件
interface ContractionListProps {
  contractions: Contraction[];
  onItemClick?: (index: number) => void;
}

export function ContractionList({ contractions, onItemClick }: ContractionListProps) {
  // 纯UI组件，无业务逻辑
}

// ❌ Bad: 在组件内部直接调用API
export function ContractionList() {
  const { data } = useQuery(...); // 混合了数据获取逻辑
}
```

### 4. Error Handling

```typescript
// ✅ Good: 明确的错误类型和消息
try {
  const analysis = await vcpService.generateAnalysis(stockCode);
} catch (error) {
  if (error instanceof NotFoundException) {
    throw new HttpException(`未找到股票代码 ${stockCode}`, 404);
  } else if (error instanceof BadRequestException) {
    throw new HttpException('K线数据不足', 400);
  } else {
    logger.error('VCP分析失败', error);
    throw new HttpException('VCP分析失败，请稍后重试', 500);
  }
}
```

### 5. Logging

```typescript
// ✅ Good: 结构化日志
this.logger.log({
  action: 'vcp_analysis_generated',
  stockCode,
  cached,
  durationMs: Date.now() - startTime,
});

// ❌ Bad: 非结构化日志
this.logger.log(`Generated VCP analysis for ${stockCode}`);
```

---

## Performance Optimization Tips

### 1. Use Caching Effectively

```typescript
// 优先使用缓存
const analysis = await this.generateAnalysis(stockCode, forceRefresh = false);

// 只在用户明确要求时实时计算
const freshAnalysis = await this.generateAnalysis(stockCode, forceRefresh = true);
```

### 2. Lazy Load Components

```typescript
// 在 App.tsx 中懒加载 VCP 分析页面
const VcpAnalysisPage = lazy(() => import('./pages/VcpAnalysisPage'));

<Route 
  path="/vcp-analysis/:stockCode" 
  element={<Suspense fallback={<Spin />}><VcpAnalysisPage /></Suspense>} 
/>
```

### 3. Limit K-Line Data

```typescript
// 默认只返回最近10天K线数据
const recentKLines = klines.slice(-10);

// 如果需要更多，通过参数控制
const recentKLines = klines.slice(-(options.klineCount || 10));
```

---

## Next Steps

完成此快速指南后，你应该能够：

- ✅ 设置开发环境并启动服务
- ✅ 理解TDD开发流程
- ✅ 实现后端API和前端UI
- ✅ 运行测试并验证功能
- ✅ 解决常见问题

**接下来**:
1. 阅读 `tasks.md`（由 `/speckit.tasks` 命令生成）
2. 按照任务清单逐步实现功能
3. 提交代码并创建Pull Request

---

## Useful Commands Reference

```bash
# 后端相关
cd backend && nvm use 20
npm run start:dev          # 启动开发服务器
npm run test              # 运行单元测试
npm run test:e2e          # 运行集成测试
npx prisma studio         # 打开数据库管理界面
npx prisma generate       # 生成Prisma Client

# 前端相关
cd frontend
npm run dev               # 启动开发服务器
npm run test              # 运行单元测试
npm run build             # 构建生产版本
npm run lint              # 检查代码风格

# 命令行脚本
cd backend && nvm use 20
npm run generate-vcp-analysis 605117  # 生成VCP分析报告
```

---

## Resources

- **Spec**: `specs/004-stock-vcp-analysis/spec.md`
- **Plan**: `specs/004-stock-vcp-analysis/plan.md`
- **Research**: `specs/004-stock-vcp-analysis/research.md`
- **Data Model**: `specs/004-stock-vcp-analysis/data-model.md`
- **API Contract**: `specs/004-stock-vcp-analysis/contracts/vcp-analysis-api.md`
- **Project README**: `README.md`
- **Backend README**: `backend/README.md`
- **Constitution**: `.specify/memory/constitution.md`

---

**Happy Coding! 🚀**
