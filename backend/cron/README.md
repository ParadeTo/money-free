# 定时任务配置

本目录包含用于自动更新股票数据的定时任务脚本。

## 脚本列表

### update-stock-data.sh

每日增量更新所有市场（A股、港股、美股）的K线数据。

**功能**:
- 更新A股K线数据
- 更新港股K线数据
- 更新美股K线数据
- 记录详细日志
- 清理旧日志（保留7天）

**执行频率**: 建议每天早上6点（交易日前）

## 配置方法

### 方式 1: 使用 crontab（推荐）

```bash
# 1. 编辑crontab
crontab -e

# 2. 添加以下行（每天早上6点执行）
0 6 * * * /Users/youxingzhi/ayou/money-free/backend/cron/update-stock-data.sh >> /Users/youxingzhi/ayou/money-free/backend/logs/cron.log 2>&1

# 3. 保存并退出
```

### 方式 2: 使用 pm2-cron

```bash
# 安装pm2（如果未安装）
npm install -g pm2

# 启动定时任务
pm2 start /Users/youxingzhi/ayou/money-free/backend/cron/update-stock-data.sh \
  --cron "0 6 * * *" \
  --no-autorestart \
  --name "stock-data-update"

# 查看任务状态
pm2 list

# 查看日志
pm2 logs stock-data-update

# 停止任务
pm2 stop stock-data-update
pm2 delete stock-data-update
```

### 方式 3: 使用 launchd（macOS）

创建文件 `~/Library/LaunchAgents/com.moneyfree.stockupdate.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.moneyfree.stockupdate</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/youxingzhi/ayou/money-free/backend/cron/update-stock-data.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/youxingzhi/ayou/money-free/backend/logs/launchd-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/youxingzhi/ayou/money-free/backend/logs/launchd-stderr.log</string>
</dict>
</plist>
```

然后加载和启动:

```bash
# 加载
launchctl load ~/Library/LaunchAgents/com.moneyfree.stockupdate.plist

# 立即运行测试
launchctl start com.moneyfree.stockupdate

# 查看状态
launchctl list | grep moneyfree

# 卸载
launchctl unload ~/Library/LaunchAgents/com.moneyfree.stockupdate.plist
```

## 日志查看

### 查看今天的更新日志

```bash
tail -f /Users/youxingzhi/ayou/money-free/backend/logs/incremental-update-$(date +%Y%m%d).log
```

### 查看最近的更新日志

```bash
ls -lt /Users/youxingzhi/ayou/money-free/backend/logs/incremental-update-*.log | head -5
```

### 查看失败的更新

```bash
grep "ERROR" /Users/youxingzhi/ayou/money-free/backend/logs/incremental-update-*.log
```

## 执行时间建议

### A股

- **更新时间**: 每天早上 6:00
- **原因**: 交易日数据在前一天15:00收盘后生成，晚上或第二天早上获取

### 港股

- **更新时间**: 每天早上 6:00
- **原因**: 港股16:00收盘，数据在当天晚上或第二天早上可用

### 美股

- **更新时间**: 每天上午 9:00（北京时间）
- **原因**: 美股收盘时间为美东时间16:00（北京时间次日凌晨4:00或5:00），早上9点数据已稳定

### 综合方案

**推荐**: 每天早上 **6:00** 统一更新所有市场

```
0 6 * * * /path/to/update-stock-data.sh
```

理由:
- A股数据已就绪
- 港股数据已就绪
- 美股数据已就绪（前一交易日）
- 避免在服务器高峰时段运行

## 监控与告警

### 添加邮件通知（可选）

修改 `update-stock-data.sh` 中的 `error()` 函数:

```bash
error() {
  log "❌ ERROR: $1"
  
  # 发送邮件
  echo "Stock data update failed: $1" | \
    mail -s "[Money-Free] Stock Update Failed" your-email@example.com
  
  exit 1
}
```

### 添加企业微信通知（可选）

```bash
send_wechat_notification() {
  local message=$1
  curl -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"msgtype\": \"text\", \"text\": {\"content\": \"$message\"}}"
}

error() {
  log "❌ ERROR: $1"
  send_wechat_notification "Stock data update failed: $1"
  exit 1
}
```

## 手动执行

### 测试脚本

```bash
cd /Users/youxingzhi/ayou/money-free/backend
./cron/update-stock-data.sh
```

### 只更新特定市场

```bash
# 只更新港股
PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" \
  npm run update-hk

# 只更新美股
PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" \
  npm run update-us
```

## 故障排查

### 1. 脚本没有执行

**检查 crontab 是否正确配置**:
```bash
crontab -l
```

**检查脚本权限**:
```bash
ls -l /Users/youxingzhi/ayou/money-free/backend/cron/update-stock-data.sh
# 应该显示 -rwxr-xr-x
```

### 2. 脚本执行失败

**查看日志**:
```bash
tail -100 /Users/youxingzhi/ayou/money-free/backend/logs/incremental-update-$(date +%Y%m%d).log
```

**常见错误**:
- `command not found: node`: Node.js路径不正确，检查 `NODE_PATH`
- `Failed to change directory`: `PROJECT_DIR` 路径不正确
- `Failed to update data`: 数据源API问题，检查网络连接

### 3. 定时任务不执行

**macOS 特殊处理**:

macOS Catalina 及以后版本需要授予 cron 完全磁盘访问权限:

1. 打开 "系统偏好设置" > "安全性与隐私" > "隐私"
2. 选择 "完全磁盘访问权限"
3. 点击 "+" 添加 `/usr/sbin/cron`
4. 重启 cron: `sudo launchctl kickstart -k system/com.vix.cron`

## 性能考虑

### 估算执行时间

- A股更新: ~10-15分钟（716只股票）
- 港股更新: ~2-5分钟（5只股票）
- 美股更新: ~2-5分钟（5只股票）
- **总计**: 约 15-25分钟

### 完整数据导入后

- A股更新: ~5-10分钟（只更新增量数据）
- 港股更新: ~2-3分钟（110只股票）
- 美股更新: ~5-8分钟（550只股票）
- **总计**: 约 12-21分钟

## 最佳实践

1. **监控日志**: 定期检查更新日志，确保数据同步正常
2. **备份数据**: 定期备份数据库（尤其在重大更新前）
3. **测试先行**: 修改脚本后先手动测试，再启用定时任务
4. **错误告警**: 配置邮件或企业微信通知，及时发现问题
5. **日志清理**: 脚本已自动清理7天前的日志，保持磁盘空间充足

## 相关文档

- [数据导入指南](../../specs/005-hk-us-stock-data/README.md)
- [增量更新脚本说明](../../specs/005-hk-us-stock-data/PHASE7_COMPLETION.md)
- [系统状态监控](../../specs/005-hk-us-stock-data/FINAL_SUMMARY.md)
