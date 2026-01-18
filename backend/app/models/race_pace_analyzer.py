"""
Race Pace Analyzer ML Model
Analyzes and predicts race pace, fuel effects, and performance trends
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from typing import Dict, Any, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class RacePaceAnalyzer:
    """
    ML Model for race pace analysis:
    - Lap time predictions
    - Fuel effect modeling
    - Performance trend analysis
    - Gap evolution prediction
    """
    
    def __init__(self):
        self.lap_time_regressor = None
        self.fuel_effect_regressor = None
        self.trend_regressor = None
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def _prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare feature vector from input data"""
        features = [
            data.get("lap_number", 1),
            data.get("fuel_load", 100),
            data.get("tire_age", 0),
            data.get("tire_compound_idx", 1),
            data.get("track_temperature", 30),
            data.get("air_temperature", 25),
            data.get("track_evolution", 50),
            data.get("traffic", 0),  # Cars within DRS
            data.get("drs_enabled", 1),
            data.get("sector1_time", 30),
            data.get("sector2_time", 35),
            data.get("previous_lap_time", 90),
            data.get("best_lap_time", 88),
            data.get("avg_lap_time", 89),
            data.get("position", 10),
            data.get("wind_speed", 10),
            data.get("humidity", 50),
            data.get("safety_car_laps", 0),
            data.get("push_level", 80),  # 0-100 driver push
            data.get("battery_deployment", 50),
        ]
        return np.array(features).reshape(1, -1)
    
    async def train(self, training_data: Dict) -> Dict[str, Any]:
        """Train the race pace models"""
        try:
            df = pd.DataFrame(training_data.get("samples", []))
            
            if len(df) < 10:
                df = self._generate_synthetic_data(1000)
            
            feature_cols = [
                "lap_number", "fuel_load", "tire_age", "tire_compound_idx",
                "track_temperature", "air_temperature", "track_evolution",
                "traffic", "drs_enabled", "sector1_time", "sector2_time",
                "previous_lap_time", "best_lap_time", "avg_lap_time", "position",
                "wind_speed", "humidity", "safety_car_laps", "push_level",
                "battery_deployment"
            ]
            
            X = df[feature_cols].values
            X_scaled = self.scaler.fit_transform(X)
            
            # Train lap time predictor
            y_lap_time = df["lap_time"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_lap_time, test_size=0.2, random_state=42
            )
            
            self.lap_time_regressor = GradientBoostingRegressor(
                n_estimators=150,
                max_depth=8,
                learning_rate=0.1,
                random_state=42
            )
            self.lap_time_regressor.fit(X_train, y_train)
            lap_time_r2 = self.lap_time_regressor.score(X_test, y_test)
            
            # Train fuel effect model
            y_fuel_effect = df["fuel_effect"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_fuel_effect, test_size=0.2, random_state=42
            )
            
            self.fuel_effect_regressor = RandomForestRegressor(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.fuel_effect_regressor.fit(X_train, y_train)
            fuel_r2 = self.fuel_effect_regressor.score(X_test, y_test)
            
            # Train trend predictor
            y_trend = df["pace_trend"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_trend, test_size=0.2, random_state=42
            )
            
            self.trend_regressor = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.trend_regressor.fit(X_train, y_train)
            trend_r2 = self.trend_regressor.score(X_test, y_test)
            
            self.is_trained = True
            
            return {
                "lap_time_r2": round(lap_time_r2, 4),
                "fuel_effect_r2": round(fuel_r2, 4),
                "trend_r2": round(trend_r2, 4),
                "samples_used": len(df)
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            raise
    
    def _generate_synthetic_data(self, n_samples: int) -> pd.DataFrame:
        """Generate synthetic training data"""
        np.random.seed(42)
        
        data = {
            "lap_number": np.random.randint(1, 60, n_samples),
            "fuel_load": np.random.uniform(5, 110, n_samples),
            "tire_age": np.random.randint(0, 35, n_samples),
            "tire_compound_idx": np.random.randint(0, 3, n_samples),
            "track_temperature": np.random.uniform(20, 50, n_samples),
            "air_temperature": np.random.uniform(15, 40, n_samples),
            "track_evolution": np.random.uniform(0, 100, n_samples),
            "traffic": np.random.randint(0, 5, n_samples),
            "drs_enabled": np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
            "sector1_time": np.random.uniform(25, 35, n_samples),
            "sector2_time": np.random.uniform(30, 40, n_samples),
            "previous_lap_time": np.random.uniform(85, 95, n_samples),
            "best_lap_time": np.random.uniform(84, 88, n_samples),
            "avg_lap_time": np.random.uniform(86, 92, n_samples),
            "position": np.random.randint(1, 20, n_samples),
            "wind_speed": np.random.uniform(0, 30, n_samples),
            "humidity": np.random.uniform(20, 90, n_samples),
            "safety_car_laps": np.random.randint(0, 10, n_samples),
            "push_level": np.random.uniform(50, 100, n_samples),
            "battery_deployment": np.random.uniform(30, 100, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Generate realistic lap times
        base_time = 88.0
        compound_effect = {0: -0.3, 1: 0, 2: 0.4}  # Soft faster, hard slower
        
        df["lap_time"] = df.apply(
            lambda row: base_time + 
            compound_effect[row["tire_compound_idx"]] +
            row["fuel_load"] * 0.03 +  # ~3s per 100kg
            row["tire_age"] * 0.04 +   # Degradation
            row["traffic"] * 0.3 +      # Traffic effect
            (row["track_temperature"] - 30) * 0.02 +
            np.random.normal(0, 0.3),
            axis=1
        )
        
        # Fuel effect (time per kg)
        df["fuel_effect"] = 0.03 + np.random.normal(0, 0.002, n_samples)
        
        # Pace trend (positive = slowing down)
        df["pace_trend"] = df.apply(
            lambda row: row["tire_age"] * 0.03 + 
            np.random.normal(0, 0.05),
            axis=1
        )
        
        return df
    
    async def predict(self, input_data: Dict) -> Dict[str, Any]:
        """Make race pace predictions"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X = self._prepare_features(input_data)
        X_scaled = self.scaler.transform(X)
        
        # Predictions
        predicted_lap_time = float(self.lap_time_regressor.predict(X_scaled)[0])
        fuel_effect = float(self.fuel_effect_regressor.predict(X_scaled)[0])
        pace_trend = float(self.trend_regressor.predict(X_scaled)[0])
        
        # Calculate additional metrics
        fuel_load = input_data.get("fuel_load", 100)
        tire_age = input_data.get("tire_age", 0)
        
        # Predict next 5 laps
        lap_predictions = []
        for i in range(5):
            future_data = input_data.copy()
            future_data["lap_number"] = input_data.get("lap_number", 1) + i + 1
            future_data["fuel_load"] = max(5, fuel_load - (i + 1) * 1.8)  # ~1.8kg/lap
            future_data["tire_age"] = tire_age + i + 1
            
            X_future = self._prepare_features(future_data)
            X_future_scaled = self.scaler.transform(X_future)
            future_time = float(self.lap_time_regressor.predict(X_future_scaled)[0])
            
            lap_predictions.append({
                "lap": input_data.get("lap_number", 1) + i + 1,
                "predicted_time": round(future_time, 3),
                "fuel_load": round(future_data["fuel_load"], 1),
                "tire_age": future_data["tire_age"]
            })
        
        return {
            "predicted_lap_time": round(predicted_lap_time, 3),
            "fuel_effect_per_kg": round(fuel_effect, 4),
            "pace_trend_per_lap": round(pace_trend, 4),
            "current_delta_to_optimal": round(
                predicted_lap_time - input_data.get("best_lap_time", predicted_lap_time), 3
            ),
            "lap_predictions": lap_predictions,
            "performance_assessment": self._assess_performance(
                predicted_lap_time, input_data, pace_trend
            ),
            "recommendations": self._get_pace_recommendations(
                predicted_lap_time, pace_trend, input_data
            )
        }
    
    def _assess_performance(
        self,
        lap_time: float,
        data: Dict,
        trend: float
    ) -> Dict[str, Any]:
        """Assess current performance level"""
        best_time = data.get("best_lap_time", lap_time)
        avg_time = data.get("avg_lap_time", lap_time)
        
        delta_to_best = lap_time - best_time
        delta_to_avg = lap_time - avg_time
        
        if delta_to_best < 0.5:
            level = "EXCELLENT"
            color = "green"
        elif delta_to_best < 1.0:
            level = "GOOD"
            color = "lime"
        elif delta_to_best < 1.5:
            level = "AVERAGE"
            color = "yellow"
        else:
            level = "BELOW PAR"
            color = "red"
        
        return {
            "level": level,
            "color": color,
            "delta_to_best": round(delta_to_best, 3),
            "delta_to_average": round(delta_to_avg, 3),
            "trend": "improving" if trend < 0 else "degrading"
        }
    
    def _get_pace_recommendations(
        self,
        lap_time: float,
        trend: float,
        data: Dict
    ) -> List[str]:
        """Generate pace management recommendations"""
        recommendations = []
        
        tire_age = data.get("tire_age", 0)
        fuel_load = data.get("fuel_load", 100)
        
        if trend > 0.1:
            recommendations.append("📉 Significant pace degradation - consider pit stop soon")
        
        if tire_age > 20 and trend > 0.05:
            recommendations.append("🔴 High tire wear affecting pace")
        
        if fuel_load > 80:
            recommendations.append("⛽ Heavy fuel load - pace will improve as fuel burns")
        
        if data.get("traffic", 0) > 0:
            recommendations.append("🚗 Traffic affecting lap time - clean air needed")
        
        if data.get("push_level", 80) < 70:
            recommendations.append("💨 Room to push harder if needed")
        
        if not recommendations:
            recommendations.append("✅ Pace is stable - maintain current rhythm")
        
        return recommendations
    
    def save(self, path: Path):
        """Save model to disk"""
        model_data = {
            "lap_time_regressor": self.lap_time_regressor,
            "fuel_effect_regressor": self.fuel_effect_regressor,
            "trend_regressor": self.trend_regressor,
            "scaler": self.scaler,
            "is_trained": self.is_trained
        }
        joblib.dump(model_data, path)
    
    def load(self, path: Path):
        """Load model from disk"""
        model_data = joblib.load(path)
        self.lap_time_regressor = model_data["lap_time_regressor"]
        self.fuel_effect_regressor = model_data["fuel_effect_regressor"]
        self.trend_regressor = model_data["trend_regressor"]
        self.scaler = model_data["scaler"]
        self.is_trained = model_data["is_trained"]
