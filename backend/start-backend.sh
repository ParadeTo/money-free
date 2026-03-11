#!/bin/bash

# Backend Start Script - 使用 Node 20 启动后端服务

echo "🚀 Starting money-free backend..."

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "📦 Loading nvm..."
    \. "$NVM_DIR/nvm.sh"
else
    echo "❌ nvm not found. Please install nvm first."
    exit 1
fi

# 切换到 Node 20
echo "🔄 Switching to Node 20..."
nvm use 20

if [ $? -ne 0 ]; then
    echo "❌ Failed to switch to Node 20. Please install it first:"
    echo "   nvm install 20"
    exit 1
fi

# 显示版本
echo "✅ Node version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 检查 Prisma Client 是否已生成
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Generating Prisma Client..."
    npx prisma generate
fi

# 启动服务器
echo "🎯 Starting development server..."
echo "📍 Backend: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api-docs"
echo ""
npm run start:dev
