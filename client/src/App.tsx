import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import Nutrition from './pages/Nutrition';
import Activity from './pages/Activity';
import Goals from './pages/Goals';
import Weight from './pages/Weight';
import Settings from './pages/Settings';
import Account from './pages/Account';
import Insights from './pages/Insights';
import Devices from './pages/Devices';
import Onboarding from './pages/Onboarding';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!user.onboarded) {
    return <Onboarding />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/weight" element={<Weight />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
