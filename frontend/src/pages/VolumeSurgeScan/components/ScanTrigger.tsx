import React, { useState } from 'react';
import { Card, Form, Radio, DatePicker, Button, Space, Alert, Spin } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { volumeSurgeScanApi } from '../../../services/volumeSurgeScanApi';

interface ScanTriggerProps {
  onScanStarted?: (scanId: string) => void;
}

const ScanTrigger: React.FC<ScanTriggerProps> = ({ onScanStarted }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [lastScanId, setLastScanId] = useState<string | null>(null);

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      const request = {
        mode: values.mode,
        referenceDate: values.mode === 'MANUAL' && values.referenceDate 
          ? dayjs(values.referenceDate).format('YYYY-MM-DD') 
          : undefined,
        source: 'web',
      };

      const response = await volumeSurgeScanApi.startScan(request);

      if (response.success && response.data) {
        setLastScanId(response.data.scanId);
        onScanStarted?.(response.data.scanId);
      }
    } catch (error: any) {
      console.error('Scan failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Start New Scan" className="scan-trigger-card">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ mode: 'AUTO' }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="mode"
          label="Scan Mode"
          tooltip="AUTO: Automatically detect the reference date from volume patterns. MANUAL: Specify a custom reference date."
        >
          <Radio.Group onChange={(e) => setScanMode(e.target.value)}>
            <Radio.Button value="AUTO">Auto Detect</Radio.Button>
            <Radio.Button value="MANUAL">Manual Reference Date</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {scanMode === 'MANUAL' && (
          <Form.Item
            name="referenceDate"
            label="Reference Date"
            rules={[{ required: true, message: 'Please select a reference date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlayCircleOutlined />}
              loading={loading}
              size="large"
            >
              {loading ? 'Scanning...' : 'Start Scan'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {lastScanId && (
        <Alert
          message="Scan Started"
          description={`Scan ID: ${lastScanId}. Check the Results tab or History for status.`}
          type="success"
          showIcon
          closable
        />
      )}
    </Card>
  );
};

export default ScanTrigger;
