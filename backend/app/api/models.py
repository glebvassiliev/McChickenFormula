"""
ML Models API Routes
Training, status, and management of ML models
"""
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TrainingRequest(BaseModel):
    """Request model for training"""
    model_name: str
    session_keys: Optional[List[int]] = None
    use_synthetic: bool = True


@router.get("/status")
async def get_models_status(request: Request):
    """Get status of all ML models"""
    model_manager = request.app.state.model_manager
    status = model_manager.get_status()
    
    return {
        "models": [
            {
                "name": name,
                "status": s,
                "description": _get_model_description(name),
                "ready": s in ["loaded", "trained"]
            }
            for name, s in status.items()
        ]
    }


@router.post("/train/{model_name}")
async def train_model(
    request: Request,
    model_name: str,
    background_tasks: BackgroundTasks,
    training_request: Optional[TrainingRequest] = None
):
    """Train a specific model"""
    model_manager = request.app.state.model_manager
    openf1_client = request.app.state.openf1_client
    
    valid_models = ["tire_strategy", "pit_stop", "race_pace", "position"]
    if model_name not in valid_models:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid model name. Valid options: {valid_models}"
        )
    
    # Prepare training data
    training_data = {"samples": []}
    
    if training_request and training_request.session_keys:
        # Fetch real data from OpenF1
        for session_key in training_request.session_keys:
            session_data = await _fetch_training_data(openf1_client, session_key)
            training_data["samples"].extend(session_data)
    
    # Train the model
    result = await model_manager.train_model(model_name, training_data)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        "message": f"Model {model_name} trained successfully",
        "metrics": result["metrics"]
    }


@router.post("/train-all")
async def train_all_models(request: Request):
    """Train all models with synthetic data"""
    model_manager = request.app.state.model_manager
    
    results = {}
    for model_name in ["tire_strategy", "pit_stop", "race_pace", "position"]:
        result = await model_manager.train_model(model_name, {"samples": []})
        results[model_name] = {
            "success": result["success"],
            "metrics": result.get("metrics") if result["success"] else None,
            "error": result.get("error") if not result["success"] else None
        }
    
    return {
        "message": "All models trained",
        "results": results
    }


@router.get("/{model_name}/info")
async def get_model_info(request: Request, model_name: str):
    """Get detailed information about a model"""
    model_manager = request.app.state.model_manager
    model = model_manager.get_model(model_name)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    status = model_manager.get_status().get(model_name, "unknown")
    
    return {
        "name": model_name,
        "status": status,
        "description": _get_model_description(model_name),
        "features": _get_model_features(model_name),
        "outputs": _get_model_outputs(model_name),
        "is_trained": model.is_trained if hasattr(model, 'is_trained') else False
    }


async def _fetch_training_data(client, session_key: int) -> List[Dict]:
    """Fetch and prepare training data from OpenF1"""
    samples = []
    
    try:
        laps = await client.get_laps(session_key)
        stints = await client.get_stints(session_key)
        weather = await client.get_weather(session_key)
        
        # Process into training samples
        # This is simplified - real implementation would be more sophisticated
        for lap in laps:
            if lap.get("lap_duration"):
                samples.append({
                    "lap_number": lap.get("lap_number", 1),
                    "lap_time": lap.get("lap_duration"),
                    "tire_age": lap.get("tyre_life", 0),
                    # Add more features as needed
                })
    except Exception as e:
        logger.error(f"Error fetching training data: {e}")
    
    return samples


def _get_model_description(name: str) -> str:
    """Get model description"""
    descriptions = {
        "tire_strategy": "Predicts optimal tire compound selection, stint lengths, and degradation rates",
        "pit_stop": "Predicts optimal pit stop timing, undercut/overcut opportunities",
        "race_pace": "Analyzes and predicts race pace, fuel effects, and performance trends",
        "position": "Predicts position changes and overtaking opportunities"
    }
    return descriptions.get(name, "Unknown model")


def _get_model_features(name: str) -> List[str]:
    """Get model input features"""
    features = {
        "tire_strategy": [
            "Track/air temperature", "Humidity", "Track characteristics",
            "Current lap/position", "Gaps to competitors", "Fuel load",
            "Tire age", "Weather conditions", "Safety car status"
        ],
        "pit_stop": [
            "Current lap", "Tire age/compound", "Position",
            "Gaps to cars ahead/behind", "Pit delta", "Degradation rate",
            "Competitor tire status", "Safety car probability"
        ],
        "race_pace": [
            "Lap number", "Fuel load", "Tire age/compound",
            "Weather conditions", "Traffic", "Sector times",
            "Historical lap times", "Position"
        ],
        "position": [
            "Current position", "Remaining laps", "Gaps",
            "Relative pace", "Tire/compound advantage", "DRS availability",
            "Track characteristics", "Driver aggression"
        ]
    }
    return features.get(name, [])


def _get_model_outputs(name: str) -> List[str]:
    """Get model outputs"""
    outputs = {
        "tire_strategy": [
            "Recommended compound", "Compound confidence",
            "Predicted stint length", "Degradation rate per lap"
        ],
        "pit_stop": [
            "In pit window (bool)", "Pit window probability",
            "Undercut opportunity", "Optimal pit lap",
            "Pit urgency score"
        ],
        "race_pace": [
            "Predicted lap time", "Fuel effect per kg",
            "Pace trend", "5-lap predictions"
        ],
        "position": [
            "Predicted final position", "Overtake probability",
            "Position change probabilities", "Battle status"
        ]
    }
    return outputs.get(name, [])
