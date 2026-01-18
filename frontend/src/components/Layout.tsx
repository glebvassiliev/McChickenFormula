import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Activity, 
  Brain, 
  MessageSquare, 
  Calendar,
  Cpu,
  Flag,
  Radio
} from 'lucide-react';
import clsx from 'clsx';
import SessionSelector from './SessionSelector';

interface LayoutProps {
  sessionKey: number | null;
  onSessionChange: (key: number) => void;
  drivers: any[];
}

export default function Layout({ sessionKey, onSessionChange, drivers }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/telemetry', icon: Activity, label: 'Telemetry' },
    { path: '/strategy', icon: Brain, label: 'Strategy' },
    { path: '/chatbot', icon: MessageSquare, label: 'AI Strategist' },
    { path: '/sessions', icon: Calendar, label: 'Sessions' },
    { path: '/models', icon: Cpu, label: 'ML Models' },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Top Header Bar - Apple-like minimal */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flag className="w-8 h-8 text-racing-red" />
              <div>
                <h1 className="font-racing text-xl font-bold tracking-wider text-white">
                  F1 STRATEGY
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
                  ML Platform
                </p>
              </div>
            </div>
          </div>

          {/* Session Selector & Info */}
          <div className="flex items-center gap-4 flex-1 justify-end min-w-0">
            <div className="min-w-0 flex-1 max-w-[400px]">
              <SessionSelector 
                currentSession={sessionKey}
                onSelect={onSessionChange}
              />
            </div>
            
            {sessionKey && drivers.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-carbon/30 rounded-lg border border-white/10 flex-shrink-0">
                <div className="w-2 h-2 bg-timing-green rounded-full live-pulse" />
                <span className="text-xs text-gray-400">{drivers.length} drivers</span>
              </div>
            )}
            
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 px-6 pb-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-racing-red/20 border border-racing-red/50 rounded-lg"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon className={clsx('w-4 h-4 relative z-10', isActive && 'text-racing-red')} />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-8 px-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Racing stripe accent */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-racing-red via-tire-medium to-racing-red opacity-60" />
    </div>
  );
}
