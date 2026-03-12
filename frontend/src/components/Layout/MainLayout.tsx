/**
 * Main Layout Component - Includes navigation menu
 */

import { Layout, Menu } from 'antd';
import { 
  AreaChartOutlined, 
  StarOutlined, 
  FilterOutlined, 
  ThunderboltOutlined,
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

  const menuItems = [
    {
      key: '/chart',
      icon: <AreaChartOutlined />,
      label: 'Chart',
    },
    {
      key: '/screener',
      icon: <FilterOutlined />,
      label: 'Screener',
    },
    {
      key: '/vcp',
      icon: <ThunderboltOutlined />,
      label: 'VCP Scanner',
    },
    {
      key: '/favorites',
      icon: <StarOutlined />,
      label: 'Favorites',
    },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/chart')) return '/chart';
    if (path.startsWith('/screener')) return '/screener';
    if (path.startsWith('/vcp')) return '/vcp';
    if (path.startsWith('/favorites')) return '/favorites';
    return '/chart';
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <AreaChartOutlined className={styles.logoIcon} />
          <span className={styles.logoText}>StockHub</span>
        </div>
        
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
      </Header>

      <Content className={styles.content}>
        {children}
      </Content>
    </Layout>
  );
}
