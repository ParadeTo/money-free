#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
使用Yahoo Finance获取股票基本信息
支持港股和美股

输入 JSON: {"symbol": "0700.HK", "market": "HK"}
输出 JSON: {"success": true, "data": {"code": "0700", "name": "Tencent Holdings", ...}}
"""

import sys
import json
import traceback
import yfinance as yf
from typing import Dict, Any
from datetime import datetime


def fetch_yahoo_stock_info(symbol: str, market: str) -> Dict[str, Any]:
    """
    使用Yahoo Finance获取股票基本信息
    
    Args:
        symbol: Yahoo Finance格式的股票代码（如"0700.HK"、"AAPL"）
        market: 市场类型（HK或US）
        
    Returns:
        股票基本信息字典
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info or 'symbol' not in info:
            raise ValueError(f"No data found for symbol {symbol}")
        
        original_code = symbol.replace('.HK', '').replace('.US', '')
        
        stock_info = {
            'code': original_code,
            'name': info.get('longName', info.get('shortName', '')),
            'currency': 'HKD' if market == 'HK' else 'USD',
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
        raise Exception(f"Failed to fetch Yahoo Finance info for {symbol}: {str(e)}")


def process_request(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """处理请求"""
    try:
        symbol = input_data.get('symbol')
        market = input_data.get('market')
        
        if not symbol:
            raise ValueError('Missing required parameter: symbol')
        if not market:
            raise ValueError('Missing required parameter: market')
        
        stock_info = fetch_yahoo_stock_info(symbol, market)
        
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
