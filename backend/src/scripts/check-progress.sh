#!/bin/bash

# 实时监控数据初始化进度
# 
# 使用:
# chmod +x src/scripts/check-progress.sh
# ./src/scripts/check-progress.sh

echo "======================================"
echo "📊 数据初始化进度监控"
echo "======================================"
echo ""

# 获取统计数据
TOTAL_STOCKS=$(sqlite3 ../data/stocks.db "SELECT COUNT(*) FROM stocks;")
PROCESSED_STOCKS=$(sqlite3 ../data/stocks.db "SELECT COUNT(DISTINCT stock_code) FROM kline_data;")
TOTAL_KLINES=$(sqlite3 ../data/stocks.db "SELECT COUNT(*) FROM kline_data;")
DAILY_KLINES=$(sqlite3 ../data/stocks.db "SELECT COUNT(*) FROM kline_data WHERE period = 'daily';")
WEEKLY_KLINES=$(sqlite3 ../data/stocks.db "SELECT COUNT(*) FROM kline_data WHERE period = 'weekly';")
TOTAL_INDICATORS=$(sqlite3 ../data/stocks.db "SELECT COUNT(*) FROM technical_indicators;")

# 计算进度
REMAINING=$((TOTAL_STOCKS - PROCESSED_STOCKS))
PROGRESS=$(echo "scale=1; $PROCESSED_STOCKS * 100 / $TOTAL_STOCKS" | bc)

echo "股票进度:"
echo "  总数: $TOTAL_STOCKS 只"
echo "  已处理: $PROCESSED_STOCKS 只"
echo "  待处理: $REMAINING 只"
echo "  完成度: $PROGRESS%"
echo ""

echo "数据统计:"
echo "  K线数据: $TOTAL_KLINES 条"
echo "    - 日线: $DAILY_KLINES 条"
echo "    - 周线: $WEEKLY_KLINES 条"
echo "  技术指标: $TOTAL_INDICATORS 条"
echo ""

# 预估剩余时间（假设 32只/分钟）
if [ $REMAINING -gt 0 ]; then
    REMAINING_MINUTES=$(echo "scale=0; $REMAINING / 32" | bc)
    REMAINING_HOURS=$(echo "scale=1; $REMAINING_MINUTES / 60" | bc)
    echo "预估剩余时间: ${REMAINING_HOURS} 小时 (约 ${REMAINING_MINUTES} 分钟)"
else
    echo "✅ 所有股票处理完成！"
fi

echo ""
echo "当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
