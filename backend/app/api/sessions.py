"""
Sessions API Routes
Manage F1 sessions from OpenF1
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_sessions(
    request: Request,
    year: Optional[int] = None,
    country: Optional[str] = None,
    session_type: Optional[str] = None,
    limit: int = Query(default=20, le=100)
):
    """Get list of F1 sessions"""
    client = request.app.state.openf1_client
    
    sessions = await client.get_sessions(
        year=year,
        country_name=country,
        session_type=session_type,
        limit=limit
    )
    
    # Process sessions for frontend
    processed = []
    for session in sessions:
        processed.append({
            "session_key": session.get("session_key"),
            "session_name": session.get("session_name"),
            "session_type": session.get("session_type"),
            "country_name": session.get("country_name"),
            "country_code": session.get("country_code"),
            "circuit_short_name": session.get("circuit_short_name"),
            "date_start": session.get("date_start"),
            "date_end": session.get("date_end"),
            "year": session.get("year"),
            "meeting_name": session.get("meeting_name")
        })
    
    return {
        "total": len(processed),
        "sessions": processed
    }


@router.get("/latest")
async def get_latest_session(request: Request):
    """Get the most recent session"""
    client = request.app.state.openf1_client
    
    session = await client.get_latest_session()
    
    if not session:
        raise HTTPException(status_code=404, detail="No session found")
    
    return session


@router.get("/{session_key}")
async def get_session_details(
    request: Request,
    session_key: int
):
    """Get detailed session information"""
    client = request.app.state.openf1_client
    
    summary = await client.get_session_summary(session_key)
    
    return summary


@router.get("/{session_key}/drivers")
async def get_session_drivers(
    request: Request,
    session_key: int
):
    """Get all drivers in a session"""
    client = request.app.state.openf1_client
    
    drivers = await client.get_drivers(session_key=session_key)
    
    # Process drivers
    processed = []
    for driver in drivers:
        processed.append({
            "driver_number": driver.get("driver_number"),
            "broadcast_name": driver.get("broadcast_name"),
            "full_name": driver.get("full_name"),
            "name_acronym": driver.get("name_acronym"),
            "team_name": driver.get("team_name"),
            "team_colour": driver.get("team_colour"),
            "headshot_url": driver.get("headshot_url"),
            "country_code": driver.get("country_code")
        })
    
    return {
        "session_key": session_key,
        "driver_count": len(processed),
        "drivers": processed
    }


@router.get("/{session_key}/standings")
async def get_session_standings(
    request: Request,
    session_key: int
):
    """Get current standings/results for a session"""
    client = request.app.state.openf1_client
    
    drivers = await client.get_drivers(session_key=session_key)
    intervals = await client.get_intervals(session_key)
    laps = await client.get_laps(session_key)
    
    # Build standings
    driver_data = {}
    for driver in drivers:
        num = driver.get("driver_number")
        driver_data[num] = {
            "driver_number": num,
            "name": driver.get("name_acronym"),
            "full_name": driver.get("full_name"),
            "team": driver.get("team_name"),
            "team_color": driver.get("team_colour"),
            "gap_to_leader": None,
            "interval": None,
            "laps": 0,
            "best_lap": None
        }
    
    # Add intervals (latest)
    driver_intervals = {}
    for interval in intervals:
        driver_intervals[interval.get("driver_number")] = interval
    
    for num, interval in driver_intervals.items():
        if num in driver_data:
            driver_data[num]["gap_to_leader"] = interval.get("gap_to_leader")
            driver_data[num]["interval"] = interval.get("interval")
    
    # Add lap data
    for lap in laps:
        num = lap.get("driver_number")
        if num in driver_data:
            driver_data[num]["laps"] += 1
            lap_time = lap.get("lap_duration")
            if lap_time:
                current_best = driver_data[num]["best_lap"]
                if current_best is None or lap_time < current_best:
                    driver_data[num]["best_lap"] = lap_time
    
    # Sort by gap to leader
    standings = sorted(
        driver_data.values(),
        key=lambda x: x["gap_to_leader"] if x["gap_to_leader"] is not None else 9999
    )
    
    # Add position
    for i, driver in enumerate(standings):
        driver["position"] = i + 1
    
    return {
        "session_key": session_key,
        "standings": standings
    }


@router.get("/years")
async def get_available_years(request: Request):
    """Get list of available years with data"""
    # OpenF1 has data from 2023 onwards
    return {
        "years": [2023, 2024, 2025, 2026]
    }


@router.get("/circuits")
async def get_circuits(
    request: Request,
    year: Optional[int] = None
):
    """Get list of circuits"""
    client = request.app.state.openf1_client
    
    sessions = await client.get_sessions(year=year, limit=100)
    
    # Extract unique circuits
    circuits = {}
    for session in sessions:
        circuit = session.get("circuit_short_name")
        if circuit and circuit not in circuits:
            circuits[circuit] = {
                "circuit_short_name": circuit,
                "country_name": session.get("country_name"),
                "country_code": session.get("country_code"),
                "meeting_name": session.get("meeting_name")
            }
    
    return {
        "circuits": list(circuits.values())
    }
