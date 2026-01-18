/**
 * SessionSelector - Apple-like Full-Screen Modal Design
 * Complete redesign with sleek, minimal interface
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Calendar, MapPin, Flag, 
  ChevronRight, Filter, Clock
} from 'lucide-react';
import clsx from 'clsx';

interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  meeting_name: string;
  date_start: string;
  year: number;
  status?: 'upcoming' | 'live' | 'finished';
}

interface SessionSelectorProps {
  currentSession: number | null;
  onSelect: (sessionKey: number) => void;
  onSessionChange?: (sessionInfo: Session | null) => void;
}

type SessionTypeFilter = 'ALL' | 'FP1' | 'FP2' | 'FP3' | 'QUALIFYING' | 'RACE' | 'SPRINT_QUALIFYING' | 'SPRINT';

const SESSION_TYPE_FILTERS: { value: SessionTypeFilter; label: string; icon: string }[] = [
  { value: 'ALL', label: 'All Sessions', icon: '🏁' },
  { value: 'RACE', label: 'Race', icon: '🏎️' },
  { value: 'QUALIFYING', label: 'Qualifying', icon: '⚡' },
  { value: 'FP1', label: 'Free Practice 1', icon: '1️⃣' },
  { value: 'FP2', label: 'Free Practice 2', icon: '2️⃣' },
  { value: 'FP3', label: 'Free Practice 3', icon: '3️⃣' },
  { value: 'SPRINT', label: 'Sprint', icon: '💨' },
  { value: 'SPRINT_QUALIFYING', label: 'Sprint Qualifying', icon: '🎯' },
];

export default function SessionSelector({ currentSession, onSelect, onSessionChange }: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionInfo, setSelectedSessionInfo] = useState<Session | null>(null);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [sessionTypeFilter, setSessionTypeFilter] = useState<SessionTypeFilter>('ALL');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchYears();
      fetchSessions();
    }
  }, [yearFilter, isOpen]);

  useEffect(() => {
    if (currentSession && sessions.length > 0) {
      const session = sessions.find(s => s.session_key === currentSession);
      if (session) {
        setSelectedSessionInfo(session);
        onSessionChange?.(session);
      }
    }
  }, [currentSession, sessions, onSessionChange]);

  const normalizeSessionType = (type: string, name?: string): SessionTypeFilter | null => {
    const typeL = (type || '').toLowerCase().trim();
    const nameL = (name || '').toLowerCase().trim();
    const combined = `${typeL} ${nameL}`;
    
    if (nameL.includes('practice 1') || nameL === 'fp1' || combined.includes('practice 1')) return 'FP1';
    if (nameL.includes('practice 2') || nameL === 'fp2' || combined.includes('practice 2')) return 'FP2';
    if (nameL.includes('practice 3') || nameL === 'fp3' || combined.includes('practice 3')) return 'FP3';
    if (typeL === 'practice 1' || typeL === 'practice1' || typeL === 'fp1') return 'FP1';
    if (typeL === 'practice 2' || typeL === 'practice2' || typeL === 'fp2') return 'FP2';
    if (typeL === 'practice 3' || typeL === 'practice3' || typeL === 'fp3') return 'FP3';
    if (combined.includes('sprint') && (combined.includes('qualifying') || combined.includes('shootout'))) return 'SPRINT_QUALIFYING';
    if (typeL === 'sprint' || nameL === 'sprint' || nameL === 'sprint race') return 'SPRINT';
    if ((typeL.includes('qualifying') || nameL.includes('qualifying')) && !combined.includes('sprint')) return 'QUALIFYING';
    if (typeL === 'race' || nameL === 'race') return 'RACE';
    return null;
  };

  useEffect(() => {
    let filtered = sessions;
    
    if (sessionTypeFilter !== 'ALL') {
      filtered = filtered.filter(s => {
        const normalized = normalizeSessionType(s.session_type, s.session_name);
        return normalized === sessionTypeFilter;
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.country_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.circuit_short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.meeting_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.session_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.session_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSessions(filtered);
  }, [searchTerm, sessions, sessionTypeFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/?year=${yearFilter}&limit=200`);
      const data = await response.json();
      setSessions(data.sessions || []);
      setFilteredSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchYears = async () => {
    if (availableYears.length > 0 || yearsLoading) return;
    setYearsLoading(true);
    try {
      const response = await fetch('/api/sessions/years');
      const data = await response.json();
      const years = data.years || [];
      setAvailableYears(years);
      if (years.length > 0 && !years.includes(yearFilter)) {
        setYearFilter(years[0]);
      }
    } catch (error) {
      console.error('Failed to fetch available years:', error);
    } finally {
      setYearsLoading(false);
    }
  };

  const handleSelect = (session: Session) => {
    onSelect(session.session_key);
    setSelectedSessionInfo(session);
    onSessionChange?.(session);
    setIsOpen(false);
    setSearchTerm('');
  };

  const formatSessionType = (type: string, name?: string) => {
    const typeL = (type || '').toLowerCase().trim();
    const nameL = (name || '').toLowerCase().trim();
    const combined = `${typeL} ${nameL}`;
    
    if (nameL.includes('practice 1') || combined.includes('practice 1') || typeL === 'fp1') return 'FP1';
    if (nameL.includes('practice 2') || combined.includes('practice 2') || typeL === 'fp2') return 'FP2';
    if (nameL.includes('practice 3') || combined.includes('practice 3') || typeL === 'fp3') return 'FP3';
    if (combined.includes('sprint') && (combined.includes('qualifying') || combined.includes('shootout'))) return 'Sprint Q';
    if (typeL === 'sprint' || nameL === 'sprint') return 'Sprint';
    if ((typeL.includes('qualifying') || nameL.includes('qualifying')) && !combined.includes('sprint')) return 'Qualifying';
    if (typeL === 'race' || nameL === 'race') return 'Race';
    return type || name || 'Session';
  };

  const getSessionTypeColor = (type: string, name?: string) => {
    const typeL = (type || '').toLowerCase().trim();
    const nameL = (name || '').toLowerCase().trim();
    const combined = `${typeL} ${nameL}`;
    
    if (typeL === 'race' || nameL === 'race') return 'text-racing-red';
    if (combined.includes('sprint') && (combined.includes('qualifying') || combined.includes('shootout'))) return 'text-orange-400';
    if (typeL === 'sprint' || nameL === 'sprint') return 'text-orange-400';
    if ((typeL.includes('qualifying') || nameL.includes('qualifying')) && !combined.includes('sprint')) return 'text-purple-400';
    if (nameL.includes('practice 1') || combined.includes('practice 1')) return 'text-sky-400';
    if (nameL.includes('practice 2') || combined.includes('practice 2')) return 'text-sky-300';
    if (nameL.includes('practice 3') || combined.includes('practice 3')) return 'text-sky-200';
    return 'text-white/60';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const yearOptions = availableYears.length > 0 ? availableYears : [yearFilter];

  // Group sessions by circuit for better organization
  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    filteredSessions.forEach(session => {
      const key = session.circuit_short_name || session.meeting_name || 'Other';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(session);
    });
    return groups;
  }, [filteredSessions]);

  return (
    <>
      {/* Trigger Button - Minimal Apple-style */}
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          'flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all duration-300',
          'hover:border-white/30 hover:bg-white/5',
          selectedSessionInfo
            ? 'bg-white/5 border-white/20 backdrop-blur-sm'
            : 'bg-white/[0.02] border-white/10',
          'w-full max-w-[400px]'
        )}
      >
        {selectedSessionInfo ? (
          <>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className={clsx(
                'w-2 h-2 rounded-full flex-shrink-0',
                selectedSessionInfo.status === 'live' && 'bg-timing-green animate-pulse',
                selectedSessionInfo.status === 'finished' && 'bg-white/40',
                selectedSessionInfo.status === 'upcoming' && 'bg-white/20'
              )} />
              <div className="flex-1 text-left min-w-0 overflow-hidden">
                <div className="text-sm font-medium text-white truncate">
                  {selectedSessionInfo.circuit_short_name || selectedSessionInfo.meeting_name}
                </div>
                <div className="text-xs text-white/50 flex items-center gap-1.5 truncate">
                  <span className={clsx('flex-shrink-0', getSessionTypeColor(selectedSessionInfo.session_type, selectedSessionInfo.session_name))}>
                    {formatSessionType(selectedSessionInfo.session_type, selectedSessionInfo.session_name)}
                  </span>
                  <span className="text-white/30 flex-shrink-0">•</span>
                  <span className="flex-shrink-0">{selectedSessionInfo.year}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
          </>
        ) : (
          <>
            <Calendar className="w-4 h-4 text-white/60 flex-shrink-0" />
            <span className="text-sm text-white/60 flex-1 text-left whitespace-nowrap">Select Session</span>
            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
          </>
        )}
      </button>

      {/* Full-Screen Modal - Apple-like */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-8 left-8 right-8 bottom-8 z-[101] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 4rem)', height: 'calc(100vh - 4rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-1">Select Session</h2>
                  <p className="text-sm text-white/50">F1 sessions where data exists</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="px-8 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search circuit, country..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                    />
                  </div>

                  {/* Year Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowYearPicker(!showYearPicker)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{yearFilter}</span>
                      <ChevronRight className={clsx('w-4 h-4 transition-transform', showYearPicker && 'rotate-90')} />
                    </button>

                    {showYearPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
                      >
                        <div className="max-h-64 overflow-y-auto p-2">
                          {yearOptions.map((year) => (
                            <button
                              key={year}
                              onClick={() => {
                                setYearFilter(year);
                                setShowYearPicker(false);
                              }}
                              className={clsx(
                                'w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors',
                                yearFilter === year
                                  ? 'bg-white/10 text-white'
                                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                              )}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Session Type Filters */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {SESSION_TYPE_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setSessionTypeFilter(filter.value)}
                      className={clsx(
                        'px-4 py-2 rounded-full text-xs font-medium transition-all duration-300',
                        sessionTypeFilter === filter.value
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-white/5 text-white/60 hover:bg-white/8 hover:text-white/80 border border-transparent'
                      )}
                    >
                      <span className="mr-1.5">{filter.icon}</span>
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto px-8 py-6" style={{ height: 0 }}>
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="w-12 h-12 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white/60 text-sm">Loading sessions...</p>
                    </div>
                  </div>
                ) : Object.keys(groupedSessions).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(groupedSessions).map(([circuit, circuitSessions]) => (
                      <div key={circuit}>
                        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4 px-2 truncate">
                          {circuit}
                        </h3>
                        <div className="space-y-2">
                          {circuitSessions.map((session) => (
                            <motion.button
                              key={session.session_key}
                              onClick={() => handleSelect(session)}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className={clsx(
                                'w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300',
                                'hover:border-white/20 hover:bg-white/5',
                                currentSession === session.session_key
                                  ? 'bg-white/10 border-white/30'
                                  : 'bg-white/[0.02] border-white/10'
                              )}
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                                <div className={clsx(
                                  'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0',
                                  session.session_type?.toLowerCase() === 'race' && 'bg-racing-red/20 text-racing-red',
                                  session.session_type?.toLowerCase().includes('qualifying') && 'bg-purple-500/20 text-purple-400',
                                  session.session_type?.toLowerCase().includes('practice') && 'bg-sky-500/20 text-sky-400',
                                  session.session_type?.toLowerCase() === 'sprint' && 'bg-orange-500/20 text-orange-400'
                                )}>
                                  {formatSessionType(session.session_type, session.session_name).charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={clsx(
                                      'text-sm font-semibold',
                                      getSessionTypeColor(session.session_type, session.session_name)
                                    )}>
                                      {formatSessionType(session.session_type, session.session_name)}
                                    </span>
                                    <span className="text-xs text-white/40">•</span>
                                    <span className="text-xs text-white/50">{session.year}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-white/60">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{session.country_name || session.circuit_short_name || session.meeting_name}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right hidden sm:block">
                                  <div className="text-xs text-white/40 font-mono">
                                    #{session.session_key}
                                  </div>
                                  <div className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    <span className="whitespace-nowrap">{formatDate(session.date_start)}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Flag className="w-16 h-16 text-white/20 mb-4" />
                    <p className="text-white/60 text-sm mb-1">No sessions found</p>
                    <p className="text-white/40 text-xs">Try adjusting your filters</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-4 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found</span>
                  <span>Press ESC to close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ESC key handler */}
      {isOpen && (
        <div
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          tabIndex={-1}
        />
      )}
    </>
  );
}
