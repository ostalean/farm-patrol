// DEV-only demo dashboard for visual testing without authentication
import Dashboard from './Dashboard';
import { DemoAuthProvider } from '@/hooks/useAuth';

export default function DemoDashboard() {
  // Only available in development mode
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Not available in production</p>
      </div>
    );
  }

  return (
    <DemoAuthProvider>
      <Dashboard />
    </DemoAuthProvider>
  );
}
