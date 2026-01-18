/**
 * TelemetryAnalyzer - Simplified analyzer for historical F1 races (1990+)
 * Focus: Lap times, sector analysis, tire degradation, driver comparison
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell
} from 'recharts';
import { 
  Activity, TrendingDown, TrendingUp, Gauge, 
  Timer, Circle, Users, Zap
} from 'lucide-react';
import clsx from 'clsx';

interface TelemetryAnalyzerProps {
  sessionKey: number | null;
  drivers: any[];
}

interface LapData {
  lap: number;
  time: number;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  compound: string;
  tyre_life: number | null;
  driver_number: number;
}

interface DriverStats {
  driver_number: number;
  name: string;
  team: string;
  team_color: string;
  best_lap: number | null;
  avg_lap: number | null;
  total_laps: number;
  pit_stops: number;
  laps: LapData[];
}

const TIRE_COLORS: Record<string, string> = {
  SOFT: '#FF0000',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD'
};

function formatTime(seconds: number | null): string {
  if (!seconds || isNaN(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

export default function TelemetryAnalyzer({ sessionKey, drivers }: TelemetryAnalyzerProps) {
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [driverStats, setDriverStats] = useState<Record<number, DriverStats>>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'laps' | 'sectors' | 'comparison'>('laps');

  // Auto-select first 3 drivers for comparison
  useEffect(() => {
    if (drivers.length > 0 && selectedDrivers.length === 0) {
      setSelectedDrivers(drivers.slice(0, Math.min(3, drivers.length)).map(d => d.driver_number));
    }
  }, [drivers, selectedDrivers.length]);

  // Fetch telemetry for selected drivers
  useEffect(() => {
    if (!sessionKey || selectedDrivers.length === 0) {
      setDriverStats({});
      return;
    }

    setLoading(true);
    const fetchPromises = selectedDrivers.map(async (driverNum) => {
      try {
        const [summaryRes, lapsRes] = await Promise.all([
          fetch(`/api/telemetry/driver/${driverNum}/summary?session_key=${sessionKey}`),
          fetch(`/api/telemetry/laps?session_key=${sessionKey}&driver_number=${driverNum}`)
        ]);

        const summary = await summaryRes.json();
        const lapsData = await lapsRes.json();

        const laps: LapData[] = (lapsData.laps || []).map((l: any) => ({
          lap: l.lap_number,
          time: l.lap_duration,
          s1: l.sector_1_time,
          s2: l.sector_2_time,
          s3: l.sector_3_time,
          compound: l.compound || 'UNKNOWN',
          tyre_life: l.tyre_life,
          driver_number: driverNum
        }));

        return {
          driver_number: driverNum,
          name: summary.driver?.name || `Driver ${driverNum}`,
          team: summary.driver?.team || 'Unknown',
          team_color: summary.driver?.team_color || 'FFFFFF',
          best_lap: summary.statistics?.best_lap || null,
          avg_lap: summary.statistics?.average_lap || null,
          total_laps: summary.statistics?.total_laps || 0,
          pit_stops: summary.statistics?.total_pit_stops || 0,
          laps
        };
      } catch (error) {
        console.error(`Failed to fetch data for driver ${driverNum}:`, error);
        return null;
      }
    });

    Promise.all(fetchPromises).then(results => {
      const stats: Record<number, DriverStats> = {};
      results.forEach(result => {
        if (result) {
          stats[result.driver_number] = result;
        }
      });
      setDriverStats(stats);
      setLoading(false);
    });
  }, [sessionKey, selectedDrivers]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (selectedDrivers.length === 0) return [];
    
    const maxLaps = Math.max(...selectedDrivers.map(d => driverStats[d]?.laps.length || 0));
    const data: any[] = [];
    
    for (let lap = 1; lap <= maxLaps; lap++) {
      const lapData: any = { lap };
      selectedDrivers.forEach(driverNum => {
        const lapInfo = driverStats[driverNum]?.laps.find(l => l.lap === lap);
        if (lapInfo) {
          lapData[`driver_${driverNum}`] = lapInfo.time;
        }
      });
      if (Object.keys(lapData).length > 1) {
        data.push(lapData);
      }
    }
    
    return data;
  }, [selectedDrivers, driverStats]);

  if (!sessionKey) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Session Selected</h3>
          <p className="text-white/50">Select a session to analyze telemetry data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Driver Selection */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            Select Drivers to Compare
          </h3>
          <span className="text-xs text-white/50">
            {selectedDrivers.length} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {drivers.map((driver) => {
            const isSelected = selectedDrivers.includes(driver.driver_number);
            return (
              <button
                key={driver.driver_number}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDrivers(selectedDrivers.filter(d => d !== driver.driver_number));
                  } else {
                    setSelectedDrivers([...selectedDrivers, driver.driver_number]);
                  }
                }}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  isSelected
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-white/60 hover:bg-white/8 hover:text-white/80 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `#${driver.team_color || 'FFFFFF'}` }}
                  />
                  <span>{driver.name_acronym || driver.driver_number}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        {(['laps', 'sectors', 'comparison'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 capitalize',
              viewMode === mode
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/5 text-white/60 hover:bg-white/8 border border-transparent'
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Driver Stats Cards */}
      {selectedDrivers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedDrivers.map((driverNum) => {
            const stats = driverStats[driverNum];
            if (!stats) return null;
            
            return (
              <motion.div
                key={driverNum}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bento-card p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `#${stats.team_color}` }}
                  >
                    {driverNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{stats.name}</p>
                    <p className="text-xs text-white/50 truncate">{stats.team}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/50 mb-1">Best Lap</p>
                    <p className="text-lg font-mono text-timing-green">
                      {formatTime(stats.best_lap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-1">Avg Lap</p>
                    <p className="text-lg font-mono text-white/80">
                      {formatTime(stats.avg_lap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-1">Laps</p>
                    <p className="text-lg font-mono text-white">{stats.total_laps}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-1">Pit Stops</p>
                    <p className="text-lg font-mono text-white">{stats.pit_stops}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading telemetry data...</p>
          </div>
        </div>
      ) : selectedDrivers.length > 0 && (
        <>
          {/* Lap Time Progression */}
          {viewMode === 'laps' && selectedDrivers.map((driverNum) => {
            const stats = driverStats[driverNum];
            if (!stats || stats.laps.length === 0) return null;
            
            return (
              <motion.div
                key={driverNum}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bento-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: `#${stats.team_color}` }}
                  />
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    {stats.name} - Lap Time Progression
                  </h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.laps}>
                      <defs>
                        <linearGradient id={`gradient-${driverNum}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={`#${stats.team_color}`} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={`#${stats.team_color}`} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="lap" 
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                        tickFormatter={(v) => formatTime(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                        formatter={(value: number) => formatTime(value)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="time" 
                        fill={`url(#gradient-${driverNum})`}
                        stroke="transparent"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="time" 
                        stroke={`#${stats.team_color}`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      {stats.best_lap && (
                        <ReferenceLine 
                          y={stats.best_lap} 
                          stroke="rgba(0,255,0,0.5)" 
                          strokeDasharray="4 4"
                          label={{ value: 'Best', fill: 'rgba(0,255,0,0.8)', fontSize: 10 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}

          {/* Sector Analysis */}
          {viewMode === 'sectors' && selectedDrivers.map((driverNum) => {
            const stats = driverStats[driverNum];
            if (!stats || stats.laps.length === 0) return null;
            
            const sectorData = stats.laps
              .filter(l => l.s1 && l.s2 && l.s3)
              .slice(-20)
              .map(l => ({
                lap: l.lap,
                'Sector 1': l.s1,
                'Sector 2': l.s2,
                'Sector 3': l.s3
              }));
            
            return (
              <motion.div
                key={driverNum}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bento-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: `#${stats.team_color}` }}
                  />
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    {stats.name} - Sector Breakdown
                  </h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="lap" 
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                        tickFormatter={(v) => v.toFixed(2)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Sector 1" stackId="a" fill="#9333EA" />
                      <Bar dataKey="Sector 2" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="Sector 3" stackId="a" fill="#22C55E" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}

          {/* Driver Comparison */}
          {viewMode === 'comparison' && comparisonData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bento-card p-6"
            >
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
                Lap Time Comparison
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="lap" 
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                      tickFormatter={(v) => formatTime(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px'
                      }}
                      formatter={(value: number) => formatTime(value)}
                    />
                    <Legend />
                    {selectedDrivers.map((driverNum) => {
                      const stats = driverStats[driverNum];
                      if (!stats) return null;
                      return (
                        <Line
                          key={driverNum}
                          type="monotone"
                          dataKey={`driver_${driverNum}`}
                          stroke={`#${stats.team_color}`}
                          strokeWidth={2}
                          dot={false}
                          name={stats.name}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
