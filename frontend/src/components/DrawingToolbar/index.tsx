/**
 * 绘图工具栏组件
 * 
 * 提供趋势线、水平线、垂直线、矩形等绘图工具
 */

import { Button, Space, Tooltip, Typography } from 'antd';
import {
  LineOutlined,
  MinusOutlined,
  ColumnHeightOutlined,
  BorderOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useChartStore } from '../../store/chart.store';
import type { DrawingType } from '../../types/drawing';
import type { CSSProperties } from 'react';

const { Text } = Typography;

interface DrawingTool {
  type: DrawingType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const drawingTools: DrawingTool[] = [
  {
    type: 'trend_line',
    label: '趋势线',
    icon: <LineOutlined />,
    description: '点击两个点绘制趋势线',
  },
  {
    type: 'horizontal_line',
    label: '水平线',
    icon: <MinusOutlined />,
    description: '点击一次绘制水平支撑/阻力线',
  },
  {
    type: 'vertical_line',
    label: '垂直线',
    icon: <ColumnHeightOutlined />,
    description: '点击一次绘制垂直时间线',
  },
  {
    type: 'rectangle',
    label: '矩形',
    icon: <BorderOutlined />,
    description: '点击两个对角点绘制矩形区域',
  },
];

export function DrawingToolbar() {
  const { activeTool, setActiveTool } = useChartStore();

  const handleToolClick = (tool: DrawingType) => {
    if (activeTool === tool) {
      setActiveTool('none');
    } else {
      setActiveTool(tool);
    }
  };

  const handleClearTool = () => {
    setActiveTool('none');
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'rgba(13, 17, 45, 0.8)',
    borderRadius: '8px',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    backdropFilter: 'blur(10px)',
  };

  const labelStyle: CSSProperties = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: 600,
  };

  return (
    <div style={containerStyle}>
      <Text style={labelStyle}>绘图工具:</Text>
      
      <Space size="small">
        {drawingTools.map((tool) => (
          <Tooltip key={tool.type} title={tool.description} placement="top">
            <Button
              type={activeTool === tool.type ? 'primary' : 'default'}
              icon={tool.icon}
              onClick={() => handleToolClick(tool.type)}
              style={{
                background: activeTool === tool.type 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                border: activeTool === tool.type 
                  ? 'none'
                  : '1px solid rgba(255, 255, 255, 0.15)',
                color: activeTool === tool.type 
                  ? '#fff'
                  : 'rgba(255, 255, 255, 0.65)',
                height: '36px',
                padding: '0 12px',
              }}
            >
              {tool.label}
            </Button>
          </Tooltip>
        ))}
        
        {activeTool !== 'none' && (
          <Tooltip title="取消绘图" placement="top">
            <Button
              icon={<CloseOutlined />}
              onClick={handleClearTool}
              danger
              style={{
                height: '36px',
                padding: '0 12px',
              }}
            >
              取消
            </Button>
          </Tooltip>
        )}
      </Space>

      {activeTool !== 'none' && (
        <Text
          style={{
            fontSize: '13px',
            color: '#667eea',
            fontWeight: 500,
            marginLeft: '8px',
          }}
        >
          {drawingTools.find((t) => t.type === activeTool)?.description}
        </Text>
      )}
    </div>
  );
}
