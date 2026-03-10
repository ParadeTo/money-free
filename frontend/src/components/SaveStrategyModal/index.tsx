// frontend/src/components/SaveStrategyModal/index.tsx
// T169 [US2] SaveStrategyModal for strategyName and description input

import React from 'react';
import { Modal, Form, Input } from 'antd';

interface SaveStrategyModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (values: { strategyName: string; description?: string }) => void;
  loading?: boolean;
}

export const SaveStrategyModal: React.FC<SaveStrategyModalProps> = ({
  open,
  onCancel,
  onSave,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
    } catch (error) {
      // Validation failed
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Save Strategy"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Save"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="strategyName"
          label="Strategy Name"
          rules={[
            { required: true, message: 'Please enter a strategy name' },
            { max: 100, message: 'Name cannot exceed 100 characters' },
          ]}
        >
          <Input placeholder="e.g., 超跌反弹策略" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
          rules={[{ max: 500, message: 'Description cannot exceed 500 characters' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe your screening strategy..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
