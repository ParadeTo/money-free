import React from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { LoginRequest } from '../types';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [form] = Form.useForm();

  const handleSubmit = async (values: LoginRequest) => {
    try {
      await login(values);
    } catch (err) {
      // Error is handled by useAuth hook
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard} bordered={false}>
        <div className={styles.header}>
          <h1 className={styles.title}>StockHub</h1>
          <p className={styles.subtitle}>Please log in to your account</p>
        </div>

        <div className={styles.formContainer}>
          {error && (
            <Alert
              message={error}
              type="error"
              closable
              onClose={clearError}
              className={styles.alert}
              showIcon
            />
          )}

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please enter username' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                placeholder="Please enter username"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                placeholder="Please enter password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isLoading}
                size="large"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Default account: admin / admin123
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
