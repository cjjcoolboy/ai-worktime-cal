# 卷了么 - 技术文档

## 项目概述

卷了么是一个基于 React + AI 的 Web 应用程序，用于智能识别、记录和分析日常工作时长。支持图片/文本双模式识别，并根据出勤表现生成专属搞笑称号和鼓励/赞美语。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.3.3 | 类型安全 |
| Vite | 5.0.8 | 构建工具 |
| Bootstrap | 5.3.2 | CSS 框架 |
| Chart.js | 4.4.1 | 图表库 |
| Axios | 1.6.2 | HTTP 客户端 |

## 项目结构

```
worktime-cal/
├── src/
│   ├── main.tsx              # 应用入口
│   ├── App.tsx               # 主应用组件
│   ├── types/
│   │   └── index.ts          # TypeScript 类型定义
│   ├── services/
│   │   └── api.ts            # API 服务（SiliconFlow 集成）
│   ├── hooks/
│   │   └── useWorkTime.ts    # 工时管理自定义 Hook
│   ├── components/
│   │   ├── Header.tsx        # 页面头部
│   │   ├── WorkTimeForm.tsx  # 工时录入表单
│   │   ├── WorkTimeList.tsx  # 工时记录列表
│   │   ├── ImageUploader.tsx # 图片/文本上传组件
│   │   ├── ChartPanel.tsx    # 图表展示组件
│   │   └── TitleCard.tsx     # 称号展示卡片
│   └── styles/
│       └── main.css          # 全局样式
├── docs/
│   ├── TECHNICAL.md          # 技术文档
│   └── USER_GUIDE.md         # 用户指南
├── public/
│   └── vite.svg              # favicon
├── index.html                # HTML 入口
├── package.json              # 依赖配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
└── .env                      # 环境变量
```

## 核心模块说明

### 1. 数据类型 (src/types/index.ts)

```typescript
// 午休时间配置
interface LunchBreak {
  start: string;  // 午休开始时间 HH:mm
  end: string;    // 午休结束时间 HH:mm
}

// 每日工时记录
interface WorkTimeRecord {
  id: string;           // 记录唯一标识
  date: string;         // 日期 YYYY-MM-DD
  checkIn: string;      // 上班时间 HH:mm:ss
  checkOut: string;     // 下班时间 HH:mm:ss
  lunchBreak: LunchBreak | number;  // 午休时间配置（新版本）或时长（兼容旧版本）
  workHours: number;    // 出勤时长（小时）
}

// 未来计划单日数据
interface FuturePlanDay {
  date: string;           // 日期 YYYY-MM-DD
  plannedHours: number;   // 计划工时
  note?: string;          // 备注
  suggestedCheckIn?: string;   // 建议上班打卡时间 HH:mm
  suggestedCheckOut?: string;  // 建议下班打卡时间 HH:mm
}

// 预测计算结果
interface PredictionResult {
  currentAvg: number;        // 当前平均工时
  targetAvg: number;         // 目标平均工时（标准线）
  daysRemaining: number;     // 剩余天数
  totalHoursNeeded: number;  // 未来N天总共需要工时
  dailyTarget: number;       // 每天需要达到的工时
  isAchievable: boolean;     // 是否可达成（每天24小时内）
}

// 策略模式类型
type PlanStrategy = 'relaxed' | 'normal' | 'hardcore';

// 策略模式配置
interface StrategyConfig {
  id: PlanStrategy;
  name: string;
  icon: string;
  description: string;
  coefficient: number;  // 标准工时系数 (0.85, 1.0, 1.2)
}

// 可用的策略模式列表
const STRATEGIES: StrategyConfig[] = [
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

// API响应 - 识别的时间点
interface RecognizedTime {
  date: string;        // 日期
  times: string[];     // 时间点数组（HH:mm:ss格式）
}

// 用户配置
interface UserConfig {
  lunchBreak: LunchBreak;       // 默认午休时间配置
  lunchBreakDuration?: number;  // 兼容旧版本的午休时长（小时）
  standardWorkHours: number;    // 标准出勤工时（小时）
}

### 2. API 服务 (src/services/api.ts)

**主要功能：**

| 函数 | 说明 |
|------|------|
| `recognizeClockTimes(imageFile)` | 调用 GLM-4.6V 识别图片打卡时间 |
| `recognizeClockTimesFromText(text)` | 调用 DeepSeek-V3.2 识别文本打卡时间 |
| `generateFunnyTitle(records)` | 调用 DeepSeek-V2.5 生成搞笑称号和鼓励/赞美语 |
| `generateTitleImage(title)` | 调用 Kwai-Kolors 生成称号图片 |
| `calculateWorkHours(checkIn, checkOut, lunchBreak)` | 计算工时（兼容旧版本，使用小时数） |
| `calculateWorkHoursWithTimeRange(checkIn, checkOut, lunchBreakStart, lunchBreakEnd)` | 基于时间范围计算工时 |
| `parseLunchBreakToHours(lunchBreak)` | 将午休时间配置转换为小时数 |
| `parseJsonWithRepair(content)` | 修复并解析不完整 JSON |

### 3. 预测服务 (src/services/prediction.ts)

**主要功能：**

| 函数 | 说明 |
|------|------|
| `calculateFutureTarget(records, standardWorkHours, futureDays, strategy)` | 计算未来出勤目标 |
| `getStrategyCoefficient(strategy)` | 获取策略系数 |
| `generateSuggestion(currentAvg, dailyTarget, strategy, isWeekend)` | 生成建议文案 |
| `getFutureDates(count)` | 生成未来工作日日期数组 |
| `calculateCumulativeAvgWithFuture(records, futurePlan)` | 计算累计平均工时 |

### 4. API 服务 - 打卡时间建议 (src/services/api.ts)

**打卡时间建议生成：**

| 函数 | 说明 |
|------|------|
| `generateClockTimeSuggestionsFor5Days(targetHours, lunchBreakStart, lunchBreakEnd)` | 使用AI一次性生成5天打卡时间建议（单次API调用） |

**AI 生成逻辑：**

```typescript
interface ClockTimeSuggestion {
  checkIn: string;     // 上班时间 HH:mm
  checkOut: string;    // 下班时间 HH:mm
  workHours: number;   // 工时
}

