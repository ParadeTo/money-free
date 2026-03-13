#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试数据源连接

输入 JSON: {"source": "akshare" | "yahoo_finance"}
输出 JSON: {"success": true, "data": {"available": true}}
"""

import sys
import json
import traceback


def test_akshare():
    """测试AkShare连接"""
    import akshare as ak
    df = ak.stock_zh_a_spot_em()
    return len(df) > 0


def test_yahoo_finance():
    """测试Yahoo Finance连接"""
    import yfinance as yf
    ticker = yf.Ticker('AAPL')
    info = ticker.info
    return 'symbol' in info


def process_request(input_data: dict) -> dict:
    """处理请求"""
    try:
        source = input_data.get('source', 'akshare')
        
        if source == 'akshare':
            available = test_akshare()
        elif source == 'yahoo_finance':
            available = test_yahoo_finance()
        else:
            raise ValueError(f'Unknown source: {source}')
        
        return {
            'success': True,
            'data': {'available': available},
            'error': None
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
