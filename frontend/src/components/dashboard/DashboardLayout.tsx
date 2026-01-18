/**
 * DashboardLayout - Main 12-column Bento Grid Layout
 * Structure:
 * - Left (col-span-3): Context & Tracking
 * - Center (col-span-6): Strategy Engine
 * - Right (col-span-3): Telemetry & Pace
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import RaceControlBar from './RaceControlBar';
import LeaderboardSnake from './LeaderboardSnake';
import TrackMapWidget from './TrackMapWidget';
import PitWindowChart from './PitWindowChart';
import TireStrategyCard from './TireStrategyCard';
import PaceHistogram from './PaceHistogram';
import RivalWatch from './RivalWatch';
import type { 
  Driver, 
  WeatherData, 
  SessionInfo, 
  PitStopPrediction,
  PositionModelOutput,
  TireDegradationProfile,
  RacePaceOutput,
  PitWindowDataPoint,
  TireCompound,
  StrategyMode
} from '../../types/dashboard';

interface DashboardLayoutProps {
  sessionKey: number | null;
  drivers: Driver[];
  weather: WeatherData | null;
  sessionInfo: SessionInfo | null;
}

export default function DashboardLayout({
  sessionKey,
  drivers,
  weather,
  sessionInfo
}: DashboardLayoutProps) {
  // State for ML predictions
  const [pitPrediction, setPitPrediction] = useState<PitStopPrediction | null>(null);
  const [positionPrediction, setPositionPrediction] = useState<PositionModelOutput | null>(null);
  const [tirePrediction, setTirePrediction] = useState<TireDegradationProfile | null>(null);
  const [pacePrediction, setPacePrediction] = useState<RacePaceOutput | null>(null);
  
  // UI state
  const [selectedDriver, setSelectedDriver] = useState<number | undefined>(undefined);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>('push');
  const [safetyCar, setSafetyCar] = useState(false);
  const [vsc, setVsc] = useState(false);

  // Get current driver data
  const currentDriver = drivers.find(d => d.driver_number === selectedDriver) || drivers[0];
  
  // Transform drivers for leaderboard with position predictions
  const driversWithPredictions: Driver[] = drivers.map((driver, idx) => ({
    ...driver,
    position_prediction: positionPrediction && driver.driver_number === selectedDriver
      ? (positionPrediction.predicted_final_position < driver.position ? 'up' : 
         positionPrediction.predicted_final_position > driver.position ? 'down' : 'stable')
      : undefined,
    traffic_risk: positionPrediction?.attack_analysis?.gap_to_target !== undefined 
      && positionPrediction.attack_analysis.gap_to_target < 1.5
      && driver.driver_number === selectedDriver
  }));

  // Generate pit window chart data
  const pitWindowData: PitWindowDataPoint[] = Array.from({ length: sessionInfo?.total_laps || 50 }, (_, i) => {
    const lap = i + 1;
    const baseTime = 92;
    const degradation = 0.04;
    const currentLap = sessionInfo?.current_lap || 1;
    
    return {
      lap,
      currentPace: lap <= currentLap ? baseTime + (lap * degradation) + Math.random() * 0.3 : baseTime + (lap * degradation),
      predictedPace: baseTime + (lap * degradation * 0.9),
      undercutWindow: pitPrediction?.in_pit_window && lap >= (pitPrediction?.optimal_pit_lap || 0) - 3 && lap <= (pitPrediction?.optimal_pit_lap || 0) + 2
        ? 0.3 + Math.random() * 0.2
        : undefined
    };
  });

  // Recent laps for pace histogram
  const recentLaps = drivers.length > 0 && currentDriver?.last_lap_time
    ? Array.from({ length: 5 }, (_, i) => ({
        lap: (sessionInfo?.current_lap || 5) - 4 + i,
        time: (currentDriver?.last_lap_time || 90) + (Math.random() - 0.5) * 1.5
      }))
    : [];

  // Fetch predictions that DON'T depend on strategy mode (tire & pit stop)
  const fetchStaticPredictions = useCallback(async () => {
    if (!sessionKey || !currentDriver) return;

    try {
      // Fetch pit stop prediction
      const pitRes = await fetch('/api/strategy/pit-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_lap: sessionInfo?.current_lap || 1,
          total_laps: sessionInfo?.total_laps || 50,
          remaining_laps: (sessionInfo?.total_laps || 50) - (sessionInfo?.current_lap || 1),
          tire_age: currentDriver.tire_age || 0,
          tire_compound_idx: currentDriver.tire_compound === 'SOFT' ? 0 : currentDriver.tire_compound === 'MEDIUM' ? 1 : 2,
          current_position: currentDriver.position || 10,
          gap_to_car_ahead: currentDriver.gap_to_car_ahead || 2.0,
          gap_to_car_behind: 2.0,
          pit_delta: 22.0,
          track_position_value: 50,
          tire_degradation_rate: 0.05,
          current_pace_delta: 0,
          competitor_tire_age: 10,
          competitor_compound_idx: 1,
          fuel_adjusted_pace: 0,
          traffic_density: 5,
          safety_car_probability: safetyCar ? 100 : 10,
          drs_available: 1,
          track_temperature: weather?.track_temperature || 30,
          rain_probability: weather?.rain_probability || 0,
        })
      });
      if (pitRes.ok) {
        const data = await pitRes.json();
        setPitPrediction(data);
      }

      // Fetch tire strategy prediction
      const tireRes = await fetch('/api/strategy/tire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_temperature: weather?.track_temperature || 30,
          air_temperature: weather?.air_temperature || 25,
          humidity: weather?.humidity || 50,
          track_length: 5.0,
          number_of_corners: 15,
          high_speed_corners: 5,
          low_speed_corners: 10,
          current_lap: sessionInfo?.current_lap || 1,
          total_laps: sessionInfo?.total_laps || 50,
          remaining_laps: (sessionInfo?.total_laps || 50) - (sessionInfo?.current_lap || 1),
          current_position: currentDriver.position || 10,
          gap_to_leader: typeof currentDriver.gap_to_leader === 'number' ? currentDriver.gap_to_leader : 0,
          gap_to_car_ahead: currentDriver.gap_to_car_ahead || 0,
          gap_to_car_behind: 0,
          fuel_load: 100 - ((sessionInfo?.current_lap || 1) * 1.8),
          tire_age: currentDriver.tire_age || 0,
          rain_probability: weather?.rain_probability || 0,
          track_evolution: 50,
          safety_car_deployed: safetyCar,
          vsc_deployed: vsc,
        })
      });
      if (tireRes.ok) {
        const data = await tireRes.json();
        setTirePrediction(data);
      }
    } catch (error) {
      console.error('Failed to fetch static predictions:', error);
    }
  }, [sessionKey, currentDriver, sessionInfo, weather, safetyCar, vsc]);

  // Fetch predictions that DO depend on strategy mode (position & pace)
  const fetchModeDependentPredictions = useCallback(async () => {
    if (!sessionKey || !currentDriver) return;

    try {
      // Fetch position prediction
      const posRes = await fetch('/api/strategy/position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_position: currentDriver.position || 10,
          lap_number: sessionInfo?.current_lap || 1,
          remaining_laps: (sessionInfo?.total_laps || 50) - (sessionInfo?.current_lap || 1),
          gap_to_car_ahead: currentDriver.gap_to_car_ahead || 2.0,
          gap_to_car_behind: 2.0,
          relative_pace: strategyMode === 'push' ? -0.2 : 0.1,
          tire_advantage: 0,
          compound_advantage: 0,
          drs_available: 1,
          battery_level: 80,
          straight_length: 1000,
          overtaking_difficulty: 50,
          track_position_value: 50,
          driver_aggression: strategyMode === 'push' ? 80 : 40,
          car_performance_delta: 0,
          weather_stability: weather?.rain_probability ? 100 - weather.rain_probability : 100,
          safety_car_probability: safetyCar ? 100 : 10,
          laps_since_pit: currentDriver.tire_age || 5,
          competitor_laps_since_pit: 5,
          points_position: currentDriver.position || 10,
        })
      });
      if (posRes.ok) {
        const data = await posRes.json();
        setPositionPrediction(data);
      }

      // Fetch race pace prediction
      const paceRes = await fetch('/api/strategy/race-pace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lap_number: sessionInfo?.current_lap || 1,
          fuel_load: 100 - ((sessionInfo?.current_lap || 1) * 1.8),
          tire_age: currentDriver.tire_age || 0,
          tire_compound_idx: currentDriver.tire_compound === 'SOFT' ? 0 : currentDriver.tire_compound === 'MEDIUM' ? 1 : 2,
          track_temperature: weather?.track_temperature || 30,
          air_temperature: weather?.air_temperature || 25,
          track_evolution: 50,
          traffic: 0,
          drs_enabled: 1,
          sector1_time: 30,
          sector2_time: 35,
          previous_lap_time: currentDriver.last_lap_time || 90,
          best_lap_time: currentDriver.best_lap_time || 88,
          avg_lap_time: 89,
          position: currentDriver.position || 10,
          wind_speed: weather?.wind_speed || 10,
          humidity: weather?.humidity || 50,
          safety_car_laps: 0,
          push_level: strategyMode === 'push' ? 90 : 60,
          battery_deployment: 50,
        })
      });
      if (paceRes.ok) {
        const data = await paceRes.json();
        setPacePrediction(data);
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    }
  }, [sessionKey, currentDriver, sessionInfo, weather, strategyMode, safetyCar, vsc]);

  // Fetch static predictions (pit & tire) - not affected by mode
  // Use stable dependencies to prevent refetch when mode changes
  useEffect(() => {
    if (!sessionKey || !currentDriver) return;
    
    // Create a stable function that doesn't depend on callback reference
    const fetchStatic = async () => {
      try {
        // Fetch pit stop prediction
        const pitRes = await fetch('/api/strategy/pit-stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_lap: sessionInfo?.current_lap || 1,
            total_laps: sessionInfo?.total_laps || 50,
            remaining_laps: (sessionInfo?.total_laps || 50) - (sessionInfo?.current_lap || 1),
            tire_age: currentDriver.tire_age || 0,
            tire_compound_idx: currentDriver.tire_compound === 'SOFT' ? 0 : currentDriver.tire_compound === 'MEDIUM' ? 1 : 2,
            current_position: currentDriver.position || 10,
            gap_to_car_ahead: currentDriver.gap_to_car_ahead || 2.0,
            gap_to_car_behind: 2.0,
            pit_delta: 22.0,
            track_position_value: 50,
            tire_degradation_rate: 0.05,
            current_pace_delta: 0,
            competitor_tire_age: 10,
            competitor_compound_idx: 1,
            fuel_adjusted_pace: 0,
            traffic_density: 5,
            safety_car_probability: safetyCar ? 100 : 10,
            drs_available: 1,
            track_temperature: weather?.track_temperature || 30,
            rain_probability: weather?.rain_probability || 0,
          })
        });
        if (pitRes.ok) {
          const data = await pitRes.json();
          setPitPrediction(data);
        }

        // Fetch tire strategy prediction
        const tireRes = await fetch('/api/strategy/tire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            track_temperature: weather?.track_temperature || 30,
            air_temperature: weather?.air_temperature || 25,
            humidity: weather?.humidity || 50,
            track_length: 5.0,
            number_of_corners: 15,
            high_speed_corners: 5,
            low_speed_corners: 10,
            current_lap: sessionInfo?.current_lap || 1,
            total_laps: sessionInfo?.total_laps || 50,
            remaining_laps: (sessionInfo?.total_laps || 50) - (sessionInfo?.current_lap || 1),
            current_position: currentDriver.position || 10,
            gap_to_leader: typeof currentDriver.gap_to_leader === 'number' ? currentDriver.gap_to_leader : 0,
            gap_to_car_ahead: currentDriver.gap_to_car_ahead || 0,
            gap_to_car_behind: 0,
            fuel_load: 100 - ((sessionInfo?.current_lap || 1) * 1.8),
            tire_age: currentDriver.tire_age || 0,
            rain_probability: weather?.rain_probability || 0,
            track_evolution: 50,
            safety_car_deployed: safetyCar,
            vsc_deployed: vsc,
          })
        });
        if (tireRes.ok) {
          const data = await tireRes.json();
          setTirePrediction(data);
        }
      } catch (error) {
        console.error('Failed to fetch static predictions:', error);
      }
    };
    
    fetchStatic();
    const interval = setInterval(fetchStatic, 10000); // Refresh every 10s
    return () => clearInterval(interval);
    // Only refetch when these specific values change - NOT when strategyMode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, currentDriver?.driver_number, sessionInfo?.current_lap, weather?.track_temperature, safetyCar, vsc]);

  // Fetch mode-dependent predictions (position & pace) - refetch when mode changes
  useEffect(() => {
    fetchModeDependentPredictions();
  }, [fetchModeDependentPredictions]);

  // Auto-select first driver if none selected
  useEffect(() => {
    if (!selectedDriver && drivers.length > 0) {
      setSelectedDriver(drivers[0]?.driver_number);
    }
  }, [drivers, selectedDriver]);

  if (!sessionKey) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-racing-red/30 border-t-racing-red rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Session Selected</h3>
          <p className="text-neutral-400">
            Select a session from the header to begin analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Race Control Bar - Sticky Header */}
      <div className="sticky top-28 z-40">
        <RaceControlBar
          session={sessionInfo}
          weather={weather}
          safetyCar={safetyCar}
          vsc={vsc}
          pitPrediction={pitPrediction}
          onStrategyCallClick={() => {
            // Scroll to pit window chart or show modal
            console.log('Strategy call clicked');
          }}
        />
      </div>

      {/* Main Bento Grid - Apple-like spacing */}
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-12 gap-5 lg:gap-6 auto-rows-min max-w-[1920px] mx-auto">
          {/* ==================== ZONE A: LEFT COLUMN ==================== */}
          <motion.div 
            className="col-span-12 lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Leaderboard Snake */}
            <div className="h-[400px]">
              <LeaderboardSnake
                drivers={driversWithPredictions}
                selectedDriver={selectedDriver}
                onDriverSelect={setSelectedDriver}
              />
            </div>

            {/* Track Map */}
            <div className="h-[250px]">
              <TrackMapWidget
                drivers={driversWithPredictions}
                selectedDriver={selectedDriver}
                circuitName={sessionInfo?.circuit_short_name}
              />
            </div>
          </motion.div>

          {/* ==================== ZONE B: CENTER COLUMN ==================== */}
          <motion.div 
            className="col-span-12 lg:col-span-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Pit Window Chart - Hero */}
            <div className="h-[320px]">
              <PitWindowChart
                data={pitWindowData}
                pitPrediction={pitPrediction}
                currentLap={sessionInfo?.current_lap || 1}
                totalLaps={sessionInfo?.total_laps || 50}
              />
            </div>

            {/* Tire Strategy */}
            <div className="h-[320px]">
              <TireStrategyCard
                tirePrediction={tirePrediction}
                currentTireAge={currentDriver?.tire_age || 0}
                currentCompound={(currentDriver?.tire_compound as TireCompound) || 'MEDIUM'}
                mode={strategyMode}
                onModeChange={setStrategyMode}
              />
            </div>
          </motion.div>

          {/* ==================== ZONE C: RIGHT COLUMN ==================== */}
          <motion.div 
            className="col-span-12 lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Pace Histogram */}
            <div className="h-[300px]">
              <PaceHistogram
                pacePrediction={pacePrediction}
                recentLaps={recentLaps}
                targetTime={currentDriver?.best_lap_time || 90}
              />
            </div>

            {/* Rival Watch */}
            <div className="h-[350px]">
              <RivalWatch
                targetDriver={currentDriver || null}
                rivals={drivers.filter(d => d.driver_number !== selectedDriver)}
                positionPrediction={positionPrediction}
              />
            </div>
          </motion.div>
        </div>

        {/* Strategy Recommendation Banner */}
        {pitPrediction?.recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 p-4 bento-card border-l-4 border-l-racing-red"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                  Strategy Recommendation
                </div>
                <div className="text-sm text-white">
                  {pitPrediction.recommendation}
                </div>
              </div>
              {pitPrediction.strategy_options && pitPrediction.strategy_options.length > 0 && (
                <div className="flex items-center gap-2">
                  {pitPrediction.strategy_options.slice(0, 2).map((opt, idx) => (
                    <button
                      key={idx}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs transition-colors"
                    >
                      <span className="text-neutral-400">{opt.name}</span>
                      <span className="ml-2 font-mono text-white">L{opt.pit_lap}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
