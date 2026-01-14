import { useState, useEffect, useCallback } from 'react';
import { WorkTimeRecord, UserConfig } from '../types';
import { calculateWorkHours, generateId } from '../services/api';

const RECORDS_KEY = 'worktime_records';
const CONFIG_KEY = 'worktime_config';

// 判断时间是否在早上7点之前（用于过滤无效的上班打卡）
const isBefore7AM = (time: string): boolean => {
  const [hour] = time.split(':').map(Number);
  return hour < 7;
};

export const useWorkTime = () => {
  const [records, setRecords] = useState<WorkTimeRecord[]>([]);
  const [config, setConfig] = useState<UserConfig>({
    lunchBreakDuration: 1.5
  });
  const [loading, setLoading] = useState(false);

  // 从LocalStorage加载数据
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(RECORDS_KEY);
      const savedConfig = localStorage.getItem(CONFIG_KEY);

      if (savedRecords) {
        setRecords(JSON.parse(savedRecords));
      }
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);

  // 保存数据到LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }, [records, config]);

  // 添加工时记录
  const addRecord = useCallback((
    date: string,
    checkIn: string,
    checkOut: string,
    lunchBreak?: number
  ) => {
    const breakDuration = lunchBreak ?? config.lunchBreakDuration;
    const workHours = calculateWorkHours(checkIn, checkOut, breakDuration);

    const newRecord: WorkTimeRecord = {
      id: generateId(),
      date,
      checkIn,
      checkOut,
      lunchBreak: breakDuration,
      workHours
    };

    setRecords(prev => [...prev, newRecord]);
    return newRecord;
  }, [config.lunchBreakDuration]);

  // 从识别结果批量添加记录（日期重复时用最新数据覆盖）
  const addRecordsFromRecognition = useCallback((
    recognizedData: Array<{ date: string; times: string[] }>
  ) => {
    const newRecords: WorkTimeRecord[] = [];

    recognizedData.forEach(item => {
      if (item.times.length < 2) return;

      // 排序时间
      const sortedTimes = [...item.times].sort();

      // 过滤掉7点之前的上班打卡时间
      const validTimes = sortedTimes.filter(time => !isBefore7AM(time));

      // 如果有效时间少于2个，跳过这条记录
      if (validTimes.length < 2) return;

      const checkIn = validTimes[0];  // 取第一个有效时间作为上班时间
      const checkOut = validTimes[validTimes.length - 1];  // 取最后一个时间作为下班时间
      const workHours = calculateWorkHours(checkIn, checkOut, config.lunchBreakDuration);

      newRecords.push({
        id: generateId(),
        date: item.date,
        checkIn,
        checkOut,
        lunchBreak: config.lunchBreakDuration,
        workHours
      });
    });

    // 按日期升序排列
    newRecords.sort((a, b) => a.date.localeCompare(b.date));

    // 删除已存在的日期记录，用新数据覆盖
    setRecords(prev => {
      const existingDates = new Set(newRecords.map(r => r.date));
      const filtered = prev.filter(r => !existingDates.has(r.date));
      return [...filtered, ...newRecords];
    });

    return newRecords;
  }, [config.lunchBreakDuration]);

  // 删除记录
  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  // 更新记录
  const updateRecord = useCallback((id: string, updates: Partial<WorkTimeRecord>) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        // 如果更新了时间，重新计算工时
        if (updates.checkIn || updates.checkOut || updates.lunchBreak) {
          updated.workHours = calculateWorkHours(
            updated.checkIn,
            updated.checkOut,
            updated.lunchBreak
          );
        }
        return updated;
      }
      return r;
    }));
  }, []);

  // 清空所有记录
  const clearRecords = useCallback(() => {
    setRecords([]);
  }, []);

  // 更新配置
  const updateConfig = useCallback((updates: Partial<UserConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // 计算统计数据
  const statistics = {
    totalDays: records.length,
    totalHours: records.reduce((sum, r) => sum + r.workHours, 0),
    averageHours: records.length > 0 
      ? Math.round((records.reduce((sum, r) => sum + r.workHours, 0) / records.length) * 100) / 100 
      : 0,
    maxHours: records.length > 0 ? Math.max(...records.map(r => r.workHours)) : 0,
    minHours: records.length > 0 ? Math.min(...records.map(r => r.workHours)) : 0
  };

  return {
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
  };
};
