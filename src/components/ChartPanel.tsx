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
import { WorkTimeRecord } from '../types';

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
}

const ChartPanel: React.FC<ChartPanelProps> = ({ records }) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [showStats, setShowStats] = useState(true);

  // 准备图表数据
  const chartData = useMemo(() => {
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sortedRecords.map(r => r.date.slice(5)), // 只显示月-日
      datasets: [
        {
          label: '每日工时 (小时)',
          data: sortedRecords.map(r => r.workHours),
          backgroundColor: sortedRecords.map(r =>
            r.workHours >= 8 ? 'rgba(75, 192, 192, 0.7)' :
            r.workHours >= 6 ? 'rgba(255, 206, 86, 0.7)' :
            'rgba(255, 99, 132, 0.7)'
          ),
          borderColor: sortedRecords.map(r =>
            r.workHours >= 8 ? 'rgba(75, 192, 192, 1)' :
            r.workHours >= 6 ? 'rgba(255, 206, 86, 1)' :
            'rgba(255, 99, 132, 1)'
          ),
          borderWidth: 1,
          fill: chartType === 'line',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(54, 162, 235, 1)'
        }
      ]
    };
  }, [records, chartType]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y.toFixed(2)} 小时`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 12,
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
  };

  // 计算统计数据
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
          <div className={showStats ? 'col-lg-8' : 'col-12'}>
            <div style={{ height: '300px' }}>
              {chartType === 'bar' ? (
                <Bar data={chartData} options={options} />
              ) : (
                <Line data={chartData} options={options} />
              )}
            </div>
          </div>

          {showStats && stats && (
            <div className="col-lg-4 mt-3 mt-lg-0">
              <div className="stats-card">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;
