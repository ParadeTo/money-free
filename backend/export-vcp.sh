#!/bin/bash

# VCP 选股列表导出脚本
# 使用 Node.js 20

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 切换到 Node 20
nvm use 20

# 运行导出脚本
npm run export-vcp