interface ClockTimeSuggestionBatch {
  suggestions: ClockTimeSuggestion[];  // 5天打卡时间建议数组
}

async function generateClockTimeSuggestionsFor5Days(
  targetHours: number,
  lunchBreakStart: string = '12:00',
  lunchBreakEnd: string = '13:30'
): Promise<ClockTimeSuggestion[]> {
  // 调用 DeepSeek-V3.2 模型（单次API调用返回5天数据）
  const response = await axios.post(SILICONFLOW_API_URL, {
    model: 'deepseek-ai/DeepSeek-V3.2',
    messages: [{
      role: 'user',
      content: `根据目标工时${targetHours}小时和午休时间${lunchBreakStart}-${lunchBreakEnd}，计算未来5天工作日每天合理的上下班打卡时间。午休时间不计入工时。上班时间不晚于9:30，下班时间不早于18:00。返回一个JSON数组，包含5天数据。`
    }],
    max_tokens: 500,
    temperature: 0.3,
    enable_thinking: false  // 加速模式
  });

  // 解析返回的JSON结果
  const result = JSON.parse(response.data.choices[0].message.content);
  return result.suggestions || result;
}
```

**本地备选计算：**
- 如果没有配置 API Key，使用本地算法计算
- 平衡分配提前上班（60%）和延后下班（40%）的时间
- 上班不早于 7:00，下班不晚于 23:59

**预测计算逻辑：**

```typescript
function calculateFutureTarget(
  records: WorkTimeRecord[],
  standardWorkHours: number,
  futureDays: number = 5,
  strategy: PlanStrategy = 'normal',
  futureDates?: string[]  // 可选：用于检测周五
): PredictionResult {
  const coefficient = getStrategyCoefficient(strategy);
  const targetAvg = standardWorkHours * coefficient;
  const currentAvg = ...;

  // 检测周五
  const fridays = futureDates?.filter(d => new Date(d).getDay() === 5) || [];
  const fridayCount = fridays.length;
  const normalDayCount = futureDays - fridayCount;

  // 计算未来N天需要达到的每日工时
  const totalHoursNeeded = (targetAvg * futureDays) - (currentAvg * futureDays);

  // 周五特殊规则：周五8小时，其余天数分摊
  let dailyTarget: number;
  let fridayTarget = 8;
  if (fridayCount > 0) {
    // 周五总工时 = 8h * 周五数量
    const fridayTotalHours = 8 * fridayCount;
    // 其余天数需要达到的总工时
    const normalDayTotalHours = totalHoursNeeded - fridayTotalHours;
    // 其余天数每天的工时
    dailyTarget = normalDayTotalHours / normalDayCount;
  } else {
    dailyTarget = totalHoursNeeded / futureDays;
  }
  const isAchievable = dailyTarget <= 24;

  return {
    currentAvg,
    targetAvg,
    daysRemaining: futureDays,
    totalHoursNeeded,
    dailyTarget,
    fridayTarget,
    fridayCount,
    isAchievable
  };
}
```

**周五特殊规则：**
- 如果未来5天内有周五，周五当天只需出勤8小时
- 周五的打卡时间为 09:30 - 18:00（标准工时）
- 缺的时长（8小时与原目标之差）分摊到其余工作日
- 确保整体平均工时仍能达到目标

**策略系数映射：**

| 策略 | 系数 | 用途 |
|------|------|------|
| `relaxed` | 0.85 | 轻松目标（85% 标准工时） |
| `normal` | 1.0 | 标准目标（100% 标准工时） |
| `hardcore` | 1.2 | 挑战目标（120% 标准工时） |

**工时计算规则：**

```typescript
function calculateWorkHoursWithTimeRange(
  checkIn: string,       // 上班打卡时间
  checkOut: string,      // 下班打卡时间
  lunchBreakStart: string, // 午休开始时间
  lunchBreakEnd: string   // 午休结束时间
): number {
  // 1. 如果只有上班或下班打卡，算缺勤
  if (!checkIn || !checkOut) return 0;

  // 2. 上班时间在午休结束后：工时 = 下班 - 上班
  if (inMinutes >= breakEndMinutes) {
    return (outMinutes - inMinutes) / 60;
  }

  // 3. 上班时间在午休期间：工时 = 下班 - 午休结束
  if (inMinutes >= breakStartMinutes && inMinutes < breakEndMinutes) {
    return (outMinutes - breakEndMinutes) / 60;
  }

  // 4. 正常情况：工时 = (午休开始 - 上班) + (下班 - 午休结束)
  return (breakStartMinutes - inMinutes + outMinutes - breakEndMinutes) / 60;
}
```

**AI 识别流程：**

```
图片/文本 → 构建请求 → SiliconFlow API → JSON解析 → 返回结果
```

**JSON 修复机制：**
- 移除 markdown 代码块标记
- 处理 GLM 模型特殊标记 `<|begin_of_box|>` 和 `<|end_of_box|>`
- 修复截断的 JSON 数组和对象
- 使用正则表达式提取完整记录

### 3. 状态管理 (src/hooks/useWorkTime.ts)

使用 React Hooks 进行状态管理：

```typescript
// 状态
const [records, setRecords] = useState<WorkTimeRecord[]>([]);
const [config, setConfig] = useState<UserConfig>({
  lunchBreak: { start: '12:00', end: '13:30' },
  standardWorkHours: 9.5
});
const [loading, setLoading] = useState(false);

