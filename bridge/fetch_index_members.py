#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
获取指数成分股列表
通过 AkShare 获取沪深300和中证1000的成分股代码

输入 JSON: { "index_code": "000300" }
输出 JSON: { "data": ["600519", "000858", ...], "count": 300 }
"""

import sys
import json
import akshare as ak


def fetch_index_members(index_code, with_names=False):
    """获取指数成分股代码列表"""
    df = ak.index_stock_cons_weight_csindex(symbol=index_code)

    if df is None or len(df) == 0:
        return {"data": [], "count": 0}

    if with_names:
        seen = set()
        stocks = []
        for _, row in df.iterrows():
            code = str(row["成分券代码"]).zfill(6)
            if code not in seen:
                seen.add(code)
                stocks.append({"code": code, "name": str(row["成分券名称"])})
        stocks.sort(key=lambda x: x["code"])
        return {"data": stocks, "count": len(stocks), "with_names": True}

    codes = df["成分券代码"].tolist()
    clean_codes = list(set(str(c).zfill(6) for c in codes))
    return {"data": sorted(clean_codes), "count": len(clean_codes)}


if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        index_code = data.get("index_code", "000300")
        with_names = data.get("with_names", False)

        result = fetch_index_members(index_code, with_names=with_names)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
