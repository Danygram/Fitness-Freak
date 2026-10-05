import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, type IconName } from './icons';
import { runReminderTick } from '../lib/reminders';
import { todayISO } from '../api';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/nutrition', label: 'Nutrition', icon: 'nutrition' },
  { to: '/weight', label: 'Weight', icon: 'weight' },
  { to: '/insights', label: 'Insights', icon: 'chart' },
  { to: '/workouts', label: 'Workouts', icon: 'dumbbell' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
  { to: '/devices', label: 'Devices', icon: 'watch' },
  { to: '/goals', label: 'Goals', icon: 'target' },
];

function Brand() {
  return (
    <div className="brand">
      <span className="logo">
        <Icon name="dumbbell" />
      </span>
      <span className="brand-text">Fitness Freak</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();

  // Fire due reminders while the app is open (checked every minute).
  useEffect(() => {
    runReminderTick(todayISO());
    const id = setInterval(() => runReminderTick(todayISO()), 60000);
    return () => clearInterval(id);
  }, []);

  // Cursor-follow spotlight: update CSS vars on the hovered .card / .stat.
  useEffect(() => {
    let current: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const card = (e.target as HTMLElement)?.closest?.('.card, .stat') as HTMLElement | null;
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
        card.style.setProperty('--spot', '1');
        if (current && current !== card) current.style.setProperty('--spot', '0');
        current = card;
      } else if (current) {
        current.style.setProperty('--spot', '0');
        current = null;
      }
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="nav-section-label">Menu</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">
                <Icon name={item.icon} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ marginBottom: 8 }}
          >
            <span className="nav-icon">
              <Icon name="settings" />
            </span>
            Settings
          </NavLink>
          <NavLink to="/account" className="user-chip" title="Account">
            <div className="avatar">{initials}</div>
            <div className="meta">
              <div className="name">{user?.name}</div>
              <div className="email">{user?.email}</div>
            </div>
          </NavLink>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-topbar">
          <Brand />
          <div style={{ display: 'flex', gap: 2 }}>
            <NavLink to="/settings" className="btn-icon" title="Settings" style={{ color: 'var(--text-dim)' }}>
              <Icon name="settings" />
            </NavLink>
            <button
              className="btn-icon"
              onClick={logout}
              title="Log out"
              style={{ color: 'var(--text-dim)' }}
            >
              <Icon name="power" />
            </button>
          </div>
        </div>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