// 策略模式状态
const [strategy, setStrategy] = useState<PlanStrategy>('normal');

// 未来出勤计划状态
const [futurePlan, setFuturePlan] = useState<FuturePlanDay[]>([]);

// 统计数据
const statistics = {
  totalDays: number;           // 出勤天数
  totalHours: number;          // 总工时
  averageHours: number;        // 平均工时
  maxHours: number;            // 最长工时
  minHours: number;            // 最短工时
  lateCount: number;           // 迟到次数
  earlyDepartureCount: number; // 早退次数
  avgHours: number;            // 平均工时（用于称号判断）
  isHighPerformance: boolean;  // 是否高绩效（>=标准工时）
};
```

**策略模式持久化：**

```typescript
const STRATEGY_KEY = 'worktime_strategy';

// 从 localStorage 加载策略
useEffect(() => {
  const savedStrategy = localStorage.getItem(STRATEGY_KEY);
  if (savedStrategy && ['relaxed', 'normal', 'hardcore'].includes(savedStrategy)) {
    setStrategy(savedStrategy as PlanStrategy);
  }
}, []);

// 保存策略到 localStorage
useEffect(() => {
  localStorage.setItem(STRATEGY_KEY, strategy);
}, [strategy]);

// 更新策略
const updateStrategy = useCallback((newStrategy: PlanStrategy) => {
  setStrategy(newStrategy);
}, []);
```

**数据规则：**
- 过滤 7:00 之前的上班打卡（无效打卡）
- 新识别数据完全覆盖旧数据
- 按日期升序排列

### 4. 组件说明

| 组件 | 功能 |
|------|------|
| Header | 页面头部，API Key 配置入口 |
| WorkTimeForm | 手动录入，公司规定时间展示 |
| WorkTimeList | 工时记录列表，支持编辑/删除 |
| ImageUploader | 图片/文本双模式上传，AI 识别 |
| ChartPanel | 工时趋势柱状图/折线图，含平均工时标准线和未来预测 |
| TitleCard | 搞笑称号 + 鼓励/赞美语展示和图片生成 |
| FuturePlan | 未来出勤计划管理，支持策略模式切换和自定义计划工时 |

#### FuturePlan 组件

**功能：**
- 展示未来5个工作日的出勤计划
- 支持三种策略模式切换（躺平/牛马/卷王）
- 自动根据目标平均工时计算每日打卡时间
- **使用 AI（DeepSeek-V3.2）智能生成打卡时间建议（单次API调用）**
- 手动调整任意日期的计划工时
- 实时显示打卡时间建议（上班/下班时间）
- 无 API Key 时使用本地备选算法
- **按策略独立缓存预测数据，切换策略时自动复用缓存**

**策略缓存机制：**
```typescript
// 缓存数据结构
interface CachedStrategyData {
  checkIn: string;       // 上班打卡时间
  checkOut: string;      // 下班打卡时间
  targetHours: number;   // 目标工时
}

