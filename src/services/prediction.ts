import { WorkTimeRecord, FuturePlanDay, PredictionResult, STRATEGIES, PlanStrategy } from '../types';

// 公司规定时间配置
const COMPANY_CONFIG = {
  latestCheckIn: '09:30',    // 最晚上班打卡时间
  earliestCheckOut: '19:00', // 最早下班打卡时间
  lunchBreakStart: '12:00',  // 午休开始时间
  lunchBreakEnd: '13:30',    // 午休结束时间
  earliestCheckIn: '07:00',  // 最早上班打卡时间
  latestCheckOut: '23:59'    // 最晚下班打卡时间
};

// 将 HH:mm 转换为分钟数
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 将分钟数转换为 HH:mm 格式
const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * 计算工作时长（考虑午休时间）
 * @param checkIn 上班时间 HH:mm
 * @param checkOut 下班时间 HH:mm
 * @param lunchBreakStart 午休开始时间 HH:mm
 * @param lunchBreakEnd 午休结束时间 HH:mm
 */
const calculateWorkHours = (
  checkIn: string,
  checkOut: string,
  lunchBreakStart: string,
  lunchBreakEnd: string
): number => {
  const inMinutes = timeToMinutes(checkIn);
  const outMinutes = timeToMinutes(checkOut);
  const breakStartMinutes = timeToMinutes(lunchBreakStart);
  const breakEndMinutes = timeToMinutes(lunchBreakEnd);

  // 如果只有上班或下班打卡，算缺勤
  if (!checkIn || !checkOut) return 0;

  // 上班时间在午休结束后
  if (inMinutes >= breakEndMinutes) {
    return (outMinutes - inMinutes) / 60;
  }

  // 上班时间在午休期间
  if (inMinutes >= breakStartMinutes && inMinutes < breakEndMinutes) {
    return (outMinutes - breakEndMinutes) / 60;
  }

  // 正常情况
  return (breakStartMinutes - inMinutes + outMinutes - breakEndMinutes) / 60;
};

/**
 * 生成打卡时间建议
 * @param plannedHours 计划工时
 * @returns 上下班打卡时间建议
 */
export const generateClockTimeSuggestion = (plannedHours: number): {
  checkIn: string;
  checkOut: string;
  workHours: number;
  balanceNote?: string;
} => {
  const latestCheckInMinutes = timeToMinutes(COMPANY_CONFIG.latestCheckIn);
  const earliestCheckOutMinutes = timeToMinutes(COMPANY_CONFIG.earliestCheckOut);
  const earliestCheckInMinutes = timeToMinutes(COMPANY_CONFIG.earliestCheckIn);
  const latestCheckOutMinutes = timeToMinutes(COMPANY_CONFIG.latestCheckOut);

  // 公司最低标准的工时（9:30上班 + 19:00下班 - 午休1.5h）
  const standardWorkHours = calculateWorkHours(
    COMPANY_CONFIG.latestCheckIn,
    COMPANY_CONFIG.earliestCheckOut,
    COMPANY_CONFIG.lunchBreakStart,
    COMPANY_CONFIG.lunchBreakEnd
  );

  // 如果计划工时等于或大于标准，按公司规定时间
  if (plannedHours >= standardWorkHours) {
    return {
      checkIn: COMPANY_CONFIG.latestCheckIn,
      checkOut: COMPANY_CONFIG.earliestCheckOut,
      workHours: standardWorkHours
    };
  }

  // 需要计算需要的额外工时（负数表示需要减少工时，但这里不会走到这个分支）
  const extraHoursNeeded = plannedHours - standardWorkHours; // 负数

  // 优先提前上班来补足工时
  // 但需要平衡上下班时间（不能让上班太早或下班太晚）
  // 策略：60% 通过提前上班，40% 通过延后下班来平衡

  // 计算提前上班的分钟数
  const adjustMinutes = Math.abs(extraHoursNeeded) * 60;
  const advanceMinutes = Math.round(adjustMinutes * 0.6);  // 60% 提前上班
  const delayMinutes = adjustMinutes - advanceMinutes;     // 40% 延后下班

  // 计算上班时间
  let checkInMinutes = latestCheckInMinutes - advanceMinutes;
  // 确保不早于最早上班时间
  checkInMinutes = Math.max(checkInMinutes, earliestCheckInMinutes);

  // 计算下班时间
  let checkOutMinutes = earliestCheckOutMinutes + delayMinutes;
  // 确保不晚于最晚下班时间
  checkOutMinutes = Math.min(checkOutMinutes, latestCheckOutMinutes);

  // 计算实际工时
  const actualWorkHours = calculateWorkHours(
    minutesToTime(checkInMinutes),
    minutesToTime(checkOutMinutes),
    COMPANY_CONFIG.lunchBreakStart,
    COMPANY_CONFIG.lunchBreakEnd
  );

  // 检查是否平衡
  const advanceMinutesTotal = latestCheckInMinutes - checkInMinutes;
  const delayMinutesTotal = checkOutMinutes - earliestCheckOutMinutes;
  let balanceNote: string | undefined;

  if (advanceMinutesTotal > 0 && delayMinutesTotal > 0) {
    balanceNote = `提前${Math.round(advanceMinutesTotal/60*10)/10}h上班，晚${Math.round(delayMinutesTotal/60*10)/10}h下班`;
  } else if (advanceMinutesTotal > 0) {
    balanceNote = `提前${Math.round(advanceMinutesTotal/60*10)/10}h上班`;
  } else if (delayMinutesTotal > 0) {
    balanceNote = `晚${Math.round(delayMinutesTotal/60*10)/10}h下班`;
  }

  return {
    checkIn: minutesToTime(checkInMinutes),
    checkOut: minutesToTime(checkOutMinutes),
    workHours: Math.round(actualWorkHours * 100) / 100,
    balanceNote
  };
};

