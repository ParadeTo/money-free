/**
 * 主布局组件 - 包含导航菜单
 */

import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { 
  AreaChartOutlined, 
  StarOutlined, 
  FilterOutlined, 
  UserOutlined,
  LogoutOutlined 
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import styles from './MainLayout.module.css';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/chart',
      icon: <AreaChartOutlined />,
      label: 'K线图',
    },
    {
      key: '/screener',
      icon: <FilterOutlined />,
      label: '选股',
    },
    {
      key: '/favorites',
      icon: <StarOutlined />,
      label: '收藏',
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/chart')) return '/chart';
    if (path.startsWith('/screener')) return '/screener';
    if (path.startsWith('/favorites')) return '/favorites';
    return '/chart';
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <AreaChartOutlined className={styles.logoIcon} />
          <span className={styles.logoText}>股票分析工具</span>
        </div>
        
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />

        <div className={styles.userSection}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" className={styles.userButton}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span className={styles.username}>admin</span>
            </Button>
          </Dropdown>
        </div>
      </Header>

      <Content className={styles.content}>
        {children}
      </Content>
    </Layout>
  );
}
