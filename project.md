# 项目全景文档 - 卷了么 (AI Worktime Cal)

> 本文档用于 AI 大模型快速了解项目全景，无需逐个文件阅读。
> 最后更新: 2026-01-16

## 1. 项目概述

**项目名称**: 卷了么 (worktime-cal)
**核心功能**: 员工出勤工时计算与分析工具，支持打卡记录识别、工时统计、趋势分析、未来出勤计划预测

**技术栈**:

- 前端: React 18 + TypeScript + Vite
- UI: Bootstrap 5 + 自定义 CSS
- AI API: SiliconFlow (DeepSeek-V3.2, GLM-4.6V)
- 打包: npm + Makefile

**启动命令**:
```bash
make dev     # 开发模式
make build   # 生产构建
make preview # 预览构建产物
```

## 2. 核心功能模块

### 2.1 工时录入
- 图片识别: 上传打卡截图，AI 识别打卡时间 (GLM-4.6V)
- 文本识别: 粘贴打卡文本，AI 解析时间 (DeepSeek-V3.2)
- 手动录入: 手动填写日期和上下班时间

### 2.2 工时分析
- 统计数据: 总天数、总工时、平均工时、最高/最低
- 考勤统计: 迟到次数、早退次数
- 图表展示: 柱状图/折线图显示工时趋势
- 平均线标注: 显示标准工时 (9.5h) 参考线

### 2.3 称号系统
- 根据工时表现生成搞笑称号
- 使用 DeepSeek-V2.5 生成称号 + 鼓励语
- 可生成对应图片 (Kwai-Kolors)

### 2.4 未来出勤计划 (核心功能)
- 预测未来5个工作日需要达到的工时
- 支持三种策略模式: 躺平 (85%) / 牛马 (100%) / 卷王 (120%)
- AI 生成打卡时间建议 (DeepSeek-V3.2)
- **周五特殊规则**: 周五固定8小时，缺的时长分摊到其余4天
- 策略缓存机制: 首次请求AI后缓存，切换策略复用缓存

## 3. 目录结构

```
worktime-cal/
├── src/
│   ├── main.tsx              # 应用入口
│   ├── App.tsx               # 主组件
│   ├── types/index.ts        # TypeScript 类型定义
│   ├── hooks/useWorkTime.ts  # 工时状态管理 Hook
│   ├── services/
│   │   ├── api.ts            # AI API 调用 (识别、称号、打卡建议)
│   │   └── prediction.ts     # 预测计算逻辑
│   ├── components/
│   │   ├── Header.tsx        # 顶部导航
│   │   ├── ImageUploader.tsx # 图片上传组件
│   │   ├── WorkTimeForm.tsx  # 手动录入表单
│   │   ├── WorkTimeList.tsx  # 工时记录列表
│   │   ├── ChartPanel.tsx    # 图表展示面板
│   │   ├── TitleCard.tsx     # 称号卡片
│   │   └── FuturePlan.tsx    # 未来出勤计划
│   └── styles/main.css       # 全局样式
├── docs/
│   ├── TECHNICAL.md          # 技术文档 (开发用)
│   └── USER_GUIDE.md         # 用户指南 (用户用)
├── spec/
│   └── instructions.md       # 初始需求文档 (已过时)
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
└── Makefile
```

## 4. 迭代历史 (重要变更记录)

### v1.0 - 基础功能 (早期)
- [x] 图片/文本识别打卡时间
- [x] 工时计算 (考虑午休)
- [x] 柱状图/折线图展示

### v1.1 - 称号系统
- [x] 添加 DeepSeek-V2.5 生成搞笑称号
- [x] 支持 Kolors 图片生成

### v1.2 - 未来出勤计划 (2026-01 重大更新)
- [x] 新增 FuturePlan 组件
- [x] 三种策略模式 (躺平/牛马/卷王)
- [x] AI 生成打卡时间建议 (DeepSeek-V3.2)
- [x] 单次 API 调用返回5天数据 (优化)

