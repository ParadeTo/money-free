/**
 * Application Entry Point
 * 
 * Configure routes and global styles
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MainLayout } from './components/Layout/MainLayout';
import { theme as customTheme } from './styles/theme';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const KLineChartPage = lazy(() => import('./pages/KLineChartPage').then(m => ({ default: m.KLineChartPage })));
const FavoritePage = lazy(() => import('./pages/FavoritePage').then(m => ({ default: m.FavoritePage })));
const ScreenerPage = lazy(() => import('./pages/ScreenerPage').then(m => ({ default: m.ScreenerPage })));
const VcpScreenerPage = lazy(() => import('./pages/VcpScreenerPage').then(m => ({ default: m.VcpScreenerPage })));
const VcpAnalysisPage = lazy(() => import('./pages/VcpAnalysisPage').then(m => ({ default: m.VcpAnalysisPage })));

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
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={enUS} theme={customTheme}>
          <BrowserRouter>
            <Suspense fallback={loadingFallback}>
              <Routes>
              {/* Default route */}
              <Route path="/" element={<Navigate to="/chart" replace />} />
              
              {/* K-line chart page */}
              <Route
                path="/chart"
                element={
                  <MainLayout>
                    <KLineChartPage />
                  </MainLayout>
                }
              />
              
              <Route
                path="/chart/:stockCode"
                element={
                  <MainLayout>
                    <KLineChartPage />
                  </MainLayout>
                }
              />
              
              {/* Stock screener page */}
              <Route
                path="/screener"
                element={
                  <MainLayout>
                    <ScreenerPage />
                  </MainLayout>
                }
              />
              
              {/* VCP scanner page */}
              <Route
                path="/vcp"
                element={
                  <MainLayout>
                    <VcpScreenerPage />
                  </MainLayout>
                }
              />
              
              {/* VCP analysis report page */}
              <Route
                path="/vcp-analysis/:stockCode"
                element={
                  <MainLayout>
                    <VcpAnalysisPage />
                  </MainLayout>
                }
              />
              
              {/* Favorites page */}
              <Route
                path="/favorites"
                element={
                  <MainLayout>
                    <FavoritePage />
                  </MainLayout>
                }
              />
              
              {/* Default redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
