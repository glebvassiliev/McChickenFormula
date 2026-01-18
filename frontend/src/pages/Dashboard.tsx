import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { 
  Timer, Fuel, Thermometer, Wind, Cloud, 
  TrendingUp, AlertTriangle, CheckCircle, Activity
} from 'lucide-react';
import clsx from 'clsx';

interface DashboardProps {
  sessionKey: number | null;
  drivers: any[];
}

export default function Dashboard({ sessionKey, drivers }: DashboardProps) {
  const [weather, setWeather] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [lapData, setLapData] = useState<any[]>([]);
  const [modelStatus, setModelStatus] = useState<any[]>([]);

  useEffect(() => {
    if (sessionKey) {
      // Fetch weather
      fetch(`/api/telemetry/weather?session_key=${sessionKey}`)
        .then(res => res.json())
        .then(data => setWeather(data.current))
        .catch(console.error);

      // Fetch standings
      fetch(`/api/sessions/${sessionKey}/standings`)
        .then(res => res.json())
        .then(data => setStandings(data.standings?.slice(0, 10) || []))
        .catch(console.error);

      // Fetch lap data for charts
      fetch(`/api/telemetry/laps?session_key=${sessionKey}`)
        .then(res => res.json())
        .then(data => {
          const processed = data.laps?.slice(-50).map((lap: any, i: number) => ({
            lap: lap.lap_number || i + 1,
            time: lap.lap_duration || 90 + Math.random() * 5,
            driver: lap.driver_number
          })) || [];
          setLapData(processed);
        })
        .catch(console.error);
    }

    // Fetch model status
    fetch('/api/models/status')
      .then(res => res.json())
      .then(data => setModelStatus(data.models || []))
      .catch(console.error);
  }, [sessionKey]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 }
    })
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div 
          className="card p-5 racing-stripe"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Track Temp</p>
              <p className="stat-value text-racing-red">
                {weather?.track_temperature?.toFixed(1) || '--'}°
              </p>
            </div>
            <Thermometer className="w-8 h-8 text-racing-red/60" />
          </div>
        </motion.div>

        <motion.div 
          className="card p-5"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Air Temp</p>
              <p className="stat-value text-sky-400">
                {weather?.air_temperature?.toFixed(1) || '--'}°
              </p>
            </div>
            <Wind className="w-8 h-8 text-sky-400/60" />
          </div>
        </motion.div>

        <motion.div 
          className="card p-5"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Humidity</p>
              <p className="stat-value text-emerald-400">
                {weather?.humidity?.toFixed(0) || '--'}%
              </p>
            </div>
            <Cloud className="w-8 h-8 text-emerald-400/60" />
          </div>
        </motion.div>

        <motion.div 
          className="card p-5"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Active Drivers</p>
              <p className="stat-value text-tire-medium">
                {drivers.length || '--'}
              </p>
            </div>
            <Activity className="w-8 h-8 text-tire-medium/60" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Live Standings */}
        <motion.div 
          className="card p-6 col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-racing-red" />
            LIVE STANDINGS
          </h2>
          <div className="space-y-2">
            {standings.length > 0 ? standings.map((driver, i) => (
              <div 
                key={driver.driver_number}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg transition-all',
                  i === 0 && 'bg-racing-red/20 border border-racing-red/30',
                  i > 0 && i < 3 && 'bg-white/5'
                )}
              >
                <span className={clsx(
                  'w-6 h-6 flex items-center justify-center rounded font-bold text-sm',
                  i === 0 ? 'bg-racing-red text-white' : 'bg-carbon text-gray-400'
                )}>
                  {driver.position}
                </span>
                <div 
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: `#${driver.team_color || '333'}` }}
                />
                <span className="font-semibold text-sm">{driver.name}</span>
                <span className="ml-auto font-mono text-xs text-gray-400">
                  {driver.gap_to_leader ? `+${driver.gap_to_leader}` : 'LEADER'}
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm">Select a session to view standings</p>
            )}
          </div>
        </motion.div>

        {/* Lap Times Chart */}
        <motion.div 
          className="card p-6 col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-timing-green" />
            LAP TIME EVOLUTION
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lapData}>
                <defs>
                  <linearGradient id="lapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E10600" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="lap" 
                  stroke="#666" 
                  tick={{ fill: '#999', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#666" 
                  tick={{ fill: '#999', fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v.toFixed(1)}s`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(3)}s`, 'Lap Time']}
                />
                <Area 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#E10600" 
                  strokeWidth={2}
                  fill="url(#lapGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ML Models Status & Quick Actions */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div 
          className="card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-tire-medium" />
            ML MODEL STATUS
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {modelStatus.map((model, i) => (
              <div 
                key={model.name}
                className="flex items-center gap-3 p-3 bg-carbon/50 rounded-lg border border-white/5"
              >
                {model.ready ? (
                  <CheckCircle className="w-5 h-5 text-timing-green" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-tire-medium" />
                )}
                <div>
                  <p className="text-sm font-semibold capitalize">
                    {model.name.replace('_', ' ')}
                  </p>
                  <p className={clsx(
                    'text-xs',
                    model.ready ? 'text-timing-green' : 'text-tire-medium'
                  )}>
                    {model.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="font-racing text-lg mb-4">QUICK ACTIONS</h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="/strategy" className="btn-primary text-center text-sm">
              Analyze Strategy
            </a>
            <a href="/chatbot" className="btn-secondary text-center text-sm">
              Ask AI Strategist
            </a>
            <a href="/telemetry" className="btn-secondary text-center text-sm">
              View Telemetry
            </a>
            <a href="/models" className="btn-secondary text-center text-sm">
              Train Models
            </a>
          </div>
        </motion.div>
      </div>

      {/* Driver Cards */}
      {drivers.length > 0 && (
        <motion.div 
          className="card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="font-racing text-lg mb-4">DRIVERS IN SESSION</h2>
          <div className="grid grid-cols-5 gap-3">
            {drivers.slice(0, 20).map((driver) => (
              <div 
                key={driver.driver_number}
                className="p-3 bg-carbon/50 rounded-lg border border-white/5 hover:border-racing-red/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `#${driver.team_colour || '333'}` }}
                  >
                    {driver.driver_number}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{driver.name_acronym}</p>
                    <p className="text-[10px] text-gray-500 truncate">{driver.team_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