### v1.3 - 优化与修复 (2026-01)
- [x] 打卡时间约束: 上班 ≤ 9:30，下班 ≥ 18:00
- [x] 策略缓存机制 (localStorage 持久化)
- [x] 躺平模式特殊处理: 目标 < 8h 时传 8h 给模型
- [x] Loading 提示改为 "数据预测中"

### v1.4 - 周五特殊规则 (2026-01-16 最新)
- [x] 周五固定8小时打卡 (09:30-18:00)
- [x] 缺的时长分摊到其余4天
- [x] PredictionResult 新增 fridayTarget, fridayCount 字段
- [x] 建议文案更新显示周五规则

## 5. 业务规则汇总

### 5.1 工时计算规则
```typescript
// 正常情况: 工时 = (午休开始 - 上班) + (下班 - 午休结束)
// 上班在午休后: 工时 = 下班 - 上班
// 上班在午休中: 工时 = 下班 - 午休结束
// 缺勤: 只有上班或下班打卡 = 0
```

### 5.2 考勤判定
- 迟到: 上班时间 > 9:30
- 早退: 下班时间 < 18:00

### 5.3 策略系数
| 策略 | 系数 | 说明 |
|------|------|------|
| 躺平 | 0.85 | 85% 标准工时 |
| 牛马 | 1.0 | 100% 标准工时 |
| 卷王 | 1.2 | 120% 标准工时 |

### 5.4 周五特殊规则
- 周五固定 8 小时 (09:30-18:00)
- 其余工作日分摊达标所需工时

### 5.5 躺平模式特殊处理
- 目标工时 < 8h 时，传 8h 给 AI 模型计算打卡时间
- 避免过早上班或过晚下班

## 6. AI 模型使用清单

| 功能 | 模型 | 参数 | 说明 |
|------|------|------|------|
| 图片识别 | GLM-4.6V | temperature=0.1 | 识别打卡截图 |
| 文本识别 | DeepSeek-V3.2 | temperature=0.1, enable_thinking=false | 解析打卡文本 |
| 打卡时间建议 | DeepSeek-V3.2 | temperature=0.3, enable_thinking=false | 单次API返回5天 |
| 称号生成 | DeepSeek-V2.5 | temperature=0.8 | JSON格式返回 |
| 图片生成 | Kwai-Kolors | width=1024, height=1024 | 生成称号配图 |

## 7. 数据存储

- 所有数据存储在浏览器 `localStorage`
- Key 列表: `worktime_records`, `worktime_config`, `worktime_future_plan`, `worktime_strategy`, `worktime_strategy_cache`
- 清除浏览器缓存会导致数据丢失

## 8. 环境配置

```env
# .env 文件
VITE_SILICONFLOW_API_KEY=your_api_key_here
```

## 9. 关键文件速查

| 功能 | 文件路径 | 关键函数/组件 |
|------|----------|---------------|
| 工时状态管理 | src/hooks/useWorkTime.ts | useWorkTime() |
| 预测计算 | src/services/prediction.ts | calculateFutureTarget(), isFriday() |
| AI API 调用 | src/services/api.ts | generateClockTimeSuggestionsFor5Days() |
| 未来计划组件 | src/components/FuturePlan.tsx | FuturePlan 组件 |
| 类型定义 | src/types/index.ts | PredictionResult, FuturePlanDay |

## 10. 快速上手 (AI 视角)

1. **修改预测逻辑**: 修改 `src/services/prediction.ts` 的 `calculateFutureTarget` 函数
2. **修改打卡时间建议**: 修改 `src/services/api.ts` 的 `generateClockTimeSuggestionsFor5Days` 函数
3. **修改 UI 展示**: 修改 `src/components/FuturePlan.tsx`
4. **更新文档**: 同步更新 `docs/TECHNICAL.md` 和 `docs/USER_GUIDE.md`
5. **构建验证**: 运行 `make build` 确保无错误

---

> 如有疑问，先查看 `docs/TECHNICAL.md` 获取详细技术说明。
