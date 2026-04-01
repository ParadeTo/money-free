import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, Card, message, Alert } from 'antd';
import ScanTrigger from './components/ScanTrigger';
import ScanHistory from './components/ScanHistory';
import ResultsViewer from './components/ResultsViewer';
import ComparisonView from './components/ComparisonView';
import { volumeSurgeScanApi } from '../../services/volumeSurgeScanApi';
import { ScanSummary, ScanStatus } from '../../types/scan.types';
import './styles.css';

const POLL_INTERVAL_MS = 3000;

const VolumeSurgeScanPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [activeScan, setActiveScan] = useState<ScanSummary | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scanRunning = activeScan?.status === ScanStatus.RUNNING;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollScanStatus = useCallback((scanId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const response = await volumeSurgeScanApi.getScanStatus(scanId);
        if (response.success && response.data) {
          setActiveScan(response.data);
          if (response.data.status !== ScanStatus.RUNNING) {
            stopPolling();
            setRefreshHistory((prev) => prev + 1);
            if (response.data.status === ScanStatus.COMPLETED) {
              message.success(`Scan completed: ${response.data.matchedStocks} stocks matched`);
            } else if (response.data.status === ScanStatus.FAILED) {
              message.error('Scan failed');
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleScanStarted = async (scanId: string) => {
    setError(null);
    message.success('Scan started successfully');

    try {
      const response = await volumeSurgeScanApi.getScanStatus(scanId);
      if (response.success && response.data) {
        setActiveScan(response.data);
        setActiveTab('results');
        if (response.data.status === ScanStatus.RUNNING) {
          pollScanStatus(scanId);
        }
      }
    } catch (err) {
      setError('Failed to fetch scan status');
      console.error('Failed to fetch scan status', err);
    }

    setRefreshHistory((prev) => prev + 1);
  };

  const handleScanSelected = async (scanId: string) => {
    setError(null);
    try {
      const response = await volumeSurgeScanApi.getScanStatus(scanId);
      if (response.success && response.data) {
        setActiveScan(response.data);
        setActiveTab('results');
        if (response.data.status === ScanStatus.RUNNING) {
          pollScanStatus(scanId);
        }
      }
    } catch (err) {
      message.error('Failed to load scan');
    }
  };

  const tabItems = [
    {
      key: 'scan',
      label: 'New Scan',
      children: <ScanTrigger onScanStarted={handleScanStarted} disabled={scanRunning} />,
    },
    {
      key: 'history',
      label: 'Scan History',
      children: (
        <ScanHistory
          refreshTrigger={refreshHistory}
          onScanSelect={handleScanSelected}
        />
      ),
    },
    {
      key: 'results',
      label: 'Results',
      disabled: !activeScan,
      children: activeScan ? <ResultsViewer scan={activeScan} /> : null,
    },
    {
      key: 'compare',
      label: 'Compare Scans',
      children: <ComparisonView />,
    },
  ];

  return (
    <div className="volume-surge-scan-page">
      <Card className="page-header" bordered={false}>
        <h1>Volume Surge Scanner</h1>
        <p className="subtitle">
          Identify stocks with volume contraction followed by expansion and strong buying support
        </p>
      </Card>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" items={tabItems} />
    </div>
  );
};

export default VolumeSurgeScanPage;
