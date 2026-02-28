/**
 * 数据管理页面
 */

import { useState, useCallback } from 'react';
import { Space, message, Typography } from 'antd';
import { UpdateButton } from '../components/UpdateButton';
import { updateService } from '../services/update.service';
import { useUpdateStore } from '../store/update.store';
import { useUpdatePolling } from '../hooks/useUpdatePolling';
import type { CSSProperties } from 'react';

const { Title } = Typography;

export function DataManagementPage() {
  const [triggerLoading, setTriggerLoading] = useState(false);

  const {
    currentTask,
    setCurrentTask,
    setIsPolling,
    updateProgress,
  } = useUpdateStore();

  const handleTriggerUpdate = async () => {
    try {
      setTriggerLoading(true);
      const response = await updateService.triggerUpdate();
      
      message.success(response.message || '数据更新已启动');
      
      setCurrentTask({
        taskId: response.taskId,
        status: 'running',
        progress: {
          total: 0,
          current: 0,
          success: 0,
          failed: 0,
          percentage: 0,
        },
        startedAt: new Date().toISOString(),
      });
      
      setIsPolling(true);
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.warning('数据更新正在进行中，请稍候...');
      } else {
        message.error('启动数据更新失败');
        console.error('Failed to trigger update:', error);
      }
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleUpdateComplete = useCallback(() => {
    setIsPolling(false);
    
    if (currentTask) {
      const { success, failed } = currentTask.progress;
      if (failed > 0) {
        message.warning(`更新完成！成功 ${success} 个，失败 ${failed} 个`);
      } else {
        message.success(`更新完成！成功更新 ${success} 个股票`);
      }
    }
  }, [currentTask, setIsPolling]);

  useUpdatePolling({
    taskId: currentTask?.taskId || null,
    enabled: currentTask?.status === 'running',
    onUpdate: (status) => {
      updateProgress(status);
    },
    onComplete: handleUpdateComplete,
    onError: (error) => {
      message.error('获取更新状态失败');
      console.error('Polling error:', error);
      setIsPolling(false);
    },
  });

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%)',
    padding: '32px',
  };

  const contentStyle: CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const headerStyle: CSSProperties = {
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '2px solid rgba(102, 126, 234, 0.3)',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <Title 
            level={2} 
            style={{ 
              margin: 0, 
              color: '#fff',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '32px',
              fontWeight: 700,
            }}
          >
            数据管理
          </Title>
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <UpdateButton
            onTriggerUpdate={handleTriggerUpdate}
            loading={triggerLoading}
          />
          
          <div style={{ 
            padding: '24px', 
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '12px',
            color: 'rgba(255, 255, 255, 0.85)',
          }}>
            <p style={{ marginBottom: '8px' }}>✅ 数据更新功能已实现</p>
            <p style={{ marginBottom: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)' }}>
              注意：完整的更新进度显示和历史记录需要后端 API 支持
            </p>
          </div>
        </Space>
      </div>
    </div>
  );
}
