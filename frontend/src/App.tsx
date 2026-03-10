/**
 * 应用主入口
 * 
 * 配置路由和全局样式
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { theme as customTheme } from './styles/theme';

const KLineChartPage = lazy(() => import('./pages/KLineChartPage').then(m => ({ default: m.KLineChartPage })));
const FavoritePage = lazy(() => import('./pages/FavoritePage').then(m => ({ default: m.FavoritePage })));
const ScreenerPage = lazy(() => import('./pages/ScreenerPage').then(m => ({ default: m.ScreenerPage })));
const VcpScreenerPage = lazy(() => import('./pages/VcpScreenerPage').then(m => ({ default: m.VcpScreenerPage })));

function App() {
  const loadingFallback = (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f5f7fa',
    }}>
      <Spin size="large" />
    </div>
  );

  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN} theme={customTheme}>
        <BrowserRouter>
          <Suspense fallback={loadingFallback}>
            <Routes>
              {/* 公开路由 */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* 受保护的路由 - 使用 MainLayout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/chart" replace />
                  </ProtectedRoute>
                }
              />
              
              {/* K线图页面 */}
              <Route
                path="/chart"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <KLineChartPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/chart/:stockCode"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <KLineChartPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* 选股页面 */}
              <Route
                path="/screener"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ScreenerPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* VCP 筛选页面 */}
              <Route
                path="/vcp"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <VcpScreenerPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* 收藏页面 */}
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <FavoritePage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* 默认重定向到首页 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
