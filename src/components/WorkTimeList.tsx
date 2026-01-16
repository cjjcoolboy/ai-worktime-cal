import React, { useState } from 'react';
import { WorkTimeRecord } from '../types';
import { calculateWorkHoursWithTimeRange } from '../services/api';

interface WorkTimeListProps {
  records: WorkTimeRecord[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WorkTimeRecord>) => void;
}

const WorkTimeList: React.FC<WorkTimeListProps> = ({
  records,
  onDelete,
  onUpdate
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkTimeRecord>>({});

  const startEdit = (record: WorkTimeRecord) => {
    setEditingId(record.id);
    setEditForm({
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      lunchBreakStart: record.lunchBreakStart,
      lunchBreakEnd: record.lunchBreakEnd
    });
  };

  const saveEdit = (id: string) => {
    onUpdate(id, editForm);
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // 按日期升序排序（日期早的排在前面）
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (records.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center text-muted py-5">
          <div className="mb-3">📋</div>
          <p className="mb-0">暂无工时记录</p>
          <small>上传打卡截图或手动录入工时</small>
        </div>
      </div>
    );
  }

  // 计算预览工时
  const calculatePreviewHours = () => {
    const checkIn = editForm.checkIn;
    const checkOut = editForm.checkOut;
    const lunchBreakStart = editForm.lunchBreakStart;
    const lunchBreakEnd = editForm.lunchBreakEnd;
    
    if (checkIn && checkOut && lunchBreakStart && lunchBreakEnd) {
      return calculateWorkHoursWithTimeRange(checkIn, checkOut, lunchBreakStart, lunchBreakEnd);
    }
    return 0;
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>📋 出勤记录</span>
        <small className="text-muted">共 {records.length} 条</small>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>日期</th>
                <th>上班</th>
                <th>下班</th>
                <th>午休</th>
                <th>工时</th>
                <th style={{ width: '100px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr key={record.id}>
                  {editingId === record.id ? (
                    <>
                      <td>{record.date}</td>
                      <td>
                        <input
                          type="time"
                          className="form-control form-control-sm"
                          value={editForm.checkIn || ''}
                          onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-control form-control-sm"
                          value={editForm.checkOut || ''}
                          onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            style={{ width: '85px' }}
                            value={editForm.lunchBreakStart || ''}
                            onChange={(e) => setEditForm({ ...editForm, lunchBreakStart: e.target.value })}
                          />
                          <span>~</span>
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            style={{ width: '85px' }}
                            value={editForm.lunchBreakEnd || ''}
                            onChange={(e) => setEditForm({ ...editForm, lunchBreakEnd: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="align-middle">
                        {calculatePreviewHours().toFixed(2)}h
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-success"
                            onClick={() => saveEdit(record.id)}
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={cancelEdit}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{record.date}</td>
                      <td>{record.checkIn}</td>
                      <td>{record.checkOut}</td>
                      <td>{record.lunchBreakStart}~{record.lunchBreakEnd}</td>
                      <td>
                        <span className={`badge ${record.workHours >= 8 ? 'bg-success' : record.workHours >= 6 ? 'bg-warning' : 'bg-danger'}`}>
                          {record.workHours.toFixed(2)}h
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => startEdit(record)}
                            title="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => onDelete(record.id)}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkTimeList;
