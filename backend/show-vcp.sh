#!/bin/bash

# VCP 选股（有回调）输出脚本
# 使用 Node.js 20

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 切换到 Node 20
nvm use 20

# 运行脚本
npm run show-vcp-pullback
