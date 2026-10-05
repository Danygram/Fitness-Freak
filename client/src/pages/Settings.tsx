import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Settings as SettingsType } from '../types';
import { PageHeader, Spinner, Switch } from '../components/ui';
import { Icon } from '../components/icons';
import {
  loadPrefs,
  savePrefs,
  notificationStatus,
  requestNotifications,
  type ReminderPrefs,
} from '../lib/reminders';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const [s, setS] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // reminders (device-local)
  const [prefs, setPrefs] = useState<ReminderPrefs>(loadPrefs());
  const [notifStatus, setNotifStatus] = useState(notificationStatus());

  function updatePrefs(next: ReminderPrefs) {
    setPrefs(next);
    savePrefs(next);
  }

  async function enableNotifs() {
    const result = await requestNotifications();
    setNotifStatus(result);
  }

  // local editable copies
  const [calorie, setCalorie] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [water, setWater] = useState('');
  const [steps, setSteps] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');

  useEffect(() => {
    api<SettingsType>('/settings')
      .then((data) => {
        setS(data);
        setCalorie(String(data.calorie_target));
        setProtein(String(data.protein_target));
        setCarbs(String(data.carbs_target));
        setFat(String(data.fat_target));
        setWater(String(data.water_target_ml));
        setSteps(String(data.step_target));
        setStartWeight(data.start_weight != null ? String(data.start_weight) : '');
        setGoalWeight(data.goal_weight != null ? String(data.goal_weight) : '');
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api<SettingsType>('/settings', {
        method: 'PUT',
        body: {
          calorie_target: Number(calorie) || 0,
          protein_target: Number(protein) || 0,
          carbs_target: Number(carbs) || 0,
          fat_target: Number(fat) || 0,
          water_target_ml: Number(water) || 0,
          step_target: Number(steps) || 0,
          start_weight: startWeight === '' ? null : Number(startWeight),
          goal_weight: goalWeight === '' ? null : Number(goalWeight),
        },
      });
      setS(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !s) return <Spinner />;

  // Quick helper: calories from macros, to sanity-check the split.
  const macroCals = Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9;

  return (
    <>
      <PageHeader title="Settings" subtitle="Set your daily nutrition targets and weight goal." />

      <div className="grid cols-2">
        <div className="card">
          <div className="card-title">Daily nutrition targets</div>
          <div className="field">
            <label>Calorie target (kcal)</label>
            <input type="number" min={0} value={calorie} onChange={(e) => setCalorie(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Protein (g)</label>
              <input type="number" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div className="field">
              <label>Carbs (g)</label>
              <input type="number" min={0} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div className="field">
              <label>Fat (g)</label>
              <input type="number" min={0} value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>
          <p className="hint">
            Your macros add up to ≈ {Math.round(macroCals)} kcal
            {Math.abs(macroCals - Number(calorie)) > 100 && Number(calorie) > 0 && (
              <span style={{ color: 'var(--warn)' }}>
                {' '}
                — {macroCals > Number(calorie) ? 'above' : 'below'} your calorie target
              </span>
            )}
            .
          </p>
          <div className="form-row section-gap">
            <div className="field">
              <label>Water target (ml)</label>
              <input type="number" min={0} step={100} value={water} onChange={(e) => setWater(e.target.value)} />
            </div>
            <div className="field">
              <label>Daily step goal</label>
              <input type="number" min={0} step={500} value={steps} onChange={(e) => setSteps(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Weight goal</div>
          <div className="form-row">
            <div className="field">
              <label>Starting weight (kg)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={startWeight}
                onChange={(e) => setStartWeight(e.target.value)}
                placeholder="104"
              />
            </div>
            <div className="field">
              <label>Goal weight (kg)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                placeholder="88"
              />
            </div>
          </div>
          {startWeight !== '' && goalWeight !== '' && (
            <p className="hint">
              Target: {Number(startWeight) > Number(goalWeight) ? 'lose' : 'gain'}{' '}
              <strong style={{ color: 'var(--text)' }}>
                {Math.abs(Number(startWeight) - Number(goalWeight)).toFixed(1)} kg
              </strong>
              . Log your weigh-ins on the Weight tab to track progress.
            </p>
          )}
        </div>
      </div>

      <div className="section-gap">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </div>

      {/* Reminders (device-local, saved instantly) */}
      <div className="card section-gap" style={{ marginTop: 24 }}>
        <div className="card-title">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
              <Icon name="bell" size={14} />
            </span>
            Reminders
          </span>
        </div>

        <div
          className="nudge"
          style={{ marginBottom: 18, background: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <span className="nudge-ic" style={{ color: 'var(--text-dim)' }}>
            <Icon name="bell" size={18} />
          </span>
          <span className="nudge-text" style={{ color: 'var(--text-dim)' }}>
            {notifStatus === 'granted'
              ? 'Notifications are on. Reminders fire while Fitness Freak is open in a tab.'
              : notifStatus === 'denied'
              ? 'Notifications are blocked in your browser — enable them in site settings to get pop-ups.'
              : notifStatus === 'unsupported'
              ? "This browser can't show notifications, but you'll still see nudges on your dashboard."
              : 'Turn on browser notifications to get reminder pop-ups.'}
          </span>
          {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
            <button className="btn btn-sm nudge-cta" onClick={enableNotifs}>
              Enable
            </button>
          )}
        </div>

        {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
          <div className="reminder-row" key={m}>
            <div>
              <div className="r-label" style={{ textTransform: 'capitalize' }}>
                {m} reminder
              </div>
              <div className="r-sub">Nudge me to log {m}</div>
            </div>
            <div className="r-controls">
              {prefs.meals[m] !== null && (
                <input
                  type="time"
                  className="input"
                  value={prefs.meals[m] as string}
                  onChange={(e) =>
                    updatePrefs({ ...prefs, meals: { ...prefs.meals, [m]: e.target.value } })
                  }
                />
              )}
              <Switch
                checked={prefs.meals[m] !== null}
                onChange={(v) =>
                  updatePrefs({
                    ...prefs,
                    meals: {
                      ...prefs.meals,
                      [m]: v ? (m === 'breakfast' ? '08:00' : m === 'lunch' ? '13:00' : '20:00') : null,
                    },
                  })
                }
              />
            </div>
          </div>
        ))}

        <div className="reminder-row">
          <div>
            <div className="r-label">Water reminder</div>
            <div className="r-sub">Remind me to drink water regularly</div>
          </div>
          <div className="r-controls">
            {prefs.water.enabled && (
              <select
                className="input"
                style={{ width: 140 }}
                value={prefs.water.everyMin}
                onChange={(e) =>
                  updatePrefs({ ...prefs, water: { ...prefs.water, everyMin: Number(e.target.value) } })
                }
              >
                <option value={60}>every 1 hour</option>
                <option value={120}>every 2 hours</option>
                <option value={180}>every 3 hours</option>
              </select>
            )}
            <Switch
              checked={prefs.water.enabled}
              onChange={(v) => updatePrefs({ ...prefs, water: { ...prefs.water, enabled: v } })}
            />
          </div>
        </div>

        <div className="reminder-row">
          <div>
            <div className="r-label">Weekly weigh-in</div>
            <div className="r-sub">Remind me to step on the scale</div>
          </div>
          <div className="r-controls">
            {prefs.weighIn.enabled && (
              <>
                <select
                  className="input"
                  style={{ width: 90 }}
                  value={prefs.weighIn.day}
                  onChange={(e) =>
                    updatePrefs({ ...prefs, weighIn: { ...prefs.weighIn, day: Number(e.target.value) } })
                  }
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className="input"
                  value={prefs.weighIn.time}
                  onChange={(e) =>
                    updatePrefs({ ...prefs, weighIn: { ...prefs.weighIn, time: e.target.value } })
                  }
                />
              </>
            )}
            <Switch
              checked={prefs.weighIn.enabled}
              onChange={(v) => updatePrefs({ ...prefs, weighIn: { ...prefs.weighIn, enabled: v } })}
            />
          </div>
        </div>

        <p className="hint" style={{ marginTop: 14 }}>
          Reminders are saved on this device and fire while Fitness Freak is open. You'll
          also see pending nudges on your dashboard.
        </p>
      </div>
    </>
  );
}
