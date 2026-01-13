import { useState, useEffect } from 'react';
import Header from './components/Header';
import WorkTimeForm from './components/WorkTimeForm';
import ImageUploader from './components/ImageUploader';
import WorkTimeList from './components/WorkTimeList';
import ChartPanel from './components/ChartPanel';
import { useWorkTime } from './hooks/useWorkTime';
import { RecognizedTime } from './types';

function App() {
  const {
    records,
    config,
    loading,
    setLoading,
    addRecord,
    addRecordsFromRecognition,
    deleteRecord,
    updateRecord,
    clearRecords,
    updateConfig,
    statistics
  } = useWorkTime();

  // 监听手动录入事件
  useEffect(() => {
    const handleAddRecord = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addRecord(detail.date, detail.checkIn, detail.checkOut);
    };

    window.addEventListener('addManualRecord', handleAddRecord);
    return () => window.removeEventListener('addManualRecord', handleAddRecord);
  }, [addRecord]);

  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [recognizedData, setRecognizedData] = useState<RecognizedTime[]>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleImageRecognized = (data: RecognizedTime[]) => {
    setRecognizedData(data);
  };

  const handleConfirmRecognition = () => {
    if (recognizedData.length > 0) {
      addRecordsFromRecognition(recognizedData);
      setRecognizedData([]);
    }
  };

  const handleSaveApiKey = () => {
    updateConfig({ apiKey });
    setShowApiKeyModal(false);
  };

  return (
    <div className="app">
      <Header 
        onOpenApiKey={() => setShowApiKeyModal(true)}
        apiKeyConfigured={!!config.apiKey}
      />

      <main className="container mt-4">
        <div className="row">
          {/* 左侧：配置和上传 */}
          <div className="col-lg-4 mb-4">
            <WorkTimeForm 
              lunchBreak={config.lunchBreakDuration}
              onUpdateLunchBreak={(duration) => updateConfig({ lunchBreakDuration: duration })}
              onClearAll={clearRecords}
              totalDays={statistics.totalDays}
              totalHours={statistics.totalHours}
            />

            <ImageUploader
              apiKey={config.apiKey}
              loading={loading}
              setLoading={setLoading}
              onRecognized={handleImageRecognized}
            />

            {recognizedData.length > 0 && (
              <div className="card mt-3">
                <div className="card-header bg-info text-white">
                  识别结果确认
                </div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    {recognizedData.map((item, index) => (
                      <li key={index} className="list-group-item">
                        <strong>{item.date}</strong>
                        <br />
                        <small className="text-muted">
                          {item.times.join(' → ')}
                        </small>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 d-flex gap-2">
                    <button 
                      className="btn btn-primary flex-grow-1"
                      onClick={handleConfirmRecognition}
                    >
                      确认添加
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setRecognizedData([])}
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：列表和图表 */}
          <div className="col-lg-8">
            <WorkTimeList
              records={records}
              onDelete={deleteRecord}
              onUpdate={updateRecord}
            />

            {records.length > 0 && (
              <ChartPanel records={records} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
