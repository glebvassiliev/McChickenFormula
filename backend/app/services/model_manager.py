"""
ML Model Manager for F1 Strategy Predictions
"""
import os
import joblib
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from app.config import settings
from app.models.tire_strategy import TireStrategyModel
from app.models.pit_stop_predictor import PitStopPredictor
from app.models.race_pace_analyzer import RacePaceAnalyzer
from app.models.position_predictor import PositionPredictor

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages all ML models for F1 strategy predictions"""
    
    def __init__(self):
        self.models_dir = Path(settings.models_dir)
        self.models: Dict[str, Any] = {}
        self.model_status: Dict[str, str] = {}
    
    async def initialize(self):
        """Initialize and load all models"""
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize model instances
        self.models = {
            "tire_strategy": TireStrategyModel(),
            "pit_stop": PitStopPredictor(),
            "race_pace": RacePaceAnalyzer(),
            "position": PositionPredictor()
        }
        
        # Load pre-trained models if available
        for name, model in self.models.items():
            model_path = self.models_dir / f"{name}_model.joblib"
            if model_path.exists():
                try:
                    model.load(model_path)
                    self.model_status[name] = "loaded"
                    logger.info(f"Loaded model: {name}")
                except Exception as e:
                    logger.warning(f"Could not load model {name}: {e}")
                    self.model_status[name] = "not_trained"
            else:
                self.model_status[name] = "not_trained"
                logger.info(f"Model {name} not found, needs training")
    
    def get_model(self, name: str):
        """Get a specific model"""
        return self.models.get(name)
    
    def get_status(self) -> Dict[str, str]:
        """Get status of all models"""
        return self.model_status
    
    async def train_model(self, name: str, training_data: Dict) -> Dict[str, Any]:
        """Train a specific model"""
        model = self.models.get(name)
        if not model:
            return {"success": False, "error": f"Model {name} not found"}
        
        try:
            metrics = await model.train(training_data)
            
            # Save the trained model
            model_path = self.models_dir / f"{name}_model.joblib"
            model.save(model_path)
            self.model_status[name] = "trained"
            
            return {"success": True, "metrics": metrics}
        except Exception as e:
            logger.error(f"Training error for {name}: {e}")
            return {"success": False, "error": str(e)}
    
    async def predict(self, model_name: str, input_data: Dict) -> Dict[str, Any]:
        """Make prediction using a specific model"""
        model = self.models.get(model_name)
        if not model:
            return {"success": False, "error": f"Model {model_name} not found"}
        
        if self.model_status.get(model_name) == "not_trained":
            return {"success": False, "error": f"Model {model_name} not trained"}
        
        try:
            prediction = await model.predict(input_data)
            return {"success": True, "prediction": prediction}
        except Exception as e:
            logger.error(f"Prediction error for {model_name}: {e}")
            return {"success": False, "error": str(e)}
