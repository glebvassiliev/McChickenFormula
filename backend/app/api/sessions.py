"""
Sessions API Routes
Manage F1 sessions from OpenF1
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List
import logging
import re

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


def _parse_duration(duration_value):
    """Parse ISO duration string (PT1M23.456S) or float to seconds as float"""
    if duration_value is None:
        return None
    
    # If already a number, return it
    if isinstance(duration_value, (int, float)):
        return float(duration_value)
    
    # If string, try to parse ISO duration format
    if isinstance(duration_value, str):
        # Handle ISO 8601 duration format: PT1M23.456S
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?', duration_value)
        if match:
            hours = float(match.group(1) or 0)
            minutes = float(match.group(2) or 0)
            seconds = float(match.group(3) or 0)
            return hours * 3600 + minutes * 60 + seconds
        
        # Try to parse as plain number string
        try:
            return float(duration_value)
        except ValueError:
            pass
    
    return None


@router.get("/{session_key}/standings")
async def get_session_standings(
    request: Request,
    session_key: int
):
    """Get current standings/results for a session"""
    client = request.app.state.openf1_client
    
    try:
        drivers = await client.get_drivers(session_key=session_key)
        logger.info(f"Fetched {len(drivers)} drivers for session {session_key}")
    except Exception as e:
        logger.warning(f"No drivers data for session {session_key}: {e}")
        drivers = []
    
    try:
        intervals = await client.get_intervals(session_key)
        logger.info(f"Fetched {len(intervals)} intervals for session {session_key}")
    except Exception as e:
        logger.warning(f"No intervals data for session {session_key}: {e}")
        intervals = []
    
    try:
        laps = await client.get_laps(session_key)
        logger.info(f"Fetched {len(laps)} laps for standings calculation")
    except Exception as e:
        logger.warning(f"No laps data for session {session_key}: {e}")
        laps = []
    
    # Build standings
    driver_data = {}
    for driver in drivers:
        num = driver.get("driver_number")
        if num is not None:
            driver_data[num] = {
                "driver_number": num,
                "name": driver.get("name_acronym") or driver.get("name_display") or f"DRV{num}",
                "full_name": driver.get("full_name") or driver.get("name_display") or "",
                "team": driver.get("team_name") or "",
                "team_color": driver.get("team_colour") or "333333",
                "gap_to_leader": None,
                "interval": None,
                "laps": 0,
                "best_lap": None
            }
    
    # Add intervals (latest per driver)
    driver_intervals = {}
    for interval in intervals:
        driver_num = interval.get("driver_number")
        if driver_num is not None:
            # Keep the latest interval for each driver
            if driver_num not in driver_intervals:
                driver_intervals[driver_num] = interval
            else:
                # Compare dates to keep the latest
                current_date = driver_intervals[driver_num].get("date")
                new_date = interval.get("date")
                if new_date and (not current_date or new_date > current_date):
                    driver_intervals[driver_num] = interval
    
    for num, interval in driver_intervals.items():
        if num in driver_data:
            gap = interval.get("gap_to_leader")
            # Parse gap if it's a duration string
            if isinstance(gap, str):
                gap_seconds = _parse_duration(gap)
                driver_data[num]["gap_to_leader"] = gap_seconds
            else:
                driver_data[num]["gap_to_leader"] = gap
            
            interval_val = interval.get("interval")
            if isinstance(interval_val, str):
                interval_seconds = _parse_duration(interval_val)
                driver_data[num]["interval"] = interval_seconds
            else:
                driver_data[num]["interval"] = interval_val
    
    # Add lap data - count laps and find best lap time
    for lap in laps:
        num = lap.get("driver_number")
        if num in driver_data:
            driver_data[num]["laps"] += 1
            lap_time = _parse_duration(lap.get("lap_duration"))
            if lap_time is not None:
                current_best = driver_data[num]["best_lap"]
                if current_best is None or lap_time < current_best:
                    driver_data[num]["best_lap"] = lap_time
    
    # If no intervals, sort by laps completed and best lap time
    if not intervals:
        standings = sorted(
            driver_data.values(),
            key=lambda x: (-x["laps"], x["best_lap"] if x["best_lap"] is not None else 9999)
        )
    else:
        # Sort by gap to leader
        standings = sorted(
            driver_data.values(),
            key=lambda x: (x["gap_to_leader"] if x["gap_to_leader"] is not None else 9999, x["laps"])
        )
    
    # Add position
    for i, driver in enumerate(standings):
        driver["position"] = i + 1
    
    logger.info(f"Generated standings for {len(standings)} drivers")
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
