/**
 * F1 Track SVG Path Data
 * Common circuit layouts for track map visualization
 */
export interface TrackPath {
  name: string;
  path: string;
  viewBox: string;
  startFinish: { x: number; y: number; rotation?: number };
}

export const TRACK_PATHS: Record<string, TrackPath> = {
  // Monaco - Tight street circuit
  'monaco': {
    name: 'Circuit de Monaco',
    path: "M 50 120 L 100 120 Q 130 120 140 100 Q 150 80 180 80 L 260 80 Q 280 80 290 100 L 290 150 L 310 180 Q 320 200 310 220 L 290 250 Q 270 270 240 280 L 100 280 Q 70 270 50 250 L 40 200 Q 30 180 40 160 Z",
    viewBox: "0 0 350 320",
    startFinish: { x: 50, y: 120, rotation: 0 }
  },
  
  // Silverstone - High speed flowing circuit
  'silverstone': {
    name: 'Silverstone Circuit',
    path: "M 80 100 Q 60 80 80 60 L 200 60 Q 250 60 280 100 Q 300 140 280 180 L 240 220 Q 200 240 160 240 L 100 220 Q 80 200 70 180 Q 60 140 80 100 Z",
    viewBox: "0 0 350 280",
    startFinish: { x: 120, y: 100, rotation: 0 }
  },
  
  // Monza - High speed with long straights
  'monza': {
    name: 'Autodromo Nazionale di Monza',
    path: "M 50 150 L 300 150 L 300 100 Q 280 80 250 80 L 100 80 Q 70 80 50 100 Z M 50 150 L 50 200 Q 70 220 100 220 L 250 220 Q 280 220 300 200 L 300 150",
    viewBox: "0 0 350 300",
    startFinish: { x: 175, y: 150, rotation: 0 }
  },
  
  // Spa-Francorchamps - Long flowing circuit
  'spa': {
    name: 'Circuit de Spa-Francorchamps',
    path: "M 60 200 L 100 180 Q 140 160 180 160 Q 220 160 260 180 L 290 200 L 280 120 Q 260 80 220 60 L 120 60 Q 80 80 70 120 L 60 200",
    viewBox: "0 0 350 260",
    startFinish: { x: 175, y: 200, rotation: 0 }
  },
  
  // Singapore - Marina Bay street circuit
  'singapore': {
    name: 'Marina Bay Street Circuit',
    path: "M 100 80 L 250 80 L 280 110 L 280 180 Q 260 200 230 200 L 120 200 Q 90 200 70 180 L 70 110 Q 80 90 100 80 Z",
    viewBox: "0 0 350 280",
    startFinish: { x: 175, y: 80, rotation: 0 }
  },
  
  // COTA - Technical with elevation changes
  'cota': {
    name: 'Circuit of the Americas',
    path: "M 80 100 L 270 100 Q 300 100 300 130 L 300 170 Q 280 200 240 220 L 160 220 Q 120 200 100 170 L 100 130 Q 100 100 130 100",
    viewBox: "0 0 400 240",
    startFinish: { x: 175, y: 100, rotation: 0 }
  },
  
  // Suzuka - Figure-8 layout
  'suzuka': {
    name: 'Suzuka International Racing Course',
    path: "M 175 50 Q 250 50 300 100 Q 320 150 300 200 Q 250 240 175 240 Q 100 240 50 200 Q 30 150 50 100 Q 100 50 175 50 M 175 145 Q 250 145 300 175 M 175 145 Q 100 145 50 175",
    viewBox: "0 0 350 290",
    startFinish: { x: 175, y: 145, rotation: 90 }
  },
  
  // Interlagos - Technical and twisty
  'interlagos': {
    name: 'Autódromo José Carlos Pace',
    path: "M 100 100 Q 60 100 50 140 L 50 160 Q 60 200 100 200 L 250 200 Q 290 200 300 160 L 300 140 Q 290 100 250 100 L 100 100",
    viewBox: "0 0 350 220",
    startFinish: { x: 175, y: 100, rotation: 0 }
  },
  
  // Red Bull Ring - Simple and fast
  'red-bull-ring': {
    name: 'Red Bull Ring',
    path: "M 80 100 L 270 100 L 300 130 L 300 170 L 270 200 L 80 200 L 50 170 L 50 130 Z",
    viewBox: "0 0 350 220",
    startFinish: { x: 175, y: 100, rotation: 0 }
  },
  
  // Yas Marina - Abu Dhabi
  'yas-marina': {
    name: 'Yas Marina Circuit',
    path: "M 50 100 L 300 100 Q 320 110 320 130 L 320 170 Q 300 200 270 200 L 80 200 Q 50 200 50 170 L 50 130 Q 50 110 50 100",
    viewBox: "0 0 370 220",
    startFinish: { x: 175, y: 100, rotation: 0 }
  }
};

// Normalize circuit names to match FastF1 data
export function getTrackPath(circuitName: string | undefined): TrackPath {
  
  const normalized = circuitName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Direct matches
  if (TRACK_PATHS[normalized]) {
    return TRACK_PATHS[normalized];
  }
  
  // Partial matches
  for (const [key, track] of Object.entries(TRACK_PATHS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return track;
    }
  }
  
  // Fallback for unknown tracks - use a generic oval
  return {
    name: circuitName || 'Circuit',
    path: "M 60 150 Q 60 60 180 60 Q 300 60 300 150 Q 300 240 180 240 Q 60 240 60 150 Z",
    viewBox: "0 0 360 300",
    startFinish: { x: 180, y: 150, rotation: 0 }
  };
}
