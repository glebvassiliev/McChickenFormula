"""
Position Predictor ML Model
Predicts race positions and overtaking opportunities
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from typing import Dict, Any, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class PositionPredictor:
    """
    ML Model for position predictions:
    - Final position prediction
    - Overtaking opportunity detection
    - Position change probability
    """
    
    def __init__(self):
        self.overtake_classifier = None
        self.position_change_classifier = None
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def _prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare feature vector from input data"""
        features = [
            data.get("current_position", 10),
            data.get("lap_number", 1),
            data.get("remaining_laps", 50),
            data.get("gap_to_car_ahead", 2.0),
            data.get("gap_to_car_behind", 2.0),
            data.get("relative_pace", 0),  # vs car ahead
            data.get("tire_advantage", 0),  # tire age difference
            data.get("compound_advantage", 0),  # -1, 0, 1
            data.get("drs_available", 1),
            data.get("battery_level", 80),
            data.get("straight_length", 1000),  # Track characteristic
            data.get("overtaking_difficulty", 50),  # 0-100
            data.get("track_position_value", 50),
            data.get("driver_aggression", 50),  # 0-100
            data.get("car_performance_delta", 0),
            data.get("weather_stability", 100),
            data.get("safety_car_probability", 10),
            data.get("laps_since_pit", 5),
            data.get("competitor_laps_since_pit", 5),
            data.get("points_position", 10),  # Championship relevance
        ]
        return np.array(features).reshape(1, -1)
    
    async def train(self, training_data: Dict) -> Dict[str, Any]:
        """Train the position prediction models"""
        try:
            df = pd.DataFrame(training_data.get("samples", []))
            
            if len(df) < 10:
                df = self._generate_synthetic_data(800)
            
            feature_cols = [
                "current_position", "lap_number", "remaining_laps",
                "gap_to_car_ahead", "gap_to_car_behind", "relative_pace",
                "tire_advantage", "compound_advantage", "drs_available",
                "battery_level", "straight_length", "overtaking_difficulty",
                "track_position_value", "driver_aggression", "car_performance_delta",
                "weather_stability", "safety_car_probability", "laps_since_pit",
                "competitor_laps_since_pit", "points_position"
            ]
            
            X = df[feature_cols].values
            X_scaled = self.scaler.fit_transform(X)
            
            # Train overtake classifier
            y_overtake = df["overtake_success"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_overtake, test_size=0.2, random_state=42
            )
            
            self.overtake_classifier = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.overtake_classifier.fit(X_train, y_train)
            overtake_accuracy = self.overtake_classifier.score(X_test, y_test)
            
            # Train position change classifier
            y_change = df["position_change"].values
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_change, test_size=0.2, random_state=42
            )
            
            self.position_change_classifier = RandomForestClassifier(
                n_estimators=100,
                max_depth=8,
                random_state=42
            )
            self.position_change_classifier.fit(X_train, y_train)
            change_accuracy = self.position_change_classifier.score(X_test, y_test)
            
            self.is_trained = True
            
            return {
                "overtake_accuracy": round(overtake_accuracy, 4),
                "position_change_accuracy": round(change_accuracy, 4),
                "samples_used": len(df)
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            raise
    
    def _generate_synthetic_data(self, n_samples: int) -> pd.DataFrame:
        """Generate synthetic training data"""
        np.random.seed(42)
        
        data = {
            "current_position": np.random.randint(1, 20, n_samples),
            "lap_number": np.random.randint(1, 60, n_samples),
            "remaining_laps": np.random.randint(1, 55, n_samples),
            "gap_to_car_ahead": np.random.exponential(2, n_samples),
            "gap_to_car_behind": np.random.exponential(2, n_samples),
            "relative_pace": np.random.normal(0, 0.5, n_samples),
            "tire_advantage": np.random.randint(-15, 16, n_samples),
            "compound_advantage": np.random.choice([-1, 0, 1], n_samples),
            "drs_available": np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
            "battery_level": np.random.uniform(30, 100, n_samples),
            "straight_length": np.random.uniform(500, 1500, n_samples),
            "overtaking_difficulty": np.random.uniform(20, 90, n_samples),
            "track_position_value": np.random.uniform(30, 80, n_samples),
            "driver_aggression": np.random.uniform(30, 90, n_samples),
            "car_performance_delta": np.random.normal(0, 0.3, n_samples),
            "weather_stability": np.random.uniform(50, 100, n_samples),
            "safety_car_probability": np.random.uniform(0, 30, n_samples),
            "laps_since_pit": np.random.randint(0, 30, n_samples),
            "competitor_laps_since_pit": np.random.randint(0, 30, n_samples),
            "points_position": np.random.randint(1, 20, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Generate labels based on conditions
        df["overtake_success"] = (
            (df["gap_to_car_ahead"] < 1.0) &
            (df["relative_pace"] < -0.2) &
            (df["drs_available"] == 1) &
            (df["overtaking_difficulty"] < 70)
        ).astype(int)
        
        # Position change: -1 (lost), 0 (same), 1 (gained)
        def calc_position_change(row):
            if row["overtake_success"]:
                return 1
            if row["gap_to_car_behind"] < 0.5 and row["relative_pace"] > 0.3:
                return -1
            return 0
        
        df["position_change"] = df.apply(calc_position_change, axis=1) + 1  # 0, 1, 2
        
        return df
    
    async def predict(self, input_data: Dict) -> Dict[str, Any]:
        """Make position predictions"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X = self._prepare_features(input_data)
        X_scaled = self.scaler.transform(X)
        
        # Predictions
        overtake_prob = float(self.overtake_classifier.predict_proba(X_scaled)[0][1])
        position_change_probs = self.position_change_classifier.predict_proba(X_scaled)[0]
        
        current_pos = input_data.get("current_position", 10)
        gap_ahead = input_data.get("gap_to_car_ahead", 2.0)
        gap_behind = input_data.get("gap_to_car_behind", 2.0)
        
        # Calculate predicted final position
        remaining = input_data.get("remaining_laps", 50)
        expected_gains = overtake_prob * min(remaining / 5, 3)  # Max 3 positions
        expected_losses = position_change_probs[0] * min(remaining / 5, 2)
        
        predicted_final = max(1, min(20, round(
            current_pos - expected_gains + expected_losses
        )))
        
        return {
            "current_position": current_pos,
            "predicted_final_position": predicted_final,
            "overtake_probability": round(overtake_prob, 4),
            "position_change_probabilities": {
                "lose_position": round(float(position_change_probs[0]), 4),
                "maintain": round(float(position_change_probs[1]), 4),
                "gain_position": round(float(position_change_probs[2]), 4) if len(position_change_probs) > 2 else 0
            },
            "attack_analysis": self._analyze_attack(input_data, overtake_prob),
            "defense_analysis": self._analyze_defense(input_data, position_change_probs[0]),
            "battle_status": self._get_battle_status(gap_ahead, gap_behind),
            "tactical_recommendations": self._get_tactical_recommendations(
                input_data, overtake_prob, position_change_probs
            )
        }
    
    def _analyze_attack(self, data: Dict, overtake_prob: float) -> Dict[str, Any]:
        """Analyze attack potential"""
        gap = data.get("gap_to_car_ahead", 2.0)
        drs = data.get("drs_available", 1)
        pace_adv = data.get("relative_pace", 0) < 0
        
        factors = []
        if gap < 1.0:
            factors.append("✅ Within striking distance")
        elif gap < 2.0:
            factors.append("🟡 Close but needs work")
        else:
            factors.append("❌ Too far to attack")
        
        if drs:
            factors.append("✅ DRS available")
        else:
            factors.append("❌ No DRS")
        
        if pace_adv:
            factors.append("✅ Pace advantage")
        else:
            factors.append("⚠️ No pace advantage")
        
        return {
            "gap_to_target": round(gap, 3),
            "probability": round(overtake_prob * 100, 1),
            "factors": factors,
            "recommended_action": "ATTACK" if overtake_prob > 0.4 else "PRESSURE"
        }
    
    def _analyze_defense(self, data: Dict, lose_prob: float) -> Dict[str, Any]:
        """Analyze defensive position"""
        gap = data.get("gap_to_car_behind", 2.0)
        
        if gap > 3.0:
            threat_level = "LOW"
            color = "green"
        elif gap > 1.5:
            threat_level = "MEDIUM"
            color = "yellow"
        else:
            threat_level = "HIGH"
            color = "red"
        
        return {
            "gap_to_threat": round(gap, 3),
            "threat_level": threat_level,
            "threat_color": color,
            "lose_probability": round(lose_prob * 100, 1),
            "recommended_action": "DEFEND" if lose_prob > 0.3 else "MAINTAIN"
        }
    
    def _get_battle_status(self, gap_ahead: float, gap_behind: float) -> str:
        """Determine current battle status"""
        if gap_ahead < 1.5 and gap_behind < 1.5:
            return "🔥 IN BATTLE - Both sides"
        elif gap_ahead < 1.5:
            return "⚔️ ATTACKING - Car ahead"
        elif gap_behind < 1.5:
            return "🛡️ DEFENDING - Under pressure"
        elif gap_ahead > 5.0 and gap_behind > 5.0:
            return "🏝️ CLEAN AIR - No immediate battle"
        else:
            return "👀 MONITORING - Gaps manageable"
    
    def _get_tactical_recommendations(
        self,
        data: Dict,
        overtake_prob: float,
        change_probs: np.ndarray
    ) -> List[str]:
        """Generate tactical recommendations"""
        recs = []
        
        gap_ahead = data.get("gap_to_car_ahead", 2.0)
        gap_behind = data.get("gap_to_car_behind", 2.0)
        tire_adv = data.get("tire_advantage", 0)
        
        if overtake_prob > 0.5:
            recs.append("🎯 High overtake probability - commit to the move")
        elif overtake_prob > 0.3:
            recs.append("💪 Build pressure, wait for mistake")
        
        if gap_behind < 1.0 and change_probs[0] > 0.3:
            recs.append("🛡️ Defensive driving recommended")
        
        if tire_adv > 10:
            recs.append("🔴 Tire advantage - attack late in stint")
        elif tire_adv < -10:
            recs.append("⚪ Tire disadvantage - consider early pit")
        
        if gap_ahead < 2.0 and data.get("drs_available"):
            recs.append("📡 DRS active - use on main straight")
        
        if data.get("remaining_laps", 50) < 10:
            recs.append("⏱️ Final laps - increased aggression warranted")
        
        if not recs:
            recs.append("📊 Maintain current strategy")
        
        return recs
    
    def save(self, path: Path):
        """Save model to disk"""
        model_data = {
            "overtake_classifier": self.overtake_classifier,
            "position_change_classifier": self.position_change_classifier,
            "scaler": self.scaler,
            "is_trained": self.is_trained
        }
        joblib.dump(model_data, path)
    
    def load(self, path: Path):
        """Load model from disk"""
        model_data = joblib.load(path)
        self.overtake_classifier = model_data["overtake_classifier"]
        self.position_change_classifier = model_data["position_change_classifier"]
        self.scaler = model_data["scaler"]
        self.is_trained = model_data["is_trained"]
