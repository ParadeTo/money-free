#!/bin/bash

# Show all VCP pattern stocks (contraction + pullback)
# 显示所有VCP形态的股票（包括收缩中和回调中的）

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 20

npm run show-all-vcp