// 首次访问策略时请求 AI，后续切换直接使用缓存
useEffect(() => {
  if (!strategyCache.current.has(strategy)) {
    // 首次请求 AI
    const results = await generateClockTimeSuggestionsFor5Days(targetHours);
    // 存入缓存
    strategyCache.current.set(strategy, { checkIn, checkOut, targetHours });
    // 持久化到 localStorage
    localStorage.setItem('worktime_strategy_cache', JSON.stringify(Object.fromEntries(strategyCache.current)));
  } else {
    // 使用缓存数据
    const cached = strategyCache.current.get(strategy);
    // 直接使用缓存的打卡时间
  }
}, [strategy]);
```

**躺平模式特殊处理：**
- 当躺平模式目标工时低于 8 小时时，传给 AI 模型的工时参数调整为 8 小时
- 原因：确保计算出的打卡时间合理，避免过早上班或过晚下班

**Props 接口：**

```typescript
interface FuturePlanProps {
  records: { date: string; workHours: number }[];  // 历史记录
  standardWorkHours: number;                         // 标准工时
  futurePlan: FuturePlanDay[];                       // 计划数据（含打卡时间建议）
  strategy: PlanStrategy;                            // 当前策略
  onUpdateFuturePlan: (plan: FuturePlanDay[]) => void;  // 更新计划回调
  onUpdateStrategy: (strategy: PlanStrategy) => void;   // 更新策略回调
}
```

**打卡时间计算流程：**

```typescript
// 1. 计算目标平均工时（根据策略）
const prediction = calculateFutureTarget(records, standardWorkHours, 5, strategy);

// 2. 躺平模式特殊处理：目标工时低于8小时时，传8小时给模型
let modelTargetHours = prediction.dailyTarget;
if (strategy === 'relaxed' && modelTargetHours < 8) {
  modelTargetHours = 8;
}

// 3. 调用 AI 一次性生成5天打卡时间建议（单次API调用）
const clockSuggestions = await generateClockTimeSuggestionsFor5Days(modelTargetHours);

