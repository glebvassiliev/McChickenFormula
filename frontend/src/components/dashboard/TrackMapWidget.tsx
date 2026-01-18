/**
 * TrackMapWidget - Simplified SVG circuit map (Zone A - Left)
 * Features: Traffic risk highlighting from Position Model, Real track layouts
 */
import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTrackPath, type TrackPath } from '../../data/trackPaths';
import type { Driver } from '../../types/dashboard';

interface TrackMapWidgetProps {
  drivers: Driver[];
  selectedDriver?: number;
  circuitName?: string;
}

// Calculate driver position along track path
function getDriverPositionOnTrack(
  driverIndex: number, 
  totalDrivers: number,
  trackPath: TrackPath
): { x: number; y: number } {
  // Distribute drivers along the track path based on position
  // Use position to determine location (1st = near start/finish, etc.)
  const positionRatio = driverIndex / totalDrivers;
  const viewBox = trackPath.viewBox.split(' ').map(Number);
  const width = viewBox[2] || 360;
  const height = viewBox[3] || 300;
  
  // Simple approximation - distribute along track perimeter
  const angle = positionRatio * 2 * Math.PI;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = (width * 0.35);
  const radiusY = (height * 0.35);
  
  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle)
  };
}

export default function TrackMapWidget({
  drivers,
  selectedDriver,
  circuitName = 'Circuit'
}: TrackMapWidgetProps) {
  // Initialize with default track, then update when circuit name changes
  const [trackData, setTrackData] = useState<TrackPath>(() => getTrackPath(circuitName));
  
  // Update track data when circuit name changes
  useEffect(() => {
    const track = getTrackPath(circuitName);
    setTrackData(track);
  }, [circuitName]);
  
  const sortedDrivers = useMemo(() => 
    [...drivers].sort((a, b) => (a.position || 99) - (b.position || 99)),
    [drivers]
  );

  // Identify traffic risk zones (clusters of drivers)
  const trafficZones = useMemo(() => {
    const zones: { x: number; y: number; severity: number }[] = [];
    
    for (let i = 0; i < sortedDrivers.length - 1; i++) {
      const gap = sortedDrivers[i + 1]?.gap_to_car_ahead;
      if (gap !== null && gap !== undefined && gap < 1.5) {
        const pos = getDriverPositionOnTrack(i, sortedDrivers.length, trackData);
        zones.push({
          x: pos.x,
          y: pos.y,
          severity: gap < 0.5 ? 1 : 0.6
        });
      }
    }
    
    return zones;
  }, [sortedDrivers, trackData]);
  
  const currentTrack = trackData;
  const viewBox = currentTrack.viewBox || "0 0 360 300";

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="bento-card-header">
        <h3 className="bento-card-title">Track Map</h3>
        <span className="text-[10px] font-mono text-neutral-500 uppercase">
          {circuitName}
        </span>
      </div>
      
      <div className="flex-1 p-3">
        <AnimatePresence mode="wait">
          <motion.svg
            key={circuitName || 'default'}
            viewBox={viewBox}
            className="w-full h-full"
            style={{ maxHeight: '180px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {/* Track outline */}
            <path
              d={currentTrack.path}
              className="fill-none stroke-neutral-800"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Track surface */}
            <path
              d={currentTrack.path}
              className="fill-none stroke-neutral-700"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Racing line */}
            <path
              d={currentTrack.path}
              className="fill-none stroke-neutral-600"
              strokeWidth="2"
              strokeDasharray="8 4"
              strokeLinecap="round"
            />

          {/* Traffic risk zones */}
          {trafficZones.map((zone, idx) => (
            <motion.circle
              key={`zone-${idx}`}
              cx={zone.x}
              cy={zone.y}
              r="20"
              fill={`rgba(225, 6, 0, ${zone.severity * 0.3})`}
              stroke="rgba(225, 6, 0, 0.5)"
              strokeWidth="1"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            />
          ))}

            {/* Driver positions */}
            {sortedDrivers.map((driver, idx) => {
              const pos = getDriverPositionOnTrack(idx, sortedDrivers.length, trackData);
            const isSelected = selectedDriver === driver.driver_number;
            const hasTrafficRisk = driver.traffic_risk;
            
            return (
              <motion.g
                key={driver.driver_number}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.03 }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill="none"
                    stroke="#E10600"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}
                
                {/* Driver dot */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 8 : 6}
                  fill={driver.team_color ? `#${driver.team_color}` : '#666'}
                  stroke={hasTrafficRisk ? '#E10600' : '#000'}
                  strokeWidth={hasTrafficRisk ? 2 : 1}
                />
                
                {/* Driver number */}
                <text
                  x={pos.x}
                  y={pos.y + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#fff"
                  className="select-none"
                >
                  {driver.driver_number}
                </text>
              </motion.g>
            );
          })}

            {/* Start/Finish line */}
            <line
              x1={currentTrack.startFinish.x - 10}
              y1={currentTrack.startFinish.y}
              x2={currentTrack.startFinish.x + 10}
              y2={currentTrack.startFinish.y}
              stroke="#fff"
              strokeWidth="3"
              transform={currentTrack.startFinish.rotation ? `rotate(${currentTrack.startFinish.rotation} ${currentTrack.startFinish.x} ${currentTrack.startFinish.y})` : undefined}
            />
            <text
              x={currentTrack.startFinish.x}
              y={currentTrack.startFinish.y - 15}
              textAnchor="middle"
              fontSize="8"
              fill="#666"
              className="uppercase font-semibold"
            >
              S/F
            </text>
          </motion.svg>
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="px-3 pb-3 flex items-center gap-4 text-[10px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-racing-red/30 border border-racing-red/50" />
          <span>Traffic Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-neutral-600 border border-neutral-500" />
          <span>Driver</span>
        </div>
      </div>
    </div>
  );
}
