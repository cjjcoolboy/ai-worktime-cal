import React, { useState } from 'react';
import { recognizeClockTimes, recognizeClockTimesFromText } from '../services/api';
import { RecognizedTime } from '../types';

interface ImageUploaderProps {
  apiKey?: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onRecognized: (data: RecognizedTime[]) => void;
}

type InputMode = 'text' | 'image';

const ImageUploader: React.FC<ImageUploaderProps> = ({
  apiKey,
  loading,
  setLoading,
  onRecognized
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [error, setError] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('请上传 PNG 或 JPG 格式的图片');
      return;
    }
    setSelectedFile(file);
    setError('');

    // 自动开始识别
    await handleImageRecognize(file);
  };

  const handleImageRecognize = async (file?: File) => {
    const targetFile = file || selectedFile;
    if (!targetFile) return;

    setLoading(true);
    setError('');

    try {
      const result = await recognizeClockTimes(targetFile);
      onRecognized(result);
      setSelectedFile(null);
    } catch (err: any) {
      if (err.message.includes('API Key')) {
        setError(err.message + ' 请在右上角配置。');
      } else {
        setError(err.message || '识别失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTextRecognize = async () => {
    if (!textInput.trim()) {
      setError('请输入打卡记录文本');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await recognizeClockTimesFromText(textInput);
      onRecognized(result);
      setTextInput('');
    } catch (err: any) {
      if (err.message.includes('API Key')) {
        setError(err.message + ' 请在右上角配置。');
      } else {
        setError(err.message || '识别失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError('');
  };

  const clearText = () => {
    setTextInput('');
    setError('');
  };

  const switchMode = (mode: InputMode) => {
    setInputMode(mode);
    setSelectedFile(null);
    setTextInput('');
    setError('');
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>📸 上传打卡截图</span>
        <div className="btn-group btn-group-sm">
          <button
            className={`btn ${inputMode === 'image' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => switchMode('image')}
          >
            图片
          </button>
          <button
            className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => switchMode('text')}
          >
            文本
          </button>
        </div>
      </div>
      <div className="card-body">
        {inputMode === 'image' ? (
          !selectedFile ? (
            <form
              className={`upload-form ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleChange}
                id="file-upload"
                className="d-none"
              />
              <label htmlFor="file-upload" className="upload-label">
                <div className="upload-icon">📁</div>
                <p className="mb-1">拖拽图片到此处，或点击选择</p>
                <small className="text-muted">支持 PNG、JPG 格式</small>
              </label>
            </form>
          ) : (
            <div className="selected-file">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <span className="me-2">📄</span>
                  <span className="text-truncate" style={{ maxWidth: '150px' }}>
                    {selectedFile.name}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={clearFile}
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 d-flex gap-2">
                {loading ? (
                  <div className="d-flex align-items-center flex-grow-1 justify-content-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">识别中...</span>
                    </div>
                    <span>正在识别打卡时间...</span>
                  </div>
                ) : (
                  <div className="flex-grow-1 text-center text-muted">
                    <small>正在识别...</small>
                  </div>
                )}
                <button
                  className="btn btn-outline-secondary"
                  onClick={clearFile}
                  disabled={loading}
                >
                  取消
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="text-input-mode">
            <textarea
              className="form-control mb-2"
              rows={5}
              placeholder="粘贴小助手的出勤信息"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={loading}
            />
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary flex-grow-1"
                onClick={handleTextRecognize}
                disabled={loading || !textInput.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    识别中...
                  </>
                ) : (
                  '🔍 识别打卡时间'
                )}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={clearText}
                disabled={loading}
              >
                清空
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger mt-3 py-2 small">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
