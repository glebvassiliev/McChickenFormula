/**
 * RaceControlBar - Sticky header component (Zone D)
 * Displays: Lap count, Weather, SC Status, Strategy Call indicator
 */
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flag, 
  Cloud, 
  Thermometer, 
  Droplets,
  AlertTriangle,
  Radio,
  Timer,
  Zap
} from 'lucide-react';
import clsx from 'clsx';
import type { WeatherData, SessionInfo, PitStopPrediction } from '../../types/dashboard';

interface RaceControlBarProps {
  session: SessionInfo | null;
  weather: WeatherData | null;
  safetyCar: boolean;
  vsc: boolean;
  pitPrediction: PitStopPrediction | null;
  onStrategyCallClick?: () => void;
}

export default function RaceControlBar({
  session,
  weather,
  safetyCar,
  vsc,
  pitPrediction,
  onStrategyCallClick
}: RaceControlBarProps) {
  const showStrategyCall = pitPrediction && pitPrediction.pit_window_probability > 0.85;
  
  return (
    <div className="bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Session Info */}
        <div className="flex items-center gap-4">
          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              session?.status === 'live' ? 'bg-timing-green live-pulse' : 'bg-neutral-600'
            )} />
            <span className="text-xs uppercase tracking-wider text-neutral-400">
              {session?.status === 'live' ? 'LIVE' : session?.status?.toUpperCase() || 'OFFLINE'}
            </span>
          </div>

          {/* Lap Counter */}
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800/50 rounded-lg">
            <Flag className="w-3.5 h-3.5 text-racing-red" />
            <span className="font-mono text-sm text-white">
              LAP <span className="text-racing-red font-bold">{session?.current_lap || '--'}</span>
              <span className="text-neutral-500">/{session?.total_laps || '--'}</span>
            </span>
          </div>

          {/* Circuit Name */}
          <span className="text-sm font-medium text-neutral-300 hidden md:block">
            {session?.circuit_short_name || 'No Session'}
          </span>
        </div>

        {/* Center: Race Control Status */}
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {safetyCar && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold uppercase text-yellow-500">SAFETY CAR</span>
              </motion.div>
            )}
            {vsc && !safetyCar && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg"
              >
                <Timer className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold uppercase text-yellow-500">VSC</span>
              </motion.div>
            )}
            {!safetyCar && !vsc && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-timing-green/10 border border-timing-green/30 rounded-lg"
              >
                <Radio className="w-3.5 h-3.5 text-timing-green" />
                <span className="text-xs font-medium uppercase text-timing-green">GREEN FLAG</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Weather + Strategy Call */}
        <div className="flex items-center gap-4">
          {/* Weather Info */}
          {weather && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Thermometer className="w-3.5 h-3.5 text-racing-red" />
                <span className="font-mono">{weather.track_temperature?.toFixed(0) || '--'}°</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono">{weather.air_temperature?.toFixed(0) || '--'}°</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-mono">{weather.humidity?.toFixed(0) || '--'}%</span>
              </div>
              {weather.rain_probability > 30 && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded text-blue-400">
                  <span className="text-[10px] font-semibold">RAIN {weather.rain_probability}%</span>
                </div>
              )}
            </div>
          )}

          {/* Strategy Call Indicator */}
          <AnimatePresence>
            {showStrategyCall && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={onStrategyCallClick}
                className="flex items-center gap-2 px-3 py-1.5 strategy-call-pulse bg-racing-red/20 rounded-lg cursor-pointer hover:bg-racing-red/30 transition-colors"
              >
                <Zap className="w-4 h-4 text-racing-red" />
                <span className="text-xs font-bold uppercase text-racing-red">
                  STRATEGY CALL
                </span>
                <span className="font-mono text-[10px] text-racing-red/80">
                  {(pitPrediction.pit_window_probability * 100).toFixed(0)}%
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
