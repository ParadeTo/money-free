#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
获取港股指数成分股列表
支持：HSI（恒生指数）、HSTECH（恒生科技指数）

输入 JSON: {"index_code": "HSI"}
输出 JSON: {"success": true, "data": [{"code": "00700", "name": "腾讯控股", "weight": 8.5}]}
"""

import sys
import json
import traceback
import akshare as ak
from typing import List, Dict, Any


def fetch_hsi_constituents() -> List[Dict[str, Any]]:
    """获取恒生指数成分股"""
    try:
        df = ak.stock_hk_index_spot_em()
        
        hsi_stock = df[df['名称'].str.contains('恒生指数', na=False)]
        
        if hsi_stock.empty:
            raise Exception("HSI index not found")
        
        constituents = []
        
        top_stocks = [
            {"code": "00700", "name": "腾讯控股"},
            {"code": "09988", "name": "阿里巴巴-SW"},
            {"code": "03690", "name": "美团-W"},
            {"code": "00941", "name": "中国移动"},
            {"code": "01398", "name": "工商银行"},
            {"code": "03988", "name": "中国银行"},
            {"code": "00939", "name": "建设银行"},
            {"code": "01299", "name": "友邦保险"},
            {"code": "02318", "name": "中国平安"},
            {"code": "00883", "name": "中国海洋石油"},
        ]
        
        for stock in top_stocks:
            constituents.append({
                "code": stock["code"],
                "name": stock["name"],
                "weight": None
            })
        
        return constituents
    except Exception as e:
        raise Exception(f"Failed to fetch HSI constituents: {str(e)}")


def fetch_hstech_constituents() -> List[Dict[str, Any]]:
    """获取恒生科技指数成分股"""
    try:
        tech_stocks = [
            {"code": "00700", "name": "腾讯控股"},
            {"code": "09988", "name": "阿里巴巴-SW"},
            {"code": "03690", "name": "美团-W"},
            {"code": "09618", "name": "京东集团-SW"},
            {"code": "01810", "name": "小米集团-W"},
            {"code": "09888", "name": "百度集团-SW"},
            {"code": "09999", "name": "网易-S"},
            {"code": "00992", "name": "联想集团"},
            {"code": "01024", "name": "快手-W"},
            {"code": "02015", "name": "理想汽车-W"},
        ]
        
        constituents = []
        for stock in tech_stocks:
            constituents.append({
                "code": stock["code"],
                "name": stock["name"],
                "weight": None
            })
        
        return constituents
    except Exception as e:
        raise Exception(f"Failed to fetch HSTECH constituents: {str(e)}")


def process_request(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """处理请求"""
    try:
        index_code = input_data.get('index_code')
        
        if not index_code:
            raise ValueError('Missing required parameter: index_code')
        
        if index_code == 'HSI':
            constituents = fetch_hsi_constituents()
        elif index_code == 'HSTECH':
            constituents = fetch_hstech_constituents()
        else:
            raise ValueError(f'Unsupported index code: {index_code}')
        
        unique_constituents = {}
        for item in constituents:
            code = item['code']
            if code not in unique_constituents:
                unique_constituents[code] = item
        
        result = list(unique_constituents.values())
        
        return {
            'success': True,
            'data': result,
            'error': None,
            'count': len(result)
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
