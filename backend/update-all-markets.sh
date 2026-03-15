#!/bin/bash

# 统一增量更新脚本 - A股/港股/美股
# 
# 用法:
#   ./update-all-markets.sh              # 更新所有市场
#   ./update-all-markets.sh --index-only # 只更新指数成分股
#   ./update-all-markets.sh --markets A  # 只更新A股
#   ./update-all-markets.sh --markets HK,US # 只更新港股和美股

echo "=================================="
echo "📊 增量更新 - A股/港股/美股"
echo "=================================="
echo ""

# 确保使用 Node 20
if command -v nvm &> /dev/null; then
  echo "🔧 切换到 Node 20..."
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use 20
  echo ""
fi

# 检查当前 Node 版本
NODE_VERSION=$(node -v)
echo "Node 版本: $NODE_VERSION"
echo ""

# 运行更新脚本
cd "$(dirname "$0")"
npx ts-node src/scripts/incremental-update-all-markets.ts "$@"
