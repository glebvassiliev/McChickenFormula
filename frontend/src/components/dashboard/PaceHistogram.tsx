/**
 * PaceHistogram - Last 5 laps vs target visualization (Zone C - Right)
 * Features: Bar chart with delta coloring
 */
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import type { RacePaceOutput, LapPrediction } from '../../types/dashboard';

interface PaceHistogramProps {
  pacePrediction: RacePaceOutput | null;
  recentLaps: { lap: number; time: number }[];
  targetTime: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0]?.payload;
  const delta = data?.delta || 0;
  const deltaColor = delta < 0 ? '#00FF00' : delta > 0 ? '#FF0000' : '#666';
  
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs font-semibold text-neutral-400 mb-2">LAP {label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-neutral-400">Lap Time:</span>
          <span className="font-mono text-white">{data?.time?.toFixed(3)}s</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-neutral-400">Delta:</span>
          <span className="font-mono" style={{ color: deltaColor }}>
            {delta >= 0 ? '+' : ''}{delta?.toFixed(3)}s
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PaceHistogram({
  pacePrediction,
  recentLaps,
  targetTime
}: PaceHistogramProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    // Use recent laps or generate mock data
    const laps = recentLaps.length >= 5 
      ? recentLaps.slice(-5) 
      : Array.from({ length: 5 }, (_, i) => ({
          lap: i + 1,
          time: targetTime + (Math.random() - 0.5) * 2
        }));
    
    return laps.map((lap) => ({
      lap: lap.lap,
      time: lap.time,
      delta: lap.time - targetTime,
      fill: lap.time < targetTime ? '#00FF00' : lap.time > targetTime ? '#FF0000' : '#666'
    }));
  }, [recentLaps, targetTime]);

  const yDomain = useMemo(() => {
    const times = chartData.map(d => d.time);
    const min = Math.min(...times, targetTime) - 0.5;
    const max = Math.max(...times, targetTime) + 0.5;
    return [Math.floor(min * 2) / 2, Math.ceil(max * 2) / 2];
  }, [chartData, targetTime]);

  // Calculate average pace
  const averagePace = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((sum, d) => sum + d.time, 0) / chartData.length;
  }, [chartData]);

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="bento-card-header">
        <h3 className="bento-card-title">Pace Analysis</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500">Target:</span>
          <span className="font-mono text-xs text-tire-medium">
            {targetTime.toFixed(3)}s
          </span>
        </div>
      </div>
      
      <div className="flex-1 p-3 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 5, left: 0, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#262626" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="lap"
              stroke="#404040"
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={{ stroke: '#404040' }}
              axisLine={{ stroke: '#404040' }}
            />
            
            <YAxis 
              stroke="#404040"
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={{ stroke: '#404040' }}
              axisLine={{ stroke: '#404040' }}
              domain={yDomain}
              tickFormatter={(v) => `${v.toFixed(1)}`}
              width={40}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Target time line */}
            <ReferenceLine 
              y={targetTime} 
              stroke="#FFD700" 
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            
            <Bar 
              dataKey="time" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Footer */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-2">
        <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Avg Pace</div>
          <div className="font-mono text-sm text-white">
            {averagePace?.toFixed(3) || '--'}s
          </div>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Trend</div>
          <div className={`font-mono text-sm ${
            pacePrediction?.performance_assessment?.trend === 'improving' 
              ? 'text-timing-green' 
              : 'text-racing-red'
          }`}>
            {pacePrediction?.performance_assessment?.trend?.toUpperCase() || '--'}
          </div>
        </div>
      </div>
    </div>
  );
}
