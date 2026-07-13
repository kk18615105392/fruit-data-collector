import { useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import CollectForm from './components/CollectForm';
import DetectPage from './components/DetectPage';
import ExportPage from './components/ExportPage';
import HomePage from './components/HomePage';
import RecordDetail from './components/RecordDetail';
import RecordList from './components/RecordList';
import { addRecord, addRecords, loadRecords, updateRecord } from './storage';
import type { FruitRecord, TabId } from './types';

type ViewMode = 'list' | 'detail' | 'edit';

export default function App() {
  const [records, setRecords] = useState<FruitRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecord, setSelectedRecord] = useState<FruitRecord | null>(null);
  const [detectPrefill, setDetectPrefill] = useState<{ disease: string; photoDataUrl: string } | null>(
    null,
  );

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const refreshRecords = () => {
    setRecords(loadRecords());
  };

  const handleSave = (record: FruitRecord) => {
    const exists = records.some((item) => item.id === record.id);
    const next = exists ? updateRecord(record) : addRecord(record);
    setRecords(next);
    setActiveTab('list');
    setViewMode('list');
    setSelectedRecord(null);
  };

  const handleSaveBatch = (batchRecords: FruitRecord[]) => {
    const next = addRecords(batchRecords);
    setRecords(next);
  };

  const handleSelectRecord = (record: FruitRecord) => {
    setSelectedRecord(record);
    setViewMode('detail');
  };

  const handleApplyDetect = (disease: string, photoDataUrl: string) => {
    setDetectPrefill({ disease, photoDataUrl });
    setActiveTab('collect');
    setViewMode('list');
  };

  return (
    <div className="app-shell">
      {activeTab === 'home' && <HomePage records={records} onNavigate={setActiveTab} />}

      <div className="tab-panel" hidden={activeTab !== 'collect'}>
        <CollectForm
          editingRecord={viewMode === 'edit' && selectedRecord ? selectedRecord : undefined}
          detectPrefill={detectPrefill}
          onConsumeDetectPrefill={() => setDetectPrefill(null)}
          onSave={handleSave}
          onSaveBatch={handleSaveBatch}
          onCancel={
            viewMode === 'edit'
              ? () => {
                  setViewMode('detail');
                  setActiveTab('list');
                }
              : undefined
          }
        />
      </div>

      {activeTab === 'detect' && <DetectPage onApplyDisease={handleApplyDetect} />}

      {activeTab === 'list' &&
        (viewMode === 'detail' && selectedRecord ? (
          <RecordDetail
            record={selectedRecord}
            onEdit={() => {
              setViewMode('edit');
              setActiveTab('collect');
            }}
            onDelete={() => {
              refreshRecords();
              setViewMode('list');
              setSelectedRecord(null);
            }}
            onBack={() => {
              setViewMode('list');
              setSelectedRecord(null);
            }}
          />
        ) : (
          <RecordList records={records} onSelect={handleSelectRecord} />
        ))}

      {activeTab === 'export' && <ExportPage records={records} />}

      <BottomNav
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'collect') {
            setViewMode('list');
          }
        }}
      />
    </div>
  );
}
