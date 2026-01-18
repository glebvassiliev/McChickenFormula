/**
 * RivalWatch - Sector-by-sector comparison (Zone C - Right)
 * Features: Delta comparison against selected rival
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Target, Zap } from 'lucide-react';
import clsx from 'clsx';
import type { Driver, SectorDelta, PositionModelOutput } from '../../types/dashboard';

interface RivalWatchProps {
  targetDriver: Driver | null;
  rivals: Driver[];
  positionPrediction: PositionModelOutput | null;
  onRivalSelect?: (driver: Driver) => void;
}

interface SectorComparisonProps {
  sectors: SectorDelta[];
}

function SectorComparison({ sectors }: SectorComparisonProps) {
  const totalDelta = sectors.reduce((sum, s) => sum + s.delta, 0);
  
  return (
    <div className="space-y-2">
      {sectors.map((sector) => (
        <div key={sector.sector} className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 w-6">S{sector.sector}</span>
          <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.min(100, Math.max(0, 50 + sector.delta * 50))}%` 
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={clsx(
                'h-full rounded-full',
                sector.deltaType === 'faster' && 'bg-timing-green',
                sector.deltaType === 'slower' && 'bg-racing-red',
                sector.deltaType === 'equal' && 'bg-neutral-600'
              )}
            />
          </div>
          <span className={clsx(
            'font-mono text-xs w-16 text-right',
            sector.deltaType === 'faster' && 'text-timing-green',
            sector.deltaType === 'slower' && 'text-racing-red',
            sector.deltaType === 'equal' && 'text-neutral-500'
          )}>
            {sector.delta >= 0 ? '+' : ''}{sector.delta.toFixed(3)}
          </span>
        </div>
      ))}
      
      {/* Total */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
        <span className="text-[10px] text-neutral-400 w-6 font-semibold">TOT</span>
        <div className="flex-1" />
        <span className={clsx(
          'font-mono text-sm font-bold w-16 text-right',
          totalDelta < 0 && 'text-timing-green',
          totalDelta > 0 && 'text-racing-red',
          totalDelta === 0 && 'text-neutral-500'
        )}>
          {totalDelta >= 0 ? '+' : ''}{totalDelta.toFixed(3)}
        </span>
      </div>
    </div>
  );
}

export default function RivalWatch({
  targetDriver,
  rivals,
  positionPrediction,
  onRivalSelect
}: RivalWatchProps) {
  const [selectedRival, setSelectedRival] = useState<Driver | null>(
    rivals.length > 0 ? rivals[0] : null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generate mock sector data based on gaps
  const sectorDeltas: SectorDelta[] = useMemo(() => {
    if (!targetDriver || !selectedRival) {
      return [
        { sector: 1, driverTime: 30.0, rivalTime: 30.0, delta: 0, deltaType: 'equal' },
        { sector: 2, driverTime: 35.0, rivalTime: 35.0, delta: 0, deltaType: 'equal' },
        { sector: 3, driverTime: 25.0, rivalTime: 25.0, delta: 0, deltaType: 'equal' },
      ];
    }

    // Generate realistic sector deltas
    const gap = selectedRival.gap_to_car_ahead || Math.random() * 2 - 1;
    return [
      { 
        sector: 1, 
        driverTime: 30.0, 
        rivalTime: 30.0 + (gap / 3), 
        delta: -(gap / 3),
        deltaType: gap > 0.1 ? 'faster' : gap < -0.1 ? 'slower' : 'equal'
      },
      { 
        sector: 2, 
        driverTime: 35.0, 
        rivalTime: 35.0 + (gap / 3), 
        delta: -(gap / 3),
        deltaType: gap > 0.1 ? 'faster' : gap < -0.1 ? 'slower' : 'equal'
      },
      { 
        sector: 3, 
        driverTime: 25.0, 
        rivalTime: 25.0 + (gap / 3), 
        delta: -(gap / 3),
        deltaType: gap > 0.1 ? 'faster' : gap < -0.1 ? 'slower' : 'equal'
      },
    ];
  }, [targetDriver, selectedRival]);

  const handleRivalSelect = (rival: Driver) => {
    setSelectedRival(rival);
    setDropdownOpen(false);
    onRivalSelect?.(rival);
  };

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="bento-card-header">
        <h3 className="bento-card-title">Rival Watch</h3>
        {positionPrediction && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-racing-red" />
            <span className="text-[10px] font-mono text-neutral-400">
              {(positionPrediction.overtake_probability * 100).toFixed(0)}% overtake
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-3 flex flex-col min-h-0">
        {/* Rival Selector */}
        <div className="relative mb-3">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            {selectedRival ? (
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedRival.team_color ? `#${selectedRival.team_color}` : '#666' }}
                />
                <span className="text-sm font-medium text-white">
                  {selectedRival.name_acronym || selectedRival.name}
                </span>
                <span className="text-xs text-neutral-500">
                  P{selectedRival.position}
                </span>
              </div>
            ) : (
              <span className="text-sm text-neutral-500">Select Rival</span>
            )}
            <ChevronDown className={clsx(
              'w-4 h-4 text-neutral-400 transition-transform',
              dropdownOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden z-10 max-h-40 overflow-y-auto"
            >
              {rivals.map((rival) => (
                <button
                  key={rival.driver_number}
                  onClick={() => handleRivalSelect(rival)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-700 transition-colors text-left',
                    selectedRival?.driver_number === rival.driver_number && 'bg-neutral-700'
                  )}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: rival.team_color ? `#${rival.team_color}` : '#666' }}
                  />
                  <span className="text-xs font-medium text-white flex-1">
                    {rival.name_acronym || rival.name}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    P{rival.position}
                  </span>
                </button>
              ))}
              {rivals.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-500">
                  No rivals available
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sector Comparison */}
        <div className="flex-1">
          <div className="text-[10px] text-neutral-500 uppercase mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Sector Deltas
          </div>
          <SectorComparison sectors={sectorDeltas} />
        </div>

        {/* Battle Analysis */}
        {positionPrediction && (
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase mb-2">
              Battle Status
            </div>
            <div className="text-xs text-white">
              {positionPrediction.battle_status}
            </div>
            {positionPrediction.tactical_recommendations.length > 0 && (
              <div className="mt-2 text-[10px] text-neutral-400">
                {positionPrediction.tactical_recommendations[0]}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
