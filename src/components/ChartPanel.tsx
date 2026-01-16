import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { WorkTimeRecord, FuturePlanDay, PlanStrategy } from '../types';
import { calculateCumulativeAvgWithFuture } from '../services/prediction';
import FuturePlan from './FuturePlan';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ChartPanelProps {
  records: WorkTimeRecord[];
  standardWorkHours?: number;
  futurePlan?: FuturePlanDay[];
  strategy?: PlanStrategy;
  onUpdateFuturePlan?: (plan: FuturePlanDay[]) => void;
  onUpdateStrategy?: (strategy: PlanStrategy) => void;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ 
  records, 
  standardWorkHours = 9.5,
  futurePlan = [],
  strategy = 'normal',
  onUpdateFuturePlan,
  onUpdateStrategy
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [showStats, setShowStats] = useState(true);

  // 准备图表数据
  const chartData: any = useMemo(() => {
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const workHoursArray = sortedRecords.map(r => r.workHours);
    const dates = sortedRecords.map(r => r.date.slice(5));

    // 使用 futurePlan 中的日期，而不是固定的 getFutureDates(5)
    const futureDates = futurePlan.map(p => p.date.slice(5));
    
    // 合并历史和未来日期
    const allDates = [...dates, ...futureDates];

    // 如果没有未来计划，只返回历史数据
    if (futurePlan.length === 0) {
      const cumulativeAvg = workHoursArray.reduce((acc, hours, idx) => {
        const sum = (acc[idx - 1]?.sum || 0) + hours;
        const avg = sum / (idx + 1);
        acc.push({ sum, avg });
        return acc;
      }, [] as { sum: number; avg: number }[]).map(item => item.avg);

      return {
        labels: dates,
        datasets: [
          {
            label: '每日工时 (小时)',
            data: workHoursArray,
            backgroundColor: (context: any) => {
              const value = context.raw;
              return value >= 8 ? 'rgba(75, 192, 192, 0.7)' :
                value >= 6 ? 'rgba(255, 206, 86, 0.7)' :
                'rgba(255, 99, 132, 0.7)';
            },
            borderColor: (context: any) => {
              const value = context.raw;
              return value >= 8 ? 'rgba(75, 192, 192, 1)' :
                value >= 6 ? 'rgba(255, 206, 86, 1)' :
                'rgba(255, 99, 132, 1)';
            },
            borderWidth: 1,
            fill: chartType === 'line',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)'
          },
          {
            label: '平均工时',
            data: cumulativeAvg,
            type: 'line' as const,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            fill: false,
            tension: 0.1,
            borderDash: [5, 5]
          }
        ],
        standardWorkHours,
        historicalCount: sortedRecords.length
      };
    }

    // 历史数据的累计平均
    const cumulativeAvg = workHoursArray.reduce((acc, hours, idx) => {
      const sum = (acc[idx - 1]?.sum || 0) + hours;
      const avg = sum / (idx + 1);
      acc.push({ sum, avg });
      return acc;
    }, [] as { sum: number; avg: number }[]).map(item => item.avg);

    // 创建预测数据数组（长度为 allDates，确保索引对齐）
    const allWorkHoursData = new Array(allDates.length).fill(null);
    const allAvgData = new Array(allDates.length).fill(null);
    
    // 填充历史数据
    workHoursArray.forEach((hours, idx) => {
      allWorkHoursData[idx] = hours;
    });
    
    // 填充历史平均
    cumulativeAvg.forEach((avg, idx) => {
      allAvgData[idx] = avg;
    });
    
    // 填充预测数据（从历史数据末尾开始）
    futurePlan.forEach((plan, idx) => {
      const dataIndex = dates.length + idx;
      if (dataIndex < allDates.length) {
        allWorkHoursData[dataIndex] = plan.plannedHours;
      }
    });

    // 计算包含预测的累计平均
    const allCumulativeAvg = calculateCumulativeAvgWithFuture(records, futurePlan);
    
    // 填充预测部分的累计平均
    allCumulativeAvg.forEach((item) => {
      if (item.isFuture) {
        const dataIndex = allDates.findIndex(d => d === item.date.slice(5));
        if (dataIndex >= 0) {
          allAvgData[dataIndex] = item.avg;
        }
      }
    });

    // 基础数据
    const baseData: any = {
      labels: allDates,
      datasets: [
        {
          label: '每日工时 (小时)',
          data: allWorkHoursData,
          backgroundColor: (context: any) => {
            const idx = context.dataIndex;
            const value = context.raw;
            if (value === null) return 'transparent';
            // 历史数据用颜色区分
            if (idx < workHoursArray.length) {
              return value >= 8 ? 'rgba(75, 192, 192, 0.7)' :
                value >= 6 ? 'rgba(255, 206, 86, 0.7)' :
                'rgba(255, 99, 132, 0.7)';
            }
            // 预测数据用灰色半透明
            return 'rgba(156, 163, 175, 0.5)';
          },
          borderColor: (context: any) => {
            const idx = context.dataIndex;
            const value = context.raw;
            if (value === null) return 'transparent';
            if (idx < workHoursArray.length) {
              return value >= 8 ? 'rgba(75, 192, 192, 1)' :
                value >= 6 ? 'rgba(255, 206, 86, 1)' :
                'rgba(255, 99, 132, 1)';
            }
            return 'rgba(156, 163, 175, 0.8)';
          },
          borderWidth: (context: any) => {
            return context.raw === null ? 0 : 1;
          },
          fill: chartType === 'line',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: (context: any) => {
            const idx = context.dataIndex;
            const value = context.raw;
            if (value === null) return 'transparent';
            if (idx < workHoursArray.length) {
              return 'rgba(54, 162, 235, 1)';
            }
            return 'rgba(156, 163, 175, 0.8)';
          }
        },
        {
          label: '平均工时',
          data: allAvgData,
          type: 'line' as const,
          borderColor: (context: any) => {
            const idx = context.dataIndex;
            // 预测部分的平均线用灰色
            if (idx >= workHoursArray.length) {
              return 'rgba(156, 163, 175, 0.8)';
            }
            return 'rgba(54, 162, 235, 1)';
          },
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderWidth: 2,
          pointRadius: (context: any) => {
            return context.raw === null ? 0 : 3;
          },
          pointBackgroundColor: (context: any) => {
            const idx = context.dataIndex;
            if (context.raw === null) return 'transparent';
            if (idx >= workHoursArray.length) {
              return 'rgba(156, 163, 175, 0.8)';
            }
            return 'rgba(54, 162, 235, 1)';
          },
          fill: false,
          tension: 0.1,
          borderDash: (context: any) => {
            const idx = context.dataIndex;
            if (idx >= workHoursArray.length) {
              return [2, 2]; // 预测部分更短的虚线
            }
            return [5, 5];
          }
        }
      ]
    };

    // 只有折线图才添加标准线
    if (chartType === 'line') {
      // 历史部分标准线
      const historicalStandard = sortedRecords.map(() => standardWorkHours);
      // 预测部分标准线
      const futureStandard = new Array(futurePlan.length).fill(standardWorkHours);
      
      baseData.datasets.push({
        label: '标准工时',
        data: [...historicalStandard, ...futureStandard],
        type: 'line' as const,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        fill: false,
        tension: 0,
        borderDash: [5, 5]
      });
    }

    return { ...baseData, standardWorkHours, historicalCount: sortedRecords.length };
  }, [records, chartType, standardWorkHours, futurePlan]);

  // 自定义插件：绘制标准工时水平线（柱状图）
  const avgLinePlugin = useMemo(() => ({
    id: 'avgLine',
    afterDraw: (chart: any) => {
      if (chartType !== 'bar' || (records.length === 0 && futurePlan.length === 0)) return;

      const { ctx, scales: { y } } = chart;
      const yPosition = y.getPixelForValue(standardWorkHours);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chart.chartArea.left, yPosition);
      ctx.lineTo(chart.chartArea.right, yPosition);
      ctx.strokeStyle = 'rgba(255, 99, 132, 1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      // 绘制标签
      ctx.fillStyle = 'rgba(255, 99, 132, 1)';
      ctx.font = '12px sans-serif';
      ctx.fillText(`标准 ${standardWorkHours.toFixed(1)}h`, chart.chartArea.right - 70, yPosition - 8);

      ctx.restore();
    }
  }), [chartType, records.length, standardWorkHours, futurePlan.length]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (context.raw === null) return '';
            if (context.dataset.label === '标准工时') {
              return `标准工时: ${context.parsed.y?.toFixed(2) || context.raw.toFixed(2)} 小时`;
            }
            if (context.dataset.label === '平均工时') {
              return `平均工时: ${context.parsed.y?.toFixed(2) || context.raw.toFixed(2)} 小时`;
            }
            const isFuture = context.dataIndex >= (chartData.historicalCount || 0);
            const prefix = isFuture ? '📅 计划 ' : '';
            return `${prefix}${context.parsed.y?.toFixed(2) || context.raw.toFixed(2)} 小时`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.max(12, ...futurePlan.map(p => p.plannedHours), ...records.map(r => r.workHours)) + 2,
        title: {
          display: true,
          text: '工时 (小时)'
        }
      },
      x: {
        title: {
          display: true,
          text: '日期'
        }
      }
    }
  }), [chartType, chartData.historicalCount, futurePlan, records]);

  // 计算统计数据（仅历史数据）
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const totalHours = records.reduce((sum, r) => sum + r.workHours, 0);
    const avgHours = totalHours / records.length;
    const maxHours = Math.max(...records.map(r => r.workHours));
    const minHours = Math.min(...records.map(r => r.workHours));
    const standardDeviation = Math.sqrt(
      records.reduce((sum, r) => sum + Math.pow(r.workHours - avgHours, 2), 0) / records.length
    );

    return {
      totalHours: totalHours.toFixed(1),
      avgHours: avgHours.toFixed(2),
      maxHours: maxHours.toFixed(2),
      minHours: minHours.toFixed(2),
      standardDeviation: standardDeviation.toFixed(2),
      daysOver8: records.filter(r => r.workHours >= 8).length,
      daysUnder6: records.filter(r => r.workHours < 6).length
    };
  }, [records]);

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>📈 工时分析</span>
        <div className="d-flex gap-2">
          <div className="btn-group btn-group-sm">
            <button
              className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setChartType('bar')}
            >
              柱状图
            </button>
            <button
              className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setChartType('line')}
            >
              折线图
            </button>
          </div>
          <button
            className={`btn btn-sm ${showStats ? 'btn-info' : 'btn-outline-info'}`}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '隐藏统计' : '显示统计'}
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="row">
          {/* 左侧区域：图表 + 出勤计划 */}
          <div className={showStats ? 'col-lg-8' : 'col-12'}>
            {/* 上方：图表 */}
            <div style={{ height: '280px' }} key={`${standardWorkHours}-${futurePlan.length}-${strategy}`}>
              {chartType === 'bar' ? (
                <Bar data={chartData} options={options} plugins={[avgLinePlugin]} />
              ) : (
                <Line data={chartData} options={options} />
              )}
            </div>
            
            {/* 下方：出勤计划 */}
            {onUpdateFuturePlan && onUpdateStrategy && (
              <div className="mt-3">
                <FuturePlan
                  records={records.map(r => ({ date: r.date, workHours: r.workHours }))}
                  standardWorkHours={standardWorkHours}
                  futurePlan={futurePlan}
                  strategy={strategy}
                  onUpdateFuturePlan={onUpdateFuturePlan}
                  onUpdateStrategy={onUpdateStrategy}
                />
              </div>
            )}
          </div>

          {/* 右侧区域：统计摘要 */}
          {showStats && stats && (
            <div className="col-lg-4 mt-3 mt-lg-0">
              <div className="stats-card" style={{ height: '100%' }}>
                <h6 className="mb-3">📊 统计摘要</h6>
                
                <div className="stat-item">
                  <span className="stat-label">总天数</span>
                  <span className="stat-value">{records.length} 天</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">总工时</span>
                  <span className="stat-value">{stats.totalHours} 小时</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">平均工时</span>
                  <span className="stat-value text-primary">{stats.avgHours} 小时</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">最高工时</span>
                  <span className="stat-value text-success">{stats.maxHours} 小时</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">最低工时</span>
                  <span className="stat-value text-danger">{stats.minHours} 小时</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">标准差</span>
                  <span className="stat-value">{stats.standardDeviation}</span>
                </div>
                
                <hr />
                
                <div className="stat-item">
                  <span className="stat-label">≥8小时天数</span>
                  <span className="stat-value text-success">{stats.daysOver8} 天</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">&lt;6小时天数</span>
                  <span className="stat-value text-danger">{stats.daysUnder6} 天</span>
                </div>

                {futurePlan.length > 0 && (
                  <>
                    <hr />
                    <div className="stat-item">
                      <span className="stat-label">📅 计划工时</span>
                      <span className="stat-value text-info">
                        {futurePlan.reduce((sum, p) => sum + p.plannedHours, 0).toFixed(1)} 小时
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;
