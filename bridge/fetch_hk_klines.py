#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
获取港股K线数据
使用AkShare获取港股的历史K线数据（后复权）

输入 JSON: {"symbol": "00700", "start_date": "2016-01-01", "end_date": "2026-01-01"}
输出 JSON: {"success": true, "data": [{"date": "2016-01-04", "open": 120.5, ...}]}
"""

import sys
import json
import traceback
import akshare as ak
import pandas as pd
from typing import List, Dict, Any
from datetime import datetime


def fetch_hk_klines(symbol: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """
    获取港股K线数据
    
    Args:
        symbol: 港股代码（5位数字，如"00700"）
        start_date: 开始日期 (YYYY-MM-DD)
        end_date: 结束日期 (YYYY-MM-DD)
        
    Returns:
        K线数据列表
    """
    try:
        symbol_padded = symbol.zfill(5)
        
        df = ak.stock_hk_hist(
            symbol=symbol_padded,
            period="daily",
            start_date=start_date.replace('-', ''),
            end_date=end_date.replace('-', ''),
            adjust="qfq"
        )
        
        if df.empty:
            return []
        
        klines = []
        for _, row in df.iterrows():
            date_str = row['日期']
            if isinstance(date_str, pd.Timestamp):
                date_str = date_str.strftime('%Y-%m-%d')
            elif isinstance(date_str, str):
                if len(date_str) == 8:
                    date_str = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            
            try:
                open_price = float(row['开盘'])
                high_price = float(row['最高'])
                low_price = float(row['最低'])
                close_price = float(row['收盘'])
                volume = float(row['成交量'])
                amount = float(row['成交额'])
                
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
            except (ValueError, KeyError) as e:
                continue
        
        return klines
        
    except Exception as e:
        raise Exception(f"Failed to fetch HK K-lines for {symbol}: {str(e)}")


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
        
        klines = fetch_hk_klines(symbol, start_date, end_date)
        
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
