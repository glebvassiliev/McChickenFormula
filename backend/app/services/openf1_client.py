"""
OpenF1 API Client for fetching F1 telemetry and session data
"""
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class OpenF1Client:
    """Client for interacting with the OpenF1 API"""
    
    def __init__(self):
        self.base_url = settings.openf1_base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def _get(self, endpoint: str, params: Optional[Dict] = None) -> List[Dict]:
        """Make GET request to OpenF1 API"""
        url = f"{self.base_url}/{endpoint}"
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"OpenF1 API error: {e}")
            return []
    
    # ==================== SESSION DATA ====================
    
    async def get_sessions(
        self,
        year: Optional[int] = None,
        country_name: Optional[str] = None,
        session_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get F1 sessions (races, qualifying, practice)"""
        params = {}
        if year:
            params["year"] = year
        if country_name:
            params["country_name"] = country_name
        if session_type:
            params["session_type"] = session_type
        
        sessions = await self._get("sessions", params)
        return sessions[:limit]
    
    async def get_latest_session(self) -> Optional[Dict]:
        """Get the most recent session"""
        sessions = await self.get_sessions(limit=1)
        return sessions[0] if sessions else None
    
    # ==================== DRIVER DATA ====================
    
    async def get_drivers(
        self,
        session_key: Optional[int] = None,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        """Get driver information"""
        params = {}
        if session_key:
            params["session_key"] = session_key
        if driver_number:
            params["driver_number"] = driver_number
        
        return await self._get("drivers", params)
    
    # ==================== LAP DATA ====================
    
    async def get_laps(
        self,
        session_key: int,
        driver_number: Optional[int] = None,
        lap_number: Optional[int] = None
    ) -> List[Dict]:
        """Get lap times and data"""
        params = {"session_key": session_key}
        if driver_number:
            params["driver_number"] = driver_number
        if lap_number:
            params["lap_number"] = lap_number
        
        return await self._get("laps", params)
    
    # ==================== CAR DATA (TELEMETRY) ====================
    
    async def get_car_data(
        self,
        session_key: int,
        driver_number: int,
        speed_gte: Optional[int] = None,
        date_gte: Optional[str] = None,
        date_lte: Optional[str] = None
    ) -> List[Dict]:
        """Get detailed car telemetry data"""
        params = {
            "session_key": session_key,
            "driver_number": driver_number
        }
        if speed_gte:
            params["speed>="] = speed_gte
        if date_gte:
            params["date>="] = date_gte
        if date_lte:
            params["date<="] = date_lte
        
        return await self._get("car_data", params)
    
    # ==================== POSITION DATA ====================
    
    async def get_position(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        """Get position tracking data"""
        params = {"session_key": session_key}
        if driver_number:
            params["driver_number"] = driver_number
        
        return await self._get("position", params)
    
    # ==================== INTERVALS ====================
    
    async def get_intervals(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        """Get interval data between drivers"""
        params = {"session_key": session_key}
        if driver_number:
            params["driver_number"] = driver_number
        
        return await self._get("intervals", params)
    
    # ==================== STINTS (TIRE DATA) ====================
    
    async def get_stints(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        """Get stint data including tire compounds"""
        params = {"session_key": session_key}
        if driver_number:
            params["driver_number"] = driver_number
        
        return await self._get("stints", params)
    
    # ==================== PIT STOPS ====================
    
    async def get_pit_stops(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        """Get pit stop data"""
        params = {"session_key": session_key}
        if driver_number:
            params["driver_number"] = driver_number
        
        return await self._get("pit", params)
    
    # ==================== WEATHER ====================
    
    async def get_weather(
        self,
        session_key: int
    ) -> List[Dict]:
        """Get weather data for a session"""
        params = {"session_key": session_key}
        return await self._get("weather", params)
    
    # ==================== RACE CONTROL ====================
    
    async def get_race_control(
        self,
        session_key: int,
        category: Optional[str] = None
    ) -> List[Dict]:
        """Get race control messages (flags, penalties, etc.)"""
        params = {"session_key": session_key}
        if category:
            params["category"] = category
        
        return await self._get("race_control", params)
    
    # ==================== TEAM RADIO ====================
    
    async def get_team_radio(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        """Get team radio messages"""
        params = {"session_key": session_key}
        if driver_number:
            params["driver_number"] = driver_number
        
        return await self._get("team_radio", params)
    
    # ==================== AGGREGATED DATA ====================
    
    async def get_session_summary(self, session_key: int) -> Dict[str, Any]:
        """Get comprehensive session summary"""
        drivers, laps, stints, weather, race_control = await asyncio.gather(
            self.get_drivers(session_key=session_key),
            self.get_laps(session_key=session_key),
            self.get_stints(session_key=session_key),
            self.get_weather(session_key=session_key),
            self.get_race_control(session_key=session_key)
        )
        
        return {
            "session_key": session_key,
            "drivers": drivers,
            "total_laps": len(laps),
            "stints": stints,
            "weather_samples": len(weather),
            "race_control_messages": len(race_control),
            "weather_latest": weather[-1] if weather else None
        }
    
    async def get_driver_race_data(
        self,
        session_key: int,
        driver_number: int
    ) -> Dict[str, Any]:
        """Get all race data for a specific driver"""
        laps, stints, intervals, pits = await asyncio.gather(
            self.get_laps(session_key, driver_number),
            self.get_stints(session_key, driver_number),
            self.get_intervals(session_key, driver_number),
            self.get_pit_stops(session_key, driver_number)
        )
        
        return {
            "driver_number": driver_number,
            "session_key": session_key,
            "laps": laps,
            "stints": stints,
            "intervals": intervals,
            "pit_stops": pits,
            "total_laps": len(laps),
            "total_pit_stops": len(pits)
        }
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
