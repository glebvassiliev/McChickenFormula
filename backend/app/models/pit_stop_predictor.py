"""
Pit Stop Predictor ML Model
Predicts optimal pit stop windows and timing
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from typing import Dict, Any, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class PitStopPredictor:
    """
    ML Model for pit stop predictions:
    - Optimal pit window detection
    - Undercut/overcut opportunity analysis
    - Pit stop timing optimization
    """
    
    def __init__(self):
        self.pit_window_classifier = None
        self.undercut_classifier = None
        self.optimal_lap_regressor = None
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def _prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare feature vector from input data"""
        features = [
            data.get("current_lap", 1),
            data.get("total_laps", 50),
            data.get("remaining_laps", 50),
            data.get("tire_age", 0),
            data.get("tire_compound_idx", 1),  # 0=SOFT, 1=MED, 2=HARD
            data.get("current_position", 10),
            data.get("gap_to_car_ahead", 2.0),
            data.get("gap_to_car_behind", 2.0),
            data.get("pit_delta", 22.0),  # Time lost in pit
            data.get("track_position_value", 50),  # How important is track position
            data.get("tire_degradation_rate", 0.05),
            data.get("current_pace_delta", 0),  # vs optimal pace
            data.get("competitor_tire_age", 10),
            data.get("competitor_compound_idx", 1),
            data.get("fuel_adjusted_pace", 0),
            data.get("traffic_density", 5),  # Cars within 30s
            data.get("safety_car_probability", 10),
            data.get("drs_available", 1),
            data.get("track_temperature", 30),
            data.get("rain_probability", 0),
        ]
        return np.array(features).reshape(1, -1)
    
    async def train(self, training_data: Dict) -> Dict[str, Any]:
        """Train the pit stop prediction models"""
        try:
            df = pd.DataFrame(training_data.get("samples", []))
            
            if len(df) < 10:
                df = self._generate_synthetic_data(500)
            
            feature_cols = [
                "current_lap", "total_laps", "remaining_laps", "tire_age",
                "tire_compound_idx", "current_position", "gap_to_car_ahead",
                "gap_to_car_behind", "pit_delta", "track_position_value",
                "tire_degradation_rate", "current_pace_delta", "competitor_tire_age",
                "competitor_compound_idx", "fuel_adjusted_pace", "traffic_density",
                "safety_car_probability", "drs_available", "track_temperature",
                "rain_probability"
            ]
            
            X = df[feature_cols].values
            X_scaled = self.scaler.fit_transform(X)
            
            # Train pit window classifier
            y_window = df["in_pit_window"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_window, test_size=0.2, random_state=42
            )
            
            self.pit_window_classifier = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.pit_window_classifier.fit(X_train, y_train)
            window_accuracy = self.pit_window_classifier.score(X_test, y_test)
            
            # Train undercut opportunity classifier
            y_undercut = df["undercut_opportunity"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_undercut, test_size=0.2, random_state=42
            )
            
            self.undercut_classifier = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.undercut_classifier.fit(X_train, y_train)
            undercut_accuracy = self.undercut_classifier.score(X_test, y_test)
            
            # Train optimal lap regressor
            y_optimal = df["optimal_pit_lap"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_optimal, test_size=0.2, random_state=42
            )
            
            self.optimal_lap_regressor = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.optimal_lap_regressor.fit(X_train, y_train)
            optimal_r2 = self.optimal_lap_regressor.score(X_test, y_test)
            
            self.is_trained = True
            
            return {
                "pit_window_accuracy": round(window_accuracy, 4),
                "undercut_accuracy": round(undercut_accuracy, 4),
                "optimal_lap_r2": round(optimal_r2, 4),
                "samples_used": len(df)
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            raise
    
    def _generate_synthetic_data(self, n_samples: int) -> pd.DataFrame:
        """Generate synthetic training data"""
        np.random.seed(42)
        
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
        
        # Generate labels
        df["in_pit_window"] = (
            (df["tire_age"] > 12) & 
            (df["tire_age"] < 35) & 
            (df["remaining_laps"] > 10)
        ).astype(int)
        
        df["undercut_opportunity"] = (
            (df["gap_to_car_ahead"] < df["pit_delta"] * 0.15) &
            (df["tire_age"] > df["competitor_tire_age"]) &
            (df["in_pit_window"] == 1)
        ).astype(int)
        
        # Optimal pit lap
        compound_stint = {0: 15, 1: 25, 2: 35}
        df["optimal_pit_lap"] = df.apply(
            lambda row: row["current_lap"] + 
            compound_stint[row["tire_compound_idx"]] - 
            row["tire_age"] +
            np.random.randint(-3, 4),
            axis=1
        )
        
        return df
    
    async def predict(self, input_data: Dict) -> Dict[str, Any]:
        """Make pit stop predictions"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X = self._prepare_features(input_data)
        X_scaled = self.scaler.transform(X)
        
        # Predictions
        in_pit_window = bool(self.pit_window_classifier.predict(X_scaled)[0])
        pit_window_prob = float(self.pit_window_classifier.predict_proba(X_scaled)[0][1])
        
        undercut_opportunity = bool(self.undercut_classifier.predict(X_scaled)[0])
        undercut_prob = float(self.undercut_classifier.predict_proba(X_scaled)[0][1])
        
        optimal_lap = max(
            input_data.get("current_lap", 1),
            int(self.optimal_lap_regressor.predict(X_scaled)[0])
        )
        
        # Calculate urgency
        tire_age = input_data.get("tire_age", 0)
        degradation = input_data.get("tire_degradation_rate", 0.05)
        urgency = min(100, int(tire_age * degradation * 100 + pit_window_prob * 30))
        
        return {
            "in_pit_window": in_pit_window,
            "pit_window_probability": round(pit_window_prob, 4),
            "undercut_opportunity": undercut_opportunity,
            "undercut_probability": round(undercut_prob, 4),
            "optimal_pit_lap": optimal_lap,
            "laps_until_optimal": max(0, optimal_lap - input_data.get("current_lap", 1)),
            "pit_urgency": urgency,
            "recommendation": self._get_recommendation(
                in_pit_window, undercut_opportunity, urgency, input_data
            ),
            "strategy_options": self._get_strategy_options(input_data, optimal_lap)
        }
    
    def _get_recommendation(
        self,
        in_window: bool,
        undercut: bool,
        urgency: int,
        data: Dict
    ) -> str:
        """Generate pit stop recommendation"""
        if urgency > 80:
            return "🔴 CRITICAL: Pit immediately - severe tire degradation"
        if undercut and in_window:
            return "🟡 UNDERCUT: Pit now to gain position on car ahead"
        if in_window and urgency > 50:
            return "🟢 WINDOW OPEN: Good time to pit - within optimal range"
        if in_window:
            return "🟡 WINDOW OPEN: Pit window available, monitor gaps"
        if data.get("safety_car_deployed"):
            return "🟡 SAFETY CAR: Free pit stop opportunity!"
        return "⚪ STAY OUT: Continue current stint"
    
    def _get_strategy_options(self, data: Dict, optimal_lap: int) -> List[Dict]:
        """Generate strategy options"""
        current_lap = data.get("current_lap", 1)
        total_laps = data.get("total_laps", 50)
        
        options = []
        
        # Option 1: Pit at optimal lap
        options.append({
            "name": "Optimal Strategy",
            "pit_lap": optimal_lap,
            "compound": "MEDIUM" if data.get("remaining_laps", 30) > 20 else "SOFT",
            "expected_gain": "+0.0s",
            "risk": "Low"
        })
        
        # Option 2: Extend stint
        if optimal_lap + 5 < total_laps:
            options.append({
                "name": "Extended Stint",
                "pit_lap": optimal_lap + 5,
                "compound": "SOFT",
                "expected_gain": "-2.5s",
                "risk": "Medium"
            })
        
        # Option 3: Early pit (undercut)
        if current_lap < optimal_lap - 2:
            options.append({
                "name": "Undercut Attempt",
                "pit_lap": current_lap + 1,
                "compound": "MEDIUM",
                "expected_gain": "+3.0s (if successful)",
                "risk": "High"
            })
        
        return options
    
    def save(self, path: Path):
        """Save model to disk"""
        model_data = {
            "pit_window_classifier": self.pit_window_classifier,
            "undercut_classifier": self.undercut_classifier,
            "optimal_lap_regressor": self.optimal_lap_regressor,
            "scaler": self.scaler,
            "is_trained": self.is_trained
        }
        joblib.dump(model_data, path)
    
    def load(self, path: Path):
        """Load model from disk"""
        model_data = joblib.load(path)
        self.pit_window_classifier = model_data["pit_window_classifier"]
        self.undercut_classifier = model_data["undercut_classifier"]
        self.optimal_lap_regressor = model_data["optimal_lap_regressor"]
        self.scaler = model_data["scaler"]
        self.is_trained = model_data["is_trained"]
