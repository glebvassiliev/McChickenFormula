"""
FastF1 Client for fetching F1 telemetry and session data
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import fastf1
import pandas as pd
from fastapi.concurrency import run_in_threadpool

from app.config import settings


@dataclass
class SessionIdentity:
    year: int
    round_number: int
    event_name: str
    session_name: str
    session_index: int
    date_start: Optional[str]
    country_name: Optional[str]
    circuit_short_name: Optional[str]


class FastF1Client:
    """Wrapper around FastF1 to provide OpenF1-like data shapes."""

    def __init__(self) -> None:
        cache_dir = settings.fastf1_cache_dir
        fastf1.Cache.enable_cache(cache_dir)
        self._schedule_cache: Dict[int, pd.DataFrame] = {}
        self._session_map: Dict[int, SessionIdentity] = {}
        self._years_cache: Optional[List[int]] = None

    async def get_available_years(self) -> List[int]:
        return await run_in_threadpool(self._get_available_years_sync)

    async def get_sessions(
        self,
        year: Optional[int] = None,
        country_name: Optional[str] = None,
        session_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        return await run_in_threadpool(
            self._get_sessions_sync, year, country_name, session_type, limit
        )

    async def get_latest_session(self) -> Optional[Dict]:
        return await run_in_threadpool(self._get_latest_session_sync)

    async def get_session_summary(self, session_key: int) -> Dict:
        return await run_in_threadpool(self._get_session_summary_sync, session_key)

    async def get_drivers(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        return await run_in_threadpool(self._get_drivers_sync, session_key, driver_number)

    async def get_laps(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        return await run_in_threadpool(self._get_laps_sync, session_key, driver_number)

    async def get_stints(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        return await run_in_threadpool(self._get_stints_sync, session_key, driver_number)

    async def get_weather(self, session_key: int) -> List[Dict]:
        return await run_in_threadpool(self._get_weather_sync, session_key)

    async def get_race_control(self, session_key: int, category: Optional[str] = None) -> List[Dict]:
        return await run_in_threadpool(self._get_race_control_sync, session_key, category)

    async def get_intervals(self, session_key: int) -> List[Dict]:
        return await run_in_threadpool(self._get_intervals_sync, session_key)

    async def get_pit_stops(
        self,
        session_key: int,
        driver_number: Optional[int] = None
    ) -> List[Dict]:
        return await run_in_threadpool(self._get_pit_stops_sync, session_key, driver_number)

    async def get_driver_race_data(self, session_key: int, driver_number: int) -> Dict:
        return await run_in_threadpool(self._get_driver_race_data_sync, session_key, driver_number)

    # ==================== Internal sync helpers ====================

    def _get_available_years_sync(self) -> List[int]:
        if self._years_cache is not None:
            return self._years_cache

        current_year = datetime.utcnow().year
        years = []
        for year in range(2018, current_year + 1):
            try:
                schedule = fastf1.get_event_schedule(year, include_testing=False)
                if schedule is not None and len(schedule.index) > 0:
                    years.append(year)
            except Exception:
                continue

        self._years_cache = sorted(years, reverse=True)
        return self._years_cache

    def _get_sessions_sync(
        self,
        year: Optional[int],
        country_name: Optional[str],
        session_type: Optional[str],
        limit: int
    ) -> List[Dict]:
        if not year:
            years = self._get_available_years_sync()
            year = years[0] if years else datetime.utcnow().year

        sessions = self._build_sessions_for_year(year)

        if country_name:
            sessions = [s for s in sessions if s.get("country_name") == country_name]
        if session_type:
            sessions = [s for s in sessions if s.get("session_type") == session_type]

        return sessions[:limit]

    def _get_latest_session_sync(self) -> Optional[Dict]:
        years = self._get_available_years_sync()
        for year in years:
            sessions = self._build_sessions_for_year(year)
            if sessions:
                return sorted(
                    sessions,
                    key=lambda s: s.get("date_start") or "",
                    reverse=True
                )[0]
        return None

    def _get_session_summary_sync(self, session_key: int) -> Dict:
        identity = self._get_session_identity(session_key)
        if not identity:
            return {"session_key": session_key, "drivers": [], "total_laps": 0}

        session = self._load_session(identity, load_weather=True)
        laps = session.laps if session and session.laps is not None else pd.DataFrame()
        drivers = self._get_drivers_sync(session_key)
        stints = self._get_stints_sync(session_key)
        weather = self._get_weather_sync(session_key)

        return {
            "session_key": session_key,
            "drivers": drivers,
            "total_laps": len(laps.index),
            "stints": stints,
            "weather_samples": len(weather),
            "race_control_messages": 0,
            "weather_latest": weather[-1] if weather else None
        }

    def _get_drivers_sync(self, session_key: int, driver_number: Optional[int] = None) -> List[Dict]:
        identity = self._get_session_identity(session_key)
        if not identity:
            return []

        session = self._load_session(identity, load_weather=False)
        results = session.results if session and session.results is not None else pd.DataFrame()
        drivers = []
        if not results.empty:
            for _, row in results.iterrows():
                num = int(row.get("DriverNumber")) if pd.notna(row.get("DriverNumber")) else None
                if driver_number is not None and num != driver_number:
                    continue
                drivers.append({
                    "driver_number": num,
                    "broadcast_name": row.get("Abbreviation"),
                    "full_name": row.get("FullName") or row.get("DriverName"),
                    "name_acronym": row.get("Abbreviation"),
                    "team_name": row.get("TeamName"),
                    "team_colour": row.get("TeamColor") or "333333",
                    "headshot_url": None,
                    "country_code": row.get("CountryCode")
                })

        return drivers

    def _get_laps_sync(self, session_key: int, driver_number: Optional[int] = None) -> List[Dict]:
        identity = self._get_session_identity(session_key)
        if not identity:
            return []

        session = self._load_session(identity, load_weather=False)
        laps_df = session.laps if session and session.laps is not None else pd.DataFrame()
        if laps_df.empty:
            return []

        if driver_number is not None:
            laps_df = laps_df.pick_driver(driver_number)

        laps_df = laps_df.reset_index()
        processed = []
        for _, lap in laps_df.iterrows():
            lap_time = lap.get("LapTime")
            sector1 = lap.get("Sector1Time")
            sector2 = lap.get("Sector2Time")
            sector3 = lap.get("Sector3Time")
            processed.append({
                "driver_number": int(lap.get("DriverNumber")) if pd.notna(lap.get("DriverNumber")) else None,
                "lap_number": int(lap.get("LapNumber")) if pd.notna(lap.get("LapNumber")) else None,
                "lap_duration": lap_time.total_seconds() if pd.notna(lap_time) else None,
                "duration_sector_1": sector1.total_seconds() if pd.notna(sector1) else None,
                "duration_sector_2": sector2.total_seconds() if pd.notna(sector2) else None,
                "duration_sector_3": sector3.total_seconds() if pd.notna(sector3) else None,
                "is_pit_out_lap": bool(lap.get("PitOutTime")) if "PitOutTime" in lap else False,
                "compound": lap.get("Compound"),
                "tyre_life": int(lap.get("TyreLife")) if pd.notna(lap.get("TyreLife")) else None,
                "stint": int(lap.get("Stint")) if pd.notna(lap.get("Stint")) else None
            })

        return [p for p in processed if p.get("driver_number") is not None]

    def _get_stints_sync(self, session_key: int, driver_number: Optional[int] = None) -> List[Dict]:
        laps = self._get_laps_sync(session_key, driver_number)
        if not laps:
            return []

        stints = []
        laps_sorted = sorted(laps, key=lambda x: (x["driver_number"], x.get("stint") or 0, x["lap_number"] or 0))
        current = None
        for lap in laps_sorted:
            if lap.get("compound") is None:
                continue
            if (
                current is None
                or current["driver_number"] != lap["driver_number"]
                or current["compound"] != lap["compound"]
                or current.get("stint") != lap.get("stint")
            ):
                if current:
                    current["lap_end"] = prev_lap
                    current["stint_length"] = (current["lap_end"] - current["lap_start"] + 1) if current["lap_end"] else None
                    stints.append(current)
                current = {
                    "driver_number": lap["driver_number"],
                    "compound": lap["compound"],
                    "stint": lap.get("stint"),
                    "lap_start": lap["lap_number"],
                    "lap_end": None,
                    "tyre_age_at_start": lap.get("tyre_life")
                }
            prev_lap = lap["lap_number"]

        if current:
            current["lap_end"] = prev_lap
            current["stint_length"] = (current["lap_end"] - current["lap_start"] + 1) if current["lap_end"] else None
            stints.append(current)

        return stints

    def _get_weather_sync(self, session_key: int) -> List[Dict]:
        identity = self._get_session_identity(session_key)
        if not identity:
            return []

        session = self._load_session(identity, load_weather=True)
        weather = session.weather_data if session and hasattr(session, "weather_data") else pd.DataFrame()
        if weather is None or weather.empty:
            return []

        weather = weather.reset_index()
        timeline = []
        for _, row in weather.iterrows():
            timeline.append({
                "date": row.get("Time").isoformat() if pd.notna(row.get("Time")) else None,
                "air_temperature": row.get("AirTemp"),
                "track_temperature": row.get("TrackTemp"),
                "humidity": row.get("Humidity"),
                "pressure": row.get("Pressure"),
                "wind_speed": row.get("WindSpeed"),
                "wind_direction": row.get("WindDirection"),
                "rainfall": bool(row.get("Rainfall")) if "Rainfall" in row else False
            })
        return timeline

    def _get_race_control_sync(self, session_key: int, category: Optional[str]) -> List[Dict]:
        return []

    def _get_intervals_sync(self, session_key: int) -> List[Dict]:
        return []

    def _get_pit_stops_sync(self, session_key: int, driver_number: Optional[int] = None) -> List[Dict]:
        laps = self._get_laps_sync(session_key, driver_number)
        pit_stops = []
        for lap in laps:
            if lap.get("is_pit_out_lap"):
                pit_stops.append({
                    "driver_number": lap["driver_number"],
                    "lap_number": lap["lap_number"]
                })
        return pit_stops

    def _get_driver_race_data_sync(self, session_key: int, driver_number: int) -> Dict:
        laps = self._get_laps_sync(session_key, driver_number)
        stints = self._get_stints_sync(session_key, driver_number)
        pits = self._get_pit_stops_sync(session_key, driver_number)

        return {
            "driver_number": driver_number,
            "session_key": session_key,
            "laps": laps,
            "stints": stints,
            "intervals": [],
            "pit_stops": pits,
            "total_laps": len(laps),
            "total_pit_stops": len(pits)
        }

    # ==================== Mapping helpers ====================

    def _build_sessions_for_year(self, year: int) -> List[Dict]:
        schedule = self._get_schedule(year)
        if schedule is None or schedule.empty:
            return []

        sessions = []
        for _, row in schedule.iterrows():
            round_number = int(row.get("RoundNumber")) if pd.notna(row.get("RoundNumber")) else 0
            event_name = row.get("EventName")
            country_name = row.get("Country")
            circuit_short_name = row.get("Location") or event_name

            for idx in range(1, 6):
                session_name = row.get(f"Session{idx}")
                session_date = row.get(f"Session{idx}Date")
                if not session_name or pd.isna(session_name):
                    continue

                session_key = self._make_session_key(year, round_number, idx)
                date_start = session_date.isoformat() if pd.notna(session_date) else None
                session_type = self._map_session_type(session_name)

                identity = SessionIdentity(
                    year=year,
                    round_number=round_number,
                    event_name=event_name,
                    session_name=session_name,
                    session_index=idx,
                    date_start=date_start,
                    country_name=country_name,
                    circuit_short_name=circuit_short_name
                )
                self._session_map[session_key] = identity

                sessions.append({
                    "session_key": session_key,
                    "session_name": session_name,
                    "session_type": session_type,
                    "country_name": country_name,
                    "country_code": None,
                    "circuit_short_name": circuit_short_name,
                    "date_start": date_start,
                    "date_end": None,
                    "year": year,
                    "meeting_name": event_name,
                    "status": "finished"
                })

        return sessions

    def _get_schedule(self, year: int) -> pd.DataFrame:
        if year in self._schedule_cache:
            return self._schedule_cache[year]

        schedule = fastf1.get_event_schedule(year, include_testing=False)
        self._schedule_cache[year] = schedule
        return schedule

    def _get_session_identity(self, session_key: int) -> Optional[SessionIdentity]:
        if session_key in self._session_map:
            return self._session_map[session_key]

        year = session_key // 1000
        self._build_sessions_for_year(year)
        return self._session_map.get(session_key)

    def _load_session(self, identity: SessionIdentity, load_weather: bool = False):
        session = fastf1.get_session(identity.year, identity.event_name, identity.session_name)
        session.load(
            telemetry=False,
            weather=load_weather,
            messages=False,
            laps=True
        )
        return session

    def _make_session_key(self, year: int, round_number: int, session_index: int) -> int:
        return year * 1000 + round_number * 10 + session_index

    def _map_session_type(self, session_name: str) -> str:
        name = (session_name or "").lower()
        if "practice 1" in name or name == "fp1":
            return "Practice 1"
        if "practice 2" in name or name == "fp2":
            return "Practice 2"
        if "practice 3" in name or name == "fp3":
            return "Practice 3"
        if "sprint" in name and ("shootout" in name or "qualifying" in name):
            return "Sprint Qualifying"
        if "sprint" in name:
            return "Sprint"
        if "qualifying" in name:
            return "Qualifying"
        if "race" in name:
            return "Race"
        return session_name
