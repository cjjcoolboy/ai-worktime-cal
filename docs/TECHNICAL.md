# 工时计算器 - 技术文档

## 项目概述

工时计算器是一个基于 React 的 Web 应用程序，用于帮助用户记录、计算和可视化日常工作时长。支持手动录入和 AI 智能识别打卡记录两种方式。

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
│   │   ├── ImageUploader.tsx # 图片上传组件
│   │   └── ChartPanel.tsx    # 图表展示组件
│   └── styles/
│       └── main.css          # 全局样式
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
  checkIn: string;      // 上班时间 HH:mm
  checkOut: string;     // 下班时间 HH:mm
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
  times: string[];     // 时间点数组
}
```

### 2. API 服务 (src/services/api.ts)

**主要功能：**

- `recognizeClockTimes(imageFile)` - 调用 SiliconFlow AI 识别图片中的打卡时间
- `calculateWorkHours(checkIn, checkOut, lunchBreak)` - 计算工时
- `formatTime(date)` - 格式化时间为 HH:mm
- `generateId()` - 生成唯一 ID
- `fileToBase64(file)` - 图片转 Base64

**AI 识别流程：**
```
图片上传 → Base64 编码 → 构建多模态请求 → 调用 SiliconFlow API → 解析 JSON 响应 → 返回识别结果
```

### 3. 状态管理 (src/hooks/useWorkTime.ts)

使用 React Hooks 进行状态管理：

- `records` - 工时记录数组
- `config` - 用户配置（午休时长等）
- `loading` - 加载状态
- `statistics` - 统计数据（总天数、总工时、平均工时等）

数据持久化：使用 localStorage 保存记录和配置

### 4. 组件说明

| 组件 | 功能 |
|------|------|
| Header | 页面头部，展示标题 |
| WorkTimeForm | 手动录入工时，配置午休时长 |
| WorkTimeList | 展示工时记录列表，支持编辑和删除 |
| ImageUploader | 上传打卡截图，调用 AI 识别 |
| ChartPanel | 使用 Chart.js 展示工时趋势图 |

## API 集成

### SiliconFlow 配置

项目使用 SiliconFlow 的 Qwen2.5-VL-72B-Instruct 模型进行图片识别。

**环境变量：**
```
VITE_SILICONFLOW_API_KEY=your_api_key_here
```

**请求格式：**
```json
{
  "model": "Qwen/Qwen2.5-VL-72B-Instruct",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "image_url", "image_url": { "url": "data:image/..." } },
        { "type": "text", "text": "请识别这张打卡记录截图中的所有打卡时间..." }
      ]
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.1
}
```

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

主要依赖：
- `react` / `react-dom` - React 核心库
- `bootstrap` - 样式框架
- `chart.js` / `react-chartjs-2` - 图表库
- `axios` - HTTP 请求

开发依赖：
- `@types/react` / `@types/react-dom` - React 类型定义
- `@vitejs/plugin-react` - Vite React 插件
- `typescript` - TypeScript 编译器
- `vite` - 构建工具
