import { useEffect, useState } from 'react';
import { api, todayISO } from '../api';
import type { Exercise, Workout, WorkoutTemplate } from '../types';
import { Empty, Modal, PageHeader, Spinner } from '../components/ui';
import { Icon } from '../components/icons';
import { BUILTIN_TEMPLATES, EXERCISE_NAMES } from '../lib/builtinWorkouts';

function blankExercise(): Exercise {
  return { name: '', sets: [{ reps: 10, weight: 0 }] };
}

function cloneExercises(exercises: Exercise[]): Exercise[] {
  return exercises.map((ex) => ({ name: ex.name, sets: ex.sets.map((st) => ({ ...st })) }));
}

export default function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // form state
  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([blankExercise()]);
  const [saving, setSaving] = useState(false);

  function load() {
    api<Workout[]>('/workouts')
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    api<WorkoutTemplate[]>('/workout-templates').then(setTemplates).catch(() => {});
  }, []);

  function applyTemplate(tmplName: string, tmplExercises: Exercise[]) {
    setEditingId(null);
    setDate(todayISO());
    setName(tmplName);
    setNotes('');
    setExercises(cloneExercises(tmplExercises));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveAsTemplate() {
    const cleaned = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({ name: ex.name.trim(), sets: ex.sets }));
    if (!templateName.trim() || cleaned.length === 0) return;
    setSavingTemplate(true);
    try {
      const created = await api<WorkoutTemplate>('/workout-templates', {
        method: 'POST',
        body: { name: templateName.trim(), exercises: cleaned },
      });
      setTemplates((prev) => [created, ...prev]);
      setShowTemplateModal(false);
      setTemplateName('');
    } finally {
      setSavingTemplate(false);
    }
  }

  async function deleteTemplate(id: number) {
    await api(`/workout-templates/${id}`, { method: 'DELETE' });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function resetForm() {
    setDate(todayISO());
    setName('');
    setNotes('');
    setExercises([blankExercise()]);
    setEditingId(null);
  }

  function startEdit(w: Workout) {
    setEditingId(w.id);
    setDate(w.date);
    setName(w.name);
    setNotes(w.notes || '');
    setExercises(
      w.exercises.length ? w.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })) : [blankExercise()]
    );
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateExercise(i: number, patch: Partial<Exercise>) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  }

  function updateSet(ei: number, si: number, patch: Partial<{ reps: number; weight: number }>) {
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === ei
          ? { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === si ? { ...s, ...patch } : s)) }
          : ex
      )
    );
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const cleaned = exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({ name: ex.name.trim(), sets: ex.sets }));
      await api<Workout>(editingId ? `/workouts/${editingId}` : '/workouts', {
        method: editingId ? 'PUT' : 'POST',
        body: { date, name: name.trim(), notes, exercises: cleaned },
      });
      resetForm();
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    await api(`/workouts/${id}`, { method: 'DELETE' });
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Workouts" subtitle="Log your training sessions and track every set." />

      <div style={{ marginBottom: 20 }}>
        <button
          className="btn"
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Close' : '＋ Log a workout'}
        </button>
      </div>

      {!showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            Start from a template
            <span className="hint">loads exercises — just fill in your weights</span>
          </div>
          <div className="tmpl-grid">
            {templates.map((t) => (
              <div className="tmpl-card" key={`u-${t.id}`}>
                <button className="tmpl-main" onClick={() => applyTemplate(t.name, t.exercises)}>
                  <span className="tmpl-name">{t.name}</span>
                  <span className="tmpl-sub">
                    <span className="tmpl-badge">Yours</span>
                    {t.exercises.length} exercises
                  </span>
                </button>
                <button
                  className="btn-icon"
                  onClick={() => deleteTemplate(t.id)}
                  title="Delete template"
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))}
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                className="tmpl-card tmpl-main"
                key={`b-${t.key}`}
                onClick={() => applyTemplate(t.name, t.exercises)}
              >
                <span className="tmpl-name">{t.name}</span>
                <span className="tmpl-sub">{t.exercises.length} exercises</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <datalist id="exercise-names">
        {EXERCISE_NAMES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {showForm && (
        <div className="card section-gap" style={{ marginTop: 0, marginBottom: 24 }}>
          <div className="card-title">{editingId ? 'Edit workout' : 'New workout'}</div>
          <div className="form-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Workout name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Push day, Leg day, Morning run…"
              />
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <label className="hint" style={{ fontWeight: 600 }}>
              Exercises
            </label>
            {exercises.map((ex, ei) => (
              <div className="exercise-block" key={ei}>
                <div className="form-row" style={{ alignItems: 'center', marginBottom: 10 }}>
                  <input
                    value={ex.name}
                    list="exercise-names"
                    onChange={(e) => updateExercise(ei, { name: e.target.value })}
                    placeholder={`Exercise ${ei + 1} (e.g. Bench press)`}
                  />
                  {exercises.length > 1 && (
                    <button
                      className="btn-icon"
                      style={{ flex: '0 0 auto', minWidth: 0 }}
                      onClick={() =>
                        setExercises((prev) => prev.filter((_, idx) => idx !== ei))
                      }
                      title="Remove exercise"
                    >
                      <Icon name="x" />
                    </button>
                  )}
                </div>
                {ex.sets.map((s, si) => (
                  <div className="set-row" key={si}>
                    <span className="set-num">#{si + 1}</span>
                    <input
                      type="number"
                      min={0}
                      value={s.reps}
                      onChange={(e) => updateSet(ei, si, { reps: Number(e.target.value) })}
                      placeholder="reps"
                    />
                    <span className="hint">reps ×</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={s.weight}
                      onChange={(e) => updateSet(ei, si, { weight: Number(e.target.value) })}
                      placeholder="kg"
                    />
                    <span className="hint">kg</span>
                    {ex.sets.length > 1 && (
                      <button
                        className="btn-icon"
                        onClick={() =>
                          updateExercise(ei, { sets: ex.sets.filter((_, idx) => idx !== si) })
                        }
                        title="Remove set"
                      >
                        <Icon name="x" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="btn-ghost btn-sm"
                  onClick={() =>
                    updateExercise(ei, { sets: [...ex.sets, { reps: 10, weight: 0 }] })
                  }
                >
                  ＋ Add set
                </button>
              </div>
            ))}
            <button
              className="btn-ghost btn-sm"
              onClick={() => setExercises((prev) => [...prev, blankExercise()])}
            >
              ＋ Add exercise
            </button>
          </div>

          <div className="field section-gap">
            <label>Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={save} disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save workout'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setTemplateName(name);
                setShowTemplateModal(true);
              }}
              disabled={exercises.every((ex) => !ex.name.trim())}
              title="Save these exercises as a reusable template"
            >
              Save as template
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">History</div>
        {workouts.length === 0 ? (
          <Empty icon={<Icon name="dumbbell" />}>No workouts logged yet. Log your first session above!</Empty>
        ) : (
          workouts.map((w) => {
            const totalSets = w.exercises.reduce((a, ex) => a + ex.sets.length, 0);
            return (
              <div className="row-item" key={w.id}>
                <div className="row-main">
                  <div className="row-title">{w.name}</div>
                  <div className="row-sub">
                    {new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {w.exercises.length} exercises · {totalSets} sets
                    {w.exercises.length > 0 && (
                      <>
                        {' — '}
                        {w.exercises.map((e) => e.name).join(', ')}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn-icon btn-icon-edit" onClick={() => startEdit(w)} title="Edit">
                    <Icon name="edit" />
                  </button>
                  <button className="btn-icon" onClick={() => remove(w.id)} title="Delete">
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showTemplateModal && (
        <Modal title="Save as template" onClose={() => setShowTemplateModal(false)}>
          <p className="hint" style={{ marginBottom: 14 }}>
            Save this workout's exercises as a reusable template you can start from anytime.
          </p>
          <div className="field">
            <label>Template name</label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. My Push Day"
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </button>
            <button className="btn" onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
