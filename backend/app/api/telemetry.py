"""
Telemetry API Routes
Real-time and historical telemetry data from OpenF1
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/live")
async def get_live_telemetry(
    request: Request,
    session_key: Optional[int] = None,
    driver_number: Optional[int] = None
):
    """Get live telemetry data"""
    client = request.app.state.openf1_client
    
    if not session_key:
        # Get latest session
        session = await client.get_latest_session()
        if not session:
            raise HTTPException(status_code=404, detail="No active session found")
        session_key = session.get("session_key")
    
    # Fetch telemetry data
    if driver_number:
        car_data = await client.get_car_data(session_key, driver_number)
        position = await client.get_position(session_key, driver_number)
    else:
        car_data = []
        position = []
    
    return {
        "session_key": session_key,
        "driver_number": driver_number,
        "car_data": car_data[-100:] if car_data else [],  # Last 100 samples
        "position": position[-50:] if position else []
    }


@router.get("/laps")
async def get_lap_data(
    request: Request,
    session_key: int,
    driver_number: Optional[int] = None
):
    """Get lap times and sector data"""
    client = request.app.state.openf1_client
    laps = await client.get_laps(session_key, driver_number)
    
    # Process lap data for visualization
    processed_laps = []
    for lap in laps:
        processed_laps.append({
            "driver_number": lap.get("driver_number"),
            "lap_number": lap.get("lap_number"),
            "lap_duration": lap.get("lap_duration"),
            "sector_1_time": lap.get("duration_sector_1"),
            "sector_2_time": lap.get("duration_sector_2"),
            "sector_3_time": lap.get("duration_sector_3"),
            "is_pit_out_lap": lap.get("is_pit_out_lap"),
            "compound": lap.get("compound"),
            "tyre_life": lap.get("tyre_life")
        })
    
    return {
        "session_key": session_key,
        "total_laps": len(processed_laps),
        "laps": processed_laps
    }


@router.get("/stints")
async def get_stint_data(
    request: Request,
    session_key: int,
    driver_number: Optional[int] = None
):
    """Get tire stint information"""
    client = request.app.state.openf1_client
    stints = await client.get_stints(session_key, driver_number)
    
    return {
        "session_key": session_key,
        "stints": stints
    }


@router.get("/intervals")
async def get_interval_data(
    request: Request,
    session_key: int
):
    """Get gap intervals between drivers"""
    client = request.app.state.openf1_client
    intervals = await client.get_intervals(session_key)
    
    # Group by driver and get latest
    driver_intervals = {}
    for interval in intervals:
        driver = interval.get("driver_number")
        driver_intervals[driver] = {
            "driver_number": driver,
            "gap_to_leader": interval.get("gap_to_leader"),
            "interval": interval.get("interval"),
            "date": interval.get("date")
        }
    
    return {
        "session_key": session_key,
        "intervals": list(driver_intervals.values())
    }


@router.get("/weather")
async def get_weather_data(
    request: Request,
    session_key: int
):
    """Get weather conditions"""
    client = request.app.state.openf1_client
    weather = await client.get_weather(session_key)
    
    # Process for timeline
    weather_timeline = []
    for w in weather:
        weather_timeline.append({
            "date": w.get("date"),
            "air_temperature": w.get("air_temperature"),
            "track_temperature": w.get("track_temperature"),
            "humidity": w.get("humidity"),
            "pressure": w.get("pressure"),
            "wind_speed": w.get("wind_speed"),
            "wind_direction": w.get("wind_direction"),
            "rainfall": w.get("rainfall", False)
        })
    
    return {
        "session_key": session_key,
        "current": weather_timeline[-1] if weather_timeline else None,
        "timeline": weather_timeline
    }


@router.get("/race-control")
async def get_race_control(
    request: Request,
    session_key: int,
    category: Optional[str] = None
):
    """Get race control messages"""
    client = request.app.state.openf1_client
    messages = await client.get_race_control(session_key, category)
    
    return {
        "session_key": session_key,
        "messages": messages
    }


@router.get("/pit-stops")
async def get_pit_stops(
    request: Request,
    session_key: int,
    driver_number: Optional[int] = None
):
    """Get pit stop data"""
    client = request.app.state.openf1_client
    pits = await client.get_pit_stops(session_key, driver_number)
    
    return {
        "session_key": session_key,
        "pit_stops": pits
    }


@router.get("/driver/{driver_number}/summary")
async def get_driver_summary(
    request: Request,
    driver_number: int,
    session_key: int
):
    """Get comprehensive driver summary"""
    client = request.app.state.openf1_client
    
    data = await client.get_driver_race_data(session_key, driver_number)
    drivers = await client.get_drivers(session_key, driver_number)
    
    driver_info = drivers[0] if drivers else {}
    
    # Calculate statistics
    lap_times = [l.get("lap_duration") for l in data["laps"] if l.get("lap_duration")]
    
    return {
        "driver": {
            "number": driver_number,
            "name": driver_info.get("full_name", f"Driver {driver_number}"),
            "team": driver_info.get("team_name", "Unknown"),
            "team_color": driver_info.get("team_colour", "#FFFFFF")
        },
        "session_key": session_key,
        "statistics": {
            "total_laps": data["total_laps"],
            "best_lap": min(lap_times) if lap_times else None,
            "average_lap": sum(lap_times) / len(lap_times) if lap_times else None,
            "total_pit_stops": data["total_pit_stops"]
        },
        "stints": data["stints"],
        "pit_stops": data["pit_stops"],
        "recent_laps": data["laps"][-10:] if data["laps"] else []
    }


@router.get("/comparison")
async def compare_drivers(
    request: Request,
    session_key: int,
    drivers: str = Query(..., description="Comma-separated driver numbers")
):
    """Compare telemetry between multiple drivers"""
    client = request.app.state.openf1_client
    driver_numbers = [int(d.strip()) for d in drivers.split(",")]
    
    comparison = {}
    for driver_num in driver_numbers:
        laps = await client.get_laps(session_key, driver_num)
        stints = await client.get_stints(session_key, driver_num)
        driver_info = await client.get_drivers(session_key, driver_num)
        
        lap_times = [l.get("lap_duration") for l in laps if l.get("lap_duration")]
        
        comparison[driver_num] = {
            "driver_info": driver_info[0] if driver_info else {},
            "lap_count": len(laps),
            "best_lap": min(lap_times) if lap_times else None,
            "average_lap": sum(lap_times) / len(lap_times) if lap_times else None,
            "stints": stints,
            "lap_times": lap_times
        }
    
    return {
        "session_key": session_key,
        "drivers": driver_numbers,
        "comparison": comparison
    }
