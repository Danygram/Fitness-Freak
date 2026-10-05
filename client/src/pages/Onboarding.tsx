import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/icons';
import { AuroraBackground } from '../components/ui/aurora-background';
import { celebrate } from '../lib/celebrate';
import type { Settings, User } from '../types';

export default function Onboarding() {
  const { user, updateUser, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // collected values
  const [startWeight, setStartWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [calorie, setCalorie] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('200');
  const [fat, setFat] = useState('65');
  const [water, setWater] = useState('2500');
  const [steps, setSteps] = useState('10000');

  const firstName = user?.name?.split(' ')[0] || 'there';
  const TOTAL = 3;

  async function finish() {
    setSaving(true);
    try {
      await api<Settings>('/settings', {
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
          onboarded: true,
        },
      });
      celebrate();
      if (user) updateUser({ ...user, onboarded: true } as User);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuroraBackground className="p-5">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="onb-dots">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={`onb-dot${i <= step ? ' on' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="onb-step">
            <div className="onb-badge">
              <Icon name="dumbbell" size={26} />
            </div>
            <div className="auth-title">Welcome, {firstName}! 💪</div>
            <p className="auth-sub" style={{ marginBottom: 22 }}>
              Let's set up your goals so Fitness Freak can track what matters to you. Takes about 30 seconds.
            </p>
            <button className="btn" style={{ width: '100%' }} onClick={() => setStep(1)}>
              Let's go
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onb-step">
            <div className="auth-title">Your weight goal</div>
            <p className="auth-sub">Where are you now, and where do you want to be? (You can skip this.)</p>
            <div className="form-row">
              <div className="field">
                <label>Current weight (kg)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={startWeight}
                  onChange={(e) => setStartWeight(e.target.value)}
                  placeholder="e.g. 104"
                  autoFocus
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
                  placeholder="e.g. 88"
                />
              </div>
            </div>
            {startWeight !== '' && goalWeight !== '' && (
              <p className="hint" style={{ marginBottom: 18 }}>
                Goal: {Number(startWeight) > Number(goalWeight) ? 'lose' : 'gain'}{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {Math.abs(Number(startWeight) - Number(goalWeight)).toFixed(1)} kg
                </strong>
                .
              </p>
            )}
            <div className="onb-nav">
              <button className="btn-ghost" onClick={() => setStep(0)}>
                Back
              </button>
              <button className="btn" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <div className="auth-title">Daily targets</div>
            <p className="auth-sub">Set your daily goals — tweak any of these now or later in Settings.</p>
            <div className="field">
              <label>Calories (kcal)</label>
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
            <div className="form-row">
              <div className="field">
                <label>Water (ml)</label>
                <input type="number" min={0} step={100} value={water} onChange={(e) => setWater(e.target.value)} />
              </div>
              <div className="field">
                <label>Daily steps</label>
                <input type="number" min={0} step={500} value={steps} onChange={(e) => setSteps(e.target.value)} />
              </div>
            </div>
            <div className="onb-nav">
              <button className="btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn" onClick={finish} disabled={saving}>
                {saving ? 'Setting up…' : 'Start tracking'}
              </button>
            </div>
          </div>
        )}

        <button
          className="inline-link"
          style={{ display: 'block', margin: '18px auto 0', color: 'var(--text-faint)' }}
          onClick={logout}
        >
          Log out
        </button>
      </div>
    </AuroraBackground>
  );
}
