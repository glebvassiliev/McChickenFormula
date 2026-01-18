/**
 * TypeScript interfaces for F1 Pitwall ML Models
 * These match the Pydantic output schemas from the FastAPI backend
 */

// ============================================================================
// Tire Compound Types
// ============================================================================
export type TireCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';

export const TIRE_COLORS: Record<TireCompound, string> = {
  SOFT: '#FF0000',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD',
};

// ============================================================================
// Pit Stop Prediction Model
// ============================================================================
export interface StrategyOption {
  name: string;
  pit_lap: number;
  compound: TireCompound;
  expected_gain: string;
  risk: 'Low' | 'Medium' | 'High';
}

export interface PitStopPrediction {
  in_pit_window: boolean;
  pit_window_probability: number;
  undercut_opportunity: boolean;
  undercut_probability: number;
  optimal_pit_lap: number;
  laps_until_optimal: number;
  pit_urgency: number; // 0-100
  recommendation: string;
  strategy_options: StrategyOption[];
}

export interface PitStopRequest {
  current_lap: number;
  total_laps: number;
  remaining_laps: number;
  tire_age: number;
  tire_compound_idx: number; // 0=SOFT, 1=MED, 2=HARD
  current_position: number;
  gap_to_car_ahead: number;
  gap_to_car_behind: number;
  pit_delta: number;
  track_position_value: number;
  tire_degradation_rate: number;
  current_pace_delta: number;
  competitor_tire_age: number;
  competitor_compound_idx: number;
  fuel_adjusted_pace: number;
  traffic_density: number;
  safety_car_probability: number;
  drs_available: number;
  track_temperature: number;
  rain_probability: number;
  safety_car_deployed?: boolean;
}

// ============================================================================
// Position Prediction Model
// ============================================================================
export interface AttackAnalysis {
  gap_to_target: number;
  probability: number;
  factors: string[];
  recommended_action: 'ATTACK' | 'PRESSURE';
}

export interface DefenseAnalysis {
  gap_to_threat: number;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
  threat_color: 'green' | 'yellow' | 'red';
  lose_probability: number;
  recommended_action: 'DEFEND' | 'MAINTAIN';
}

export interface PositionChangeProbabilities {
  lose_position: number;
  maintain: number;
  gain_position: number;
}

export interface PositionModelOutput {
  current_position: number;
  predicted_final_position: number;
  overtake_probability: number;
  position_change_probabilities: PositionChangeProbabilities;
  attack_analysis: AttackAnalysis;
  defense_analysis: DefenseAnalysis;
  battle_status: string;
  tactical_recommendations: string[];
}

export interface PositionRequest {
  current_position: number;
  lap_number: number;
  remaining_laps: number;
  gap_to_car_ahead: number;
  gap_to_car_behind: number;
  relative_pace: number;
  tire_advantage: number;
  compound_advantage: number;
  drs_available: number;
  battery_level: number;
  straight_length: number;
  overtaking_difficulty: number;
  track_position_value: number;
  driver_aggression: number;
  car_performance_delta: number;
  weather_stability: number;
  safety_car_probability: number;
  laps_since_pit: number;
  competitor_laps_since_pit: number;
  points_position: number;
}

// ============================================================================
// Tire Strategy Model
// ============================================================================
export interface TireDegradationProfile {
  recommended_compound: TireCompound;
  compound_confidence: number;
  compound_probabilities: Record<TireCompound, number>;
  predicted_stint_length: number;
  degradation_rate_per_lap: number;
  expected_time_loss_per_lap: number; // milliseconds
  strategy_notes: string[];
}

export interface TireStrategyRequest {
  track_temperature: number;
  air_temperature: number;
  humidity: number;
  track_length: number;
  number_of_corners: number;
  high_speed_corners: number;
  low_speed_corners: number;
  current_lap: number;
  total_laps: number;
  remaining_laps: number;
  current_position: number;
  gap_to_leader: number;
  gap_to_car_ahead: number;
  gap_to_car_behind: number;
  fuel_load: number;
  tire_age: number;
  rain_probability: number;
  track_evolution: number;
  safety_car_deployed?: boolean;
  vsc_deployed?: boolean;
}

