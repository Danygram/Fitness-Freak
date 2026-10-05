import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, todayISO } from '../api';
import type { DayLog, Food, FoodSearchResult, Meal, MealType, Settings } from '../types';
import { Empty, Modal, PageHeader, Ring } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { NumberTicker } from '../components/ui/number-ticker';
import { HABITS } from '../habits';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
const WATER_STEPS = [250, 500];

function EditMealModal({
  meal,
  onClose,
  onSaved,
}: {
  meal: Meal;
  onClose: () => void;
  onSaved: (m: Meal) => void;
}) {
  const [name, setName] = useState(meal.name);
  const [mealType, setMealType] = useState<MealType>(meal.meal_type);
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.protein));
  const [carbs, setCarbs] = useState(String(meal.carbs));
  const [fat, setFat] = useState(String(meal.fat));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await api<Meal>(`/meals/${meal.id}`, {
        method: 'PUT',
        body: {
          name: name.trim(),
          meal_type: mealType,
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit meal" onClose={onClose}>
      <div className="form-row">
        <div className="field" style={{ flex: 2 }}>
          <label>Food / meal</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Meal</label>
          <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Calories</label>
          <input type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
        <div className="field">
          <label>Protein (g)</label>
          <input type="number" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Carbs (g)</label>
          <input type="number" min={0} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </div>
        <div className="field">
          <label>Fat (g)</label>
          <input type="number" min={0} value={fat} onChange={(e) => setFat(e.target.value)} />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" onClick={save} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="macro-row">
      <div className="macro-top">
        <span className="lbl">
          <span className="dot" style={{ background: color }} />
          {label}
        </span>
        <span className="val">
          {Math.round(value)} / {Math.round(target)} g
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Nutrition() {
  const [date, setDate] = useState(todayISO());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [day, setDay] = useState<DayLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // add-meal form
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saveToLib, setSaveToLib] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLibForm, setShowLibForm] = useState(false);

  function loadDay(d: string) {
    setLoading(true);
    Promise.all([api<Meal[]>(`/meals?date=${d}`), api<DayLog>(`/day?date=${d}`)])
      .then(([m, dl]) => {
        setMeals(m);
        setDay(dl);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    Promise.all([api<Food[]>('/foods'), api<Settings>('/settings')]).then(([f, s]) => {
      setFoods(f);
      setSettings(s);
    });
  }, []);

  useEffect(() => {
    loadDay(date);
  }, [date]);

  const totals = meals.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calTarget = settings?.calorie_target ?? 2000;
  const remaining = calTarget - totals.calories;
  const waterTarget = settings?.water_target_ml ?? 2500;
  const waterMl = day?.water_ml ?? 0;

  async function addMeal() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api<Meal>('/meals', {
        method: 'POST',
        body: {
          date,
          name: name.trim(),
          meal_type: mealType,
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
      });
      if (saveToLib) {
        const food = await api<Food>('/foods', {
          method: 'POST',
          body: {
            name: name.trim(),
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0,
          },
        });
        setFoods((prev) => [...prev, food].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setSaveToLib(false);
      loadDay(date);
    } finally {
      setSaving(false);
    }
  }

  async function quickAdd(f: Food) {
    await api<Meal>('/meals', {
      method: 'POST',
      body: {
        date,
        name: f.name,
        meal_type: 'other',
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      },
    });
    loadDay(date);
  }

  async function removeMeal(id: number) {
    await api(`/meals/${id}`, { method: 'DELETE' });
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  async function removeFood(id: number) {
    await api(`/foods/${id}`, { method: 'DELETE' });
    setFoods((prev) => prev.filter((f) => f.id !== id));
  }

  // --- food database search ---
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = useState('100');
  const searchSeq = useRef(0);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await api<FoodSearchResult[]>(`/foods/search?q=${encodeURIComponent(q)}`);
        if (seq === searchSeq.current) setSearchResults(res);
      } catch (err) {
        if (seq === searchSeq.current) {
          setSearchError(err instanceof Error ? err.message : 'Search failed');
          setSearchResults([]);
        }
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const factor = (Number(grams) || 0) / 100;
  const scaled = selected
    ? {
        calories: Math.round(selected.calories * factor),
        protein: Math.round(selected.protein * factor * 10) / 10,
        carbs: Math.round(selected.carbs * factor * 10) / 10,
        fat: Math.round(selected.fat * factor * 10) / 10,
      }
    : null;

  function pickSearchResult(f: FoodSearchResult) {
    setSelected(f);
    setGrams('100');
  }

  async function addSelected(alsoSave: boolean) {
    if (!selected || !scaled) return;
    const label = `${selected.name}${selected.brand ? ` (${selected.brand})` : ''} · ${grams} g`;
    await api<Meal>('/meals', {
      method: 'POST',
      body: { date, name: label, meal_type: mealType, ...scaled },
    });
    if (alsoSave) {
      const food = await api<Food>('/foods', {
        method: 'POST',
        body: { name: `${selected.name} · ${grams} g`, ...scaled },
      });
      setFoods((prev) => [...prev, food].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setSelected(null);
    setSearchQ('');
    setSearchResults([]);
    loadDay(date);
  }

  // library quick-add form
  const [libName, setLibName] = useState('');
  const [libCal, setLibCal] = useState('');
  const [libP, setLibP] = useState('');
  const [libC, setLibC] = useState('');
  const [libF, setLibF] = useState('');

  async function addLibFood() {
    if (!libName.trim()) return;
    const food = await api<Food>('/foods', {
      method: 'POST',
      body: {
        name: libName.trim(),
        calories: Number(libCal) || 0,
        protein: Number(libP) || 0,
        carbs: Number(libC) || 0,
        fat: Number(libF) || 0,
      },
    });
    setFoods((prev) => [...prev, food].sort((a, b) => a.name.localeCompare(b.name)));
    setLibName('');
    setLibCal('');
    setLibP('');
    setLibC('');
    setLibF('');
    setShowLibForm(false);
  }

  async function setWater(ml: number) {
    const next = Math.max(0, ml);
    const updated = await api<DayLog>('/day', {
      method: 'PUT',
      body: { date, water_ml: next },
    });
    setDay(updated);
  }

  async function toggleHabit(key: string) {
    const current = day?.habits ?? [];
    const next = current.includes(key)
      ? current.filter((h) => h !== key)
      : [...current, key];
    const updated = await api<DayLog>('/day', {
      method: 'PUT',
      body: { date, habits: next },
    });
    setDay(updated);
  }

  // Auto-derived green lights.
  const autoWins: { key: string; label: string; icon: IconName; on: boolean }[] = [
    {
      key: 'within_cals',
      label: 'Within calories',
      icon: 'target',
      on: totals.calories > 0 && totals.calories <= calTarget,
    },
    {
      key: 'hit_protein',
      label: 'Hit protein',
      icon: 'bolt',
      on: settings != null && totals.protein >= settings.protein_target && settings.protein_target > 0,
    },
    {
      key: 'hit_water',
      label: 'Hydrated',
      icon: 'drop',
      on: waterMl >= waterTarget && waterTarget > 0,
    },
  ];

  const waterPct = waterTarget > 0 ? Math.min(100, (waterMl / waterTarget) * 100) : 0;

  return (
    <>
      <PageHeader title="Nutrition" subtitle="Log what you ate, hit your targets, and stack up clean days." />

      <div className="date-bar">
        <input
          type="date"
          className="input"
          style={{ maxWidth: 190 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Link to="/settings" className="inline-link">
          Edit targets →
        </Link>
      </div>

      {/* Calories + macros vs target */}
      <div className="grid cols-2">
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">Calories</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
              flex: 1,
              flexWrap: 'wrap',
            }}
          >
            <Ring
              value={totals.calories / calTarget}
              size={150}
              stroke={13}
              color={remaining < 0 ? 'var(--danger)' : 'var(--accent)'}
              valueSize={34}
              label={<NumberTicker value={Math.abs(Math.round(remaining))} />}
              sub={remaining < 0 ? 'OVER' : 'LEFT'}
            />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
                {Math.round(totals.calories).toLocaleString()}
                <span style={{ color: 'var(--text-faint)', fontSize: 15, fontWeight: 500 }}>
                  {' '}
                  / {calTarget.toLocaleString()}
                </span>
              </div>
              <div className="hint" style={{ marginTop: 2 }}>kcal eaten today</div>
              <div style={{ marginTop: 14 }}>
                <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', textTransform: 'none' }}>
                  {Math.round((totals.calories / calTarget) * 100)}% of goal
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Macros</div>
          <MacroBar label="Protein" value={totals.protein} target={settings?.protein_target ?? 150} color="#38bdf8" />
          <MacroBar label="Carbs" value={totals.carbs} target={settings?.carbs_target ?? 200} color="#a3e635" />
          <MacroBar label="Fat" value={totals.fat} target={settings?.fat_target ?? 65} color="#fbbf24" />
        </div>
      </div>

      {/* Daily wins (green lights) + Water */}
      <div className="grid cols-2 section-gap">
        <div className="card">
          <div className="card-title">
            Daily wins
            <span className="hint">tap to light up</span>
          </div>
          <div className="wins-grid">
            {autoWins.map((w) => (
              <div key={w.key} className={`win-chip auto ${w.on ? 'on' : 'off'}`} title="Earned automatically">
                <span className="led" />
                <Icon name={w.icon} size={15} /> {w.label}
              </div>
            ))}
            {HABITS.map((h) => {
              const on = day?.habits.includes(h.key) ?? false;
              return (
                <button key={h.key} className={`win-chip${on ? ' on' : ''}`} onClick={() => toggleHabit(h.key)}>
                  <span className="led" />
                  {h.icon} {h.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: 'var(--blue)', display: 'inline-flex' }}>
                <Icon name="drop" size={14} />
              </span>
              Water
            </span>
          </div>
          <div className="water-head">
            <span className="water-amount">
              {(waterMl / 1000).toFixed(2)} <span className="unit">/ {(waterTarget / 1000).toFixed(1)} L</span>
            </span>
            <span className="hint">{Math.round(waterPct)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${waterPct}%` }} />
          </div>
          <div className="water-btns">
            {WATER_STEPS.map((ml) => (
              <button key={ml} className="water-btn" onClick={() => setWater(waterMl + ml)}>
                ＋{ml} ml
              </button>
            ))}
            <button className="water-btn" onClick={() => setWater(waterMl - 250)} disabled={waterMl <= 0}>
              －250 ml
            </button>
            <button className="water-btn" onClick={() => setWater(0)}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Food database search */}
      <div className="card section-gap">
        <div className="card-title">
          Search foods
          <span className="hint">powered by Open Food Facts</span>
        </div>
        <div className="search-box">
          <span className="search-ic">
            <Icon name="search" size={17} />
          </span>
          <input
            className="input"
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setSelected(null);
            }}
            placeholder="Search a food — e.g. banana, paneer, oats…"
          />
          {searchQ && (
            <button
              className="btn-icon"
              onClick={() => {
                setSearchQ('');
                setSelected(null);
                setSearchResults([]);
              }}
              title="Clear"
            >
              <Icon name="x" />
            </button>
          )}
        </div>

        {selected && scaled ? (
          <div className="exercise-block" style={{ marginTop: 14, marginBottom: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{selected.name}</div>
            {selected.brand && <div className="hint" style={{ marginBottom: 12 }}>{selected.brand}</div>}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field" style={{ marginBottom: 0, maxWidth: 110 }}>
                <label>Quantity (g)</label>
                <input
                  type="number"
                  min={0}
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                  {scaled.calories} <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>kcal</span>
                </div>
                <div className="hint" style={{ marginTop: 2 }}>
                  P {scaled.protein}g · C {scaled.carbs}g · F {scaled.fat}g
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => addSelected(false)}>
                Add to today
              </button>
              <button className="btn-ghost btn-sm" onClick={() => addSelected(true)}>
                Add &amp; save to my foods
              </button>
              <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Back to results
              </button>
            </div>
          </div>
        ) : (
          <>
            {searching && <div className="hint" style={{ marginTop: 12 }}>Searching…</div>}
            {searchError && (
              <div className="hint" style={{ marginTop: 12, color: 'var(--warn)' }}>{searchError}</div>
            )}
            {!searching && !searchError && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((f, i) => (
                  <button key={i} className="search-result" onClick={() => pickSearchResult(f)}>
                    <span className="sr-main">
                      <span className="sr-name">{f.name}</span>
                      {f.brand && <span className="sr-brand">{f.brand}</span>}
                    </span>
                    <span className="sr-kcal">
                      {f.calories} <span>kcal/100g</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick add from library */}
      <div className="card section-gap">
        <div className="card-title">
          Quick add from your foods
          <button className="inline-link" onClick={() => setShowLibForm((s) => !s)}>
            {showLibForm ? 'Close' : '＋ New food'}
          </button>
        </div>

        {showLibForm && (
          <div className="exercise-block">
            <div className="form-row" style={{ marginBottom: 10 }}>
              <input value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="Food name (e.g. Oats)" />
              <input type="number" value={libCal} onChange={(e) => setLibCal(e.target.value)} placeholder="kcal" />
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <input type="number" value={libP} onChange={(e) => setLibP(e.target.value)} placeholder="protein g" />
              <input type="number" value={libC} onChange={(e) => setLibC(e.target.value)} placeholder="carbs g" />
              <input type="number" value={libF} onChange={(e) => setLibF(e.target.value)} placeholder="fat g" />
            </div>
            <button className="btn btn-sm" onClick={addLibFood} disabled={!libName.trim()}>
              Save to my foods
            </button>
          </div>
        )}

        {foods.length === 0 ? (
          <div className="hint">
            No saved foods yet. Add foods you eat often here (or tick “save to my foods” below) for one-tap logging.
          </div>
        ) : (
          <div className="quick-foods">
            {foods.map((f) => (
              <span key={f.id} className="food-chip">
                <button
                  className="inline-link"
                  style={{ color: 'inherit', fontWeight: 600, padding: 0 }}
                  onClick={() => quickAdd(f)}
                  title="Add to today"
                >
                  <span className="add-plus">＋</span> {f.name}{' '}
                  <span className="kcal">{Math.round(f.calories)} kcal</span>
                </button>
                <button
                  className="btn-icon"
                  style={{ width: 22, height: 22 }}
                  onClick={() => removeFood(f.id)}
                  title="Remove from library"
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add a meal (detailed) */}
      <div className="card section-gap">
        <div className="card-title">Add a meal</div>
        <div className="form-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Food / meal</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grilled chicken salad" />
          </div>
          <div className="field">
            <label>Meal</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Calories</label>
            <input type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="kcal" />
          </div>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 12 }}>
          <input type="checkbox" checked={saveToLib} onChange={(e) => setSaveToLib(e.target.checked)} style={{ width: 'auto' }} />
          Also save to my foods for quick-add
        </label>
        <button className="btn" onClick={addMeal} disabled={saving || !name.trim()}>
          {saving ? 'Adding…' : 'Add meal'}
        </button>
      </div>

      {/* Today's meals */}
      <div className="card section-gap">
        <div className="card-title">
          Meals
          <span className="hint">
            {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        {loading ? (
          <div className="hint">Loading…</div>
        ) : meals.length === 0 ? (
          <Empty icon={<Icon name="nutrition" />}>No meals logged for this day yet.</Empty>
        ) : (
          meals.map((m) => (
            <div className="row-item" key={m.id}>
              <div className="row-main">
                <div className="row-title">
                  {m.name} <span className="badge">{m.meal_type}</span>
                </div>
                <div className="row-sub">
                  {Math.round(m.calories)} kcal · P {m.protein}g · C {m.carbs}g · F {m.fat}g
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  className="btn-icon btn-icon-edit"
                  onClick={() => setEditingMeal(m)}
                  title="Edit"
                >
                  <Icon name="edit" />
                </button>
                <button className="btn-icon" onClick={() => removeMeal(m.id)} title="Delete">
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={(updated) => {
            setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setEditingMeal(null);
          }}
        />
      )}
    </>
  );
}
