import React, { useState, useEffect } from 'react';
import { Tabs, Card, message } from 'antd';
import ScanTrigger from './components/ScanTrigger';
import ScanHistory from './components/ScanHistory';
import ResultsViewer from './components/ResultsViewer';
import ComparisonView from './components/ComparisonView';
import { volumeSurgeScanApi } from '../../services/volumeSurgeScanApi';
import { ScanSummary } from '../../types/scan.types';
import './styles.css';

const { TabPane } = Tabs;

const VolumeSurgeScanPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [activeScan, setActiveScan] = useState<ScanSummary | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleScanStarted = async (scanId: string) => {
    message.success('Scan started successfully');
    
    try {
      const response = await volumeSurgeScanApi.getScanStatus(scanId);
      if (response.success && response.data) {
        setActiveScan(response.data);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Failed to fetch scan status', error);
    }

    setRefreshHistory((prev) => prev + 1);
  };

  const handleScanSelected = async (scanId: string) => {
    try {
      const response = await volumeSurgeScanApi.getScanStatus(scanId);
      if (response.success && response.data) {
        setActiveScan(response.data);
        setActiveTab('results');
      }
    } catch (error) {
      message.error('Failed to load scan');
    }
  };

  return (
    <div className="volume-surge-scan-page">
      <Card className="page-header" bordered={false}>
        <h1>Volume Surge Scanner</h1>
        <p className="subtitle">
          Identify stocks with volume contraction followed by expansion and strong buying support
        </p>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane tab="New Scan" key="scan">
          <ScanTrigger onScanStarted={handleScanStarted} />
        </TabPane>

        <TabPane tab="Scan History" key="history">
          <ScanHistory 
            refreshTrigger={refreshHistory} 
            onScanSelect={handleScanSelected}
          />
        </TabPane>

        <TabPane tab="Results" key="results" disabled={!activeScan}>
          {activeScan && <ResultsViewer scan={activeScan} />}
        </TabPane>

        <TabPane tab="Compare Scans" key="compare">
          <ComparisonView />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default VolumeSurgeScanPage;
