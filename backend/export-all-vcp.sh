#!/bin/bash

# Export all VCP pattern stocks to Markdown document
# 导出所有VCP形态股票到Markdown文档

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 20

npm run export-all-vcp
