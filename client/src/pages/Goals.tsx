import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Goal, GoalType } from '../types';
import { Empty, PageHeader, Spinner } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { celebrate } from '../lib/celebrate';

const GOAL_PRESETS: { type: GoalType; label: string; unit: string; icon: IconName }[] = [
  { type: 'weight', label: 'Body weight', unit: 'kg', icon: 'weight' },
  { type: 'steps', label: 'Daily steps', unit: 'steps', icon: 'activity' },
  { type: 'calories', label: 'Daily calories', unit: 'kcal', icon: 'flame' },
  { type: 'workouts', label: 'Workouts / week', unit: 'sessions', icon: 'dumbbell' },
  { type: 'custom', label: 'Custom goal', unit: '', icon: 'target' },
];

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<GoalType>('weight');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [unit, setUnit] = useState('kg');
  const [saving, setSaving] = useState(false);

  function load() {
    api<Goal[]>('/goals')
      .then(setGoals)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function pickType(t: GoalType) {
    setType(t);
    const preset = GOAL_PRESETS.find((p) => p.type === t);
    if (preset) {
      setUnit(preset.unit);
      if (!title) setTitle(preset.type === 'custom' ? '' : preset.label);
    }
  }

  async function add() {
    if (!title.trim() || !target) return;
    setSaving(true);
    try {
      await api<Goal>('/goals', {
        method: 'POST',
        body: {
          type,
          title: title.trim(),
          target: Number(target),
          current: Number(current) || 0,
          unit,
        },
      });
      setTitle('');
      setTarget('');
      setCurrent('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function updateCurrent(g: Goal, value: number) {
    const wasReached = g.target > 0 && g.current >= g.target;
    const updated = await api<Goal>(`/goals/${g.id}`, {
      method: 'PUT',
      body: { current: value },
    });
    setGoals((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
    // Celebrate the moment a goal is newly reached.
    if (!wasReached && updated.target > 0 && updated.current >= updated.target) {
      celebrate();
    }
  }

  async function remove(id: number) {
    await api(`/goals/${id}`, { method: 'DELETE' });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Goals & progress" subtitle="Set targets and track how close you are." />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">New goal</div>
        <div className="pill-tabs">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p.type}
              className={`pill${type === p.type ? ' active' : ''}`}
              onClick={() => pickType(p.type)}
            >
              <Icon name={p.icon} size={15} /> {p.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reach 75 kg, Walk 10k daily…"
          />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Current</label>
            <input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Target</label>
            <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Unit</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, steps…" />
          </div>
        </div>
        <button className="btn" onClick={add} disabled={saving || !title.trim() || !target}>
          {saving ? 'Saving…' : 'Add goal'}
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <Empty icon={<Icon name="target" />}>No goals yet. Create one above to start tracking progress.</Empty>
        </div>
      ) : (
        <div className="grid cols-2">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
            const done = pct >= 100;
            return (
              <div className="card" key={g.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 15.5 }}>{g.title}</span>
                  <button className="btn-icon" onClick={() => remove(g.id)} title="Delete">
                    <Icon name="trash" />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>
                    {g.current}
                  </span>
                  <span className="hint">
                    / {g.target} {g.unit}
                  </span>
                  {done && (
                    <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      Reached 🎉
                    </span>
                  )}
                </div>
                <div className="progress-track" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                  <input
                    type="number"
                    className="input"
                    defaultValue={g.current}
                    style={{ maxWidth: 120 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateCurrent(g, Number((e.target as HTMLInputElement).value));
                    }}
                    id={`goal-${g.id}`}
                  />
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      const el = document.getElementById(`goal-${g.id}`) as HTMLInputElement;
                      updateCurrent(g, Number(el.value));
                    }}
                  >
                    Update progress
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
