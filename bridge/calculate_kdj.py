#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
KDJ 指标计算脚本
使用 pandas 计算 KDJ (随机指标)

输入 JSON 格式:
{
  "high": [10.5, 10.8, 11.2, ...],
  "low": [10.1, 10.3, 10.5, ...],
  "close": [10.3, 10.6, 10.9, ...],
  "period": 9,
  "k_period": 3,
  "d_period": 3
}

输出 JSON 格式:
{
  "k": [50.2, 52.3, ...],
  "d": [48.5, 49.8, ...],
  "j": [53.6, 57.3, ...]
}
"""

import sys
import json
import pandas as pd
import numpy as np

def calculate_kdj(high, low, close, period=9, k_period=3, d_period=3):
    """
    计算 KDJ 指标
    
    Args:
        high: 最高价数组
        low: 最低价数组
        close: 收盘价数组
        period: KDJ 周期 (默认 9)
        k_period: K 值平滑周期 (默认 3)
        d_period: D 值平滑周期 (默认 3)
    
    Returns:
        dict: 包含 K, D, J 值的字典
    """
    try:
        # 转换为 pandas Series
        high = pd.Series(high)
        low = pd.Series(low)
        close = pd.Series(close)
        
        # 计算 RSV (Raw Stochastic Value)
        # RSV = (收盘价 - N日最低价) / (N日最高价 - N日最低价) × 100
        lowest_low = low.rolling(window=period, min_periods=1).min()
        highest_high = high.rolling(window=period, min_periods=1).max()
        
        rsv = (close - lowest_low) / (highest_high - lowest_low) * 100
        rsv = rsv.fillna(50)  # 前期数据不足时，使用 50
        
        # 计算 K 值 (RSV 的 k_period 日加权移动平均)
        # K = (2/3) × 前一日K值 + (1/3) × 当日RSV
        k = pd.Series(index=rsv.index, dtype=float)
        k.iloc[0] = 50  # 初始值
        
        for i in range(1, len(rsv)):
            k.iloc[i] = (2/3) * k.iloc[i-1] + (1/3) * rsv.iloc[i]
        
        # 计算 D 值 (K 值的 d_period 日加权移动平均)
        # D = (2/3) × 前一日D值 + (1/3) × 当日K值
        d = pd.Series(index=k.index, dtype=float)
        d.iloc[0] = 50  # 初始值
        
        for i in range(1, len(k)):
            d.iloc[i] = (2/3) * d.iloc[i-1] + (1/3) * k.iloc[i]
        
        # 计算 J 值
        # J = 3K - 2D
        j = 3 * k - 2 * d
        
        # 处理 NaN 和 Inf
        k = k.replace([np.inf, -np.inf], np.nan).fillna(50)
        d = d.replace([np.inf, -np.inf], np.nan).fillna(50)
        j = j.replace([np.inf, -np.inf], np.nan).fillna(50)
        
        # 返回结果
        return {
            "k": k.round(2).tolist(),
            "d": d.round(2).tolist(),
            "j": j.round(2).tolist()
        }
    except Exception as e:
        raise ValueError(f"KDJ calculation error: {str(e)}")

if __name__ == "__main__":
    try:
        # 读取输入 JSON
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        # 提取参数
        high = data.get("high", [])
        low = data.get("low", [])
        close = data.get("close", [])
        period = data.get("period", 9)
        k_period = data.get("k_period", 3)
        d_period = data.get("d_period", 3)
        
        # 验证输入
        if not high or not low or not close:
            raise ValueError("Missing required fields: high, low, close")
        
        if len(high) != len(low) or len(high) != len(close):
            raise ValueError("high, low, close arrays must have the same length")
        
        # 计算 KDJ
        result = calculate_kdj(high, low, close, period, k_period, d_period)
        
        # 输出 JSON 结果
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_result = {
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