/**
 * 根据策略获取系数
 */
export const getStrategyCoefficient = (strategy: PlanStrategy): number => {
  const strategyConfig = STRATEGIES.find(s => s.id === strategy);
  return strategyConfig?.coefficient ?? 1.0;
};

/**
 * 检查日期是否为周五
 */
export const isFriday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return date.getDay() === 5;
};

/**
 * 获取未来日期中的周五日期列表
 */
export const getFutureFridays = (futureDates: string[]): string[] => {
  return futureDates.filter(date => isFriday(date));
};

/**
 * 计算未来N天需要达到的每日工时
 * @param currentRecords 当前出勤记录
 * @param standardWorkHours 标准工时（目标平均值）
 * @param futureDays 未来天数（默认5天）
 * @param strategy 策略模式（relaxed/normal/hardcore）
 * @param futureDates 未来日期列表（用于检测周五）
 */
export const calculateFutureTarget = (
  currentRecords: WorkTimeRecord[],
  standardWorkHours: number,
  futureDays: number = 5,
  strategy: PlanStrategy = 'normal',
  futureDates?: string[]
): PredictionResult => {
  const totalDays = currentRecords.length;

  // 当前总工时
  const currentTotalHours = currentRecords.reduce((sum, r) => sum + r.workHours, 0);

  // 当前平均工时
  const currentAvg = totalDays > 0 ? currentTotalHours / totalDays : 0;

  // 根据策略计算目标平均工时
  const coefficient = getStrategyCoefficient(strategy);
  const targetAvg = standardWorkHours * coefficient;

  // 检查是否有周五
  const fridays = futureDates ? getFutureFridays(futureDates) : [];
  const fridayCount = fridays.length;
  const normalDayCount = futureDays - fridayCount;

  // 目标总工时 = 目标平均工时 * (当前天数 + 未来天数)
  const targetTotalHours = targetAvg * (totalDays + futureDays);

  // 未来N天总共需要的工时
  const totalHoursNeeded = targetTotalHours - currentTotalHours;

  // 计算每日工时（考虑周五特殊规则）
  let dailyTarget: number;
  let fridayTarget: number;
  let isAchievable: boolean;

  if (fridayCount > 0) {
    // 有周五：周五8小时，其余天数分摊剩余工时
    fridayTarget = 8;
    // 周五总工时
    const fridayTotalHours = fridayTarget * fridayCount;
    // 其余天数需要达到的总工时
    const normalDayTotalHours = totalHoursNeeded - fridayTotalHours;
    // 其余天数每天的工时
    dailyTarget = normalDayCount > 0 ? normalDayTotalHours / normalDayCount : 0;
    // 检查其余天数是否可达成
    isAchievable = dailyTarget <= 24;
  } else {
    // 没有周五，正常计算
    dailyTarget = totalHoursNeeded / futureDays;
    fridayTarget = dailyTarget;
    isAchievable = dailyTarget <= 24;
  }

  return {
    currentAvg: Math.round(currentAvg * 100) / 100,
    targetAvg: Math.round(targetAvg * 100) / 100,
    daysRemaining: futureDays,
    totalHoursNeeded: Math.round(totalHoursNeeded * 100) / 100,
    dailyTarget: Math.round(dailyTarget * 100) / 100,
    fridayTarget: Math.round(fridayTarget * 100) / 100,
    fridayCount,
    isAchievable
  };
};

