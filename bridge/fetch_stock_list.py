#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
通过 AkShare 获取A股股票列表

输入 JSON: {}
输出 JSON: { "data": [{"code": "600519", "name": "贵州茅台", "market": "SH", ...}], "count": 5000 }
"""

import sys
import json
import akshare as ak
from datetime import datetime


def fetch_stock_list():
    """获取A股股票基本信息"""
    # 获取A股实时行情（包含所有上市股票）
    df = ak.stock_zh_a_spot_em()
    
    stocks = []
    for _, row in df.iterrows():
        code = str(row["代码"])
        name = str(row["名称"])
        
        # 判断市场
        if code.startswith(("6", "9")):
            market = "SH"
        else:
            market = "SZ"
        
        stocks.append({
            "code": code,
            "name": name,
            "market": market,
        })
    
    return {"data": stocks, "count": len(stocks)}


if __name__ == "__main__":
    try:
        result = fetch_stock_list()
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
