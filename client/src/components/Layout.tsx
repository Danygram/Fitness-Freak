import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, type IconName } from './icons';
import { runReminderTick } from '../lib/reminders';
import { todayISO } from '../api';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

// Full menu — shown in the desktop sidebar.
const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/nutrition', label: 'Nutrition', icon: 'nutrition' },
  { to: '/weight', label: 'Weight', icon: 'weight' },
  { to: '/insights', label: 'Insights', icon: 'chart' },
  { to: '/workouts', label: 'Workouts', icon: 'dumbbell' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
  { to: '/devices', label: 'Devices', icon: 'watch' },
  { to: '/goals', label: 'Goals', icon: 'target' },
];

// Mobile bottom bar — just the core four; everything else lives under "More".
const PRIMARY: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/nutrition', label: 'Nutrition', icon: 'nutrition' },
  { to: '/weight', label: 'Weight', icon: 'weight' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
];

const MORE: NavItem[] = [
  { to: '/insights', label: 'Insights', icon: 'chart' },
  { to: '/workouts', label: 'Workouts', icon: 'dumbbell' },
  { to: '/devices', label: 'Devices', icon: 'watch' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/account', label: 'Account', icon: 'user' },
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
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the "More" sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

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

  // Highlight the "More" tab when the active route lives inside the sheet.
  const moreActive = MORE.some(
    (m) => location.pathname === m.to || location.pathname.startsWith(m.to + '/')
  );

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

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div
            className="more-sheet"
            role="dialog"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="more-sheet-handle" />
            <div className="more-sheet-head">
              <NavLink to="/account" className="more-user">
                <div className="avatar">{initials}</div>
                <div className="meta">
                  <div className="name">{user?.name}</div>
                  <div className="email">{user?.email}</div>
                </div>
              </NavLink>
              <button className="btn-icon" onClick={() => setMoreOpen(false)} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="more-grid">
              {MORE.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `more-tile${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon">
                    <Icon name={item.icon} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button className="more-logout" onClick={logout}>
              <Icon name="power" size={16} /> Log out
            </button>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {PRIMARY.map((item) => (
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
        <button
          type="button"
          className={`nav-link more-btn${moreActive || moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          <span className="nav-icon">
            <Icon name="more" />
          </span>
          More
        </button>
      </nav>
    </div>
  );
}
