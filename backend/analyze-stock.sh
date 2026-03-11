#!/bin/bash

# VCP 单股分析脚本
# 使用 Node.js 20

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 切换到 Node 20
nvm use 20

# 运行脚本，传递参数
npm run analyze-stock -- "$@"
