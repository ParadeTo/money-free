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
          <span className="title-text">Early Stage VCP Filter</span>
          <Tooltip title="Filter stocks in bottom area just starting to form VCP patterns">
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
            Reset
          </Button>
          <Button
            type="primary"
            onClick={onFilter}
            loading={loading}
            className="filter-button"
          >
            Start Filter
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
                <span className="label-text">From 52W Low</span>
                <Tooltip title="Percentage from 52-week low, lower means closer to bottom">
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
                <span className="label-text">From 52W High</span>
                <Tooltip title="Percentage from 52-week high, higher means more upside potential">
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
                <span className="label-text">Contraction Count Range</span>
                <Tooltip title="Number of VCP contractions: 2-3 for very early, 3-4 for typical early, 4-5 for stable early">
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
                  marks={{ 2: '2', 4: '4', 6: '6', 8: '8' }}
                  tooltip={{ 
                    formatter: (value) => value ? `${value}` : '',
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
                    addonBefore="Min"
                    className="control-number"
                  />
                  <span className="range-separator">~</span>
                  <InputNumber
                    min={2}
                    max={8}
                    value={conditions.contractionCountMax}
                    onChange={handleChange('contractionCountMax')}
                    disabled={loading}
                    addonBefore="Max"
                    className="control-number"
                  />
                </Space>
              </div>
            </div>
          </Col>
        </Row>

        {/* Preset Buttons */}
        <div className="preset-buttons">
          <span className="preset-label">Quick Presets:</span>
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
              Very Early
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
              Typical Early (Recommended)
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
              Stable Early
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};