// 4. 更新计划数据
const newPlan = dates.map((date, index) => ({
  date,
  plannedHours: prediction.dailyTarget,
  suggestedCheckIn: clockSuggestions[index]?.checkIn || '09:30',
  suggestedCheckOut: clockSuggestions[index]?.checkOut || '18:00'
}));
```

**打卡时间显示：**

```tsx
<div className="clock-time-suggestion">
  <div className="check-in-time text-primary">
    🏢 {plan.suggestedCheckIn || '--:--'}
  </div>
  <div className="check-out-time text-success">
    🏠 {plan.suggestedCheckOut || '--:--'}
  </div>
</div>
```

**策略切换逻辑：**

```typescript
const handleStrategyChange = (newStrategy: PlanStrategy) => {
  onUpdateStrategy(newStrategy);

  // 自动更新所有日期的计划工时为推荐值
  const updatedPlan = predictionResult.dailyTargetPlan.map(day => ({
    ...day,
    plannedHours: roundToTwoDecimals(predictionResult.dailyTarget)
  }));

  onUpdateFuturePlan(updatedPlan);
};
```

## API 集成

### SiliconFlow 配置

环境变量：
```
VITE_SILICONFLOW_API_KEY=your_api_key_here
```

### 模型列表

| 功能 | 模型 | 端点 | 参数 |
|------|------|------|------|
| 图片识别 | zai-org/GLM-4.6V | /v1/chat/completions | temperature=0.1 |
| 文本识别 | deepseek-ai/DeepSeek-V3.2 | /v1/chat/completions | temperature=0.1, enable_thinking=false（加速模式） |
| 打卡时间建议 | deepseek-ai/DeepSeek-V3.2 | /v1/chat/completions | temperature=0.3, enable_thinking=false（单次API调用返回5天数据，含周五特殊处理） |
| 称号生成 | deepseek-ai/DeepSeek-V2.5 | /v1/chat/completions | temperature=0.8，JSON格式返回title+message |
| 图片生成 | Kwai-Kolors/Kolors | /v1/images/generations | width=1024, height=1024 |

### 请求示例

**图片识别：**
```json
{
  "model": "zai-org/GLM-4.6V",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "image_url", "image_url": { "url": "data:image/..." } },
        { "type": "text", "text": "请识别打卡时间..." }
      ]
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.1
}
```

**文本识别（加速模式）：**
```json
{
  "model": "deepseek-ai/DeepSeek-V3.2",
  "messages": [{ "role": "user", "content": "请提取打卡记录..." }],
  "max_tokens": 1000,
  "temperature": 0.1,
  "enable_thinking": false
}
```

## 出勤规则

### 公司规定时间

| 项目 | 时间范围 | 说明 |
|------|----------|------|
| 正常上班 | 8:30 - 9:30 | 超过 9:30 算迟到 |
| 正常下班 | 18:00 - 19:00 | 早于 18:00 算早退 |

### 无效打卡过滤

- 早于 7:00 的上班打卡时间自动过滤，不纳入计算

### 工时计算规则

工时计算基于午休时间范围进行：

1. **正常情况**：上班时间在午休开始之前
   - 工时 = (午休开始时间 - 上班打卡时间) + (下班时间 - 午休结束时间)

2. **上班时间在午休结束后**：上班打卡时间晚于午休结束时间
   - 工时 = 下班时间 - 上班时间

3. **上班时间在午休期间**：上班打卡时间在午休时间范围内
   - 工时 = 下班时间 - 午休结束时间

4. **缺勤情况**：只有上班打卡或只有下班打卡
   - 工时 = 0

### 数据覆盖策略

- 新识别数据完全替换已有数据
- 按日期升序排列展示

### 向后兼容性

- 支持读取旧版本 localStorage 数据（lunchBreak 为 number 类型）
- 自动将 lunchBreakDuration 转换为 LunchBreak 对象（默认 12:00~13:30）

## 构建部署

### 开发模式
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## 依赖管理

### 主要依赖
- `react` / `react-dom` - React 核心库
- `bootstrap` - 样式框架
- `chart.js` / `react-chartjs-2` - 图表库
- `axios` - HTTP 请求

### 开发依赖
- `@types/react` / `@types/react-dom` - React 类型定义
- `@vitejs/plugin-react` - Vite React 插件
- `typescript` - TypeScript 编译器
- `vite` - 构建工具