/**
 * 生成未来N个工作日的日期数组（跳过周六周日）
 * @param days 工作日天数（默认5天）
 */
export const getFutureDates = (days: number = 5): string[] => {
  const dates: string[] = [];
  const today = new Date();
  let added = 0;
  let i = 1;

  while (added < days) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();

    // 跳过周六(6)和周日(0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(date.toISOString().split('T')[0]);
      added++;
    }
    i++;
  }

  return dates;
};

/**
 * 创建默认的未来计划（每天使用推荐的目标工时）
 */
export const createDefaultFuturePlan = (
  dailyTarget: number,
  futureDates: string[]
): FuturePlanDay[] => {
  return futureDates.map(date => {
    const suggestion = generateClockTimeSuggestion(dailyTarget);
    return {
      date,
      plannedHours: dailyTarget,
      note: '推荐目标',
      suggestedCheckIn: suggestion.checkIn,
      suggestedCheckOut: suggestion.checkOut
    };
  });
};

/**
 * 根据预测结果生成建议文本
 */
export const generateSuggestion = (result: PredictionResult, workDaysCount: number = 5, strategyName: string = '正常模式', futureDates?: string[]): string => {
  if (result.daysRemaining === 0) {
    return '没有剩余天数，无法进行预测';
  }

  if (result.currentAvg >= result.targetAvg) {
    return `太棒了！您当前平均工时 ${result.currentAvg}h 已达标，继续保持！`;
  }

  // 检查是否有周五
  const fridays = futureDates ? getFutureFridays(futureDates) : [];
  const hasFriday = fridays.length > 0;

  if (!result.isAchievable) {
    return `目标挑战较大！普通日每天需${result.dailyTarget}h，建议适当调整`;
  }

  if (hasFriday) {
    return `${strategyName}：周五8h，其余${workDaysCount - 1}天需${result.dailyTarget}h/天，整体平均达${result.targetAvg}h`;
  }

  return `${strategyName}：未来${workDaysCount}个工作日每天需要达到约 ${result.dailyTarget}h 才能让整体平均达到 ${result.targetAvg}h 目标`;
};

/**
 * 计算包含未来计划的累计平均工时（用于图表展示）
 */
export const calculateCumulativeAvgWithFuture = (
  records: WorkTimeRecord[],
  futurePlan: FuturePlanDay[]
): { date: string; avg: number; isFuture: boolean }[] => {
  const sortedRecords = [...records].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const result: { date: string; avg: number; isFuture: boolean }[] = [];

  // 添加历史数据的累计平均
  let totalHours = 0;
  sortedRecords.forEach((record, index) => {
    totalHours += record.workHours;
    result.push({
      date: record.date,
      avg: Math.round((totalHours / (index + 1)) * 100) / 100,
      isFuture: false
    });
  });

  // 添加未来计划的累计平均
  let cumulativeHours = totalHours;
  const historyCount = sortedRecords.length;

  futurePlan.forEach((plan, index) => {
    cumulativeHours += plan.plannedHours;
    result.push({
      date: plan.date,
      avg: Math.round((cumulativeHours / (historyCount + index + 1)) * 100) / 100,
      isFuture: true
    });
  });

  return result;
};
