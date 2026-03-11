# money-free

股票分析工具 - VCP 形态选股系统

## 项目结构

```
money-free/
├── backend/          # 后端服务 (NestJS + Prisma + SQLite)
├── frontend/         # 前端应用 (React + TypeScript + Vite)
└── data/            # SQLite 数据库文件
```

## 快速开始

### 后端 (Backend)

⚠️ **重要**: 后端必须使用 **Node.js 20.x** 版本

```bash
cd backend

# 使用 nvm 切换到 Node 20
nvm use 20

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run start:dev
```

详细说明请查看: [backend/README.md](./backend/README.md)

后端服务: http://localhost:3000  
API 文档: http://localhost:3000/api-docs

### 前端 (Frontend)

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用: http://localhost:5173

## 功能特性

- ✅ VCP (Volatility Contraction Pattern) 形态选股
- ✅ 趋势模板分析 (Mark Minervini 方法)
- ✅ 相对强度 (RS Rating) 计算
- ✅ 收缩和回调检测
- ✅ 52 周高低点跟踪
- ✅ 技术指标计算 (MA, KDJ, RSI 等)
- ✅ K 线数据管理
- ✅ 股票筛选和收藏

## 技术栈

### 后端
- Node.js 20.x
- NestJS
- Prisma ORM
- SQLite
- TypeScript

### 前端
- React 18
- TypeScript
- Vite
- Ant Design
- React Router

## 环境要求

- Node.js 20.x (后端必须)
- Node.js 18+ (前端)
- npm 或 yarn

## 数据源

- Tushare API (股票数据)

## 开发

### 后端开发

```bash
cd backend
nvm use 20
npm run start:dev  # 热重载开发模式
```

### 前端开发

```bash
cd frontend
npm run dev
```

## 相关文档

### 开发指南
- [后端开发指南](./backend/README.md)
- [后端快速启动](./backend/QUICK_START.md)
- [并行数据获取](./backend/PARALLEL_IMPLEMENTATION.md)
- [增量更新指南](./backend/INCREMENTAL_UPDATE_GUIDE.md)
- [数据更新指南](./backend/DATA_UPDATE_GUIDE.md)

### AI 相关
- [AI 运行时命令](./.cursor/rules/ai-runtime-commands.mdc) - AI 执行时必读
- [后端环境要求](./.cursor/rules/backend-environment.mdc)

## License

MIT
