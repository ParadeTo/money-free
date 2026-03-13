#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
获取美股基本信息
使用AkShare或Yahoo Finance获取美股的基本信息

输入 JSON: {"symbol": "AAPL", "market": "US"}
输出 JSON: {"success": true, "data": {"code": "AAPL", "name": "Apple Inc.", ...}}
"""

import sys
import json
import traceback
import yfinance as yf
from typing import Dict, Any
from datetime import datetime


def fetch_us_stock_info(symbol: str) -> Dict[str, Any]:
    """
    获取美股基本信息
    
    Args:
        symbol: 美股代码（如"AAPL"）
        
    Returns:
        股票基本信息字典
    """
    try:
        symbol_upper = symbol.upper()
        ticker = yf.Ticker(symbol_upper)
        info = ticker.info
        
        if not info or 'symbol' not in info:
            raise ValueError(f"Stock {symbol_upper} not found in US market")
        
        stock_info = {
            'code': symbol_upper,
            'name': info.get('longName', info.get('shortName', '')),
            'currency': 'USD',
            'industry': info.get('industry', info.get('sector', None)),
            'listDate': None,
            'marketCap': None,
        }
        
        try:
            first_trade_date = info.get('firstTradeDateEpochUtc')
            if first_trade_date:
                list_date = datetime.fromtimestamp(first_trade_date)
                stock_info['listDate'] = list_date.strftime('%Y-%m-%d')
            else:
                stock_info['listDate'] = '2000-01-01'
        except:
            stock_info['listDate'] = '2000-01-01'
        
        try:
            market_cap = info.get('marketCap')
            if market_cap:
                market_cap_yi = market_cap / 100000000
                stock_info['marketCap'] = round(market_cap_yi, 2)
        except:
            pass
        
        return stock_info
        
    except Exception as e:
        raise Exception(f"Failed to fetch US stock info for {symbol}: {str(e)}")


def process_request(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """处理请求"""
    try:
        symbol = input_data.get('symbol')
        market = input_data.get('market')
        
        if not symbol:
            raise ValueError('Missing required parameter: symbol')
        
        if market != 'US':
            raise ValueError(f'Invalid market: {market}, expected US')
        
        stock_info = fetch_us_stock_info(symbol)
        
        return {
            'success': True,
            'data': stock_info,
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
