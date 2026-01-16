// 每日工时记录
export interface WorkTimeRecord {
  id: string;
  date: string;           // 日期 YYYY-MM-DD
  checkIn: string;        // 上班时间 HH:mm
  checkOut: string;       // 下班时间 HH:mm
  lunchBreakStart: string; // 午休开始时间 HH:mm
  lunchBreakEnd: string;   // 午休结束时间 HH:mm
  workHours: number;      // 出勤时长（小时）
}

// 未来计划单日数据
export interface FuturePlanDay {
  date: string;           // 日期 YYYY-MM-DD
  plannedHours: number;   // 计划工时
  note?: string;          // 备注
  suggestedCheckIn?: string;   // 建议上班打卡时间 HH:mm
  suggestedCheckOut?: string;  // 建议下班打卡时间 HH:mm
}

// 预测计算结果
export interface PredictionResult {
  currentAvg: number;        // 当前平均工时
  targetAvg: number;         // 目标平均工时（标准线）
  daysRemaining: number;     // 剩余天数
  totalHoursNeeded: number;  // 未来N天总共需要工时
  dailyTarget: number;       // 普通工作日需要达到的工时
  fridayTarget?: number;     // 周五需要达到的工时（如果有周五）
  fridayCount?: number;      // 周五数量
  isAchievable: boolean;     // 是否可达成（每天24小时内）
}

// 策略模式类型
export type PlanStrategy = 'relaxed' | 'normal' | 'hardcore';

// 策略模式配置
export interface StrategyConfig {
  id: PlanStrategy;
  name: string;
  icon: string;
  description: string;
  coefficient: number;  // 标准工时系数 (0.85, 1.0, 1.2)
}

// 可用的策略模式列表
export const STRATEGIES: StrategyConfig[] = [
  {
    id: 'relaxed',
    name: '躺平模式',
    icon: '🛋️',
    description: '85% 标准工时',
    coefficient: 0.85
  },
  {
    id: 'normal',
    name: '牛马模式',
    icon: '🐮',
    description: '100% 标准工时',
    coefficient: 1.0
  },
  {
    id: 'hardcore',
    name: '卷王模式',
    icon: '🔥',
    description: '120% 标准工时',
    coefficient: 1.2
  }
];

// 图表数据类型
export interface ChartDataPoint {
  date: string;
  hours: number;
}

// API响应 - 识别的时间点
export interface RecognizedTime {
  date: string;
  times: string[];
}

// 用户配置
export interface UserConfig {
  lunchBreakStart: string;  // 午休开始时间
  lunchBreakEnd: string;    // 午休结束时间
  standardWorkHours: number; // 标准工时
  apiKey?: string;          // API密钥
}