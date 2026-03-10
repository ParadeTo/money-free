#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Python Bridge 健康检查脚本
检查 Python 环境和依赖包是否正常
"""

import sys
import json

def check_health():
    """
    检查 Python 环境和依赖
    
    Returns:
        dict: 健康检查结果
    """
    try:
        import pandas
        import akshare
        import tushare
        
        result = {
            "status": "ok",
            "python_version": sys.version,
            "packages": {
                "pandas": pandas.__version__,
                "akshare": akshare.__version__,
                "tushare": tushare.__version__,
            }
        }
        
        return result
    except ImportError as e:
        return {
            "status": "error",
            "error": f"Missing package: {str(e)}"
        }

if __name__ == "__main__":
    try:
        # 读取输入 (虽然健康检查不需要输入，但保持接口一致)
        input_data = sys.stdin.read()
        
        # 执行健康检查
        result = check_health()
        
        # 输出 JSON 结果
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
