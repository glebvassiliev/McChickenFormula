"""
Complete training script for Colab - can be copied into notebook cells
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib

def prepare_tire_data(session_data_list):
    """Prepare tire strategy training data"""
    samples = []
    
    for session_data in session_data_list:
        laps = session_data.get('laps', [])
        stints = session_data.get('stints', [])
        weather = session_data.get('weather', [])
        
        if not laps:
            continue
            
        current_weather = weather[-1] if weather else {}
        
        # Group stints by driver
        driver_stints = {}
        for stint in stints:
            driver = stint.get('driver_number')
            if driver not in driver_stints:
                driver_stints[driver] = []
            driver_stints[driver].append(stint)
        
        for lap in laps:
            if not lap.get('lap_duration'):
                continue
                
            driver_num = lap.get('driver_number')
            lap_num = lap.get('lap_number', 1)
            
            # Find current stint
            current_stint = None
            if driver_num in driver_stints:
                for stint in driver_stints[driver_num]:
                    if stint.get('lap_start', 0) <= lap_num <= stint.get('lap_end', 999):
                        current_stint = stint
                        break
            
            total_laps = max([l.get('lap_number', 0) for l in laps] or [50])
            
            sample = {
                "track_temperature": current_weather.get('track_temperature', 30),
                "air_temperature": current_weather.get('air_temperature', 25),
                "humidity": current_weather.get('humidity', 50),
                "track_length": 5.0,
                "number_of_corners": 15,
                "high_speed_corners": 5,
                "low_speed_corners": 10,
                "current_lap": lap_num,
                "total_laps": total_laps,
                "remaining_laps": total_laps - lap_num,
                "current_position": 10,
                "gap_to_leader": 0,
                "gap_to_car_ahead": 0,
                "gap_to_car_behind": 0,
                "fuel_load": max(5, 110 - (lap_num * 1.8)),
                "tire_age": lap.get('tyre_life', 0) or (lap_num - (current_stint.get('lap_start', lap_num) if current_stint else lap_num)),
                "rain_probability": 0 if not current_weather.get('rainfall') else 50,
                "track_evolution": min(100, lap_num * 2),
                "safety_car": 0,
                "vsc": 0,
                "optimal_compound": current_stint.get('compound', 'MEDIUM') if current_stint else 'MEDIUM',
                "optimal_stint_length": current_stint.get('stint_length', 20) if current_stint else 20,
                "degradation_rate": 0.05 + np.random.uniform(-0.01, 0.01)
            }
            samples.append(sample)
    
    return pd.DataFrame(samples)

def prepare_pit_data(session_data_list):
    """Prepare pit stop training data"""
    samples = []
    
    for session_data in session_data_list:
        laps = session_data.get('laps', [])
        stints = session_data.get('stints', [])
        
        if not laps:
            continue
        
        total_laps = max([l.get('lap_number', 0) for l in laps] or [50])
        
        for lap in laps:
            if not lap.get('lap_duration'):
                continue
            
            driver_num = lap.get('driver_number')
            lap_num = lap.get('lap_number', 1)
            
            # Find stint
            current_stint = None
            for stint in stints:
                if stint.get('driver_number') == driver_num:
                    if stint.get('lap_start', 0) <= lap_num <= stint.get('lap_end', 999):
                        current_stint = stint
                        break
            
            if not current_stint:
                continue
            
            compound_map = {'SOFT': 0, 'MEDIUM': 1, 'HARD': 2, 'INTERMEDIATE': 1, 'WET': 1}
            
            sample = {
                "current_lap": lap_num,
                "total_laps": total_laps,
                "remaining_laps": total_laps - lap_num,
                "tire_age": lap.get('tyre_life', 0) or (lap_num - current_stint.get('lap_start', lap_num)),
                "tire_compound_idx": compound_map.get(current_stint.get('compound', 'MEDIUM'), 1),
                "current_position": 10,
                "gap_to_car_ahead": 2.0,
                "gap_to_car_behind": 2.0,
                "pit_delta": 22.0,
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
                "in_pit_window": 1 if 15 <= (lap.get('tyre_life', 0) or 15) <= 30 and (total_laps - lap_num) > 10 else 0,
                "undercut_opportunity": 1 if (lap.get('tyre_life', 0) or 15) > 20 else 0,
                "optimal_pit_lap": current_stint.get('lap_start', lap_num) + 20
            }
            samples.append(sample)
    
    return pd.DataFrame(samples)

def prepare_pace_data(session_data_list):
    """Prepare race pace training data"""
    samples = []
    
    for session_data in session_data_list:
        laps = session_data.get('laps', [])
        stints = session_data.get('stints', [])
        weather = session_data.get('weather', [])
        
        if not laps:
            continue
        
        current_weather = weather[-1] if weather else {}
        best_lap = min([l.get('lap_duration') for l in laps if l.get('lap_duration')] or [90])
        avg_lap = np.mean([l.get('lap_duration') for l in laps if l.get('lap_duration')] or [90])
        
        for i, lap in enumerate(laps):
            if not lap.get('lap_duration'):
                continue
            
            driver_num = lap.get('driver_number')
            
            # Find stint
            current_stint = None
            for stint in stints:
                if stint.get('driver_number') == driver_num:
                    if stint.get('lap_start', 0) <= lap.get('lap_number', 0) <= stint.get('lap_end', 999):
                        current_stint = stint
                        break
            
            compound_map = {'SOFT': 0, 'MEDIUM': 1, 'HARD': 2, 'INTERMEDIATE': 1, 'WET': 1}
            prev_lap_time = laps[i-1].get('lap_duration', avg_lap) if i > 0 else avg_lap
            
            sample = {
                "lap_number": lap.get('lap_number', 1),
                "fuel_load": max(5, 110 - (lap.get('lap_number', 1) * 1.8)),
                "tire_age": lap.get('tyre_life', 0) or (lap.get('lap_number', 1) - (current_stint.get('lap_start', 1) if current_stint else 1)),
                "tire_compound_idx": compound_map.get(current_stint.get('compound', 'MEDIUM'), 1) if current_stint else 1,
                "track_temperature": current_weather.get('track_temperature', 30),
                "air_temperature": current_weather.get('air_temperature', 25),
                "track_evolution": min(100, lap.get('lap_number', 1) * 2),
                "traffic": 0,
                "drs_enabled": 1,
                "sector1_time": lap.get('duration_sector_1', 30),
                "sector2_time": lap.get('duration_sector_2', 35),
                "previous_lap_time": prev_lap_time,
                "best_lap_time": best_lap,
                "avg_lap_time": avg_lap,
                "position": 10,
                "wind_speed": current_weather.get('wind_speed', 10),
                "humidity": current_weather.get('humidity', 50),
                "safety_car_laps": 0,
                "push_level": 80,
                "battery_deployment": 50,
                "lap_time": lap.get('lap_duration'),
                "fuel_effect": 0.03,
                "pace_trend": 0.05 * (lap.get('tyre_life', 0) or 10)
            }
            samples.append(sample)
    
    return pd.DataFrame(samples)

def prepare_position_data(session_data_list):
    """Prepare position prediction training data"""
    samples = []
    
    for session_data in session_data_list:
        laps = session_data.get('laps', [])
        intervals = session_data.get('intervals', [])
        stints = session_data.get('stints', [])
        
        if not laps:
            continue
        
        total_laps = max([l.get('lap_number', 0) for l in laps] or [50])
        
        for lap in laps:
            driver_num = lap.get('driver_number')
            lap_num = lap.get('lap_number', 1)
            
            interval = next((inv for inv in intervals if inv.get('driver_number') == driver_num), None)
            
            # Get stint
            current_stint = None
            for stint in stints:
                if stint.get('driver_number') == driver_num:
                    if stint.get('lap_start', 0) <= lap_num <= stint.get('lap_end', 999):
                        current_stint = stint
                        break
            
            compound_map = {'SOFT': -1, 'MEDIUM': 0, 'HARD': 1, 'INTERMEDIATE': 0, 'WET': 0}
            
            sample = {
                "current_position": 10,
                "lap_number": lap_num,
                "remaining_laps": total_laps - lap_num,
                "gap_to_car_ahead": interval.get('interval', 2.0) if interval else 2.0,
                "gap_to_car_behind": 2.0,
                "relative_pace": np.random.normal(0, 0.3),
                "tire_advantage": (current_stint.get('tyre_life', 10) if current_stint else 10) - 15,
                "compound_advantage": compound_map.get(current_stint.get('compound', 'MEDIUM'), 0) if current_stint else 0,
                "drs_available": 1,
                "battery_level": 80,
                "straight_length": 1000,
                "overtaking_difficulty": 50,
                "track_position_value": 50,
                "driver_aggression": 50,
                "car_performance_delta": 0,
                "weather_stability": 100,
                "safety_car_probability": 10,
                "laps_since_pit": lap_num - (current_stint.get('lap_start', lap_num) if current_stint else lap_num),
                "competitor_laps_since_pit": 15,
                "points_position": 10,
                "overtake_success": 1 if (interval.get('interval', 10) if interval else 10) < 1.0 else 0,
                "position_change": 1
            }
            samples.append(sample)
    
    return pd.DataFrame(samples)
