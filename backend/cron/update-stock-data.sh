#!/bin/bash

# 股票数据增量更新定时任务脚本
# 
# 功能:
# 1. 每日更新A股、港股、美股K线数据
# 2. 记录更新日志
# 3. 失败时发送通知（可选）
#
# 使用:
# 1. 添加到crontab: crontab -e
# 2. 添加以下行（每天早上6点执行）:
#    0 6 * * * /path/to/money-free/backend/cron/update-stock-data.sh >> /path/to/logs/update.log 2>&1
#
# 或使用 pm2-cron:
#    pm2 start update-stock-data.sh --cron "0 6 * * *" --no-autorestart

# 错误时退出
set -e

# 配置
PROJECT_DIR="/Users/youxingzhi/ayou/money-free/backend"
NODE_VERSION="20.19.5"
NODE_PATH="/Users/youxingzhi/.nvm/versions/node/v$NODE_VERSION/bin"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/incremental-update-$(date +%Y%m%d).log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 错误处理
error() {
  log "❌ ERROR: $1"
  # 可选：发送通知（邮件、企业微信等）
  # send_notification "Stock data update failed: $1"
  exit 1
}

# 开始更新
log "========================================="
log "🚀 Starting stock data incremental update"
log "========================================="

cd "$PROJECT_DIR" || error "Failed to change directory to $PROJECT_DIR"

# 设置Node.js环境
export PATH="$NODE_PATH:$PATH"

# 检查Node版本
NODE_ACTUAL=$(node --version)
log "Node version: $NODE_ACTUAL"

# 1. 更新A股数据
log "\n📊 Step 1: Updating A-share data..."
if PATH="$NODE_PATH:$PATH" npx ts-node src/scripts/incremental-update-latest.ts; then
  log "✅ A-share data updated successfully"
else
  error "Failed to update A-share data"
fi

# 2. 更新港股数据
log "\n📊 Step 2: Updating HK stocks data..."
if PATH="$NODE_PATH:$PATH" npm run update-hk; then
  log "✅ HK stocks data updated successfully"
else
  log "⚠️ Warning: Failed to update HK stocks data (non-critical)"
fi

# 3. 更新美股数据
log "\n📊 Step 3: Updating US stocks data..."
if PATH="$NODE_PATH:$PATH" npm run update-us; then
  log "✅ US stocks data updated successfully"
else
  log "⚠️ Warning: Failed to update US stocks data (non-critical)"
fi

# 4. 重新计算VCP（可选，耗时较长）
# log "\n📊 Step 4: Recalculating VCP patterns..."
# if PATH="$NODE_PATH:$PATH" npm run calculate-vcp:all; then
#   log "✅ VCP patterns recalculated successfully"
# else
#   log "⚠️ Warning: Failed to recalculate VCP patterns (non-critical)"
# fi

# 完成
log "\n========================================="
log "✅ Stock data update completed"
log "========================================="

# 清理旧日志（保留最近7天）
find "$LOG_DIR" -name "incremental-update-*.log" -type f -mtime +7 -delete
log "🧹 Cleaned up old logs (>7 days)"

exit 0
