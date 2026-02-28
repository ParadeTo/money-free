#!/bin/bash

# 批量初始化所有股票K线数据的自动化脚本
# 
# 功能:
# - 自动分批处理所有股票
# - 避免API限流
# - 显示总体进度
# - 记录处理日志
#
# 使用:
# chmod +x src/scripts/batch-init-all-klines.sh
# ./src/scripts/batch-init-all-klines.sh

set -e  # 遇到错误立即退出

# 配置参数
TOTAL_STOCKS=3665          # 总股票数量
ALREADY_PROCESSED=100      # 已处理的股票数量
BATCH_SIZE=500             # 每批处理数量
PAUSE_BETWEEN_BATCHES=30   # 批次间暂停秒数（避免API限流）

# 计算需要处理的批次
REMAINING=$((TOTAL_STOCKS - ALREADY_PROCESSED))
BATCHES=$(((REMAINING + BATCH_SIZE - 1) / BATCH_SIZE))

echo "======================================"
echo "📊 批量初始化K线数据"
echo "======================================"
echo ""
echo "总股票数: $TOTAL_STOCKS"
echo "已处理: $ALREADY_PROCESSED"
echo "待处理: $REMAINING"
echo "批次大小: $BATCH_SIZE"
echo "预计批次: $BATCHES"
echo ""
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 记录日志
LOG_FILE="logs/batch-init-$(date +%Y%m%d-%H%M%S).log"
mkdir -p logs

echo "日志文件: $LOG_FILE"
echo ""

# 执行批次处理
CURRENT_OFFSET=$ALREADY_PROCESSED
BATCH_NUM=1
SUCCESS_COUNT=0
FAILED_COUNT=0

while [ $CURRENT_OFFSET -lt $TOTAL_STOCKS ]; do
    # 计算当前批次大小
    CURRENT_BATCH_SIZE=$BATCH_SIZE
    if [ $((CURRENT_OFFSET + BATCH_SIZE)) -gt $TOTAL_STOCKS ]; then
        CURRENT_BATCH_SIZE=$((TOTAL_STOCKS - CURRENT_OFFSET))
    fi
    
    echo "======================================"
    echo "📦 批次 $BATCH_NUM/$BATCHES"
    echo "======================================"
    echo "范围: $((CURRENT_OFFSET + 1)) - $((CURRENT_OFFSET + CURRENT_BATCH_SIZE))"
    echo "开始时间: $(date '+%H:%M:%S')"
    echo ""
    
    # 执行脚本
    if npx ts-node src/scripts/fetch-batch-klines.ts $CURRENT_BATCH_SIZE $CURRENT_OFFSET 2>&1 | tee -a "$LOG_FILE"; then
        echo ""
        echo "✅ 批次 $BATCH_NUM 完成"
        SUCCESS_COUNT=$((SUCCESS_COUNT + CURRENT_BATCH_SIZE))
    else
        echo ""
        echo "❌ 批次 $BATCH_NUM 失败"
        FAILED_COUNT=$((FAILED_COUNT + CURRENT_BATCH_SIZE))
        
        # 询问是否继续
        read -p "是否继续下一批次? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            echo "用户中止处理"
            break
        fi
    fi
    
    # 更新偏移量
    CURRENT_OFFSET=$((CURRENT_OFFSET + CURRENT_BATCH_SIZE))
    BATCH_NUM=$((BATCH_NUM + 1))
    
    # 如果还有下一批次，暂停一段时间
    if [ $CURRENT_OFFSET -lt $TOTAL_STOCKS ]; then
        echo ""
        echo "⏸️  暂停 $PAUSE_BETWEEN_BATCHES 秒以避免API限流..."
        echo "   (按 Ctrl+C 可以随时中止)"
        sleep $PAUSE_BETWEEN_BATCHES
        echo ""
    fi
done

# 最终统计
echo ""
echo "======================================"
echo "🎉 批量处理完成！"
echo "======================================"
echo ""
echo "总股票数: $TOTAL_STOCKS"
echo "已处理: $((ALREADY_PROCESSED + SUCCESS_COUNT))"
echo "成功: $SUCCESS_COUNT"
echo "失败: $FAILED_COUNT"
echo ""
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "日志文件: $LOG_FILE"
echo ""

# 显示数据库统计
echo "======================================"
echo "📊 数据库统计"
echo "======================================"
echo ""
echo "股票数量:"
sqlite3 ../data/stocks.db "SELECT COUNT(*) || ' 只' FROM stocks;"
echo ""
echo "K线数据:"
sqlite3 ../data/stocks.db "SELECT COUNT(*) || ' 条' FROM kline_data;"
sqlite3 ../data/stocks.db "SELECT '  日线: ' || COUNT(*) || ' 条' FROM kline_data WHERE period = 'daily';"
sqlite3 ../data/stocks.db "SELECT '  周线: ' || COUNT(*) || ' 条' FROM kline_data WHERE period = 'weekly';"
echo ""
echo "技术指标:"
sqlite3 ../data/stocks.db "SELECT COUNT(*) || ' 条' FROM technical_indicators;"
echo ""
echo "✨ 数据初始化完成！可以启动应用进行测试了。"
echo ""
