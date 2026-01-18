import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, MapPin, Flag, Clock, ChevronDown,
  CheckCircle, Search
} from 'lucide-react';
import clsx from 'clsx';

interface SessionSelectProps {
  onSelect: (sessionKey: number) => void;
  currentSession: number | null;
}

interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
  meeting_name: string;
}

export default function SessionSelect({ onSelect, currentSession }: SessionSelectProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (yearFilter) params.append('year', yearFilter.toString());
    if (typeFilter) params.append('session_type', typeFilter);
    params.append('limit', '50');

    fetch(`/api/sessions/?${params}`)
      .then(res => res.json())
      .then(data => setSessions(data.sessions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [yearFilter, typeFilter]);

  const filteredSessions = sessions.filter(s => 
    !searchTerm || 
    s.country_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.circuit_short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.meeting_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sessionTypes = ['Race', 'Qualifying', 'Practice 1', 'Practice 2', 'Practice 3', 'Sprint'];
  const years = [2026, 2025, 2024, 2023];

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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-racing text-2xl flex items-center gap-3">
          <Calendar className="w-8 h-8 text-racing-red" />
          SESSION SELECTION
        </h1>
        <p className="text-gray-400 mt-1">Select a session to analyze telemetry and strategy</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search circuits, countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Year Filter */}
        <div className="relative">
          <select
            value={yearFilter || ''}
            onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : null)}
            className="input-field appearance-none pr-10 min-w-[120px] cursor-pointer"
          >
            <option value="">All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field appearance-none pr-10 min-w-[150px] cursor-pointer"
          >
            <option value="">All Types</option>
            {sessionTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-carbon rounded w-3/4 mb-4" />
              <div className="h-6 bg-carbon rounded w-1/2 mb-2" />
              <div className="h-4 bg-carbon rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredSessions.map((session, i) => (
            <motion.div
              key={session.session_key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(session.session_key)}
              className={clsx(
                'card p-5 cursor-pointer transition-all hover:scale-[1.02]',
                currentSession === session.session_key
                  ? 'border-racing-red ring-2 ring-racing-red/30'
                  : 'hover:border-white/30'
              )}
            >
              {/* Session Type Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={clsx(
                  'px-2 py-1 rounded text-xs font-semibold',
                  getSessionTypeColor(session.session_type)
                )}>
                  {session.session_type}
                </span>
                {currentSession === session.session_key && (
                  <CheckCircle className="w-5 h-5 text-timing-green" />
                )}
              </div>

              {/* Circuit Name */}
              <h3 className="font-racing text-lg mb-1">
                {session.circuit_short_name || session.meeting_name}
              </h3>

              {/* Country */}
              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{session.country_name}</span>
                <Flag className="w-4 h-4 ml-2" />
                <span className="text-xs">{session.country_code}</span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatDate(session.date_start)}</span>
              </div>

              {/* Session Key */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <span className="font-mono text-xs text-gray-500">
                  Session Key: {session.session_key}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Sessions Found</h3>
          <p className="text-gray-400">
            Try adjusting your filters or search term
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {filteredSessions.length} sessions</span>
        {currentSession && (
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-timing-green" />
            Selected: Session {currentSession}
          </span>
        )}
      </div>
    </div>
  );
}
