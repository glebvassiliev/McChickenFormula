import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TelemetryView from './pages/TelemetryView';
import StrategyAnalysis from './pages/StrategyAnalysis';
import Chatbot from './pages/Chatbot';
import SessionSelect from './pages/SessionSelect';
import ModelStatus from './pages/ModelStatus';

function App() {
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch latest session on mount
    fetch('/api/sessions/latest')
      .then(res => res.json())
      .then(data => {
        if (data.session_key) {
          setSessionKey(data.session_key);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (sessionKey) {
      fetch(`/api/sessions/${sessionKey}/drivers`)
        .then(res => res.json())
        .then(data => setDrivers(data.drivers || []))
        .catch(console.error);
    }
  }, [sessionKey]);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <Layout 
              sessionKey={sessionKey} 
              onSessionChange={setSessionKey}
              drivers={drivers}
            />
          }
        >
          <Route index element={<Dashboard sessionKey={sessionKey} drivers={drivers} />} />
          <Route path="telemetry" element={<TelemetryView sessionKey={sessionKey} drivers={drivers} />} />
          <Route path="strategy" element={<StrategyAnalysis sessionKey={sessionKey} />} />
          <Route path="chatbot" element={<Chatbot sessionKey={sessionKey} />} />
          <Route path="sessions" element={<SessionSelect onSelect={setSessionKey} currentSession={sessionKey} />} />
          <Route path="models" element={<ModelStatus />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
