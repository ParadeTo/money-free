#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
获取美股K线数据
使用Yahoo Finance获取美股的历史K线数据（自动复权）

输入 JSON: {"symbol": "AAPL", "start_date": "2016-01-01", "end_date": "2026-01-01"}
输出 JSON: {"success": true, "data": [{"date": "2016-01-04", "open": 25.65, ...}]}
"""

import sys
import json
import traceback
import yfinance as yf
from typing import List, Dict, Any


def fetch_us_klines(symbol: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """
    获取美股K线数据
    
    Args:
        symbol: 美股代码（如"AAPL"）
        start_date: 开始日期 (YYYY-MM-DD)
        end_date: 结束日期 (YYYY-MM-DD)
        
    Returns:
        K线数据列表
    """
    try:
        symbol_upper = symbol.upper()
        ticker = yf.Ticker(symbol_upper)
        df = ticker.history(start=start_date, end=end_date, auto_adjust=True)
        
        if df.empty:
            return []
        
        klines = []
        for date, row in df.iterrows():
            try:
                date_str = date.strftime('%Y-%m-%d')
                open_price = float(row['Open'])
                high_price = float(row['High'])
                low_price = float(row['Low'])
                close_price = float(row['Close'])
                volume = float(row['Volume'])
                amount = close_price * volume
                
                if open_price <= 0 or close_price <= 0:
                    continue
                
                klines.append({
                    'date': date_str,
                    'open': round(open_price, 2),
                    'high': round(high_price, 2),
                    'low': round(low_price, 2),
                    'close': round(close_price, 2),
                    'volume': int(volume),
                    'amount': round(amount, 2)
                })
            except (ValueError, KeyError):
                continue
        
        return klines
        
    except Exception as e:
        raise Exception(f"Failed to fetch US K-lines for {symbol}: {str(e)}")


def process_request(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """处理请求"""
    try:
        symbol = input_data.get('symbol')
        start_date = input_data.get('start_date')
        end_date = input_data.get('end_date')
        
        if not symbol:
            raise ValueError('Missing required parameter: symbol')
        if not start_date:
            raise ValueError('Missing required parameter: start_date')
        if not end_date:
            raise ValueError('Missing required parameter: end_date')
        
        klines = fetch_us_klines(symbol, start_date, end_date)
        
        return {
            'success': True,
            'data': klines,
            'error': None,
            'count': len(klines)
        }
        
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        return {
            'success': False,
            'data': None,
            'error': error_msg,
            'traceback': traceback.format_exc()
        }


if __name__ == "__main__":
    try:
        input_json = sys.stdin.read()
        input_data = json.loads(input_json) if input_json else {}
        
        result = process_request(input_data)
        
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'data': None,
            'error': f'Top-level error: {str(e)}',
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
