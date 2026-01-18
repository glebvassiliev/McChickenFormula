import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Zap, Timer, TrendingUp, AlertTriangle, 
  CheckCircle, Target, Gauge, Thermometer
} from 'lucide-react';
import clsx from 'clsx';

interface StrategyAnalysisProps {
  sessionKey: number | null;
}

interface StrategyInputs {
  track_temperature: number;
  air_temperature: number;
  current_lap: number;
  total_laps: number;
  remaining_laps: number;
  tire_age: number;
  current_position: number;
  gap_to_car_ahead: number;
  gap_to_car_behind: number;
  fuel_load: number;
  rain_probability: number;
}

export default function StrategyAnalysis({ sessionKey }: StrategyAnalysisProps) {
  const [inputs, setInputs] = useState<StrategyInputs>({
    track_temperature: 35,
    air_temperature: 25,
    current_lap: 20,
    total_laps: 57,
    remaining_laps: 37,
    tire_age: 15,
    current_position: 5,
    gap_to_car_ahead: 2.5,
    gap_to_car_behind: 1.8,
    fuel_load: 65,
    rain_probability: 10
  });

  const [tireResult, setTireResult] = useState<any>(null);
  const [pitResult, setPitResult] = useState<any>(null);
  const [paceResult, setPaceResult] = useState<any>(null);
  const [positionResult, setPositionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const updateInput = (key: keyof StrategyInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const runAnalysis = async () => {
    setLoading(true);
    
    try {
      // Run all predictions in parallel
      const [tireRes, pitRes, paceRes, posRes] = await Promise.all([
        fetch('/api/strategy/tire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs)
        }),
        fetch('/api/strategy/pit-stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...inputs,
            tire_compound_idx: 1,
            pit_delta: 22,
            track_position_value: 60,
            tire_degradation_rate: 0.06
          })
        }),
        fetch('/api/strategy/race-pace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lap_number: inputs.current_lap,
            fuel_load: inputs.fuel_load,
            tire_age: inputs.tire_age,
            track_temperature: inputs.track_temperature,
            position: inputs.current_position
          })
        }),
        fetch('/api/strategy/position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_position: inputs.current_position,
            remaining_laps: inputs.remaining_laps,
            gap_to_car_ahead: inputs.gap_to_car_ahead,
            gap_to_car_behind: inputs.gap_to_car_behind,
            tire_advantage: 5
          })
        })
      ]);

      setTireResult(await tireRes.json());
      setPitResult(await pitRes.json());
      setPaceResult(await paceRes.json());
      setPositionResult(await posRes.json());
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const InputSlider = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 1,
    unit = '',
    onChange 
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (v: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-carbon rounded-lg appearance-none cursor-pointer accent-racing-red"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-racing text-2xl flex items-center gap-3">
            <Brain className="w-8 h-8 text-racing-red" />
            STRATEGY ANALYSIS
          </h1>
          <p className="text-gray-400 mt-1">ML-powered race strategy predictions</p>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <Zap className={clsx('w-5 h-5', loading && 'animate-pulse')} />
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Session Warning */}
      {!sessionKey && (
        <div className="card p-4 bg-tire-medium/10 border border-tire-medium/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-tire-medium mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1 text-sm">No Session Selected</h3>
              <p className="text-xs text-gray-400">
                Select a track/session from the header dropdown for real-time data. Strategy analysis works with manual inputs below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Input Panel */}
        <motion.div 
          className="card p-6 col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="font-racing text-lg mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-racing-red" />
            RACE CONDITIONS
          </h2>
          
          <div className="space-y-5">
            <InputSlider 
              label="Track Temperature" 
              value={inputs.track_temperature} 
              min={15} max={60} 
              unit="°C"
              onChange={(v) => updateInput('track_temperature', v)}
            />
            <InputSlider 
              label="Current Lap" 
              value={inputs.current_lap} 
              min={1} max={inputs.total_laps}
              onChange={(v) => {
                updateInput('current_lap', v);
                updateInput('remaining_laps', inputs.total_laps - v);
              }}
            />
            <InputSlider 
              label="Total Laps" 
              value={inputs.total_laps} 
              min={30} max={78}
              onChange={(v) => {
                updateInput('total_laps', v);
                updateInput('remaining_laps', v - inputs.current_lap);
              }}
            />
            <InputSlider 
              label="Tire Age" 
              value={inputs.tire_age} 
              min={0} max={40}
              unit=" laps"
              onChange={(v) => updateInput('tire_age', v)}
            />
            <InputSlider 
              label="Position" 
              value={inputs.current_position} 
              min={1} max={20}
              onChange={(v) => updateInput('current_position', v)}
            />
            <InputSlider 
              label="Gap Ahead" 
              value={inputs.gap_to_car_ahead} 
              min={0} max={30} 
              step={0.1}
              unit="s"
              onChange={(v) => updateInput('gap_to_car_ahead', v)}
            />
            <InputSlider 
              label="Gap Behind" 
              value={inputs.gap_to_car_behind} 
              min={0} max={30}
              step={0.1}
              unit="s"
              onChange={(v) => updateInput('gap_to_car_behind', v)}
            />
            <InputSlider 
              label="Fuel Load" 
              value={inputs.fuel_load} 
              min={5} max={110}
              unit=" kg"
              onChange={(v) => updateInput('fuel_load', v)}
            />
            <InputSlider 
              label="Rain Probability" 
              value={inputs.rain_probability} 
              min={0} max={100}
              unit="%"
              onChange={(v) => updateInput('rain_probability', v)}
            />
          </div>
        </motion.div>

        {/* Results Panel */}
        <div className="col-span-2 space-y-6">
          {/* Tire Strategy Result */}
          {tireResult && (
            <motion.div 
              className="card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-tire-medium" />
                TIRE STRATEGY
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Recommended</p>
                  <p className={clsx(
                    'stat-value text-2xl mt-1',
                    tireResult.recommended_compound === 'SOFT' && 'text-tire-soft',
                    tireResult.recommended_compound === 'MEDIUM' && 'text-tire-medium',
                    tireResult.recommended_compound === 'HARD' && 'text-tire-hard'
                  )}>
                    {tireResult.recommended_compound}
                  </p>
                </div>
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Stint Length</p>
                  <p className="stat-value text-2xl mt-1 text-sky-400">
                    {tireResult.predicted_stint_length} <span className="text-sm">laps</span>
                  </p>
                </div>
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Confidence</p>
                  <p className="stat-value text-2xl mt-1 text-timing-green">
                    {(tireResult.compound_confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              {tireResult.strategy_notes && (
                <div className="space-y-2">
                  {tireResult.strategy_notes.map((note: string, i: number) => (
                    <p key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span>{note}</span>
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Pit Stop Result */}
          {pitResult && (
            <motion.div 
              className="card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-tire-medium" />
                PIT STOP ANALYSIS
              </h2>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className={clsx(
                  'p-4 rounded-lg text-center',
                  pitResult.in_pit_window ? 'bg-timing-green/20 border border-timing-green/50' : 'bg-carbon/50'
                )}>
                  <p className="stat-label">Pit Window</p>
                  <p className={clsx(
                    'stat-value text-xl mt-1',
                    pitResult.in_pit_window ? 'text-timing-green' : 'text-gray-400'
                  )}>
                    {pitResult.in_pit_window ? 'OPEN' : 'CLOSED'}
                  </p>
                </div>
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Optimal Lap</p>
                  <p className="stat-value text-xl mt-1 text-sky-400">
                    {pitResult.optimal_pit_lap}
                  </p>
                </div>
                <div className={clsx(
                  'p-4 rounded-lg text-center',
                  pitResult.undercut_opportunity ? 'bg-racing-red/20 border border-racing-red/50' : 'bg-carbon/50'
                )}>
                  <p className="stat-label">Undercut</p>
                  <p className={clsx(
                    'stat-value text-xl mt-1',
                    pitResult.undercut_opportunity ? 'text-racing-red' : 'text-gray-400'
                  )}>
                    {pitResult.undercut_opportunity ? 'AVAILABLE' : 'NO'}
                  </p>
                </div>
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Urgency</p>
                  <div className="mt-2">
                    <div className="w-full h-2 bg-carbon rounded-full overflow-hidden">
                      <div 
                        className={clsx(
                          'h-full rounded-full transition-all',
                          pitResult.pit_urgency > 70 ? 'bg-racing-red' :
                          pitResult.pit_urgency > 40 ? 'bg-tire-medium' : 'bg-timing-green'
                        )}
                        style={{ width: `${pitResult.pit_urgency}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pitResult.pit_urgency}%</p>
                  </div>
                </div>
              </div>
              {pitResult.recommendation && (
                <div className="p-3 bg-carbon/50 rounded-lg">
                  <p className="text-sm font-medium">{pitResult.recommendation}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Position Result */}
          {positionResult && (
            <motion.div 
              className="card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-racing text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-timing-green" />
                POSITION PREDICTION
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Current</p>
                  <p className="stat-value text-2xl mt-1">
                    P{positionResult.current_position}
                  </p>
                </div>
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Predicted Final</p>
                  <p className={clsx(
                    'stat-value text-2xl mt-1',
                    positionResult.predicted_final_position < positionResult.current_position ? 'text-timing-green' :
                    positionResult.predicted_final_position > positionResult.current_position ? 'text-racing-red' : 'text-white'
                  )}>
                    P{positionResult.predicted_final_position}
                  </p>
                </div>
                <div className="p-4 bg-carbon/50 rounded-lg text-center">
                  <p className="stat-label">Overtake Prob</p>
                  <p className="stat-value text-2xl mt-1 text-sky-400">
                    {(positionResult.overtake_probability * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              {positionResult.battle_status && (
                <div className="p-3 bg-carbon/50 rounded-lg mb-3">
                  <p className="text-sm font-medium">{positionResult.battle_status}</p>
                </div>
              )}
              {positionResult.tactical_recommendations && (
                <div className="space-y-2">
                  {positionResult.tactical_recommendations.map((rec: string, i: number) => (
                    <p key={i} className="text-sm text-gray-300">{rec}</p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* No results state */}
          {!tireResult && !pitResult && !positionResult && (
            <div className="card p-12 text-center">
              <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
              <p className="text-gray-400">
                Adjust the race conditions and click "Run Analysis" to get ML-powered strategy predictions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
