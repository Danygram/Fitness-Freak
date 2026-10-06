import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';

// Code-split every page so the first load only ships the shell + the page
// you actually open. Heavy deps (Recharts, motion) now load on demand.
const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Weight = lazy(() => import('./pages/Weight'));
const Insights = lazy(() => import('./pages/Insights'));
const Workouts = lazy(() => import('./pages/Workouts'));
const Activity = lazy(() => import('./pages/Activity'));
const Devices = lazy(() => import('./pages/Devices'));
const Goals = lazy(() => import('./pages/Goals'));
const Settings = lazy(() => import('./pages/Settings'));
const Account = lazy(() => import('./pages/Account'));

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!user.onboarded) {
    return (
      <Suspense fallback={<Spinner />}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<Spinner />}>
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
    </Suspense>
  );
}
