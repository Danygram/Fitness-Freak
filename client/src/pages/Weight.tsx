import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, todayISO } from '../api';
import type { Settings, WeightLog } from '../types';
import { Empty, Modal, PageHeader, Spinner } from '../components/ui';
import { Icon } from '../components/icons';

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function Weight() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<WeightLog | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  function loadLogs() {
    return api<WeightLog[]>('/weight').then(setLogs);
  }

  function openEdit(l: WeightLog) {
    setEditing(l);
    setEditWeight(String(l.weight));
  }

  async function saveEdit() {
    if (!editing || editWeight === '') return;
    setEditSaving(true);
    try {
      await api<WeightLog>('/weight', {
        method: 'PUT',
        body: { date: editing.date, weight: Number(editWeight) },
      });
      setEditing(null);
      await loadLogs();
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    Promise.all([api<WeightLog[]>('/weight'), api<Settings>('/settings')])
      .then(([l, s]) => {
        setLogs(l);
        setSettings(s);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (weight === '') return;
    setSaving(true);
    try {
      await api<WeightLog>('/weight', {
        method: 'PUT',
        body: { date, weight: Number(weight) },
      });
      setWeight('');
      await loadLogs();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    await api(`/weight/${id}`, { method: 'DELETE' });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  if (loading) return <Spinner />;

  const goal = settings?.goal_weight ?? null;
  const start = settings?.start_weight ?? (logs.length ? logs[0].weight : null);
  const latest = logs.length ? logs[logs.length - 1].weight : null;

  // Progress + projection.
  const lost = start != null && latest != null ? start - latest : null;
  const toGo = goal != null && latest != null ? latest - goal : null;
  const totalToLose = start != null && goal != null ? start - goal : null;
  const pct =
    totalToLose != null && totalToLose !== 0 && lost != null
      ? Math.max(0, Math.min(100, (lost / totalToLose) * 100))
      : null;

  // Rate (kg/week) from first→last weigh-in.
  let ratePerWeek: number | null = null;
  let projection: string | null = null;
  if (logs.length >= 2) {
    const first = logs[0];
    const last = logs[logs.length - 1];
    const days =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
    if (days > 0) {
      const perDay = (last.weight - first.weight) / days; // negative = losing
      ratePerWeek = perDay * 7;
      if (goal != null && latest != null) {
        const remaining = latest - goal; // positive if above goal
        // projecting only makes sense if moving toward the goal
        if ((remaining > 0 && perDay < 0) || (remaining < 0 && perDay > 0)) {
          const daysLeft = Math.abs(remaining / perDay);
          if (daysLeft < 3650) {
            const eta = new Date();
            eta.setDate(eta.getDate() + Math.round(daysLeft));
            projection = eta.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
          }
        }
      }
    }
  }

  const chartData = logs.map((l) => ({ ...l, label: fmtDay(l.date) }));
  const weights = logs.map((l) => l.weight);
  const domainLo = Math.floor(Math.min(...weights, goal ?? Infinity) - 1);
  const domainHi = Math.ceil(Math.max(...weights, start ?? -Infinity) + 1);

  return (
    <>
      <PageHeader title="Weight" subtitle="Log your weigh-ins and track progress toward your goal." />

      {goal == null && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)' }}>
          <div className="hint">
            🎯 Set your starting and goal weight in{' '}
            <Link to="/settings" className="inline-link">
              Settings
            </Link>{' '}
            to unlock progress tracking and a projected goal date.
          </div>
        </div>
      )}

      <div className="grid stat-grid">
        <div className="stat">
          <div className="stat-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Icon name="weight" />
          </div>
          <div className="stat-value">{latest != null ? `${latest} kg` : '—'}</div>
          <div className="stat-label">Current weight</div>
          {goal != null && <div className="stat-sub">Goal {goal} kg</div>}
          {pct != null && (
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="stat">
          <div
            className="stat-icon"
            style={{ background: 'color-mix(in srgb, var(--good) 14%, transparent)', color: 'var(--good)' }}
          >
            <Icon name="trendUp" style={{ transform: 'scaleY(-1)' }} />
          </div>
          <div className="stat-value">
            {lost != null ? `${lost > 0 ? '' : '+'}${(-lost).toFixed(1)}` : '—'}
          </div>
          <div className="stat-label">kg change so far</div>
          {start != null && <div className="stat-sub">Started at {start} kg</div>}
        </div>
        <div className="stat">
          <div
            className="stat-icon"
            style={{ background: 'color-mix(in srgb, var(--blue) 14%, transparent)', color: 'var(--blue)' }}
          >
            <Icon name="flag" />
          </div>
          <div className="stat-value">{toGo != null ? `${toGo.toFixed(1)} kg` : '—'}</div>
          <div className="stat-label">To go</div>
          {ratePerWeek != null && (
            <div className="stat-sub">
              {ratePerWeek <= 0 ? '' : '+'}
              {ratePerWeek.toFixed(2)} kg / week
            </div>
          )}
        </div>
        <div className="stat">
          <div
            className="stat-icon"
            style={{ background: 'color-mix(in srgb, var(--violet) 14%, transparent)', color: 'var(--violet)' }}
          >
            <Icon name="calendar" />
          </div>
          <div className="stat-value" style={{ fontSize: projection ? 19 : 30 }}>
            {projection || '—'}
          </div>
          <div className="stat-label">Projected goal date</div>
          <div className="stat-sub">at your current pace</div>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card">
          <div className="card-title">Log a weigh-in</div>
          <div className="form-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Weight (kg)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 103.5"
              />
            </div>
          </div>
          <button className="btn" onClick={save} disabled={saving || weight === ''}>
            {saving ? 'Saving…' : 'Save weigh-in'}
          </button>
          <p className="hint" style={{ marginTop: 10 }}>
            One entry per day — saving again overwrites that day.
          </p>
        </div>

        <div className="card">
          <div className="card-title">Trend</div>
          {logs.length === 0 ? (
            <Empty icon={<Icon name="weight" />}>No weigh-ins yet. Log your first one!</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData} margin={{ left: -14, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  domain={[domainLo, domainHi]}
                />
                <Tooltip
                  contentStyle={{
                    background: '#151f38',
                    border: '1px solid #243150',
                    borderRadius: 10,
                    color: '#e8eefc',
                  }}
                  formatter={(v: number) => [`${v} kg`, 'weight']}
                />
                {goal != null && (
                  <ReferenceLine
                    y={goal}
                    stroke="#a3e635"
                    strokeDasharray="5 4"
                    label={{ value: `Goal ${goal}`, fill: '#a3e635', fontSize: 11, position: 'insideTopRight' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="url(#wGrad)"
                  dot={{ r: 3, fill: '#38bdf8' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card section-gap">
          <div className="card-title">History</div>
          {[...logs].reverse().map((l, i, arr) => {
            const prev = arr[i + 1];
            const diff = prev ? l.weight - prev.weight : null;
            return (
              <div className="row-item" key={l.id}>
                <div className="row-main">
                  <div className="row-title">{l.weight} kg</div>
                  <div className="row-sub">
                    {new Date(l.date + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {diff != null && (
                      <span style={{ color: diff <= 0 ? 'var(--accent-2)' : 'var(--danger)' }}>
                        {' '}
                        · {diff > 0 ? '+' : ''}
                        {diff.toFixed(1)} kg
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(l)} title="Edit">
                    <Icon name="edit" />
                  </button>
                  <button className="btn-icon" onClick={() => remove(l.id)} title="Delete">
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={`Edit weigh-in · ${new Date(editing.date + 'T00:00:00').toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}`}
          onClose={() => setEditing(null)}
        >
          <div className="field">
            <label>Weight (kg)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn" onClick={saveEdit} disabled={editSaving || editWeight === ''}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
