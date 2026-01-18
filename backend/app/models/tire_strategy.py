"""
Tire Strategy ML Model
Predicts optimal tire compound selection and stint lengths
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class TireStrategyModel:
    """
    ML Model for tire strategy predictions:
    - Optimal tire compound selection
    - Stint length predictions
    - Tire degradation analysis
    """
    
    TIRE_COMPOUNDS = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"]
    
    def __init__(self):
        self.compound_classifier = None
        self.stint_regressor = None
        self.degradation_regressor = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(self.TIRE_COMPOUNDS)
        self.is_trained = False
    
    def _prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare feature vector from input data"""
        features = [
            data.get("track_temperature", 30),
            data.get("air_temperature", 25),
            data.get("humidity", 50),
            data.get("track_length", 5.0),
            data.get("number_of_corners", 15),
            data.get("high_speed_corners", 5),
            data.get("low_speed_corners", 10),
            data.get("current_lap", 1),
            data.get("total_laps", 50),
            data.get("remaining_laps", 50),
            data.get("current_position", 10),
            data.get("gap_to_leader", 0),
            data.get("gap_to_car_ahead", 0),
            data.get("gap_to_car_behind", 0),
            data.get("fuel_load", 100),
            data.get("tire_age", 0),
            data.get("rain_probability", 0),
            data.get("track_evolution", 50),
            1 if data.get("safety_car_deployed", False) else 0,
            1 if data.get("vsc_deployed", False) else 0,
        ]
        return np.array(features).reshape(1, -1)
    
    async def train(self, training_data: Dict) -> Dict[str, Any]:
        """Train the tire strategy models"""
        try:
            # Convert training data to DataFrame
            df = pd.DataFrame(training_data.get("samples", []))
            
            if len(df) < 10:
                # Use synthetic data for demo if not enough real data
                df = self._generate_synthetic_data(500)
            
            # Prepare features
            feature_cols = [
                "track_temperature", "air_temperature", "humidity",
                "track_length", "number_of_corners", "high_speed_corners",
                "low_speed_corners", "current_lap", "total_laps", "remaining_laps",
                "current_position", "gap_to_leader", "gap_to_car_ahead",
                "gap_to_car_behind", "fuel_load", "tire_age", "rain_probability",
                "track_evolution", "safety_car", "vsc"
            ]
            
            X = df[feature_cols].values
            X_scaled = self.scaler.fit_transform(X)
            
            # Train compound classifier
            y_compound = self.label_encoder.transform(df["optimal_compound"])
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_compound, test_size=0.2, random_state=42
            )
            
            self.compound_classifier = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            self.compound_classifier.fit(X_train, y_train)
            compound_accuracy = self.compound_classifier.score(X_test, y_test)
            
            # Train stint length regressor
            y_stint = df["optimal_stint_length"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_stint, test_size=0.2, random_state=42
            )
            
            self.stint_regressor = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.stint_regressor.fit(X_train, y_train)
            stint_r2 = self.stint_regressor.score(X_test, y_test)
            
            # Train degradation predictor
            y_degradation = df["degradation_rate"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_degradation, test_size=0.2, random_state=42
            )
            
            self.degradation_regressor = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.degradation_regressor.fit(X_train, y_train)
            degradation_r2 = self.degradation_regressor.score(X_test, y_test)
            
            self.is_trained = True
            
            return {
                "compound_classifier_accuracy": round(compound_accuracy, 4),
                "stint_regressor_r2": round(stint_r2, 4),
                "degradation_regressor_r2": round(degradation_r2, 4),
                "samples_used": len(df)
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            raise
    
    def _generate_synthetic_data(self, n_samples: int) -> pd.DataFrame:
        """Generate synthetic training data for demonstration"""
        np.random.seed(42)
        
        data = {
            "track_temperature": np.random.uniform(20, 50, n_samples),
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
        
        # Generate synthetic labels based on conditions
        def get_optimal_compound(row):
            if row["rain_probability"] > 70:
                return "WET" if row["rain_probability"] > 85 else "INTERMEDIATE"
            if row["remaining_laps"] < 15:
                return "SOFT"
            if row["track_temperature"] > 40:
                return "HARD"
            if row["track_temperature"] < 25:
                return "SOFT"
            return "MEDIUM"
        
        df["optimal_compound"] = df.apply(get_optimal_compound, axis=1)
        
        # Stint length depends on compound and conditions
        compound_base_stint = {"SOFT": 15, "MEDIUM": 25, "HARD": 35, "INTERMEDIATE": 20, "WET": 15}
        df["optimal_stint_length"] = df.apply(
            lambda row: compound_base_stint[row["optimal_compound"]] + 
            np.random.randint(-5, 6) - 
            (row["track_temperature"] - 30) * 0.2,
            axis=1
        )
        
        # Degradation rate
        df["degradation_rate"] = df.apply(
            lambda row: 0.05 + 
            (row["track_temperature"] - 30) * 0.002 +
            row["high_speed_corners"] * 0.003 +
            np.random.uniform(-0.01, 0.01),
            axis=1
        )
        
        return df
    
    async def predict(self, input_data: Dict) -> Dict[str, Any]:
        """Make tire strategy predictions"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X = self._prepare_features(input_data)
        X_scaled = self.scaler.transform(X)
        
        # Predict compound
        compound_idx = self.compound_classifier.predict(X_scaled)[0]
        compound_probs = self.compound_classifier.predict_proba(X_scaled)[0]
        recommended_compound = self.label_encoder.inverse_transform([compound_idx])[0]
        
        # Predict stint length
        predicted_stint = max(5, int(self.stint_regressor.predict(X_scaled)[0]))
        
        # Predict degradation
        degradation_rate = max(0.01, self.degradation_regressor.predict(X_scaled)[0])
        
        # Calculate compound probabilities
        compound_probabilities = {
            self.label_encoder.inverse_transform([i])[0]: round(float(prob), 4)
            for i, prob in enumerate(compound_probs)
        }
        
        return {
            "recommended_compound": recommended_compound,
            "compound_confidence": round(float(max(compound_probs)), 4),
            "compound_probabilities": compound_probabilities,
            "predicted_stint_length": predicted_stint,
            "degradation_rate_per_lap": round(degradation_rate, 4),
            "expected_time_loss_per_lap": round(degradation_rate * 1000, 1),  # ms
            "strategy_notes": self._generate_strategy_notes(
                recommended_compound, predicted_stint, degradation_rate, input_data
            )
        }
    
    def _generate_strategy_notes(
        self,
        compound: str,
        stint_length: int,
        degradation: float,
        conditions: Dict
    ) -> List[str]:
        """Generate human-readable strategy notes"""
        notes = []
        
        if conditions.get("rain_probability", 0) > 50:
            notes.append("⚠️ High rain probability - monitor weather closely")
        
        if compound == "SOFT":
            notes.append("🔴 Soft compound: Maximum grip but high degradation")
        elif compound == "MEDIUM":
            notes.append("🟡 Medium compound: Balanced performance")
        elif compound == "HARD":
            notes.append("⚪ Hard compound: Lower grip but excellent durability")
        
        if stint_length < 15:
            notes.append("📉 Short stint expected - plan for additional stop")
        elif stint_length > 30:
            notes.append("📈 Long stint possible - one-stop strategy viable")
        
        if conditions.get("safety_car_deployed"):
            notes.append("🟡 Safety car - consider opportunistic pit stop")
        
        if conditions.get("track_temperature", 30) > 45:
            notes.append("🌡️ High track temp - expect increased degradation")
        
        return notes
    
    def save(self, path: Path):
        """Save model to disk"""
        model_data = {
            "compound_classifier": self.compound_classifier,
            "stint_regressor": self.stint_regressor,
            "degradation_regressor": self.degradation_regressor,
            "scaler": self.scaler,
            "is_trained": self.is_trained
        }
        joblib.dump(model_data, path)
    
    def load(self, path: Path):
        """Load model from disk"""
        model_data = joblib.load(path)
        self.compound_classifier = model_data["compound_classifier"]
        self.stint_regressor = model_data["stint_regressor"]
        self.degradation_regressor = model_data["degradation_regressor"]
        self.scaler = model_data["scaler"]
        self.is_trained = model_data["is_trained"]
