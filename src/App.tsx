import { useState, useEffect } from 'react';
import Header from './components/Header';
import WorkTimeForm from './components/WorkTimeForm';
import ImageUploader from './components/ImageUploader';
import WorkTimeList from './components/WorkTimeList';
import ChartPanel from './components/ChartPanel';
import TitleCard from './components/TitleCard';
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

  // 修改页面标题
  useEffect(() => {
    document.title = '出勤计算器';
  }, []);

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
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // 识别完成后直接添加到记录中
  const handleImageRecognized = (data: RecognizedTime[]) => {
    addRecordsFromRecognition(data);
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
          </div>

          {/* 右侧：图表、称号和列表 */}
          <div className="col-lg-8">
            {records.length > 0 && (
              <>
                <TitleCard records={records} />
                <ChartPanel records={records} />
              </>
            )}

            <WorkTimeList
              records={records}
              onDelete={deleteRecord}
              onUpdate={updateRecord}
            />
          </div>
        </div>
      </main>
        
      {/* 页脚 */}
      <footer className="app-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <span className="footer-item">
                <span className="footer-icon">👨‍💻</span>
                制作人：iflow
              </span>
              <span className="footer-divider">|</span>
              <span className="footer-item">
                <span className="footer-icon">🤖</span>
                模型：minimax-m2.1
              </span>
            </div>
          </div>
        </div>
      </footer>
        
      {/* API Key 设置模态框 */}
      {showApiKeyModal && (
        <div className="modal-backdrop fade show"></div>
      )}
      <div className={`modal fade ${showApiKeyModal ? 'show d-block' : ''}`} tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">配置 SiliconFlow API Key</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowApiKeyModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                请前往 <a href="https://cloud.siliconflow.cn" target="_blank" rel="noreferrer">
                  SiliconFlow Cloud
                </a> 获取 API Key
              </p>
              <p className="small text-muted">
                提示：也可以在项目根目录的 .env 文件中配置 VITE_SILICONFLOW_API_KEY
              </p>
              <div className="mb-3">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  className="form-control"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowApiKeyModal(false)}
              >
                取消
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveApiKey}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
      
export default App;