// ============================================================================
// Race Pace Analysis Model
// ============================================================================
export interface LapPrediction {
  lap: number;
  predicted_time: number;
  fuel_load: number;
  tire_age: number;
}

export interface PerformanceAssessment {
  level: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW PAR';
  color: 'green' | 'lime' | 'yellow' | 'red';
  delta_to_best: number;
  delta_to_average: number;
  trend: 'improving' | 'degrading';
}

export interface RacePaceOutput {
  predicted_lap_time: number;
  fuel_effect_per_kg: number;
  pace_trend_per_lap: number;
  current_delta_to_optimal: number;
  lap_predictions: LapPrediction[];
  performance_assessment: PerformanceAssessment;
  recommendations: string[];
}

export interface RacePaceRequest {
  lap_number: number;
  fuel_load: number;
  tire_age: number;
  tire_compound_idx: number;
  track_temperature: number;
  air_temperature: number;
  track_evolution: number;
  traffic: number;
  drs_enabled: number;
  sector1_time: number;
  sector2_time: number;
  previous_lap_time: number;
  best_lap_time: number;
  avg_lap_time: number;
  position: number;
  wind_speed: number;
  humidity: number;
  safety_car_laps: number;
  push_level: number;
  battery_deployment: number;
}

// ============================================================================
// Dashboard Data Types
// ============================================================================
export interface Driver {
  driver_number: number;
  name: string;
  name_acronym: string;
  team_name: string;
  team_color: string;
  position: number;
  gap_to_leader: number | string | null;
  gap_to_car_ahead: number | null;
  last_lap_time: number | null;
  best_lap_time: number | null;
  tire_compound: TireCompound;
  tire_age: number;
  pit_stops: number;
  position_prediction?: 'up' | 'down' | 'stable';
  traffic_risk?: boolean;
}

export interface WeatherData {
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: boolean;
  rain_probability: number;
}

export interface RaceControlMessage {
  timestamp: string;
  category: 'SafetyCar' | 'VSC' | 'Flag' | 'Other';
  message: string;
  flag?: 'GREEN' | 'YELLOW' | 'RED' | 'SC' | 'VSC' | 'CHEQUERED';
}

export interface SessionInfo {
  session_key: number;
  meeting_name: string;
  session_name: string;
  circuit_short_name: string;
  date_start: string;
  current_lap: number;
  total_laps: number;
  status: 'live' | 'finished' | 'upcoming';
}

// ============================================================================
// Chart Data Types (for Recharts)
// ============================================================================
export interface PitWindowDataPoint {
  lap: number;
  currentPace: number;
  predictedPace: number;
  undercutWindow?: number;
  optimalWindow?: boolean;
}

export interface TireDegradationDataPoint {
  lap: number;
  soft: number | null;
  medium: number | null;
  hard: number | null;
  current: number;
  crossoverLap?: boolean;
}

export interface PaceHistogramDataPoint {
  lap: number;
  lapTime: number;
  targetTime: number;
  delta: number;
  deltaType: 'positive' | 'negative' | 'neutral';
}

export interface SectorDelta {
  sector: 1 | 2 | 3;
  driverTime: number;
  rivalTime: number;
  delta: number;
  deltaType: 'faster' | 'slower' | 'equal';
}

// ============================================================================
// Strategy Mode Types
// ============================================================================
export type StrategyMode = 'push' | 'conserve';

export interface StrategyContext {
  mode: StrategyMode;
  targetDriver: Driver | null;
  selectedRival: Driver | null;
  pitStopPrediction: PitStopPrediction | null;
  positionPrediction: PositionModelOutput | null;
  tirePrediction: TireDegradationProfile | null;
  pacePrediction: RacePaceOutput | null;
}

// ============================================================================
// API Response Types
// ============================================================================
export interface ModelStatus {
  name: string;
  status: 'loaded' | 'trained' | 'not_loaded' | 'error';
  description: string;
  ready: boolean;
}

export interface ModelStatusResponse {
  models: ModelStatus[];
}

export interface FullStrategyAnalysis {
  tire_strategy: TireDegradationProfile | null;
  pit_stop: PitStopPrediction | null;
  race_pace: RacePaceOutput | null;
  position: PositionModelOutput | null;
  executive_summary: {
    critical_actions: string[];
    recommendations: string[];
    risk_factors: string[];
  };
}
