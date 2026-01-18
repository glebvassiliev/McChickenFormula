/**
 * Dashboard Page - Mission Control View
 * Uses the new Bento Grid Layout for data-dense visualization
 */
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard';
import type { Driver, WeatherData, SessionInfo, TireCompound } from '../types/dashboard';

interface DashboardProps {
  sessionKey: number | null;
  drivers: any[];
}

// Transform raw driver data to typed Driver interface
function transformDrivers(rawDrivers: any[]): Driver[] {
  return rawDrivers.map((driver, idx) => {
    // Extract name - prioritize name_acronym from standings, then broadcast_name, then construct from full_name
    const nameAcronym = driver.name_acronym || driver.name || '';
    const broadcastName = driver.broadcast_name || '';
    const fullName = driver.full_name || '';
    
    let finalAcronym = nameAcronym;
    if (!finalAcronym && broadcastName) {
      finalAcronym = broadcastName.toUpperCase();
    } else if (!finalAcronym && fullName) {
      // Extract initials from full name (e.g., "Max Verstappen" -> "MVE")
      const parts = fullName.split();
      if (parts.length >= 2) {
        finalAcronym = (parts[0][0] + parts[parts.length - 1].substring(0, 2)).toUpperCase();
      } else if (parts.length === 1) {
        finalAcronym = parts[0].substring(0, 3).toUpperCase();
      }
    }
    
    return {
      driver_number: driver.driver_number,
      name: driver.full_name || driver.name || `Driver ${driver.driver_number}`,
      name_acronym: finalAcronym || `DRV${driver.driver_number}`,
      team_name: driver.team_name || driver.team || 'Unknown Team',
      team_color: driver.team_colour || driver.team_color || '333333',
      position: driver.position || idx + 1,
      gap_to_leader: driver.gap_to_leader ?? null,
      gap_to_car_ahead: driver.gap_to_car_ahead ?? null,
      last_lap_time: driver.last_lap_time ?? null,
      best_lap_time: driver.best_lap ?? null,
      tire_compound: (driver.compound?.toUpperCase() || 'MEDIUM') as TireCompound,
      tire_age: driver.tyre_life || driver.tire_age || 0,
      pit_stops: driver.pit_stops || 0,
    };
  });
}

export default function Dashboard({ sessionKey, drivers }: DashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [standings, setStandings] = useState<Driver[]>([]);
  const [, setLoading] = useState(false);

  // Fetch weather and session data
  useEffect(() => {
    if (!sessionKey) {
      setWeather(null);
      setSessionInfo(null);
      setStandings([]);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Fetch weather
        const weatherRes = await fetch(`/api/telemetry/weather?session_key=${sessionKey}`);
        if (weatherRes.ok && !cancelled) {
          const data = await weatherRes.json();
          const weatherValue = data?.current || 
            (data?.timeline?.length > 0 ? data.timeline[data.timeline.length - 1] : null) ||
            (Array.isArray(data) && data.length > 0 ? data[data.length - 1] : null);
          
          if (weatherValue) {
            setWeather({
              air_temperature: weatherValue.air_temperature,
              track_temperature: weatherValue.track_temperature,
              humidity: weatherValue.humidity,
              wind_speed: weatherValue.wind_speed || 0,
              wind_direction: weatherValue.wind_direction || 0,
              rainfall: weatherValue.rainfall || false,
              rain_probability: weatherValue.rain_probability || 0,
            });
          }
        }

        // Fetch standings
        const standingsRes = await fetch(`/api/sessions/${sessionKey}/standings`);
        if (standingsRes.ok && !cancelled) {
          const data = await standingsRes.json();
          const standingsList = data?.standings || (Array.isArray(data) ? data : []);
          setStandings(transformDrivers(standingsList));
        }

        // Fetch session details to get circuit name and session info
        const sessionRes = await fetch(`/api/sessions/${sessionKey}`);
        let sessionDetails = null;
        if (sessionRes.ok && !cancelled) {
          try {
            sessionDetails = await sessionRes.json();
          } catch (e) {
            console.warn('Could not parse session details:', e);
          }
        }

        // Create session info from fetched data
        if (!cancelled) {
          // Get circuit name from session details or from the API sessions list
          let circuitName = 'Circuit';
          if (sessionDetails?.circuit_short_name) {
            circuitName = sessionDetails.circuit_short_name;
          } else if (sessionDetails?.meeting_name) {
            // Try to extract from meeting name
            circuitName = sessionDetails.meeting_name;
          }
          
          setSessionInfo({
            session_key: sessionKey,
            meeting_name: sessionDetails?.meeting_name || 'Race Weekend',
            session_name: sessionDetails?.session_name || 'Race',
            circuit_short_name: circuitName,
            date_start: sessionDetails?.date_start || new Date().toISOString(),
            current_lap: 1, // TODO: Calculate from lap data
            total_laps: sessionDetails?.total_laps || 50,
            status: 'live',
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Refresh data periodically
    const interval = setInterval(fetchData, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionKey]);

  // Merge standings with driver props
  const mergedDrivers = standings.length > 0 
    ? standings 
    : transformDrivers(drivers);

  return (
    <DashboardLayout
      sessionKey={sessionKey}
      drivers={mergedDrivers}
      weather={weather}
      sessionInfo={sessionInfo}
    />
  );
}
