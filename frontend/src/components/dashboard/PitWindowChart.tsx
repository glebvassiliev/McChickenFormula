/**
 * PitWindowChart - Strategy Engine main chart (Zone B - Center)
 * Features: Line chart with undercut window visualization
 */
import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend
} from 'recharts';
import type { PitWindowDataPoint, PitStopPrediction } from '../../types/dashboard';

interface PitWindowChartProps {
  data: PitWindowDataPoint[];
  pitPrediction: PitStopPrediction | null;
  currentLap: number;
  totalLaps: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs font-semibold text-neutral-400 mb-2">LAP {label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-400">{entry.name}:</span>
          <span className="font-mono text-white">{entry.value?.toFixed(3)}s</span>
        </div>
      ))}
    </div>
  );
}

export default function PitWindowChart({
  data,
  pitPrediction,
  currentLap,
  totalLaps
}: PitWindowChartProps) {
  // Calculate pit window boundaries
  const pitWindowStart = pitPrediction?.optimal_pit_lap 
    ? Math.max(1, pitPrediction.optimal_pit_lap - 3) 
    : null;
  const pitWindowEnd = pitPrediction?.optimal_pit_lap 
    ? Math.min(totalLaps, pitPrediction.optimal_pit_lap + 3) 
    : null;

  // Generate display data with projections
  const chartData = useMemo(() => {
    if (!data.length) {
      // Generate mock data for visualization
      return Array.from({ length: 20 }, (_, i) => ({
        lap: i + 1,
        currentPace: 92 + Math.random() * 2 + (i * 0.03),
        predictedPace: 91.5 + (i * 0.04),
        undercutGain: i >= 10 && i <= 16 ? 0.3 + Math.random() * 0.2 : null
      }));
    }
    return data;
  }, [data]);

  const yDomain = useMemo(() => {
    const times = chartData.flatMap(d => [d.currentPace, d.predictedPace]).filter(Boolean);
    const min = Math.min(...times) - 0.5;
    const max = Math.max(...times) + 0.5;
    return [Math.floor(min * 2) / 2, Math.ceil(max * 2) / 2];
  }, [chartData]);

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="bento-card-header">
        <div className="flex items-center gap-3">
          <h3 className="bento-card-title">Pit Window Analysis</h3>
          {pitPrediction?.in_pit_window && (
            <span className="px-2 py-0.5 bg-racing-red/20 border border-racing-red/40 rounded text-[10px] font-semibold text-racing-red uppercase">
              Window Open
            </span>
          )}
        </div>
        {pitPrediction && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500">Optimal Lap:</span>
            <span className="font-mono text-sm text-racing-red font-bold">
              L{pitPrediction.optimal_pit_lap}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#262626" 
              vertical={false}
            />
            
            {/* Pit Window Highlight */}
            {pitWindowStart && pitWindowEnd && (
              <ReferenceArea
                x1={pitWindowStart}
                x2={pitWindowEnd}
                fill="rgba(225, 6, 0, 0.1)"
                stroke="rgba(225, 6, 0, 0.3)"
                strokeDasharray="4 2"
              />
            )}

            {/* Undercut opportunity area */}
            <Area
              type="monotone"
              dataKey="undercutGain"
              fill="rgba(0, 255, 0, 0.15)"
              stroke="rgba(0, 255, 0, 0.5)"
              strokeWidth={1}
              name="Undercut Gain"
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
              width={45}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              iconSize={8}
            />

            {/* Current lap marker */}
            <ReferenceLine 
              x={currentLap} 
              stroke="#FFD700" 
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: 'NOW',
                fill: '#FFD700',
                fontSize: 9,
                position: 'top'
              }}
            />

            {/* Optimal pit lap marker */}
            {pitPrediction?.optimal_pit_lap && (
              <ReferenceLine 
                x={pitPrediction.optimal_pit_lap} 
                stroke="#E10600" 
                strokeWidth={2}
                label={{
                  value: 'PIT',
                  fill: '#E10600',
                  fontSize: 9,
                  position: 'top'
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="currentPace"
              stroke="#E10600"
              strokeWidth={2}
              dot={false}
              name="Current Pace"
              activeDot={{ r: 4, fill: '#E10600' }}
            />
            
            <Line
              type="monotone"
              dataKey="predictedPace"
              stroke="#00FF00"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Predicted Pace"
              activeDot={{ r: 4, fill: '#00FF00' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Quick stats footer */}
      {pitPrediction && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-[10px] text-neutral-500 uppercase">Pit Probability</div>
            <div className="font-mono text-lg text-white">
              {(pitPrediction.pit_window_probability * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-neutral-500 uppercase">Undercut</div>
            <div className={`font-mono text-lg ${pitPrediction.undercut_opportunity ? 'text-timing-green' : 'text-neutral-500'}`}>
              {pitPrediction.undercut_opportunity ? 'YES' : 'NO'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-neutral-500 uppercase">Urgency</div>
            <div className={`font-mono text-lg ${
              pitPrediction.pit_urgency > 70 ? 'text-racing-red' : 
              pitPrediction.pit_urgency > 40 ? 'text-tire-medium' : 'text-timing-green'
            }`}>
              {pitPrediction.pit_urgency}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
