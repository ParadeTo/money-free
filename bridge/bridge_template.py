#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Python Bridge 脚本模板
用于创建新的数据获取脚本

输入 JSON: {"param1": "value1", "param2": "value2"}
输出 JSON: {"success": true, "data": [...], "error": null}
"""

import sys
import json
import traceback
from typing import Any, Dict


def process_request(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理请求的主函数
    
    Args:
        input_data: 从stdin接收的JSON数据
        
    Returns:
        包含success, data, error的字典
    """
    try:
        # 1. 提取参数
        param1 = input_data.get('param1')
        param2 = input_data.get('param2')
        
        # 2. 参数验证
        if not param1:
            raise ValueError('Missing required parameter: param1')
        
        # 3. 执行数据获取逻辑
        # TODO: 实现具体的数据获取逻辑
        result_data = []
        
        # 4. 返回成功结果
        return {
            'success': True,
            'data': result_data,
            'error': None
        }
        
    except Exception as e:
        # 5. 返回错误结果
        error_msg = f"{type(e).__name__}: {str(e)}"
        return {
            'success': False,
            'data': None,
            'error': error_msg,
            'traceback': traceback.format_exc()
        }


if __name__ == "__main__":
    try:
        # 从stdin读取JSON输入
        input_json = sys.stdin.read()
        input_data = json.loads(input_json) if input_json else {}
        
        # 处理请求
        result = process_request(input_data)
        
        # 输出JSON结果到stdout
        print(json.dumps(result, ensure_ascii=False))
        
        # 根据成功状态设置退出码
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        # 顶层错误处理
        error_result = {
            'success': False,
            'data': None,
            'error': f'Top-level error: {str(e)}',
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
