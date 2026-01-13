// 每日工时记录
export interface WorkTimeRecord {
  id: string;
  date: string;           // 日期 YYYY-MM-DD
  checkIn: string;        // 上班时间 HH:mm
  checkOut: string;       // 下班时间 HH:mm
  lunchBreak: number;     // 午休时长（小时）
  workHours: number;      // 出勤时长（小时）
}

// 用户配置
export interface UserConfig {
  lunchBreakDuration: number;  // 默认午休时长
  apiKey?: string;             // SiliconFlow API Key
}

// API响应 - 识别的时间点
export interface RecognizedTime {
  date: string;
  times: string[];
}

// API错误
export interface ApiError {
  message: string;
}

// 图表数据类型
export interface ChartDataPoint {
  date: string;
  hours: number;
}
