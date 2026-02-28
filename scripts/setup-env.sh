#!/bin/bash
# 开发环境设置脚本
# 用途：确保使用正确的 Node.js 版本并安装依赖

set -e  # 遇到错误立即退出

echo "🔧 Money-Free 开发环境设置"
echo "=============================="

# 检测 nvm 是否安装
if [ ! -d "$HOME/.nvm" ]; then
  echo "❌ 错误: 未检测到 nvm"
  echo "请先安装 nvm: https://github.com/nvm-sh/nvm"
  exit 1
fi

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo ""
echo "📦 检查 Node.js 版本..."

# 检查是否安装了 Node.js 20
if [ ! -d "$HOME/.nvm/versions/node/v20.19.5" ]; then
  echo "⚠️  Node.js 20.19.5 未安装"
  echo "正在安装 Node.js 20..."
  nvm install 20.19.5
else
  echo "✅ Node.js 20.19.5 已安装"
fi

# 切换到 Node.js 20
echo "🔄 切换到 Node.js 20.19.5..."
nvm use 20.19.5

# 验证版本
echo ""
echo "✅ 当前 Node.js 版本: $(node --version)"
echo "✅ 当前 npm 版本: $(npm --version)"

# 检查 pnpm
echo ""
echo "📦 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
  echo "⚠️  pnpm 未安装"
  echo "正在安装 pnpm@9.6.0..."
  npm install -g pnpm@9.6.0
else
  echo "✅ pnpm 版本: $(pnpm --version)"
fi

# 检查 Python
echo ""
echo "🐍 检查 Python 环境..."
if command -v python3.11 &> /dev/null; then
  echo "✅ Python 3.11 版本: $(python3.11 --version)"
else
  echo "⚠️  Python 3.11 未安装"
  echo "请安装 Python 3.11:"
  echo "  brew install python@3.11"
fi

# 安装依赖
echo ""
echo "📚 安装项目依赖..."
pnpm install

# 生成 Prisma Client
echo ""
echo "🔨 生成 Prisma Client..."
cd backend
pnpm prisma generate
cd ..

# 设置 Python 环境（如果存在）
if command -v python3.11 &> /dev/null; then
  echo ""
  echo "🐍 设置 Python Bridge 环境..."
  cd bridge
  
  if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3.11 -m venv venv
  fi
  
  echo "激活虚拟环境并安装依赖..."
  source venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  deactivate
  
  cd ..
  echo "✅ Python 环境设置完成"
fi

echo ""
echo "=============================="
echo "🎉 环境设置完成！"
echo ""
echo "下一步："
echo "  1. 启动 backend:  pnpm --filter backend dev"
echo "  2. 启动 frontend: pnpm --filter frontend dev"
echo "  3. 或者同时启动:   pnpm dev"
echo ""
echo "更多信息请查看 README.md"
