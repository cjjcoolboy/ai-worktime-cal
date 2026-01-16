import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FuturePlanDay, PredictionResult, STRATEGIES, PlanStrategy } from '../types';
import { calculateFutureTarget, getFutureDates, generateSuggestion, isFriday } from '../services/prediction';
import { generateClockTimeSuggestionsFor5Days, getApiKey } from '../services/api';

interface FuturePlanProps {
  records: { date: string; workHours: number }[];
  standardWorkHours: number;
  futurePlan: FuturePlanDay[];
  strategy: PlanStrategy;
  onUpdateFuturePlan: (plan: FuturePlanDay[]) => void;
  onUpdateStrategy: (strategy: PlanStrategy) => void;
}

// 按策略缓存预测数据
interface CachedStrategyData {
  checkIn: string;
  checkOut: string;
  targetHours: number;
}

const CACHE_KEY = 'worktime_strategy_cache';

const FuturePlan: React.FC<FuturePlanProps> = ({
  records,
  standardWorkHours,
  futurePlan,
  strategy,
  onUpdateFuturePlan,
  onUpdateStrategy
}) => {
  // 加载状态
  const [loading, setLoading] = useState(false);
  // 策略缓存数据
  const strategyCache = useRef<Map<PlanStrategy, CachedStrategyData>>(new Map());

  // 使用 ref 防止重复调用
  const isInitialMount = useRef(true);

  // 加载本地缓存
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, value]) => {
          strategyCache.current.set(key as PlanStrategy, value as CachedStrategyData);
        });
      }
    } catch (e) {
      console.error('加载缓存失败:', e);
    }
  }, []);

  // 保存缓存到本地
  const saveCache = () => {
    try {
      const cacheObj: Record<string, CachedStrategyData> = {};
      strategyCache.current.forEach((value, key) => {
        cacheObj[key] = value;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (e) {
      console.error('保存缓存失败:', e);
    }
  };

  // 获取未来工作日日期
  const futureDates = getFutureDates(5);

  // 计算预测结果（传入futureDates以检测周五）
  const prediction: PredictionResult = calculateFutureTarget(
    records.map(r => ({
      ...r,
      id: '',
      checkIn: '',
      checkOut: '',
      lunchBreakStart: '',
      lunchBreakEnd: ''
    })),
    standardWorkHours,
    5,
    strategy,
    futureDates
  );

  // 计算实际工作日数量
  const workDaysCount = futureDates.length;

  // 获取当前策略的显示名称
  const currentStrategy = STRATEGIES.find(s => s.id === strategy);
  const strategyName = currentStrategy?.name || '正常模式';

  const suggestion = generateSuggestion(prediction, workDaysCount, strategyName, futureDates);

  // 本地计算打卡时间（备选方案）
  const calculateClockTimeLocal = (targetHours: number): { checkIn: string; checkOut: string } => {
    const latestCheckIn = 9 * 60 + 30;  // 9:30
    const earliestCheckOut = 18 * 60;   // 18:00

    if (targetHours >= 8) {
      return { checkIn: '09:30', checkOut: '19:00' };
    }

    const stayMinutes = targetHours * 60 + 90; // 停留时间 = 工时 + 午休90分钟
    const targetStayMinutes = 8 * 60 + 90;     // 标准9.5小时停留
    const diffMinutes = targetStayMinutes - stayMinutes;

    const advanceMinutes = Math.round(diffMinutes * 0.6);
    const delayMinutes = diffMinutes - advanceMinutes;

    let checkInMinutes = latestCheckIn - advanceMinutes;
    if (checkInMinutes < 7 * 60) checkInMinutes = 7 * 60;

    let checkOutMinutes = earliestCheckOut + delayMinutes;
    if (checkOutMinutes > 23 * 60 + 59) checkOutMinutes = 23 * 60 + 59;

    return {
      checkIn: `${Math.floor(checkInMinutes / 60).toString().padStart(2, '0')}:${(checkInMinutes % 60).toString().padStart(2, '0')}`,
      checkOut: `${Math.floor(checkOutMinutes / 60).toString().padStart(2, '0')}:${(checkOutMinutes % 60).toString().padStart(2, '0')}`
    };
  };

  // 创建默认计划
  const createDefaultPlan = useCallback(async (targetHours: number, fridayTarget: number, strategyId: PlanStrategy) => {
    const cached = strategyCache.current.get(strategyId);

    let clockSuggestions: { checkIn: string; checkOut: string }[] = [];

    if (cached && Math.abs(cached.targetHours - targetHours) < 0.01) {
      // 有缓存且目标工时相同，使用缓存
      clockSuggestions = Array(5).fill({ checkIn: cached.checkIn, checkOut: cached.checkOut });
    } else {
      // 无缓存或目标工时不同，需要请求模型
      const apiKey = getApiKey();
      if (apiKey) {
        setLoading(true);

        // 躺平模式且目标工时低于8小时时，置为8小时传给模型
        let modelTargetHours = targetHours;
        if (strategyId === 'relaxed' && targetHours < 8) {
          modelTargetHours = 8;
        }

        // 检查是否有周五
        const hasFriday = futureDates.some(date => isFriday(date));

        const modelResults = await generateClockTimeSuggestionsFor5Days(
          modelTargetHours,
          '12:00',
          '13:30',
          hasFriday ? fridayTarget : undefined  // 传入周五目标工时
        );

        if (hasFriday && modelResults.length === 5) {
          // 周五使用特殊的打卡时间（8小时）
          const fridaySuggestion = calculateClockTimeLocal(fridayTarget);
          // 保持模型返回的其他4天建议，只替换周五
          clockSuggestions = futureDates.map((date, index) => {
            if (isFriday(date)) {
              return fridaySuggestion;
            }
            return modelResults[index] || { checkIn: '09:30', checkOut: '19:00' };
          });
        } else {
          clockSuggestions = modelResults;
        }

        // 保存到缓存
        strategyCache.current.set(strategyId, {
          checkIn: modelResults[0]?.checkIn || '09:30',
          checkOut: modelResults[0]?.checkOut || '19:00',
          targetHours
        });
        saveCache();
        setLoading(false);
      } else {
        // 无API Key，使用本地计算
        const normalLocal = calculateClockTimeLocal(targetHours);
        const fridayLocal = calculateClockTimeLocal(fridayTarget);
        clockSuggestions = futureDates.map(date => isFriday(date) ? fridayLocal : normalLocal);
      }
    }

    const newPlan = futureDates.map((date, index) => {
      const isFri = isFriday(date);
      return {
        date,
        plannedHours: isFri ? fridayTarget : targetHours,
        note: isFri ? '周五8小时' : '推荐目标',
        suggestedCheckIn: clockSuggestions[index]?.checkIn || '09:30',
        suggestedCheckOut: clockSuggestions[index]?.checkOut || '19:00'
      };
    });

    onUpdateFuturePlan(newPlan);
  }, [futureDates, onUpdateFuturePlan]);

  // 确保 futurePlan 存在且日期匹配，或者策略变化时更新
  useEffect(() => {
    // 首次挂载时不执行，等待数据加载完成
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // 首次加载当前策略（传入周五目标）
      createDefaultPlan(prediction.dailyTarget, prediction.fridayTarget || prediction.dailyTarget, strategy);
      return;
    }

    const needsRecreate =
      futurePlan.length === 0 ||
      futurePlan.length !== workDaysCount ||
      futurePlan.some((p, idx) => {
        if (idx >= workDaysCount) return false;
        const targetForDay = isFriday(p.date) ? (prediction.fridayTarget || prediction.dailyTarget) : prediction.dailyTarget;
        return Math.abs(p.plannedHours - targetForDay) > 0.01;
      });

    if (needsRecreate) {
      createDefaultPlan(prediction.dailyTarget, prediction.fridayTarget || prediction.dailyTarget, strategy);
    }
  }, [workDaysCount, prediction.dailyTarget, prediction.fridayTarget, strategy, futurePlan]);

  // 更新单日计划（使用本地计算）
  const updateDayPlan = useCallback((index: number, hours: number) => {
    const newPlan = [...futurePlan];
    if (newPlan[index]) {
      const adjusted = calculateClockTimeLocal(hours);
      newPlan[index] = {
        ...newPlan[index],
        plannedHours: hours,
        suggestedCheckIn: adjusted.checkIn,
        suggestedCheckOut: adjusted.checkOut
      };
      onUpdateFuturePlan(newPlan);
    }
  }, [futurePlan, onUpdateFuturePlan]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const monthDay = `${date.getMonth() + 1}/${date.getDate()}`;
    const weekDay = weekDays[date.getDay()];
    return `${monthDay} (${weekDay})`;
  };

  // 切换策略
  const handleStrategyChange = (newStrategy: PlanStrategy) => {
    onUpdateStrategy(newStrategy);
  };

  // 检查当前策略是否已缓存
  const isCurrentStrategyCached = strategyCache.current.has(strategy);

  return (
    <div className="card" style={{ fontSize: '0.85rem' }}>
      <div className="card-header py-2 px-3">
        {/* 策略选择器 */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <span className="fw-bold">📅 未来{workDaysCount}个工作日出勤计划</span>
          <div className="btn-group btn-group-sm">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                className={`btn ${strategy === s.id ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleStrategyChange(s.id)}
                title={s.description}
                style={{ fontSize: '0.7rem' }}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>
        {/* 策略说明 */}
        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
          {currentStrategy?.description} · {prediction.targetAvg}h 目标平均
          {isCurrentStrategyCached && <span className="ms-2 text-success">✓ 已缓存</span>}
          {!getApiKey() && <span className="ms-2 text-warning">（本地计算）</span>}
        </div>
      </div>
      <div className="card-body py-2 px-3">
        {/* 预测分析结果 */}
        <div className="prediction-summary mb-3">
          <div className="row g-3 text-center">
            <div className="col-3">
              <div className="summary-item">
                <div className="summary-label" style={{ fontSize: '0.7rem' }}>当前平均</div>
                <div className="summary-value" style={{ fontSize: '0.95rem' }}>{prediction.currentAvg}h</div>
              </div>
            </div>
            <div className="col-3">
              <div className="summary-item">
                <div className="summary-label" style={{ fontSize: '0.7rem' }}>目标平均</div>
                <div className="summary-value text-primary" style={{ fontSize: '0.95rem' }}>{prediction.targetAvg}h</div>
              </div>
            </div>
            <div className="col-3">
              <div className="summary-item">
                <div className="summary-label" style={{ fontSize: '0.7rem' }}>未来需达到</div>
                <div className={`summary-value ${!prediction.isAchievable ? 'text-warning' : 'text-success'}`} style={{ fontSize: '0.95rem' }}>
                  {prediction.dailyTarget}h/天
                </div>
              </div>
            </div>
            <div className="col-3">
              <div className="summary-item">
                <div className="summary-label" style={{ fontSize: '0.7rem' }}>建议</div>
                <div className="summary-value-small" style={{ fontSize: '0.65rem' }}>{suggestion}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 每日计划输入 - 横向排列 */}
        <div className="plan-days">
          <div className="row g-2">
            {futureDates.map((date, index) => {
              const plan = futurePlan[index] || { date, plannedHours: prediction.dailyTarget };
              return (
                <div key={date} className="col">
                  <div className="plan-day-card text-center py-2 px-2">
                    <div className="plan-date mb-1" style={{ fontSize: '0.8rem' }}>{formatDate(date)}</div>
                    <input
                      type="number"
                      className="form-control form-control-sm plan-input text-center mb-1"
                      value={plan.plannedHours}
                      onChange={(e) => updateDayPlan(index, parseFloat(e.target.value) || 0)}
                      step="0.5"
                      min="0"
                      max="24"
                      style={{ fontSize: '0.9rem', height: '28px' }}
                    />
                    <div className="plan-unit mb-2" style={{ fontSize: '0.7rem' }}>小时</div>
                    {/* 打卡时间建议 */}
                    <div className="clock-time-suggestion">
                      <div className="check-in-time text-primary" style={{ fontSize: '0.75rem' }}>
                        🏢 {plan.suggestedCheckIn || '--:--'}
                      </div>
                      <div className="check-out-time text-success" style={{ fontSize: '0.75rem' }}>
                        🏠 {plan.suggestedCheckOut || '--:--'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center mt-2">
            <small className="text-muted">
              <span className="spinner-border spinner-border-sm me-1"></span>
              数据预测中...
            </small>
          </div>
        )}

        {/* 图例说明 */}
        <div className="mt-3 text-center">
          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
            <span className="legend-dot" style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              marginRight: '5px',
              borderRadius: '2px',
              verticalAlign: 'middle'
            }}></span>
            预测数据将在图表中以虚线显示
          </small>
        </div>
      </div>
    </div>
  );
};

export default FuturePlan;
