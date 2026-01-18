"""
Hybrid Data Collector - Combines Real OpenF1 Data with Domain Knowledge
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


class HybridDataCollector:
    """
    Collects and processes F1 data from multiple sources:
    1. Real OpenF1 API data (when available)
    2. Domain knowledge rules (for missing/incomplete data)
    3. Weighted combination for training
    """
    
    # Domain knowledge rules (based on F1 strategy principles)
    DOMAIN_RULES = {
        "tire_compound": {
            "soft_stint_base": 12,  # Average soft tire stint
            "medium_stint_base": 25,
            "hard_stint_base": 35,
            "temp_threshold_hot": 40,  # Celsius
            "temp_threshold_cold": 25,
            "rain_crossover": 70,  # % probability
            "wet_crossover": 85,
            "short_stint_threshold": 15,  # laps remaining
        },
        "pit_stop": {
            "min_window_tire_age": 12,
            "max_window_tire_age": 35,
            "optimal_tire_age": 20,
            "undercut_gap_threshold": 0.15,  # fraction of pit delta
            "pit_delta_base": 22,  # seconds
        },
        "pace": {
            "fuel_effect_per_kg": 0.03,  # seconds per kg
            "tire_degradation_base": 0.05,  # seconds per lap per lap of age
            "compound_offsets": {
                "SOFT": -0.3,
                "MEDIUM": 0.0,
                "HARD": 0.4,
                "INTERMEDIATE": 0.8,
                "WET": 1.5
            }
        }
    }
    
    def __init__(self, real_data_weight: float = 0.7, synthetic_data_weight: float = 0.3):
        """
        Args:
            real_data_weight: Weight for real OpenF1 data (0.0-1.0)
            synthetic_data_weight: Weight for synthetic/domain knowledge data
        """
        self.real_data_weight = real_data_weight
        self.synthetic_data_weight = synthetic_data_weight
    
    def process_real_tire_data(self, session_data: Dict) -> pd.DataFrame:
        """
        Extract tire strategy data from real OpenF1 session data.
        Uses actual race outcomes to create training labels.
        """
        samples = []
        
        laps = session_data.get('laps', [])
        stints = session_data.get('stints', [])
        weather = session_data.get('weather', [])
        race_control = session_data.get('race_control', [])
        
        if not laps or not stints:
            return pd.DataFrame()
        
        # Group stints by driver
        driver_stints = {}
        for stint in stints:
            driver = stint.get('driver_number')
            if driver not in driver_stints:
                driver_stints[driver] = []
            driver_stints[driver].append(stint)
        
        # Get weather context
        current_weather = weather[-1] if weather else {}
        has_rain = any(rc.get('category') == 'rain' for rc in race_control) if race_control else False
        
        for lap in laps:
            if not lap.get('lap_duration'):
                continue
            
            driver_num = lap.get('driver_number')
            lap_num = lap.get('lap_number', 1)
            
            # Find current stint for this driver
            current_stint = None
            if driver_num in driver_stints:
                for stint in driver_stints[driver_num]:
                    start = stint.get('lap_start', 0)
                    end = stint.get('lap_end', 999)
                    if start <= lap_num <= end:
                        current_stint = stint
                        break
            
            if not current_stint:
                continue
            
            # Calculate tire age within stint
            tire_age_in_stint = lap_num - current_stint.get('lap_start', lap_num)
            total_laps = max([l.get('lap_number', 0) for l in laps] or [50])
            
            # Get actual compound used (REAL DATA)
            actual_compound = current_stint.get('compound', 'MEDIUM')
            
            # Calculate actual stint length (REAL DATA)
            actual_stint_length = current_stint.get('stint_length', 
                current_stint.get('lap_end', lap_num) - current_stint.get('lap_start', lap_num) + 1)
            
            # Estimate degradation from lap time progression
            degradation_rate = self._estimate_degradation_from_laps(
                laps, driver_num, current_stint
            )
            
            sample = {
                # Features
                "track_temperature": current_weather.get('track_temperature', 30),
                "air_temperature": current_weather.get('air_temperature', 25),
                "humidity": current_weather.get('humidity', 50),
                "track_length": 5.0,  # Average, could be fetched from circuit data
                "number_of_corners": 15,  # Could be fetched from circuit data
                "high_speed_corners": 5,
                "low_speed_corners": 10,
                "current_lap": lap_num,
                "total_laps": total_laps,
                "remaining_laps": total_laps - lap_num,
                "current_position": 10,  # Could be fetched from position data
                "gap_to_leader": 0,
                "gap_to_car_ahead": 0,
                "gap_to_car_behind": 0,
                "fuel_load": max(5, 110 - (lap_num * 1.8)),  # Estimated
                "tire_age": tire_age_in_stint,
                "rain_probability": 50 if has_rain else 0,
                "track_evolution": min(100, lap_num * 2),
                "safety_car": 1 if any('safety' in str(rc.get('category', '')).lower() 
                                      for rc in race_control) else 0,
                "vsc": 1 if any('vsc' in str(rc.get('category', '')).lower() 
                               for rc in race_control) else 0,
                # Labels (from REAL race data)
                "optimal_compound": actual_compound,  # What was actually used
                "optimal_stint_length": actual_stint_length,  # Actual stint length
                "degradation_rate": degradation_rate,
                # Metadata
                "data_source": "real",  # Mark as real data
                "confidence": 1.0  # High confidence for real data
            }
            samples.append(sample)
        
        return pd.DataFrame(samples)
    
    def generate_synthetic_tire_data(self, n_samples: int, context: Optional[Dict] = None) -> pd.DataFrame:
        """
        Generate synthetic tire strategy data using domain knowledge.
        Can use context from real data to make synthetic data more realistic.
        """
        rules = self.DOMAIN_RULES["tire_compound"]
        np.random.seed(42)
        
        # Use context from real data if available (e.g., track characteristics)
        track_temp_range = context.get('track_temp_range', (20, 50)) if context else (20, 50)
        
        data = {
            "track_temperature": np.random.uniform(track_temp_range[0], track_temp_range[1], n_samples),
            "air_temperature": np.random.uniform(15, 40, n_samples),
            "humidity": np.random.uniform(20, 90, n_samples),
            "track_length": np.random.uniform(3.0, 7.0, n_samples),
            "number_of_corners": np.random.randint(10, 25, n_samples),
            "high_speed_corners": np.random.randint(2, 10, n_samples),
            "low_speed_corners": np.random.randint(5, 15, n_samples),
            "current_lap": np.random.randint(1, 50, n_samples),
            "total_laps": np.random.randint(50, 70, n_samples),
            "remaining_laps": np.random.randint(1, 50, n_samples),
            "current_position": np.random.randint(1, 20, n_samples),
            "gap_to_leader": np.random.uniform(0, 60, n_samples),
            "gap_to_car_ahead": np.random.uniform(0, 10, n_samples),
            "gap_to_car_behind": np.random.uniform(0, 10, n_samples),
            "fuel_load": np.random.uniform(10, 110, n_samples),
            "tire_age": np.random.randint(0, 30, n_samples),
            "rain_probability": np.random.uniform(0, 100, n_samples),
            "track_evolution": np.random.uniform(0, 100, n_samples),
            "safety_car": np.random.choice([0, 1], n_samples, p=[0.9, 0.1]),
            "vsc": np.random.choice([0, 1], n_samples, p=[0.95, 0.05]),
        }
        
        df = pd.DataFrame(data)
        
        # Apply domain knowledge rules with some randomness
        def get_optimal_compound(row):
            # Rain rules
            if row["rain_probability"] > rules["wet_crossover"]:
                return "WET"
            if row["rain_probability"] > rules["rain_crossover"]:
                return "INTERMEDIATE"
            
            # Temperature rules
            if row["track_temperature"] > rules["temp_threshold_hot"]:
                # Hot track favors hard tires
                return "HARD" if row["remaining_laps"] > 20 else "MEDIUM"
            
            if row["track_temperature"] < rules["temp_threshold_cold"]:
                # Cold track favors soft tires
                return "SOFT"
            
            # Remaining laps rules
            if row["remaining_laps"] < rules["short_stint_threshold"]:
                return "SOFT"  # Short stint = soft for maximum pace
            
            # Default: medium for balanced approach
            # Add some strategy variance based on position
            if row["current_position"] <= 3:
                # Top positions: conservative medium/hard
                return "MEDIUM" if np.random.random() > 0.3 else "HARD"
            elif row["current_position"] >= 15:
                # Back of grid: aggressive soft
                return "SOFT" if np.random.random() > 0.5 else "MEDIUM"
            else:
                # Midfield: balanced
                return np.random.choice(["SOFT", "MEDIUM", "HARD"], p=[0.3, 0.5, 0.2])
        
        df["optimal_compound"] = df.apply(get_optimal_compound, axis=1)
        
        # Calculate stint length based on compound and conditions
        compound_base = {
            "SOFT": rules["soft_stint_base"],
            "MEDIUM": rules["medium_stint_base"],
            "HARD": rules["hard_stint_base"],
            "INTERMEDIATE": 20,
            "WET": 15
        }
        
        df["optimal_stint_length"] = df.apply(
            lambda row: compound_base[row["optimal_compound"]] + 
            np.random.randint(-5, 6) -  # Random variation
            (row["track_temperature"] - 30) * 0.2 -  # Hot = shorter stint
            row["high_speed_corners"] * 0.5,  # More high-speed corners = more wear
            axis=1
        )
        df["optimal_stint_length"] = df["optimal_stint_length"].clip(lower=5, upper=50)
        
        # Calculate degradation rate using domain knowledge
        df["degradation_rate"] = df.apply(
            lambda row: (
                self.DOMAIN_RULES["pace"]["tire_degradation_base"] +
                (row["track_temperature"] - 30) * 0.002 +  # Hot = more degradation
                row["high_speed_corners"] * 0.003 +  # High-speed corners = more wear
                np.random.uniform(-0.01, 0.01)  # Random variation
            ),
            axis=1
        )
        df["degradation_rate"] = df["degradation_rate"].clip(lower=0.01, upper=0.15)
        
        # Mark as synthetic
        df["data_source"] = "synthetic"
        df["confidence"] = self.synthetic_data_weight  # Lower confidence for synthetic
        
        return df
    
    def create_hybrid_dataset(
        self, 
        real_data: List[Dict], 
        min_real_samples: int = 100,
        target_total_samples: int = 1000
    ) -> pd.DataFrame:
        """
        Create hybrid dataset combining real and synthetic data.
        
        Args:
            real_data: List of session data dictionaries from OpenF1
            min_real_samples: Minimum number of real samples needed
            target_total_samples: Target total samples in final dataset
        """
        all_real_samples = []
        
        # Process all real data
        for session in real_data:
            real_df = self.process_real_tire_data(session)
            if len(real_df) > 0:
                all_real_samples.append(real_df)
        
        # Combine all real samples
        real_df = pd.concat(all_real_samples, ignore_index=True) if all_real_samples else pd.DataFrame()
        
        n_real = len(real_df)
        logger.info(f"Collected {n_real} real samples from OpenF1 data")
        
        # Determine how much synthetic data to generate
        if n_real < min_real_samples:
            # Not enough real data - generate more synthetic
            n_synthetic = target_total_samples
            logger.info(f"Not enough real data ({n_real} < {min_real_samples}), generating {n_synthetic} synthetic samples")
        else:
            # Use real data primarily, supplement with synthetic
            n_synthetic = max(0, int((target_total_samples - n_real) * self.synthetic_data_weight))
            logger.info(f"Supplementing {n_real} real samples with {n_synthetic} synthetic samples")
        
        # Generate synthetic data
        synthetic_df = pd.DataFrame()
        if n_synthetic > 0:
            # Extract context from real data to make synthetic more realistic
            context = {}
            if len(real_df) > 0:
                context['track_temp_range'] = (
                    real_df['track_temperature'].min(),
                    real_df['track_temperature'].max()
                )
            
            synthetic_df = self.generate_synthetic_tire_data(n_synthetic, context)
        
        # Combine datasets with weights
        if len(real_df) > 0 and len(synthetic_df) > 0:
            # Weight real data more heavily
            real_df['sample_weight'] = self.real_data_weight
            synthetic_df['sample_weight'] = self.synthetic_data_weight
            
            # Combine
            hybrid_df = pd.concat([real_df, synthetic_df], ignore_index=True)
            logger.info(f"Created hybrid dataset: {len(real_df)} real + {len(synthetic_df)} synthetic = {len(hybrid_df)} total")
            return hybrid_df
        elif len(real_df) > 0:
            real_df['sample_weight'] = 1.0
            return real_df
        else:
            synthetic_df['sample_weight'] = 1.0
            return synthetic_df
    
    def _estimate_degradation_from_laps(self, laps: List[Dict], driver_num: int, stint: Dict) -> float:
        """
        Estimate tire degradation rate from actual lap time progression.
        This uses REAL data to calculate degradation.
        """
        stint_laps = [
            l for l in laps 
            if (l.get('driver_number') == driver_num and
                stint.get('lap_start', 0) <= l.get('lap_number', 0) <= stint.get('lap_end', 999))
        ]
        
        if len(stint_laps) < 3:
            # Not enough data, use domain knowledge estimate
            return self.DOMAIN_RULES["pace"]["tire_degradation_base"]
        
        # Sort by lap number
        stint_laps.sort(key=lambda x: x.get('lap_number', 0))
        
        # Get lap times
        lap_times = [l.get('lap_duration') for l in stint_laps if l.get('lap_duration')]
        
        if len(lap_times) < 3:
            return self.DOMAIN_RULES["pace"]["tire_degradation_base"]
        
        # Calculate degradation: how much slower per lap
        # Compare early laps (tires fresh) vs late laps (tires worn)
        early_laps = np.mean(lap_times[:3])  # First 3 laps
        late_laps = np.mean(lap_times[-3:])  # Last 3 laps
        
        if late_laps <= early_laps:
            return 0.01  # No degradation or improvement (fuel effect)
        
        # Degradation per lap of tire age
        degradation_per_lap = (late_laps - early_laps) / len(stint_laps)
        # Normalize to degradation rate (seconds per lap per lap of age)
        degradation_rate = degradation_per_lap / max(1, len(stint_laps))
        
        return max(0.01, min(0.15, degradation_rate))  # Clip to reasonable range
    
    def process_real_pit_data(self, session_data: Dict) -> pd.DataFrame:
        """Extract pit stop data from real OpenF1 data"""
        samples = []
        
        laps = session_data.get('laps', [])
        stints = session_data.get('stints', [])
        intervals = session_data.get('intervals', [])
        pit_stops = session_data.get('pit_stops', [])
        
        if not laps or not stints:
            return pd.DataFrame()
        
        # Get actual pit stop timings (REAL DATA)
        pit_laps_by_driver = {}
        for pit in pit_stops:
            driver = pit.get('driver_number')
            lap_num = pit.get('lap_number')
            if driver not in pit_laps_by_driver:
                pit_laps_by_driver[driver] = []
            pit_laps_by_driver[driver].append(lap_num)
        
        total_laps = max([l.get('lap_number', 0) for l in laps] or [50])
        
        for lap in laps:
            if not lap.get('lap_duration'):
                continue
            
            driver_num = lap.get('driver_number')
            lap_num = lap.get('lap_number', 1)
            
            # Find current stint
            current_stint = None
            for stint in stints:
                if stint.get('driver_number') == driver_num:
                    if stint.get('lap_start', 0) <= lap_num <= stint.get('lap_end', 999):
                        current_stint = stint
                        break
            
            if not current_stint:
                continue
            
            # Check if this lap was a pit stop (REAL DATA)
            is_pit_lap = lap_num in pit_laps_by_driver.get(driver_num, [])
            
            # Calculate if in optimal pit window (domain knowledge + real context)
            tire_age = lap.get('tyre_life', 0) or (lap_num - current_stint.get('lap_start', lap_num))
            rules = self.DOMAIN_RULES["pit_stop"]
            
            in_pit_window = (
                tire_age >= rules["min_window_tire_age"] and
                tire_age <= rules["max_window_tire_age"] and
                (total_laps - lap_num) > 10
            )
            
            # Get interval data
            interval = next((inv for inv in intervals if inv.get('driver_number') == driver_num), None)
            gap_ahead = interval.get('interval', 5.0) if interval else 5.0
            
            sample = {
                "current_lap": lap_num,
                "total_laps": total_laps,
                "remaining_laps": total_laps - lap_num,
                "tire_age": tire_age,
                "tire_compound_idx": {"SOFT": 0, "MEDIUM": 1, "HARD": 2}.get(
                    current_stint.get('compound', 'MEDIUM'), 1
                ),
                "current_position": 10,
                "gap_to_car_ahead": gap_ahead,
                "gap_to_car_behind": 2.0,
                "pit_delta": rules["pit_delta_base"],
                "track_position_value": 50,
                "tire_degradation_rate": 0.05,
                "current_pace_delta": 0,
                "competitor_tire_age": 15,
                "competitor_compound_idx": 1,
                "fuel_adjusted_pace": 0,
                "traffic_density": 5,
                "safety_car_probability": 10,
                "drs_available": 1,
                "track_temperature": 30,
                "rain_probability": 0,
                # Labels (REAL DATA: did they actually pit?)
                "in_pit_window": 1 if in_pit_window else 0,
                "actual_pit_taken": 1 if is_pit_lap else 0,  # Did they actually pit?
                "undercut_opportunity": 1 if (gap_ahead < rules["pit_delta_base"] * rules["undercut_gap_threshold"] 
                                               and tire_age > 15) else 0,
                "optimal_pit_lap": pit_laps_by_driver[driver_num][0] if pit_laps_by_driver.get(driver_num) else lap_num + 20,
                "data_source": "real",
                "confidence": 1.0
            }
            samples.append(sample)
        
        return pd.DataFrame(samples)
    
    def generate_synthetic_pit_data(self, n_samples: int) -> pd.DataFrame:
        """Generate synthetic pit stop data using domain knowledge"""
        rules = self.DOMAIN_RULES["pit_stop"]
        np.random.seed(42)
        
        # Similar structure to tire data generation but for pit stops
        data = {
            "current_lap": np.random.randint(1, 55, n_samples),
            "total_laps": np.random.randint(50, 70, n_samples),
            "remaining_laps": np.random.randint(1, 55, n_samples),
            "tire_age": np.random.randint(0, 35, n_samples),
            "tire_compound_idx": np.random.randint(0, 3, n_samples),
            "current_position": np.random.randint(1, 20, n_samples),
            "gap_to_car_ahead": np.random.exponential(3, n_samples),
            "gap_to_car_behind": np.random.exponential(3, n_samples),
            "pit_delta": np.random.uniform(18, 26, n_samples),
            "track_position_value": np.random.uniform(30, 80, n_samples),
            "tire_degradation_rate": np.random.uniform(0.02, 0.12, n_samples),
            "current_pace_delta": np.random.normal(0, 0.5, n_samples),
            "competitor_tire_age": np.random.randint(0, 35, n_samples),
            "competitor_compound_idx": np.random.randint(0, 3, n_samples),
            "fuel_adjusted_pace": np.random.normal(0, 0.3, n_samples),
            "traffic_density": np.random.randint(0, 15, n_samples),
            "safety_car_probability": np.random.uniform(0, 30, n_samples),
            "drs_available": np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
            "track_temperature": np.random.uniform(20, 50, n_samples),
            "rain_probability": np.random.uniform(0, 100, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Apply domain knowledge rules
        df["in_pit_window"] = (
            (df["tire_age"] >= rules["min_window_tire_age"]) &
            (df["tire_age"] <= rules["max_window_tire_age"]) &
            (df["remaining_laps"] > 10)
        ).astype(int)
        
        df["undercut_opportunity"] = (
            (df["gap_to_car_ahead"] < df["pit_delta"] * rules["undercut_gap_threshold"]) &
            (df["tire_age"] > df["competitor_tire_age"]) &
            (df["in_pit_window"] == 1)
        ).astype(int)
        
        compound_stint = {0: 15, 1: 25, 2: 35}
        df["optimal_pit_lap"] = df.apply(
            lambda row: row["current_lap"] + 
            compound_stint[row["tire_compound_idx"]] - 
            row["tire_age"] +
            np.random.randint(-3, 4),
            axis=1
        )
        
        df["actual_pit_taken"] = df["in_pit_window"].apply(lambda x: 1 if x and np.random.random() > 0.3 else 0)
        
        df["data_source"] = "synthetic"
        df["confidence"] = self.synthetic_data_weight
        
        return df
    
    def create_hybrid_pit_dataset(
        self,
        real_data: List[Dict],
        min_real_samples: int = 100,
        target_total_samples: int = 800
    ) -> pd.DataFrame:
        """Create hybrid pit stop dataset"""
        all_real_samples = []
        
        for session in real_data:
            real_df = self.process_real_pit_data(session)
            if len(real_df) > 0:
                all_real_samples.append(real_df)
        
        real_df = pd.concat(all_real_samples, ignore_index=True) if all_real_samples else pd.DataFrame()
        n_real = len(real_df)
        
        n_synthetic = max(0, int((target_total_samples - n_real) * self.synthetic_data_weight))
        if n_real < min_real_samples:
            n_synthetic = target_total_samples
        
        synthetic_df = self.generate_synthetic_pit_data(n_synthetic) if n_synthetic > 0 else pd.DataFrame()
        
        if len(real_df) > 0 and len(synthetic_df) > 0:
            real_df['sample_weight'] = self.real_data_weight
            synthetic_df['sample_weight'] = self.synthetic_data_weight
            return pd.concat([real_df, synthetic_df], ignore_index=True)
        elif len(real_df) > 0:
            real_df['sample_weight'] = 1.0
            return real_df
        else:
            synthetic_df['sample_weight'] = 1.0
            return synthetic_df
