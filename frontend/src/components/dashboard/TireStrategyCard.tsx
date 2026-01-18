/**
 * TireStrategyCard - Tire degradation visualization (Zone B - Center)
 * Features: Area chart with crossover point (cliff) marker
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Circle } from 'lucide-react';
import clsx from 'clsx';
import type { TireDegradationProfile, TireCompound, StrategyMode } from '../../types/dashboard';

interface TireStrategyCardProps {
  tirePrediction: TireDegradationProfile | null;
  currentTireAge: number;
  currentCompound: TireCompound;
  mode: StrategyMode;
  onModeChange: (mode: StrategyMode) => void;
}

interface DegradationDataPoint {
  lap: number;
  soft: number;
  medium: number;
  hard: number;
  current?: number;
}

const COMPOUND_COLORS = {
  SOFT: '#FF0000',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD',
};

// Base degradation curves by compound
const BASE_DEGRADATION = {
  SOFT: { base: 0, rate: 0.08, cliff: 18 },
  MEDIUM: { base: 0.3, rate: 0.05, cliff: 28 },
  HARD: { base: 0.6, rate: 0.03, cliff: 38 },
};

function generateDegradationData(
  maxLaps: number = 40,
  degradationRate: number = 0.05
): DegradationDataPoint[] {
  return Array.from({ length: maxLaps }, (_, i) => {
    const lap = i + 1;
    const soft = BASE_DEGRADATION.SOFT.base + (lap * BASE_DEGRADATION.SOFT.rate);
    const medium = BASE_DEGRADATION.MEDIUM.base + (lap * BASE_DEGRADATION.MEDIUM.rate);
    const hard = BASE_DEGRADATION.HARD.base + (lap * BASE_DEGRADATION.HARD.rate);
    
    // Apply cliff effect
    const softWithCliff = lap > BASE_DEGRADATION.SOFT.cliff 
      ? soft + ((lap - BASE_DEGRADATION.SOFT.cliff) * 0.15) 
      : soft;
    const mediumWithCliff = lap > BASE_DEGRADATION.MEDIUM.cliff 
      ? medium + ((lap - BASE_DEGRADATION.MEDIUM.cliff) * 0.12) 
      : medium;
    const hardWithCliff = lap > BASE_DEGRADATION.HARD.cliff 
      ? hard + ((lap - BASE_DEGRADATION.HARD.cliff) * 0.1) 
      : hard;

    return {
      lap,
      soft: Math.min(4, softWithCliff),
      medium: Math.min(4, mediumWithCliff),
      hard: Math.min(4, hardWithCliff),
    };
  });
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
          <span className="text-neutral-400 capitalize">{entry.name}:</span>
          <span className="font-mono text-white">+{entry.value?.toFixed(2)}s</span>
        </div>
      ))}
    </div>
  );
}

export default function TireStrategyCard({
  tirePrediction,
  currentTireAge,
  currentCompound,
  mode,
  onModeChange
}: TireStrategyCardProps) {
  const degradationData = useMemo(() => 
    generateDegradationData(40, tirePrediction?.degradation_rate_per_lap || 0.05),
    [tirePrediction]
  );

  // Find crossover point (cliff)
  const crossoverLap = useMemo(() => {
    return BASE_DEGRADATION[currentCompound as keyof typeof BASE_DEGRADATION]?.cliff || 25;
  }, [currentCompound]);

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="bento-card-header">
        <div className="flex items-center gap-3">
          <h3 className="bento-card-title">Tire Degradation</h3>
          {tirePrediction && (
            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COMPOUND_COLORS[tirePrediction.recommended_compound] }}
              />
              <span className="text-[10px] font-semibold text-white uppercase">
                {tirePrediction.recommended_compound}
              </span>
              <span className="text-[10px] text-neutral-500">
                ({(tirePrediction.compound_confidence * 100).toFixed(0)}%)
              </span>
            </div>
          )}
        </div>
        
        {/* Push/Conserve Toggle */}
        <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('push')}
            className={clsx(
              'btn-toggle',
              mode === 'push' ? 'btn-toggle-active' : 'btn-toggle-inactive'
            )}
          >
            Push
          </button>
          <button
            onClick={() => onModeChange('conserve')}
            className={clsx(
              'btn-toggle',
              mode === 'conserve' ? 'btn-toggle-active' : 'btn-toggle-inactive'
            )}
          >
            Conserve
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={degradationData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="softGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="hardGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
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
              label={{ value: 'Tire Age (Laps)', position: 'bottom', fill: '#666', fontSize: 10 }}
            />
            
            <YAxis 
              stroke="#404040"
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={{ stroke: '#404040' }}
              domain={[0, 4]}
              tickFormatter={(v) => `+${v.toFixed(1)}s`}
              width={45}
              label={{ value: 'Deg (s/lap)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 10 }}
            />
            
            <Tooltip content={<CustomTooltip />} />

            {/* Crossover/Cliff line */}
            <ReferenceLine 
              x={crossoverLap} 
              stroke="#FFD700" 
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: 'CLIFF',
                fill: '#FFD700',
                fontSize: 9,
                position: 'top'
              }}
            />

            {/* Current tire age marker */}
            <ReferenceLine 
              x={currentTireAge} 
              stroke="#00FF00" 
              strokeWidth={2}
              label={{
                value: 'NOW',
                fill: '#00FF00',
                fontSize: 9,
                position: 'insideTop'
              }}
            />
            
            <Area
              type="monotone"
              dataKey="soft"
              stroke="#FF0000"
              strokeWidth={2}
              fill="url(#softGradient)"
              name="Soft"
            />
            
            <Area
              type="monotone"
              dataKey="medium"
              stroke="#FFD700"
              strokeWidth={2}
              fill="url(#mediumGradient)"
              name="Medium"
            />
            
            <Area
              type="monotone"
              dataKey="hard"
              stroke="#FFFFFF"
              strokeWidth={2}
              fill="url(#hardGradient)"
              name="Hard"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Compound Legend & Stats */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(['SOFT', 'MEDIUM', 'HARD'] as const).map((compound) => (
              <div key={compound} className="flex items-center gap-1.5">
                <Circle 
                  className="w-2.5 h-2.5" 
                  fill={COMPOUND_COLORS[compound]}
                  stroke={COMPOUND_COLORS[compound]}
                />
                <span className={clsx(
                  'text-[10px] uppercase',
                  currentCompound === compound ? 'text-white font-semibold' : 'text-neutral-500'
                )}>
                  {compound}
                </span>
              </div>
            ))}
          </div>
          
          {tirePrediction && (
            <div className="text-right">
              <div className="text-[10px] text-neutral-500">Predicted Stint</div>
              <div className="font-mono text-sm text-white">
                {tirePrediction.predicted_stint_length} laps
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
