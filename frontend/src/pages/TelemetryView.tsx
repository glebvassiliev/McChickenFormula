import TelemetryAnalyzer from '../components/TelemetryAnalyzer';

interface TelemetryViewProps {
  sessionKey: number | null;
  drivers: any[];
}

export default function TelemetryView({ sessionKey, drivers }: TelemetryViewProps) {
  return <TelemetryAnalyzer sessionKey={sessionKey} drivers={drivers} />;
}
