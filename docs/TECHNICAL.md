# 卷了么 - 技术文档

## 项目概述

卷了么是一个基于 React + AI 的 Web 应用程序，用于智能识别、记录和分析日常工作时长。支持图片/文本双模式识别，并根据出勤表现生成专属搞笑称号。

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
// 每日工时记录
interface WorkTimeRecord {
  id: string;           // 记录唯一标识
  date: string;         // 日期 YYYY-MM-DD
  checkIn: string;      // 上班时间 HH:mm:ss
  checkOut: string;     // 下班时间 HH:mm:ss
  lunchBreak: number;   // 午休时长（小时）
  workHours: number;    // 出勤时长（小时）
}

// 用户配置
interface UserConfig {
  lunchBreakDuration: number;  // 默认午休时长
}

// API响应 - 识别的时间点
interface RecognizedTime {
  date: string;        // 日期
  times: string[];     // 时间点数组（HH:mm:ss格式）
}
```

### 2. API 服务 (src/services/api.ts)

**主要功能：**

| 函数 | 说明 |
|------|------|
| `recognizeClockTimes(imageFile)` | 调用 GLM-4.6V 识别图片打卡时间 |
| `recognizeClockTimesFromText(text)` | 调用 DeepSeek-V3.2 识别文本打卡时间 |
| `generateFunnyTitle(records)` | 调用 DeepSeek-V2.5 生成搞笑称号 |
| `generateTitleImage(title)` | 调用 Kwai-Kolors 生成称号图片 |
| `calculateWorkHours(checkIn, checkOut, lunchBreak)` | 计算工时 |
| `parseJsonWithRepair(content)` | 修复并解析不完整 JSON |

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
const [config, setConfig] = useState<UserConfig>({ lunchBreakDuration: 1.5 });
const [loading, setLoading] = useState(false);

// 统计数据
const statistics = {
  totalDays: number;           // 出勤天数
  totalHours: number;          // 总工时
  averageHours: number;        // 平均工时
  maxHours: number;            // 最长工时
  minHours: number;            // 最短工时
  lateCount: number;           // 迟到次数
  earlyDepartureCount: number; // 早退次数
};
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
| ChartPanel | 工时趋势折线图 |
| TitleCard | 搞笑称号展示和图片生成 |

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
| 文本识别 | deepseek-ai/DeepSeek-V3.2 | /v1/chat/completions | temperature=0.1, enable_thinking=false |
| 称号生成 | deepseek-ai/DeepSeek-V2.5 | /v1/chat/completions | temperature=0.8 |
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

### 数据覆盖策略

- 新识别数据完全替换已有数据
- 按日期升序排列展示

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
