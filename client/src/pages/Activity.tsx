import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, todayISO } from '../api';
import type { Activity as ActivityDay, Session, SessionType, Settings, TrendPoint, WeightLog } from '../types';
import { PageHeader, Ring, Spinner, Empty } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { ShareStoryModal } from '../components/ShareStoryModal';
import { fmtDuration, fmtPace } from '../lib/storyCard';
import { useAuth } from '../context/AuthContext';

const SESSION_TYPES: { type: SessionType; label: string; icon: IconName }[] = [
  { type: 'walk', label: 'Walk', icon: 'activity' },
  { type: 'run', label: 'Run', icon: 'flame' },
  { type: 'ride', label: 'Ride', icon: 'target' },
  { type: 'hike', label: 'Hike', icon: 'flag' },
];

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const chartAxis = { stroke: '#64748b', fontSize: 12 };
const tooltipStyle = {
  background: '#151f38',
  border: '1px solid #243150',
  borderRadius: 10,
  color: '#e8eefc',
};

export default function Activity() {
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState<ActivityDay | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const [steps, setSteps] = useState('');
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [sharing, setSharing] = useState<Session | null>(null);

  // log-activity form
  const [sType, setSType] = useState<SessionType>('walk');
  const [sTitle, setSTitle] = useState('');
  const [sDate, setSDate] = useState(todayISO());
  const [sDist, setSDist] = useState('');
  const [sH, setSH] = useState('');
  const [sM, setSM] = useState('');
  const [sSec, setSSec] = useState('');
  const [sSaving, setSSaving] = useState(false);

  function loadDay(d: string) {
    api<ActivityDay | null>(`/activity?date=${d}`).then((row) => {
      setDay(row);
      setSteps(row?.steps ? String(row.steps) : '');
      setDistance(row?.distance_km ? String(row.distance_km) : '');
      setMinutes(row?.active_minutes ? String(row.active_minutes) : '');
    });
  }

  function loadTrends() {
    api<TrendPoint[]>(`/summary/trends?days=14&end=${todayISO()}`).then(setTrends);
  }

  useEffect(() => {
    Promise.all([
      api<ActivityDay | null>(`/activity?date=${date}`),
      api<TrendPoint[]>(`/summary/trends?days=14&end=${todayISO()}`),
      api<Settings>('/settings'),
      api<Session[]>('/sessions'),
      api<WeightLog[]>('/weight'),
    ])
      .then(([row, t, s, sess, weights]) => {
        setDay(row);
        setTrends(t);
        setSettings(s);
        setSessions(sess);
        setLatestWeight(weights.length ? weights[weights.length - 1].weight : null);
        setSteps(row?.steps ? String(row.steps) : '');
        setDistance(row?.distance_km ? String(row.distance_km) : '');
        setMinutes(row?.active_minutes ? String(row.active_minutes) : '');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadDay(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api<ActivityDay>('/activity', {
        method: 'PUT',
        body: {
          date,
          steps: Number(steps) || 0,
          distance_km: Number(distance) || 0,
          active_minutes: Number(minutes) || 0,
        },
      });
      loadDay(date);
      loadTrends();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function addSession() {
    const durationSec =
      (Number(sH) || 0) * 3600 + (Number(sM) || 0) * 60 + (Number(sSec) || 0);
    if (!Number(sDist) && !durationSec) return;
    setSSaving(true);
    try {
      const created = await api<Session>('/sessions', {
        method: 'POST',
        body: {
          type: sType,
          title: sTitle.trim() || null,
          date: sDate,
          distance_km: Number(sDist) || 0,
          duration_sec: durationSec,
        },
      });
      setSessions((prev) => [created, ...prev]);
      setSTitle('');
      setSDist('');
      setSH('');
      setSM('');
      setSSec('');
    } finally {
      setSSaving(false);
    }
  }

  async function removeSession(id: number) {
    await api(`/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) return <Spinner />;

  const chartData = trends.map((t) => ({ ...t, label: fmtDay(t.date) }));
  const current = {
    steps: day?.steps ?? 0,
    distance: day?.distance_km ?? 0,
    minutes: day?.active_minutes ?? 0,
  };
  const stepGoal = settings?.step_target || 10000;

  return (
    <>
      <PageHeader title="Activity" subtitle="Record your daily movement — steps, distance, and active time." />

      <div className="date-bar">
        <input
          type="date"
          className="input"
          style={{ maxWidth: 190 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-title">Steps</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, flexWrap: 'wrap' }}>
            <Ring
              value={current.steps / stepGoal}
              size={148}
              stroke={13}
              valueSize={current.steps >= 100000 ? 24 : 28}
              label={current.steps.toLocaleString()}
              sub="STEPS"
            />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                {current.steps.toLocaleString()}
                <span style={{ color: 'var(--text-faint)', fontSize: 14, fontWeight: 500 }}>
                  {' '}
                  / {stepGoal.toLocaleString()}
                </span>
              </div>
              <div className="hint" style={{ marginTop: 2 }}>daily step goal</div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--blue)' }}>
                <Icon name="flag" size={16} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
                  {current.distance.toFixed(1)} km
                </span>
                <span className="hint">covered</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Active minutes</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, flexWrap: 'wrap' }}>
            <Ring
              value={current.minutes / 60}
              size={148}
              stroke={13}
              color="var(--violet)"
              valueSize={30}
              label={String(current.minutes)}
              sub="MIN"
            />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                {current.minutes}
                <span style={{ color: 'var(--text-faint)', fontSize: 14, fontWeight: 500 }}> / 60</span>
              </div>
              <div className="hint" style={{ marginTop: 2 }}>active-minutes goal</div>
              <div style={{ marginTop: 14 }}>
                <span
                  className="badge"
                  style={{ background: 'color-mix(in srgb, var(--violet) 15%, transparent)', color: 'var(--violet)', textTransform: 'none' }}
                >
                  {Math.round((current.minutes / 60) * 100)}% of goal
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card">
          <div className="card-title">Log activity for this day</div>
          <div className="form-row">
            <div className="field">
              <label>Steps</label>
              <input type="number" min={0} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Distance (km)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="0.0"
              />
            </div>
            <div className="field">
              <label>Active minutes</label>
              <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save activity'}
          </button>
          <p className="hint" style={{ marginTop: 10 }}>
            Saving overwrites the totals for the selected day.
          </p>
        </div>

        <div className="card">
          <div className="card-title">Steps · last 14 days</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} margin={{ left: -18, right: 6, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
              <XAxis dataKey="label" {...chartAxis} tickLine={false} axisLine={false} />
              <YAxis {...chartAxis} tickLine={false} axisLine={false} width={44} />
              <Tooltip cursor={{ fill: 'rgba(56,189,248,0.08)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="steps" fill="#38bdf8" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">Active minutes · last 14 days</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ left: -18, right: 6, top: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
            <XAxis dataKey="label" {...chartAxis} tickLine={false} axisLine={false} />
            <YAxis {...chartAxis} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="active_minutes"
              name="active minutes"
              stroke="#a3e635"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#a3e635' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Strava-style activities with shareable story cards */}
      <div className="card section-gap">
        <div className="card-title">
          Activities
          <span className="hint">log a walk, run or ride — then share it as a story</span>
        </div>

        <div className="pill-tabs">
          {SESSION_TYPES.map((t) => (
            <button
              key={t.type}
              className={`pill${sType === t.type ? ' active' : ''}`}
              onClick={() => setSType(t.type)}
            >
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Title (optional)</label>
            <input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="Evening walk" />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Distance (km)</label>
            <input type="number" min={0} step="0.01" value={sDist} onChange={(e) => setSDist(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label>Hours</label>
            <input type="number" min={0} value={sH} onChange={(e) => setSH(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Minutes</label>
            <input type="number" min={0} value={sM} onChange={(e) => setSM(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Seconds</label>
            <input type="number" min={0} value={sSec} onChange={(e) => setSSec(e.target.value)} placeholder="0" />
          </div>
        </div>
        <button className="btn" onClick={addSession} disabled={sSaving}>
          {sSaving ? 'Saving…' : 'Log activity'}
        </button>

        <div className="section-gap">
          {sessions.length === 0 ? (
            <Empty icon={<Icon name="activity" />}>No activities yet — log your first walk above!</Empty>
          ) : (
            sessions.map((s) => {
              const pace = s.distance_km > 0 ? s.duration_sec / s.distance_km : 0;
              const typeDef = SESSION_TYPES.find((t) => t.type === s.type);
              return (
                <div className="row-item" key={s.id}>
                  <div className="row-main" style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <span
                      className="stat-icon"
                      style={{ width: 40, height: 40, marginBottom: 0, flexShrink: 0 }}
                    >
                      <Icon name={typeDef?.icon ?? 'activity'} size={20} />
                    </span>
                    <div>
                      <div className="row-title">
                        {s.title || typeDef?.label} <span className="badge">{s.type}</span>
                      </div>
                      <div className="row-sub">
                        {new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        · {s.distance_km.toFixed(2)} km · {fmtDuration(s.duration_sec)}
                        {pace > 0 && <> · {fmtPace(pace)} /km</>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button className="btn-ghost btn-sm" onClick={() => setSharing(s)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="share" size={14} /> Share
                      </span>
                    </button>
                    <button className="btn-icon" onClick={() => removeSession(s.id)} title="Delete">
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {sharing && (
        <ShareStoryModal
          session={sharing}
          sessions={sessions}
          weightKg={latestWeight ?? 70}
          userName={user?.name}
          onClose={() => setSharing(null)}
        />
      )}
    </>
  );
}
