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
          <p className={styles.subtitle}>请登录您的账户</p>
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
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                placeholder="请输入密码"
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
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            默认账号: admin / admin123
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
