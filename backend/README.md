# Backend Development Guide

## 环境要求

### Node.js 版本

**重要**: 本项目后端必须使用 **Node.js 20.x** 版本运行。

使用 nvm 切换到 Node 20:
```bash
nvm use 20
# 或直接指定版本
nvm use 20.19.5
```

验证 Node 版本:
```bash
node --version  # 应显示 v20.x.x
```

### 为什么需要 Node 20？

- Prisma Client 在 Node 18 下可能出现兼容性问题
- 项目依赖需要 Node 20 的特性支持
- 确保最佳性能和稳定性

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 生成 Prisma Client

```bash
npx prisma generate
```

### 3. 同步数据库 Schema

```bash
npx prisma db push
```

### 4. 启动开发服务器

**方法 1: 使用自动启动脚本（推荐）**:
```bash
cd /Users/youxingzhi/ayou/money-free/backend
./start-backend.sh
```

**方法 2: 使用 nvm**:
```bash
cd /Users/youxingzhi/ayou/money-free/backend
nvm use 20
npm run start:dev
```

**方法 3: 手动指定 PATH（适用于 AI 运行）**:
```bash
cd /Users/youxingzhi/ayou/money-free/backend && PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" && node --version && npm --version
```

然后启动服务：
```bash
PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" npm run start:dev
```

或者一条命令完成（AI 运行时使用）：
```bash
cd /Users/youxingzhi/ayou/money-free/backend && PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" npm run start:dev
```

服务器将运行在: http://localhost:3000

API 文档: http://localhost:3000/api-docs

## 常用命令

### 开发

```bash
npm run start:dev      # 启动开发服务器 (热重载)
npm run build          # 构建生产版本
npm run start:prod     # 启动生产服务器
```

### 数据库

```bash
npx prisma studio      # 打开数据库可视化界面
npx prisma db push     # 同步 schema 到数据库
npx prisma generate    # 重新生成 Prisma Client
npx prisma format      # 格式化 schema 文件
```

### 数据脚本

```bash
npm run calculate-vcp  # 计算 VCP 形态
npm run seed           # 数据初始化
```

查看更多脚本命令: `package.json` 中的 `scripts` 部分

## 项目结构

```
backend/
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── src/
│   ├── modules/              # 业务模块
│   │   ├── vcp/             # VCP 选股功能
│   │   ├── prisma/          # Prisma 服务
│   │   └── ...
│   ├── services/            # 业务服务
│   │   ├── vcp/            # VCP 分析服务
│   │   ├── datasource/     # 数据源服务
│   │   └── ...
│   ├── scripts/            # 数据处理脚本
│   └── main.ts            # 应用入口
├── data/
│   └── stocks.db          # SQLite 数据库文件
└── README.md
```

## 故障排查

### Prisma Client 错误

如果遇到 Prisma Client 相关错误:

1. 确认使用 Node 20:
   ```bash
   node --version
   ```

2. 清理并重新生成:
   ```bash
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

3. 重启开发服务器:
   ```bash
   npm run start:dev
   ```

### 端口被占用

如果 3000 端口被占用:

```bash
# 查找占用进程
lsof -ti:3000

# 杀死进程
lsof -ti:3000 | xargs kill -9
```

## 相关文档

- [并行数据获取实现](./PARALLEL_IMPLEMENTATION.md)
- [增量更新指南](./INCREMENTAL_UPDATE_GUIDE.md)
- [数据更新指南](./DATA_UPDATE_GUIDE.md)
- [数据状态](./DATA_STATUS.md)

## API 文档

启动服务器后访问 Swagger 文档:
http://localhost:3000/api-docs

## 技术栈

- **Runtime**: Node.js 20.x
- **Framework**: NestJS
- **Database**: SQLite (Prisma ORM)
- **Language**: TypeScript
- **API Docs**: Swagger/OpenAPI
