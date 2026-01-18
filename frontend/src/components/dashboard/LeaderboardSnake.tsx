/**
 * LeaderboardSnake - Animated position leaderboard (Zone A - Left)
 * Features: Framer Motion row reordering, Position prediction arrows
 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import type { Driver, TireCompound } from '../../types/dashboard';

interface LeaderboardSnakeProps {
  drivers: Driver[];
  selectedDriver?: number;
  onDriverSelect?: (driverNumber: number) => void;
}

const TIRE_BADGE_CLASSES: Record<TireCompound, string> = {
  SOFT: 'bg-tire-soft text-white',
  MEDIUM: 'bg-tire-medium text-black',
  HARD: 'bg-tire-hard text-black',
  INTERMEDIATE: 'bg-tire-inter text-white',
  WET: 'bg-tire-wet text-white',
};

function formatGap(gap: number | string | null): string {
  if (gap === null || gap === undefined) return '--';
  if (typeof gap === 'string') return gap;
  if (gap === 0) return 'LEADER';
  if (gap < 60) return `+${gap.toFixed(3)}`;
  const mins = Math.floor(gap / 60);
  const secs = (gap % 60).toFixed(1);
  return `+${mins}:${secs.padStart(4, '0')}`;
}

function PositionArrow({ prediction }: { prediction?: 'up' | 'down' | 'stable' }) {
  if (!prediction || prediction === 'stable') {
    return <Minus className="w-3 h-3 text-neutral-600" />;
  }
  if (prediction === 'up') {
    return <ChevronUp className="w-4 h-4 text-timing-green" />;
  }
  return <ChevronDown className="w-4 h-4 text-racing-red" />;
}

export default function LeaderboardSnake({
  drivers,
  selectedDriver,
  onDriverSelect
}: LeaderboardSnakeProps) {
  // Sort drivers by position
  const sortedDrivers = useMemo(() => 
    [...drivers].sort((a, b) => (a.position || 99) - (b.position || 99)),
    [drivers]
  );

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="bento-card-header">
        <h3 className="bento-card-title">Race Standings</h3>
        <span className="text-[10px] font-mono text-neutral-500">
          {drivers.length} DRIVERS
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence mode="popLayout">
          {sortedDrivers.map((driver, index) => (
            <motion.div
              key={driver.driver_number}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              onClick={() => onDriverSelect?.(driver.driver_number)}
              className={clsx(
                'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-neutral-800/50',
                selectedDriver === driver.driver_number && 'bg-racing-red/10 border border-racing-red/30',
                driver.traffic_risk && 'border-l-2 border-l-racing-red'
              )}
            >
              {/* Position */}
              <div className={clsx(
                'w-6 h-6 flex items-center justify-center rounded text-xs font-bold',
                index === 0 && 'bg-racing-red text-white',
                index > 0 && index < 3 && 'bg-neutral-700 text-white',
                index >= 3 && 'bg-neutral-800 text-neutral-400'
              )}>
                {driver.position || index + 1}
              </div>

              {/* Team Color Bar */}
              <div 
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: driver.team_color ? `#${driver.team_color}` : '#333' }}
              />

              {/* Driver Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">
                    {driver.name_acronym || driver.name?.substring(0, 3).toUpperCase()}
                  </span>
                  {/* Position Prediction Arrow */}
                  <PositionArrow prediction={driver.position_prediction} />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* Tire Badge */}
                  {driver.tire_compound && (
                    <span className={clsx(
                      'px-1.5 py-0 rounded text-[9px] font-bold',
                      TIRE_BADGE_CLASSES[driver.tire_compound]
                    )}>
                      {driver.tire_compound.charAt(0)}
                    </span>
                  )}
                  {/* Tire Age */}
                  {driver.tire_age !== undefined && (
                    <span className="text-[10px] font-mono text-neutral-500">
                      L{driver.tire_age}
                    </span>
                  )}
                </div>
              </div>

              {/* Gap */}
              <div className="text-right">
                <span className={clsx(
                  'text-xs font-mono',
                  index === 0 ? 'text-racing-red font-semibold' : 'text-neutral-400'
                )}>
                  {formatGap(driver.gap_to_leader)}
                </span>
                {driver.gap_to_car_ahead !== null && driver.gap_to_car_ahead !== undefined && index > 0 && (
                  <div className="text-[10px] font-mono text-neutral-600">
                    +{driver.gap_to_car_ahead.toFixed(1)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {drivers.length === 0 && (
          <div className="flex items-center justify-center h-32 text-neutral-500 text-sm">
            No driver data available
          </div>
        )}
      </div>
    </div>
  );
}
