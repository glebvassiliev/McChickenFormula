import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ComposedChart, Bar, Area
} from 'recharts';
import { 
  Activity, Gauge, Zap, Timer, Circle,
  ChevronDown, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface TelemetryViewProps {
  sessionKey: number | null;
  drivers: any[];
}

const TIRE_COLORS: Record<string, string> = {
  SOFT: '#FF0000',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD'
};

export default function TelemetryView({ sessionKey, drivers }: TelemetryViewProps) {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [lapTimes, setLapTimes] = useState<any[]>([]);
  const [stints, setStints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (drivers.length > 0 && !selectedDriver) {
      setSelectedDriver(drivers[0].driver_number);
    }
  }, [drivers, selectedDriver]);

  useEffect(() => {
    if (sessionKey && selectedDriver) {
      setLoading(true);
      
      Promise.all([
        fetch(`/api/telemetry/driver/${selectedDriver}/summary?session_key=${sessionKey}`),
        fetch(`/api/telemetry/laps?session_key=${sessionKey}&driver_number=${selectedDriver}`),
        fetch(`/api/telemetry/stints?session_key=${sessionKey}&driver_number=${selectedDriver}`)
      ])
        .then(async ([summaryRes, lapsRes, stintsRes]) => {
          const summary = await summaryRes.json();
          const laps = await lapsRes.json();
          const stintsData = await stintsRes.json();
          
          setDriverData(summary);
          setLapTimes(laps.laps?.map((l: any) => ({
            lap: l.lap_number,
            time: l.lap_duration,
            s1: l.sector_1_time,
            s2: l.sector_2_time,
            s3: l.sector_3_time,
            compound: l.compound,
            tyre_life: l.tyre_life
          })) || []);
          setStints(stintsData.stints || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [sessionKey, selectedDriver]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Driver Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={selectedDriver || ''}
            onChange={(e) => setSelectedDriver(Number(e.target.value))}
            className="input-field pr-10 appearance-none cursor-pointer min-w-[250px]"
          >
            {drivers.map((d) => (
              <option key={d.driver_number} value={d.driver_number}>
                #{d.driver_number} - {d.full_name || d.broadcast_name} ({d.team_name})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        
        <button 
          onClick={() => setSelectedDriver(selectedDriver)}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Driver Stats */}
      {driverData && (
        <motion.div 
          className="grid grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card p-5 racing-stripe">
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: `#${driverData.driver?.team_color || '333'}` }}
              >
                {driverData.driver?.number}
              </div>
              <div>
                <p className="font-semibold">{driverData.driver?.name}</p>
                <p className="text-xs text-gray-400">{driverData.driver?.team}</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Best Lap</p>
                <p className="stat-value text-timing-green text-2xl">
                  {formatTime(driverData.statistics?.best_lap)}
                </p>
              </div>
              <Timer className="w-6 h-6 text-timing-green/60" />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Avg Lap</p>
                <p className="stat-value text-sky-400 text-2xl">
                  {formatTime(driverData.statistics?.average_lap)}
                </p>
              </div>
              <Gauge className="w-6 h-6 text-sky-400/60" />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Pit Stops</p>
                <p className="stat-value text-tire-medium text-2xl">
                  {driverData.statistics?.total_pit_stops || 0}
                </p>
              </div>
              <Zap className="w-6 h-6 text-tire-medium/60" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Lap Times Chart */}
      <motion.div 
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-racing-red" />
          LAP TIME PROGRESSION
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lapTimes}>
              <defs>
                <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E10600" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="lap" 
                stroke="#666"
                label={{ value: 'Lap', position: 'bottom', fill: '#666' }}
              />
              <YAxis 
                stroke="#666"
                domain={['auto', 'auto']}
                tickFormatter={(v) => formatTime(v)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  formatTime(value), 
                  name === 'time' ? 'Lap Time' : name.toUpperCase()
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="time" 
                fill="url(#timeGradient)"
                stroke="transparent"
              />
              <Line 
                type="monotone" 
                dataKey="time" 
                stroke="#E10600" 
                strokeWidth={2}
                dot={(props: any) => {
                  const compound = props.payload.compound;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={TIRE_COLORS[compound] || '#666'}
                      stroke="#000"
                      strokeWidth={1}
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tire Legend */}
        <div className="flex items-center gap-4 mt-4 justify-center">
          {Object.entries(TIRE_COLORS).map(([compound, color]) => (
            <div key={compound} className="flex items-center gap-2">
              <Circle className="w-4 h-4" fill={color} stroke="#000" />
              <span className="text-xs text-gray-400">{compound}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sector Times & Stints */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sector Comparison */}
        <motion.div 
          className="card p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-racing text-lg mb-4">SECTOR BREAKDOWN</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lapTimes.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="lap" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="s1" stackId="a" fill="#9333EA" name="Sector 1" />
                <Bar dataKey="s2" stackId="a" fill="#3B82F6" name="Sector 2" />
                <Bar dataKey="s3" stackId="a" fill="#22C55E" name="Sector 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stint History */}
        <motion.div 
          className="card p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-racing text-lg mb-4">STINT HISTORY</h2>
          <div className="space-y-3">
            {stints.length > 0 ? stints.map((stint, i) => (
              <div 
                key={i}
                className="flex items-center gap-4 p-3 bg-carbon/50 rounded-lg"
              >
                <div 
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                    stint.compound === 'SOFT' && 'bg-tire-soft text-white',
                    stint.compound === 'MEDIUM' && 'bg-tire-medium text-black',
                    stint.compound === 'HARD' && 'bg-tire-hard text-black',
                    stint.compound === 'INTERMEDIATE' && 'bg-tire-inter text-white',
                    stint.compound === 'WET' && 'bg-tire-wet text-white',
                  )}
                >
                  {stint.compound?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Stint {i + 1}</p>
                  <p className="text-xs text-gray-400">
                    Laps {stint.lap_start || '?'} - {stint.lap_end || 'ongoing'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">
                    {stint.stint_length || stint.tyre_age_at_start || '?'} laps
                  </p>
                  <p className="text-xs text-gray-500">{stint.compound}</p>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-sm">No stint data available</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Laps Table */}
      <motion.div 
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="font-racing text-lg mb-4">RECENT LAPS</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">Lap</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">Time</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">S1</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">S2</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">S3</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">Tire</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400">Age</th>
              </tr>
            </thead>
            <tbody>
              {lapTimes.slice(-15).reverse().map((lap, i) => (
                <tr 
                  key={lap.lap}
                  className={clsx(
                    'border-b border-white/5 hover:bg-white/5 transition-colors',
                    i === 0 && 'bg-racing-red/10'
                  )}
                >
                  <td className="py-3 px-4 font-mono">{lap.lap}</td>
                  <td className="py-3 px-4 font-mono text-timing-green">{formatTime(lap.time)}</td>
                  <td className="py-3 px-4 font-mono text-purple-400">{lap.s1?.toFixed(3) || '--'}</td>
                  <td className="py-3 px-4 font-mono text-blue-400">{lap.s2?.toFixed(3) || '--'}</td>
                  <td className="py-3 px-4 font-mono text-green-400">{lap.s3?.toFixed(3) || '--'}</td>
                  <td className="py-3 px-4">
                    <span 
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{ 
                        backgroundColor: TIRE_COLORS[lap.compound] || '#333',
                        color: ['MEDIUM', 'HARD'].includes(lap.compound) ? '#000' : '#FFF'
                      }}
                    >
                      {lap.compound || '?'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-400">{lap.tyre_life || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
