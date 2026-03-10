#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
AkShare 数据获取脚本
使用 AkShare 获取股票数据 (Tushare 的备用数据源)

输入 JSON 格式:
{
  "stock_code": "600519",
  "start_date": "20240101",
  "end_date": "20241231",
  "period": "daily"  // "daily" or "weekly"
}

输出 JSON 格式:
{
  "data": [
    {
      "date": "2024-01-02",
      "open": 1650.5,
      "high": 1680.0,
      "low": 1640.0,
      "close": 1670.0,
      "volume": 12000000,
      "amount": 20000000000
    },
    ...
  ]
}
"""

import sys
import json
import akshare as ak
import pandas as pd
from datetime import datetime

def fetch_stock_data(stock_code, start_date, end_date, period="daily"):
    """
    使用 AkShare 获取股票数据
    
    Args:
        stock_code: 股票代码 (例如: "600519")
        start_date: 开始日期 (格式: "20240101")
        end_date: 结束日期 (格式: "20241231")
        period: 周期 ("daily" 或 "weekly")
    
    Returns:
        dict: 包含股票数据的字典
    """
    try:
        # 转换股票代码格式 (AkShare 使用 sh/sz 前缀)
        if stock_code.startswith('6'):
            symbol = f"sh{stock_code}"
        else:
            symbol = f"sz{stock_code}"
        
        # 转换日期格式 (YYYYMMDD -> YYYY-MM-DD)
        start_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y%m%d")
        end_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y%m%d")
        
        # 获取股票数据
        if period == "daily":
            # 获取日线数据
            df = ak.stock_zh_a_hist(
                symbol=symbol,
                period="daily",
                start_date=start_date,
                end_date=end_date,
                adjust="qfq"  # 前复权
            )
        elif period == "weekly":
            # 获取周线数据
            df = ak.stock_zh_a_hist(
                symbol=symbol,
                period="weekly",
                start_date=start_date,
                end_date=end_date,
                adjust="qfq"  # 前复权
            )
        else:
            raise ValueError(f"Invalid period: {period}")
        
        # 如果没有数据，返回空列表
        if df is None or len(df) == 0:
            return {"data": []}
        
        # 转换列名 (AkShare 的列名为中文)
        df = df.rename(columns={
            '日期': 'date',
            '开盘': 'open',
            '最高': 'high',
            '最低': 'low',
            '收盘': 'close',
            '成交量': 'volume',
            '成交额': 'amount',
        })
        
        # 选择需要的列
        df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'amount']]
        
        # 转换日期格式
        df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
        
        # 转换数据类型
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)
        df['amount'] = df['amount'].astype(float)
        
        # 转换为字典列表
        data = df.to_dict('records')
        
        return {
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise ValueError(f"AkShare fetch error: {str(e)}")

if __name__ == "__main__":
    try:
        # 读取输入 JSON
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        # 提取参数
        stock_code = data.get("stock_code")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        period = data.get("period", "daily")
        
        # 验证输入
        if not stock_code or not start_date or not end_date:
            raise ValueError("Missing required fields: stock_code, start_date, end_date")
        
        # 获取数据
        result = fetch_stock_data(stock_code, start_date, end_date, period)
        
        # 输出 JSON 结果
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_result = {
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
