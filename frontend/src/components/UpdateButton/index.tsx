/**
 * 更新按钮组件
 */

import { Button, Tooltip, Space, Typography } from 'antd';
import { SyncOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useUpdateStore } from '../../store/update.store';
import type { CSSProperties } from 'react';

const { Text } = Typography;

interface UpdateButtonProps {
  onTriggerUpdate: () => void;
  loading?: boolean;
}

export function UpdateButton({ onTriggerUpdate, loading = false }: UpdateButtonProps) {
  const { lastUpdateTime, currentTask } = useUpdateStore();

  const isUpdating = currentTask?.status === 'running';
  const isDisabled = loading || isUpdating;

  const formatUpdateTime = (time: string | null): string => {
    if (!time) return '从未更新';
    
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚更新';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canUpdate = (): boolean => {
    if (!lastUpdateTime) return true;
    
    const diffMs = new Date().getTime() - new Date(lastUpdateTime).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    return diffMins >= 1;
  };

  const getTooltipText = (): string => {
    if (isUpdating) return '数据更新进行中...';
    if (!canUpdate()) return '请等待至少 1 分钟后再次更新';
    return '手动触发数据更新';
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  };

  return (
    <div style={containerStyle}>
      <Space size="middle" style={{ flex: 1 }}>
        <ClockCircleOutlined style={{ fontSize: '18px', color: '#667eea' }} />
        <div>
          <Text style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
            上次更新
          </Text>
          <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.65)' }}>
            {formatUpdateTime(lastUpdateTime)}
          </Text>
        </div>
      </Space>
      
      <Tooltip title={getTooltipText()}>
        <Button
          type="primary"
          icon={<SyncOutlined spin={isUpdating} />}
          onClick={onTriggerUpdate}
          disabled={isDisabled || !canUpdate()}
          loading={loading}
          size="large"
          style={{
            background: isDisabled ? undefined : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            height: '44px',
            padding: '0 24px',
            fontWeight: 600,
          }}
        >
          {isUpdating ? '更新中...' : '更新数据'}
        </Button>
      </Tooltip>
    </div>
  );
}
