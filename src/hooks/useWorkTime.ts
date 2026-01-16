import { useState, useEffect, useCallback } from 'react';
import { WorkTimeRecord, UserConfig, FuturePlanDay, PlanStrategy } from '../types';
import { calculateWorkHoursWithTimeRange, generateId } from '../services/api';

const RECORDS_KEY = 'worktime_records';
const CONFIG_KEY = 'worktime_config';
const FUTURE_PLAN_KEY = 'worktime_future_plan';
const STRATEGY_KEY = 'worktime_strategy';

// 判断时间是否在早上7点之前（用于过滤无效的上班打卡）
const isBefore7AM = (time: string): boolean => {
  const [hour] = time.split(':').map(Number);
  return hour < 7;
};

// 公司规定上班时间：8:30 - 9:30（超过9:30算迟到）
const isLate = (time: string): boolean => {
  const [hour, min] = time.split(':').map(Number);
  // 9:30 之后算迟到
  return hour > 9 || (hour === 9 && min > 30);
};

// 公司规定下班时间：18:00 - 19:00（早于18:00算早退）
const isEarlyDeparture = (time: string): boolean => {
  const [hour] = time.split(':').map(Number);
  // 18:00 之前算早退
  return hour < 18;
};

export const useWorkTime = () => {
  const [records, setRecords] = useState<WorkTimeRecord[]>([]);
  const [config, setConfig] = useState<UserConfig>({
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:30',
    standardWorkHours: 9.5
  });
  const [futurePlan, setFuturePlan] = useState<FuturePlanDay[]>([]);
  const [strategy, setStrategy] = useState<PlanStrategy>('normal');
  const [loading, setLoading] = useState(false);

  // 从LocalStorage加载数据
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(RECORDS_KEY);
      const savedConfig = localStorage.getItem(CONFIG_KEY);

      if (savedRecords) {
        let loadedRecords = JSON.parse(savedRecords);
        // 迁移旧数据格式（lunchBreak: number -> lunchBreakStart/lunchBreakEnd）
        loadedRecords = loadedRecords.map((r: any) => {
          if (r.lunchBreak !== undefined && r.lunchBreakStart === undefined) {
            // 使用配置的午休时间作为默认值
            const lunchBreakHours = r.lunchBreak || 1.5;
            const defaultStart = '12:00';
            const endMinutes = 12 * 60 + 30 + lunchBreakHours * 60;
            const endHour = Math.floor(endMinutes / 60);
            const endMin = endMinutes % 60;
            return {
              ...r,
              lunchBreakStart: defaultStart,
              lunchBreakEnd: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
              lunchBreak: undefined
            };
          }
          return r;
        });
        setRecords(loadedRecords);
      }
      if (savedConfig) {
        const loadedConfig = JSON.parse(savedConfig);
        // 迁移旧配置格式
        if (loadedConfig.lunchBreakDuration !== undefined && loadedConfig.lunchBreakStart === undefined) {
          const lunchBreakHours = loadedConfig.lunchBreakDuration || 1.5;
          const startMinutes = 12 * 60 + 30;
          const endMinutes = startMinutes + lunchBreakHours * 60;
          const endHour = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;
          loadedConfig.lunchBreakStart = '12:00';
          loadedConfig.lunchBreakEnd = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          delete loadedConfig.lunchBreakDuration;
        }
        // 确保standardWorkHours有默认值
        if (typeof loadedConfig.standardWorkHours !== 'number') {
          loadedConfig.standardWorkHours = 9.5;
        }
        setConfig(prev => ({ ...prev, ...loadedConfig }));
      }

      // 加载未来计划
      const savedFuturePlan = localStorage.getItem(FUTURE_PLAN_KEY);
      if (savedFuturePlan) {
        setFuturePlan(JSON.parse(savedFuturePlan));
      }

      // 加载策略模式
      const savedStrategy = localStorage.getItem(STRATEGY_KEY);
      if (savedStrategy && ['relaxed', 'normal', 'hardcore'].includes(savedStrategy)) {
        setStrategy(savedStrategy as PlanStrategy);
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
      localStorage.setItem(FUTURE_PLAN_KEY, JSON.stringify(futurePlan));
      localStorage.setItem(STRATEGY_KEY, strategy);
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }, [records, config, futurePlan, strategy]);

  // 添加工时记录
  const addRecord = useCallback((
    date: string,
    checkIn: string,
    checkOut: string
  ) => {
    const lunchBreakStart = config.lunchBreakStart;
    const lunchBreakEnd = config.lunchBreakEnd;
    const workHours = calculateWorkHoursWithTimeRange(checkIn, checkOut, lunchBreakStart, lunchBreakEnd);

    const newRecord: WorkTimeRecord = {
      id: generateId(),
      date,
      checkIn,
      checkOut,
      lunchBreakStart,
      lunchBreakEnd,
      workHours
    };

    setRecords(prev => [...prev, newRecord]);
    return newRecord;
  }, [config.lunchBreakStart, config.lunchBreakEnd]);

  // 从识别结果批量添加记录（日期重复时用最新数据覆盖）
  const addRecordsFromRecognition = useCallback((
    recognizedData: Array<{ date: string; times: string[] }>
  ) => {
    const newRecords: WorkTimeRecord[] = [];
    const lunchBreakStart = config.lunchBreakStart;
    const lunchBreakEnd = config.lunchBreakEnd;

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
      const workHours = calculateWorkHoursWithTimeRange(checkIn, checkOut, lunchBreakStart, lunchBreakEnd);

      newRecords.push({
        id: generateId(),
        date: item.date,
        checkIn,
        checkOut,
        lunchBreakStart,
        lunchBreakEnd,
        workHours
      });
    });

    // 按日期升序排列
    newRecords.sort((a, b) => a.date.localeCompare(b.date));

    // 直接用新识别的数据完全覆盖旧记录
    setRecords(newRecords);

    return newRecords;
  }, [config.lunchBreakStart, config.lunchBreakEnd]);

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
        if (updates.checkIn || updates.checkOut || updates.lunchBreakStart || updates.lunchBreakEnd) {
          const lunchBreakStart = updated.lunchBreakStart || r.lunchBreakStart;
          const lunchBreakEnd = updated.lunchBreakEnd || r.lunchBreakEnd;
          updated.workHours = calculateWorkHoursWithTimeRange(
            updated.checkIn,
            updated.checkOut,
            lunchBreakStart,
            lunchBreakEnd
          );
        }
        return updated;
      }
      return r;
    }));
  }, []);

  // 更新单条记录的午休时间并重新计算工时
  const updateRecordLunchBreak = useCallback((id: string, lunchBreakStart: string, lunchBreakEnd: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = {
          ...r,
          lunchBreakStart,
          lunchBreakEnd,
          workHours: calculateWorkHoursWithTimeRange(r.checkIn, r.checkOut, lunchBreakStart, lunchBreakEnd)
        };
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
    setConfig((prev: UserConfig) => ({ ...prev, ...updates }));
  }, []);

  // 批量更新所有记录的午休时间并重新计算工时
  const updateAllRecordsLunchBreak = useCallback((lunchBreakStart: string, lunchBreakEnd: string) => {
    setRecords((prev: WorkTimeRecord[]) => prev.map(r => ({
      ...r,
      lunchBreakStart,
      lunchBreakEnd,
      workHours: calculateWorkHoursWithTimeRange(r.checkIn, r.checkOut, lunchBreakStart, lunchBreakEnd)
    })));
  }, []);

  // 计算统计数据
  const statistics = {
    totalDays: records.length,
    totalHours: records.reduce((sum, r) => sum + r.workHours, 0),
    averageHours: records.length > 0 
      ? Math.round((records.reduce((sum, r) => sum + r.workHours, 0) / records.length) * 100) / 100 
      : 0,
    maxHours: records.length > 0 ? Math.max(...records.map(r => r.workHours)) : 0,
    minHours: records.length > 0 ? Math.min(...records.map(r => r.workHours)) : 0,
    lateCount: records.filter(r => isLate(r.checkIn)).length,
    earlyDepartureCount: records.filter(r => isEarlyDeparture(r.checkOut)).length
  };

  // 更新未来计划
  const updateFuturePlan = useCallback((plan: FuturePlanDay[]) => {
    setFuturePlan(plan);
  }, []);

  // 清空未来计划
  const clearFuturePlan = useCallback(() => {
    setFuturePlan([]);
  }, []);

  // 更新策略模式
  const updateStrategy = useCallback((newStrategy: PlanStrategy) => {
    setStrategy(newStrategy);
  }, []);

  // 清空策略
  const clearStrategy = useCallback(() => {
    setStrategy('normal');
  }, []);

  return {
    records,
    config,
    futurePlan,
    strategy,
    loading,
    setLoading,
    addRecord,
    addRecordsFromRecognition,
    deleteRecord,
    updateRecord,
    updateRecordLunchBreak,
    clearRecords,
    updateConfig,
    updateAllRecordsLunchBreak,
    updateFuturePlan,
    clearFuturePlan,
    updateStrategy,
    clearStrategy,
    statistics
  };
};