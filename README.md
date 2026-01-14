# 卷了什么

一个基于 React + AI 的出勤记录与分析工具，支持图片/文本识别、智能称号生成。

## ✨ 功能特性

- **🤖 AI 智能识别** - 支持图片和文本两种识别方式
  - 图片识别：使用 GLM-4.6V 模型识别打卡截图
  - 文本识别：使用 DeepSeek-V3.2 模型解析粘贴文本
- **📊 出勤分析** - 自动计算工时，统计迟到/早退次数
- **🏆 专属称号** - 根据出勤表现生成搞笑称号和图片
- **💾 本地存储** - 数据保存在浏览器localStorage
- **🎨 简洁界面** - 基于 Bootstrap 的响应式设计

## 🚀 快速开始

### 环境要求

- Node.js 16+
- SiliconFlow API Key

### 安装

```bash
npm install
```

### 配置

1. 复制环境变量文件
```bash
cp .env.example .env
```

2. 编辑 `.env`，填入 SiliconFlow API Key
```
VITE_SILICONFLOW_API_KEY=sk-xxx...
```

### 启动

```bash
npm run dev
```

访问 http://localhost:5173

## 📖 使用说明

### 识别打卡记录

**方式一：图片上传**
- 上传打卡截图（支持拖拽）
- AI 自动识别时间点

**方式二：文本粘贴**
- 直接粘贴打卡信息文本
- 默认使用文本识别模式

### 数据规则

- **无效打卡**：早于 7:00 的上班打卡自动过滤
- **迟到判定**：上班时间晚于 9:30
- **早退判定**：下班时间早于 18:00
- **数据覆盖**：新识别数据完全替换旧数据

### 查看分析

- **工时趋势图** - 展示每日工时变化
- **统计数据** - 总天数、总工时、平均工时
- **专属称号** - 根据出勤表现生成的搞笑称号

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Bootstrap 5 | CSS 框架 |
| Chart.js | 图表库 |
| Axios | HTTP 客户端 |

## 📁 项目结构

```
src/
├── main.tsx              # 应用入口
├── App.tsx               # 主组件
├── types/index.ts        # 类型定义
├── services/api.ts       # API 服务
├── hooks/useWorkTime.ts  # 工时管理 Hook
└── components/
    ├── Header.tsx        # 头部
    ├── WorkTimeForm.tsx  # 工时表单
    ├── WorkTimeList.tsx  # 记录列表
    ├── ImageUploader.tsx # 图片上传
    ├── ChartPanel.tsx    # 图表
    └── TitleCard.tsx     # 称号卡片
```

## 🔧 AI 模型

| 功能 | 模型 | 说明 |
|------|------|------|
| 图片识别 | zai-org/GLM-4.6V | 多模态视觉识别 |
| 文本识别 | deepseek-ai/DeepSeek-V3.2 | 自然语言理解 |
| 称号生成 | deepseek-ai/DeepSeek-V2.5 | 创意文案生成 |
| 图片生成 | Kwai-Kolors/Kolors | 文本到图像 |

## 📝 更新日志

### v1.1.0 (2026-01)
- 新增文本识别模式
- 新增搞笑称号和图片生成功能
- 新增迟到/早退统计分析
- 优化识别速度（关闭思考模式）
- 调整数据覆盖逻辑

### v1.0.0 (2026-01)
- 初始版本
- 图片识别工时功能
- 基础工时计算和图表展示

## 📄 许可证

MIT