"""
Strategy API Routes
ML-powered strategy predictions and recommendations
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TireStrategyRequest(BaseModel):
    """Request model for tire strategy prediction"""
    track_temperature: float = 30.0
    air_temperature: float = 25.0
    humidity: float = 50.0
    track_length: float = 5.0
    number_of_corners: int = 15
    high_speed_corners: int = 5
    low_speed_corners: int = 10
    current_lap: int = 1
    total_laps: int = 50
    remaining_laps: int = 50
    current_position: int = 10
    gap_to_leader: float = 0.0
    gap_to_car_ahead: float = 0.0
    gap_to_car_behind: float = 0.0
    fuel_load: float = 100.0
    tire_age: int = 0
    rain_probability: float = 0.0
    track_evolution: float = 50.0
    safety_car_deployed: bool = False
    vsc_deployed: bool = False


class PitStopRequest(BaseModel):
    """Request model for pit stop prediction"""
    current_lap: int = 1
    total_laps: int = 50
    remaining_laps: int = 50
    tire_age: int = 0
    tire_compound_idx: int = 1
    current_position: int = 10
    gap_to_car_ahead: float = 2.0
    gap_to_car_behind: float = 2.0
    pit_delta: float = 22.0
    track_position_value: float = 50.0
    tire_degradation_rate: float = 0.05
    current_pace_delta: float = 0.0
    competitor_tire_age: int = 10
    competitor_compound_idx: int = 1
    fuel_adjusted_pace: float = 0.0
    traffic_density: int = 5
    safety_car_probability: float = 10.0
    drs_available: int = 1
    track_temperature: float = 30.0
    rain_probability: float = 0.0
    safety_car_deployed: bool = False


class RacePaceRequest(BaseModel):
    """Request model for race pace analysis"""
    lap_number: int = 1
    fuel_load: float = 100.0
    tire_age: int = 0
    tire_compound_idx: int = 1
    track_temperature: float = 30.0
    air_temperature: float = 25.0
    track_evolution: float = 50.0
    traffic: int = 0
    drs_enabled: int = 1
    sector1_time: float = 30.0
    sector2_time: float = 35.0
    previous_lap_time: float = 90.0
    best_lap_time: float = 88.0
    avg_lap_time: float = 89.0
    position: int = 10
    wind_speed: float = 10.0
    humidity: float = 50.0
    safety_car_laps: int = 0
    push_level: float = 80.0
    battery_deployment: float = 50.0


class PositionRequest(BaseModel):
    """Request model for position prediction"""
    current_position: int = 10
    lap_number: int = 1
    remaining_laps: int = 50
    gap_to_car_ahead: float = 2.0
    gap_to_car_behind: float = 2.0
    relative_pace: float = 0.0
    tire_advantage: int = 0
    compound_advantage: int = 0
    drs_available: int = 1
    battery_level: float = 80.0
    straight_length: float = 1000.0
    overtaking_difficulty: float = 50.0
    track_position_value: float = 50.0
    driver_aggression: float = 50.0
    car_performance_delta: float = 0.0
    weather_stability: float = 100.0
    safety_car_probability: float = 10.0
    laps_since_pit: int = 5
    competitor_laps_since_pit: int = 5
    points_position: int = 10


@router.post("/tire")
async def predict_tire_strategy(
    request: Request,
    data: TireStrategyRequest
):
    """Get tire strategy prediction"""
    model_manager = request.app.state.model_manager
    
    result = await model_manager.predict("tire_strategy", data.model_dump())
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result["prediction"]


@router.post("/pit-stop")
async def predict_pit_stop(
    request: Request,
    data: PitStopRequest
):
    """Get pit stop prediction"""
    model_manager = request.app.state.model_manager
    
    result = await model_manager.predict("pit_stop", data.model_dump())
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result["prediction"]


@router.post("/race-pace")
async def analyze_race_pace(
    request: Request,
    data: RacePaceRequest
):
    """Analyze and predict race pace"""
    model_manager = request.app.state.model_manager
    
    result = await model_manager.predict("race_pace", data.model_dump())
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result["prediction"]


@router.post("/position")
async def predict_position(
    request: Request,
    data: PositionRequest
):
    """Predict position changes and overtaking"""
    model_manager = request.app.state.model_manager
    
    result = await model_manager.predict("position", data.model_dump())
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result["prediction"]


@router.post("/full-analysis")
async def full_strategy_analysis(
    request: Request,
    tire_data: TireStrategyRequest,
    pit_data: PitStopRequest,
    pace_data: RacePaceRequest,
    position_data: PositionRequest
):
    """Get comprehensive strategy analysis combining all models"""
    model_manager = request.app.state.model_manager
    
    # Run all predictions
    tire_result = await model_manager.predict("tire_strategy", tire_data.model_dump())
    pit_result = await model_manager.predict("pit_stop", pit_data.model_dump())
    pace_result = await model_manager.predict("race_pace", pace_data.model_dump())
    position_result = await model_manager.predict("position", position_data.model_dump())
    
    # Combine insights
    return {
        "tire_strategy": tire_result.get("prediction") if tire_result["success"] else None,
        "pit_stop": pit_result.get("prediction") if pit_result["success"] else None,
        "race_pace": pace_result.get("prediction") if pace_result["success"] else None,
        "position": position_result.get("prediction") if position_result["success"] else None,
        "executive_summary": _generate_executive_summary(
            tire_result, pit_result, pace_result, position_result
        )
    }


def _generate_executive_summary(tire, pit, pace, position) -> Dict[str, Any]:
    """Generate executive summary from all predictions"""
    summary = {
        "critical_actions": [],
        "recommendations": [],
        "risk_factors": []
    }
    
    # Check pit urgency
    if pit["success"] and pit["prediction"].get("pit_urgency", 0) > 70:
        summary["critical_actions"].append("🔴 Consider pit stop - high urgency")
    
    # Check overtaking opportunities
    if position["success"] and position["prediction"].get("overtake_probability", 0) > 0.5:
        summary["critical_actions"].append("⚔️ Overtaking opportunity detected")
    
    # Check tire compound
    if tire["success"]:
        compound = tire["prediction"].get("recommended_compound")
        summary["recommendations"].append(f"Recommended compound: {compound}")
    
    # Check pace trend
    if pace["success"]:
        trend = pace["prediction"].get("pace_trend_per_lap", 0)
        if trend > 0.1:
            summary["risk_factors"].append("📉 Pace degradation detected")
    
    return summary


@router.get("/scenario/{scenario_name}")
async def get_strategy_scenario(
    request: Request,
    scenario_name: str
):
    """Get pre-configured strategy scenarios"""
    scenarios = {
        "aggressive_one_stop": {
            "name": "Aggressive One-Stop",
            "description": "Maximize stint length for single pit stop",
            "tire_sequence": ["MEDIUM", "HARD"],
            "target_pit_lap": 30,
            "risk_level": "Medium"
        },
        "conservative_two_stop": {
            "name": "Conservative Two-Stop",
            "description": "Safer strategy with two pit stops",
            "tire_sequence": ["SOFT", "MEDIUM", "MEDIUM"],
            "target_pit_laps": [15, 35],
            "risk_level": "Low"
        },
        "undercut_aggressive": {
            "name": "Undercut Strategy",
            "description": "Early pit to gain track position",
            "tire_sequence": ["MEDIUM", "HARD"],
            "trigger": "When within 2s of car ahead",
            "risk_level": "High"
        },
        "overcut_defensive": {
            "name": "Overcut Strategy", 
            "description": "Stay out to benefit from clear track",
            "tire_sequence": ["HARD", "MEDIUM"],
            "trigger": "When car behind pits first",
            "risk_level": "Medium"
        }
    }
    
    if scenario_name not in scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return scenarios[scenario_name]


@router.get("/scenarios")
async def list_strategy_scenarios():
    """List all available strategy scenarios"""
    return {
        "scenarios": [
            "aggressive_one_stop",
            "conservative_two_stop", 
            "undercut_aggressive",
            "overcut_defensive"
        ]
    }
