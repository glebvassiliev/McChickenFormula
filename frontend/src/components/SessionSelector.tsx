import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Calendar, MapPin, Flag, CheckCircle, 
  Search, Loader2, X
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
}

interface SessionSelectorProps {
  currentSession: number | null;
  onSelect: (sessionKey: number) => void;
  onSessionChange?: (sessionInfo: Session | null) => void;
}

export default function SessionSelector({ currentSession, onSelect, onSessionChange }: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionInfo, setSelectedSessionInfo] = useState<Session | null>(null);
  const [yearFilter, setYearFilter] = useState<number>(2024);

  useEffect(() => {
    fetchSessions();
  }, [yearFilter]);

  useEffect(() => {
    if (currentSession && sessions.length > 0) {
      const session = sessions.find(s => s.session_key === currentSession);
      if (session) {
        setSelectedSessionInfo(session);
        onSessionChange?.(session);
      }
    }
  }, [currentSession, sessions, onSessionChange]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = sessions.filter(s =>
        s.country_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.circuit_short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.meeting_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.session_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSessions(filtered);
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchTerm, sessions]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/?year=${yearFilter}&limit=50`);
      const data = await response.json();
      setSessions(data.sessions || []);
      setFilteredSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (session: Session) => {
    onSelect(session.session_key);
    setSelectedSessionInfo(session);
    onSessionChange?.(session);
    setIsOpen(false);
    setSearchTerm('');
  };

  const formatSessionType = (type: string) => {
    if (!type) return type;
    const lower = type.toLowerCase();
    if (lower.includes('practice 1') || lower === 'practice1' || lower === 'fp1') return 'FP1';
    if (lower.includes('practice 2') || lower === 'practice2' || lower === 'fp2') return 'FP2';
    if (lower.includes('practice 3') || lower === 'practice3' || lower === 'fp3') return 'FP3';
    if (lower.includes('qualifying') || lower === 'q') return 'Qualifying';
    if (lower === 'race') return 'Race';
    if (lower === 'sprint') return 'Sprint';
    return type;
  };

  const getSessionTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'race': return 'bg-racing-red';
      case 'qualifying': return 'bg-timing-purple';
      case 'sprint': return 'bg-mclaren';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-200',
          'hover:border-racing-red/50 hover:bg-carbon/50',
          selectedSessionInfo
            ? 'bg-carbon/30 border-racing-red/30'
            : 'bg-carbon/50 border-white/10',
          'min-w-[300px]'
        )}
      >
        {selectedSessionInfo ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <div className={clsx('w-3 h-3 rounded-full', getSessionTypeColor(selectedSessionInfo.session_type))} />
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white truncate">
                  {selectedSessionInfo.circuit_short_name || selectedSessionInfo.meeting_name}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>{formatSessionType(selectedSessionInfo.session_type)}</span>
                  <span>•</span>
                  <span>{selectedSessionInfo.country_name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">{selectedSessionInfo.session_key}</span>
              <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-400 flex-1 text-left">Select Session</span>
            <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
          </>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-[600px] max-h-[70vh] z-50"
              style={{ maxWidth: 'calc(100vw - 2rem)' }}
            >
              <div className="card p-4 bg-pit-wall border border-white/20 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-racing text-sm flex items-center gap-2">
                    <Flag className="w-4 h-4 text-racing-red" />
                    SELECT TRACK / SESSION
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-carbon rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search circuits, countries, session types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-11 pr-4 text-sm h-11"
                    />
                  </div>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(Number(e.target.value))}
                    className="input-field text-sm min-w-[100px] h-11"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                  </select>
                </div>

                {/* Session List */}
                <div className="overflow-y-auto space-y-2" style={{ maxHeight: 'calc(70vh - 180px)' }}>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-racing-red animate-spin" />
                      <span className="ml-2 text-sm text-gray-400">Loading sessions...</span>
                    </div>
                  ) : filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <button
                        key={session.session_key}
                        onClick={() => handleSelect(session)}
                        className={clsx(
                          'w-full p-3 rounded-lg border transition-all text-left',
                          'hover:border-racing-red/50 hover:bg-racing-red/10',
                          currentSession === session.session_key
                            ? 'bg-racing-red/20 border-racing-red/50'
                            : 'bg-carbon/30 border-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className={clsx(
                              'px-2 py-0.5 rounded text-xs font-semibold mt-0.5 whitespace-nowrap',
                              getSessionTypeColor(session.session_type)
                            )}>
                              {formatSessionType(session.session_type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-white mb-1">
                                {session.circuit_short_name || session.meeting_name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span>{session.country_name}</span>
                                <span>•</span>
                                <span>{formatDate(session.date_start)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentSession === session.session_key && (
                              <CheckCircle className="w-5 h-5 text-timing-green flex-shrink-0" />
                            )}
                            <span className="font-mono text-xs text-gray-500">
                              #{session.session_key}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No sessions found. Try adjusting your filters.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
