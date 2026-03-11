# 后端快速启动指南

## ⚠️ 重要：必须使用 Node 20

### 方法 1: 使用自动启动脚本（最简单）

```bash
cd /Users/youxingzhi/ayou/money-free/backend
./start-backend.sh
```

### 方法 2: 使用 nvm

```bash
cd /Users/youxingzhi/ayou/money-free/backend
nvm use 20
node --version  # 验证版本，应该显示 v20.x.x
npm run start:dev
```

### 方法 3: 手动设置 PATH（AI 运行时使用）

**验证 Node 版本：**
```bash
cd /Users/youxingzhi/ayou/money-free/backend && PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" && node --version && npm --version
```

**启动服务器：**
```bash
cd /Users/youxingzhi/ayou/money-free/backend && PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" npm run start:dev
```

## 常见问题

### 如果遇到 Prisma 错误

```bash
# 清理并重新生成
rm -rf node_modules/.prisma
npx prisma generate
npm run start:dev
```

### 如果端口 3000 被占用

```bash
# 杀死占用端口的进程
lsof -ti:3000 | xargs kill -9
```

## 一键启动脚本

将以下内容保存为 `start-backend.sh`:

```bash
#!/bin/bash

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 切换到 Node 20
nvm use 20

# 启动服务器
cd "$(dirname "$0")"
npm run start:dev
```

然后运行:
```bash
chmod +x start-backend.sh
./start-backend.sh
```

## 服务地址

- 后端服务: http://localhost:3000
- API 文档: http://localhost:3000/api-docs
- 数据库文件: `../data/stocks.db`

## 更多信息

详细文档请查看: [README.md](./README.md)
