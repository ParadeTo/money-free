import React from 'react';
import { Card, Slider, InputNumber, Button, Alert, Row, Col, Space, Tooltip } from 'antd';
import { ReloadOutlined, InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { FilterConditions, ResultTip } from '../../types/vcp';
import './styles.css';

interface VcpEarlyStageFilterProps {
  conditions: FilterConditions;
  onChange: (conditions: FilterConditions) => void;
  onFilter: () => void;
  onReset: () => void;
  loading?: boolean;
  tip?: ResultTip;
  onApplyQuickAction?: (adjustments: Partial<FilterConditions>) => void;
}

export const VcpEarlyStageFilter: React.FC<VcpEarlyStageFilterProps> = ({
  conditions,
  onChange,
  onFilter,
  onReset,
  loading = false,
  tip,
  onApplyQuickAction,
}) => {
  const handleChange = (field: keyof FilterConditions) => (value: number | null) => {
    if (value !== null) {
      onChange({ ...conditions, [field]: value });
    }
  };

  const handleRangeChange = (values: [number, number]) => {
    onChange({
      ...conditions,
      contractionCountMin: values[0],
      contractionCountMax: values[1],
    });
  };

  return (
    <Card 
      className="vcp-early-filter-card"
      title={
        <div className="filter-card-title">
          <ThunderboltOutlined className="title-icon" />
          <span className="title-text">早期启动阶段筛选</span>
          <Tooltip title="筛选处于底部区域、刚开始形成VCP形态的股票">
            <InfoCircleOutlined className="title-info" />
          </Tooltip>
        </div>
      }
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset}
            disabled={loading}
            className="reset-button"
          >
            重置
          </Button>
          <Button
            type="primary"
            onClick={onFilter}
            loading={loading}
            className="filter-button"
          >
            开始筛选
          </Button>
        </Space>
      }
    >
      <div className="filter-content">
        {/* Tip Display */}
        {tip && (
          <Alert
            message={tip.message}
            type={tip.type === 'error' ? 'error' : tip.type === 'warning' ? 'warning' : 'info'}
            showIcon
            closable
            className="filter-tip-alert"
            action={
              tip.suggestedActions.length > 0 && onApplyQuickAction ? (
                <Space direction="vertical" size="small" className="quick-actions">
                  {tip.suggestedActions.map((action, index) => (
                    <Button
                      key={index}
                      size="small"
                      type="link"
                      onClick={() => onApplyQuickAction(action.adjustments)}
                      className="quick-action-btn"
                    >
                      {action.label}
                    </Button>
                  ))}
                </Space>
              ) : undefined
            }
          />
        )}

        {/* Filter Controls */}
        <Row gutter={[24, 24]}>
          {/* Distance from 52-week low */}
          <Col xs={24} sm={12}>
            <div className="filter-control-group">
              <div className="control-label">
                <span className="label-text">距52周低点</span>
                <Tooltip title="股票价格距离52周最低点的百分比，越小说明越接近底部">
                  <InfoCircleOutlined className="label-icon" />
                </Tooltip>
              </div>
              <div className="control-input-group">
                <Slider
                  min={20}
                  max={60}
                  value={conditions.distFrom52WeekLow}
                  onChange={handleChange('distFrom52WeekLow')}
                  disabled={loading}
                  marks={{ 20: '20%', 40: '40%', 60: '60%' }}
                  tooltip={{ formatter: (value) => `≤${value}%` }}
                  className="control-slider"
                />
                <InputNumber
                  min={20}
                  max={60}
                  value={conditions.distFrom52WeekLow}
                  onChange={handleChange('distFrom52WeekLow')}
                  disabled={loading}
                  addonAfter="%"
                  className="control-number"
                />
              </div>
            </div>
          </Col>

          {/* Distance from 52-week high */}
          <Col xs={24} sm={12}>
            <div className="filter-control-group">
              <div className="control-label">
                <span className="label-text">距52周高点</span>
                <Tooltip title="股票价格距离52周最高点的百分比，越大说明还有更多上涨空间">
                  <InfoCircleOutlined className="label-icon" />
                </Tooltip>
              </div>
              <div className="control-input-group">
                <Slider
                  min={10}
                  max={50}
                  value={conditions.distFrom52WeekHigh}
                  onChange={handleChange('distFrom52WeekHigh')}
                  disabled={loading}
                  marks={{ 10: '10%', 30: '30%', 50: '50%' }}
                  tooltip={{ formatter: (value) => `≥${value}%` }}
                  className="control-slider"
                />
                <InputNumber
                  min={10}
                  max={50}
                  value={conditions.distFrom52WeekHigh}
                  onChange={handleChange('distFrom52WeekHigh')}
                  disabled={loading}
                  addonAfter="%"
                  className="control-number"
                />
              </div>
            </div>
          </Col>

          {/* Contraction count range */}
          <Col xs={24}>
            <div className="filter-control-group">
              <div className="control-label">
                <span className="label-text">收缩次数范围</span>
                <Tooltip title="VCP形态收缩的次数，2-3次为极早期，3-4次为典型早期，4-5次为稳健早期">
                  <InfoCircleOutlined className="label-icon" />
                </Tooltip>
              </div>
              <div className="control-input-group">
                <Slider
                  range
                  min={2}
                  max={8}
                  value={[conditions.contractionCountMin, conditions.contractionCountMax]}
                  onChange={handleRangeChange}
                  disabled={loading}
                  marks={{ 2: '2次', 4: '4次', 6: '6次', 8: '8次' }}
                  tooltip={{ 
                    formatter: (value) => value ? `${value}次` : '',
                  }}
                  className="control-slider control-slider-range"
                />
                <Space className="range-input-group">
                  <InputNumber
                    min={2}
                    max={8}
                    value={conditions.contractionCountMin}
                    onChange={handleChange('contractionCountMin')}
                    disabled={loading}
                    addonBefore="最小"
                    addonAfter="次"
                    className="control-number"
                  />
                  <span className="range-separator">~</span>
                  <InputNumber
                    min={2}
                    max={8}
                    value={conditions.contractionCountMax}
                    onChange={handleChange('contractionCountMax')}
                    disabled={loading}
                    addonBefore="最大"
                    addonAfter="次"
                    className="control-number"
                  />
                </Space>
              </div>
            </div>
          </Col>
        </Row>

        {/* Preset Buttons */}
        <div className="preset-buttons">
          <span className="preset-label">快捷预设：</span>
          <Space wrap>
            <Button
              size="small"
              onClick={() => onChange({
                distFrom52WeekLow: 35,
                distFrom52WeekHigh: 10,
                contractionCountMin: 2,
                contractionCountMax: 3,
              })}
              disabled={loading}
              className="preset-btn"
            >
              极早期
            </Button>
            <Button
              size="small"
              onClick={() => onChange({
                distFrom52WeekLow: 45,
                distFrom52WeekHigh: 10,
                contractionCountMin: 3,
                contractionCountMax: 4,
              })}
              disabled={loading}
              className="preset-btn"
            >
              典型早期（推荐）
            </Button>
            <Button
              size="small"
              onClick={() => onChange({
                distFrom52WeekLow: 55,
                distFrom52WeekHigh: 10,
                contractionCountMin: 4,
                contractionCountMax: 5,
              })}
              disabled={loading}
              className="preset-btn"
            >
              稳健早期
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};
