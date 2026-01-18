import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Timer, Fuel, Thermometer, Wind, Cloud, 
  TrendingUp, AlertTriangle, CheckCircle, Activity, Flag
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset data immediately when session changes
    setWeather(null);
    setStandings([]);
    setLapData([]);
    setError(null);
    
    if (!sessionKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    // Helper function to fetch with proper error handling
    const fetchWithErrorHandling = async (url: string, defaultValue: any, label: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[${label}] Failed to fetch ${url}: ${res.status} ${res.statusText}`);
          return defaultValue;
        }
        const data = await res.json();
        console.log(`[${label}] Successfully fetched data:`, data);
        return data;
      } catch (err) {
        console.error(`[${label}] Error fetching ${url}:`, err);
        return defaultValue;
      }
    };

    // Fetch all data in parallel with better error handling
    Promise.all([
      fetchWithErrorHandling(
        `/api/telemetry/weather?session_key=${sessionKey}`,
        { current: null, timeline: [] },
        'Weather'
      ),
      fetchWithErrorHandling(
        `/api/sessions/${sessionKey}/standings`,
        { standings: [] },
        'Standings'
      ),
      fetchWithErrorHandling(
        `/api/telemetry/laps?session_key=${sessionKey}`,
        { laps: [] },
        'Laps'
      )
    ]).then(([weatherData, standingsData, lapsData]) => {
      if (cancelled) return;

      // Set weather - handle multiple response formats
      let weatherValue = null;
      if (weatherData?.current) {
        weatherValue = weatherData.current;
      } else if (weatherData?.timeline && weatherData.timeline.length > 0) {
        weatherValue = weatherData.timeline[weatherData.timeline.length - 1];
      } else if (Array.isArray(weatherData) && weatherData.length > 0) {
        weatherValue = weatherData[weatherData.length - 1];
      }
      setWeather(weatherValue);

      // Set standings - handle different response formats
      let standingsList = [];
      if (standingsData?.standings && Array.isArray(standingsData.standings)) {
        standingsList = standingsData.standings.slice(0, 10);
      } else if (Array.isArray(standingsData)) {
        standingsList = standingsData.slice(0, 10);
      }
      setStandings(standingsList);

      // Process and set lap data
      let lapsList = [];
      if (lapsData?.laps && Array.isArray(lapsData.laps)) {
        lapsList = lapsData.laps;
      } else if (Array.isArray(lapsData)) {
        lapsList = lapsData;
      }
      
      const processed = lapsList
        .slice(-50)
        .map((lap: any) => {
          // Handle different time formats - should be seconds as number from backend
          let lapTime = lap.lap_duration || lap.duration || lap.time || null;
          
          // If it's a string (ISO duration), try to parse it (fallback)
          if (typeof lapTime === 'string') {
            const match = lapTime.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
            if (match) {
              const hours = parseFloat(match[1] || '0');
              const minutes = parseFloat(match[2] || '0');
              const seconds = parseFloat(match[3] || '0');
              lapTime = hours * 3600 + minutes * 60 + seconds;
            } else {
              // Try parsing as plain number
              lapTime = parseFloat(lapTime) || null;
            }
          }
          
          return {
            lap: lap.lap_number || lap.lap || 0,
            time: lapTime,
            driver: lap.driver_number || lap.driver || null
          };
        })
        .filter((lap: any) => {
          // Filter out invalid data
          return lap.time !== null && 
                 !isNaN(lap.time) && 
                 lap.time > 0 && 
                 lap.lap > 0 && 
                 lap.driver !== null;
        });
      
      console.log(`[Lap Data] Processed ${processed.length} valid lap times from ${lapsList.length} total laps`);
      setLapData(processed);
      setLoading(false);
      
      // Check if we got any useful data
      if (!weatherValue && standingsList.length === 0 && processed.length === 0) {
        setError('No data available for this session. The session may not have started yet or data may not be available.');
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load data. Please try again or select a different session.');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  // Fetch model status separately (doesn't depend on session)
  useEffect(() => {
    fetch('/api/models/status')
      .then(res => res.json())
      .then(data => setModelStatus(data.models || []))
      .catch(console.error);
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 }
    })
  };

  // Show message if no session selected
  if (!sessionKey) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Flag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Session Selected</h3>
          <p className="text-gray-400 mb-4">
            Please select a track/session from the dropdown in the header above
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && !weather && standings.length === 0 && lapData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-16 h-16 text-racing-red mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold mb-2">Loading Session Data</h3>
          <p className="text-gray-400">Fetching data from OpenF1...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-200 font-medium">Data Warning</p>
            <p className="text-yellow-300/80 text-sm mt-1">{error}</p>
          </div>
        </motion.div>
      )}
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
            {standings.length > 0 ? standings.map((driver) => {
              const position = driver.position || standings.indexOf(driver) + 1;
              const gapToLeader = driver.gap_to_leader;
              let gapDisplay = 'LEADER';
              
              if (gapToLeader !== null && gapToLeader !== undefined) {
                if (typeof gapToLeader === 'number') {
                  if (gapToLeader === 0) {
                    gapDisplay = 'LEADER';
                  } else if (gapToLeader < 60) {
                    gapDisplay = `+${gapToLeader.toFixed(3)}s`;
                  } else {
                    const minutes = Math.floor(gapToLeader / 60);
                    const seconds = (gapToLeader % 60).toFixed(3);
                    gapDisplay = `+${minutes}m${seconds}s`;
                  }
                } else {
                  gapDisplay = `+${gapToLeader}`;
                }
              }
              
              return (
              <div 
                key={driver.driver_number || `driver-${standings.indexOf(driver)}`}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg transition-all',
                  position === 1 && 'bg-racing-red/20 border border-racing-red/30',
                  position > 1 && position < 4 && 'bg-white/5'
                )}
              >
                <span className={clsx(
                  'w-6 h-6 flex items-center justify-center rounded font-bold text-sm',
                  position === 1 ? 'bg-racing-red text-white' : 'bg-carbon text-gray-400'
                )}>
                  {position}
                </span>
                <div 
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: `#${driver.team_color || '333333'}` }}
                />
                <span className="font-semibold text-sm">{driver.name || `Driver ${driver.driver_number}`}</span>
                <span className="ml-auto font-mono text-xs text-gray-400">
                  {gapDisplay}
                </span>
              </div>
              );
            }) : (
              <div className="text-center py-8">
                <Timer className="w-8 h-8 mx-auto mb-2 text-gray-600 opacity-50" />
                <p className="text-gray-500 text-sm">No standings data available</p>
                <p className="text-xs text-gray-600 mt-1">The session may not have started yet</p>
              </div>
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
            {lapData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Timer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No lap time data available</p>
                  <p className="text-xs text-gray-600 mt-1">The session may not have started yet</p>
                </div>
              </div>
            )}
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
            {modelStatus.map((model) => (
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
