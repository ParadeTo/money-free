#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
获取港股基本信息
使用AkShare获取港股的基本信息、行业、上市日期等

输入 JSON: {"symbol": "00700", "market": "HK"}
输出 JSON: {"success": true, "data": {"code": "00700", "name": "腾讯控股", ...}}
"""

import sys
import json
import traceback
import akshare as ak
import pandas as pd
from typing import Dict, Any
from datetime import datetime


def fetch_hk_stock_info(symbol: str) -> Dict[str, Any]:
    """
    获取港股基本信息
    
    Args:
        symbol: 港股代码（5位数字，如"00700"）
        
    Returns:
        股票基本信息字典
    """
    try:
        symbol_padded = symbol.zfill(5)
        
        df = ak.stock_hk_spot_em()
        stock_row = df[df['代码'] == symbol_padded]
        
        if stock_row.empty:
            raise ValueError(f"Stock {symbol_padded} not found in HK market")
        
        row = stock_row.iloc[0]
        
        stock_info = {
            'code': symbol_padded,
            'name': str(row.get('名称', '')),
            'currency': 'HKD',
            'industry': str(row.get('所属行业', None)) if pd.notna(row.get('所属行业')) else None,
            'listDate': None,
            'marketCap': None,
        }
        
        try:
            market_cap_str = row.get('总市值', None)
            if pd.notna(market_cap_str):
                market_cap = float(market_cap_str) / 100000000
                stock_info['marketCap'] = round(market_cap, 2)
        except:
            pass
        
        try:
            detail_df = ak.stock_hk_hist(symbol=symbol_padded, period="daily", adjust="qfq")
            if not detail_df.empty:
                first_date = detail_df['日期'].min()
                stock_info['listDate'] = first_date.strftime('%Y-%m-%d')
        except:
            stock_info['listDate'] = '2000-01-01'
        
        return stock_info
        
    except Exception as e:
        raise Exception(f"Failed to fetch HK stock info for {symbol}: {str(e)}")


def process_request(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """处理请求"""
    try:
        symbol = input_data.get('symbol')
        market = input_data.get('market')
        
        if not symbol:
            raise ValueError('Missing required parameter: symbol')
        
        if market != 'HK':
            raise ValueError(f'Invalid market: {market}, expected HK')
        
        stock_info = fetch_hk_stock_info(symbol)
        
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
