import React, { useState } from 'react';

interface WorkTimeFormProps {
  lunchBreak: number;
  onUpdateLunchBreak: (duration: number) => void;
  onClearAll: () => void;
  totalDays: number;
  totalHours: number;
}

const WorkTimeForm: React.FC<WorkTimeFormProps> = ({
  lunchBreak,
  onUpdateLunchBreak,
  onClearAll,
  totalDays,
  totalHours
}) => {
  const [manualDate, setManualDate] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !checkIn || !checkOut) return;

    // 触发自定义事件，让父组件处理
    const event = new CustomEvent('addManualRecord', {
      detail: { date: manualDate, checkIn, checkOut }
    });
    window.dispatchEvent(event);

    // 重置表单
    setManualDate('');
    setCheckIn('');
    setCheckOut('');
    setShowManualForm(false);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>⚙️ 基本设置</span>
        {totalDays > 0 && (
          <small className="text-muted">
            已记录 {totalDays} 天，共 {totalHours.toFixed(1)} 小时
          </small>
        )}
      </div>
      <div className="card-body">
        {/* 午休时长设置 */}
        <div className="mb-3">
          <label className="form-label">默认午休时长（小时）</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              value={lunchBreak}
              onChange={(e) => onUpdateLunchBreak(parseFloat(e.target.value) || 1.5)}
              step="0.5"
              min="0"
              max="4"
            />
            <span className="input-group-text">小时</span>
          </div>
        </div>

        {/* 公司规定上下班时间 */}
        <div className="alert alert-info py-2 mb-3">
          <small>
            <strong>🏢 公司规定时间</strong><br />
            上班：周一~周五 8:30 - 9:30<br />
            下班：周一~周五 18:00 - 19:00
          </small>
        </div>

        {/* 手动添加按钮 */}
        <button
          className="btn btn-outline-primary w-100"
          onClick={() => setShowManualForm(!showManualForm)}
        >
          {showManualForm ? '收起手动录入' : '+ 手动录入工时'}
        </button>

        {/* 手动录入表单 */}
        {showManualForm && (
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="mb-2">
              <label className="form-label">日期</label>
              <input
                type="date"
                className="form-control"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                max={today}
                required
              />
            </div>
            <div className="mb-2">
              <label className="form-label">上班时间</label>
              <input
                type="time"
                className="form-control"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">下班时间</label>
              <input
                type="time"
                className="form-control"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              添加记录
            </button>
          </form>
        )}

        {/* 清空数据 */}
        {totalDays > 0 && (
          <hr />
        )}
        {totalDays > 0 && (
          <button
            className="btn btn-outline-danger btn-sm w-100"
            onClick={onClearAll}
          >
            🗑️ 清空所有数据
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkTimeForm;
