/**
 * 应用主入口
 * 
 * 配置路由和全局样式
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { theme as customTheme } from './styles/theme';

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN} theme={customTheme}>
        <BrowserRouter>
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* 受保护的路由 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div className="app" style={{ padding: '24px' }}>
                    <h1>股票分析工具</h1>
                    <p>✅ 登录成功！欢迎使用股票分析工具</p>
                    <p>这是受保护的首页，只有登录用户才能访问。</p>
                  </div>
                </ProtectedRoute>
              }
            />
            
            {/* 默认重定向到首页 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
