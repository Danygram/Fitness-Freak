import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, todayISO } from '../api';
import type {
  CalendarDay,
  DayLog,
  DaySummary,
  Meal,
  Settings,
  TrendPoint,
  WeekReport,
  WeightLog,
} from '../types';
import { PageHeader, Spinner, Stat } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { NumberTicker } from '../components/ui/number-ticker';
import { BackgroundBeams } from '../components/ui/background-beams';
import { useAuth } from '../context/AuthContext';
import { loadPrefs, timeToMin } from '../lib/reminders';

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function heatLevel(meals: number) {
  if (meals <= 0) return '';
  if (meals === 1) return 'lv1';
  if (meals === 2) return 'lv2';
  return 'lv3';
}

const chartAxis = { stroke: '#64748b', fontSize: 12 };
const tooltipStyle = {
  background: '#151f38',
  border: '1px solid #243150',
  borderRadius: 10,
  color: '#e8eefc',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [week, setWeek] = useState<WeekReport | null>(null);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [dayLog, setDayLog] = useState<DayLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayISO();
    Promise.all([
      api<DaySummary>(`/summary?date=${today}`),
      api<TrendPoint[]>(`/summary/trends?days=14&end=${today}`),
      api<Settings>('/settings'),
      api<WeekReport>(`/summary/week?end=${today}`),
      api<WeightLog[]>('/weight'),
      api<CalendarDay[]>(`/summary/calendar?days=35&end=${today}`),
      api<Meal[]>(`/meals?date=${today}`),
      api<DayLog>(`/day?date=${today}`),
    ])
      .then(([s, t, st, w, wl, cal, m, dl]) => {
        setSummary(s);
        setTrends(t);
        setSettings(st);
        setWeek(w);
        setWeights(wl);
        setCalendar(cal);
        setTodayMeals(m);
        setDayLog(dl);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary || !settings) return <Spinner />;

  const weekChunks: CalendarDay[][] = [];
  for (let i = 0; i < calendar.length; i += 7) weekChunks.push(calendar.slice(i, i + 7));

  // Pending reminder nudges (always shown in-app, independent of notifications).
  const prefs = loadPrefs();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const loggedTypes = new Set(todayMeals.map((m) => m.meal_type));
  const nudges: { icon: IconName; text: string; to: string }[] = [];

  (['breakfast', 'lunch', 'dinner'] as const).forEach((m) => {
    const t = prefs.meals[m];
    if (t && timeToMin(t) <= nowMin && !loggedTypes.has(m)) {
      nudges.push({ icon: 'nutrition', text: `You haven't logged ${m} yet`, to: '/nutrition' });
    }
  });
  if (
    prefs.water.enabled &&
    dayLog != null &&
    settings.water_target_ml > 0 &&
    dayLog.water_ml < settings.water_target_ml
  ) {
    const left = ((settings.water_target_ml - dayLog.water_ml) / 1000).toFixed(1);
    nudges.push({ icon: 'drop', text: `${left} L of water left to hit your goal`, to: '/nutrition' });
  }
  const weighedToday = weights.some((w) => w.date === todayISO());
  if (prefs.weighIn.enabled && now.getDay() === prefs.weighIn.day && !weighedToday) {
    nudges.push({ icon: 'weight', text: "It's your weekly weigh-in day", to: '/weight' });
  }

  const calTarget = settings.calorie_target;
  const chartData = trends.map((t) => ({ ...t, label: fmtDay(t.date) }));
  const firstName = user?.name?.split(' ')[0] || 'there';

  const latestWeight = weights.length ? weights[weights.length - 1].weight : null;
  const goalWeight = settings.goal_weight;
  const startWeight = settings.start_weight ?? (weights.length ? weights[0].weight : null);
  const weightPct =
    startWeight != null && goalWeight != null && latestWeight != null && startWeight !== goalWeight
      ? Math.max(0, Math.min(100, ((startWeight - latestWeight) / (startWeight - goalWeight)) * 100))
      : null;

  return (
    <>
      <BackgroundBeams className="dash-beams" />
      <div className="dash-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <PageHeader title={`Welcome back, ${firstName} 👋`} subtitle="Here's your health snapshot for today." />
        {summary.streak > 0 && (
          <span className="streak-badge">
            <Icon name="flame" /> {summary.streak}-day logging streak
          </span>
        )}
      </div>

      {nudges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {nudges.slice(0, 3).map((n, i) => (
            <Link to={n.to} key={i} className="nudge">
              <span className="nudge-ic">
                <Icon name={n.icon} size={18} />
              </span>
              <span className="nudge-text">{n.text}</span>
              <span className="nudge-cta">
                <Icon name="plus" size={16} />
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid stat-grid">
        <Stat
          icon={<Icon name="flame" />}
          accent="var(--amber)"
          value={<NumberTicker value={Math.round(summary.nutrition.calories)} />}
          label="Calories eaten"
          sub={`${Math.max(0, calTarget - summary.nutrition.calories).toFixed(0)} kcal left of ${calTarget.toLocaleString()}`}
          progress={summary.nutrition.calories / calTarget}
        />
        <Stat
          icon={<Icon name="bolt" />}
          accent="var(--blue)"
          value={
            <>
              <NumberTicker value={Math.round(summary.nutrition.protein)} />g
            </>
          }
          label="Protein today"
          sub={`Goal ${Math.round(settings.protein_target)}g`}
          progress={summary.nutrition.protein / settings.protein_target}
        />
        <Stat
          icon={<Icon name="activity" />}
          value={<NumberTicker value={summary.activity.steps} />}
          label="Steps today"
          sub={`Goal ${settings.step_target.toLocaleString()}`}
          progress={summary.activity.steps / settings.step_target}
        />
        {latestWeight != null ? (
          <Stat
            icon={<Icon name="weight" />}
            accent="var(--violet)"
            value={
              <>
                <NumberTicker value={latestWeight} decimalPlaces={Number.isInteger(latestWeight) ? 0 : 1} /> kg
              </>
            }
            label="Current weight"
            sub={goalWeight != null ? `Goal ${goalWeight} kg` : 'Set a goal in Settings'}
            progress={weightPct != null ? weightPct / 100 : undefined}
          />
        ) : (
          <Stat
            icon={<Icon name="dumbbell" />}
            accent="var(--violet)"
            value={<NumberTicker value={summary.workouts} />}
            label="Workouts today"
          />
        )}
      </div>

      {/* Weekly report */}
      {week && (
        <div className="card section-gap">
          <div className="card-title">
            This week
            <span className="hint">
              {week.daysLogged}/7 days logged
            </span>
          </div>
          <div className="wstat-row">
            <div className="wstat">
              <div className="v">{Math.round(week.avg.calories).toLocaleString()}</div>
              <div className="l">avg kcal / logged day</div>
            </div>
            <div className="wstat">
              <div className="v">{Math.round(week.avg.protein)}g</div>
              <div className="l">avg protein</div>
            </div>
            <div className="wstat">
              <div className="v">{(week.avg.water_ml / 1000).toFixed(1)} L</div>
              <div className="l">avg water</div>
            </div>
            <div className="wstat">
              <div className="v" style={{ color: week.weightChange != null && week.weightChange <= 0 ? 'var(--accent-2)' : undefined }}>
                {week.weightChange != null ? `${week.weightChange > 0 ? '+' : ''}${week.weightChange.toFixed(1)} kg` : '—'}
              </div>
              <div className="l">weight change</div>
            </div>
          </div>
        </div>
      )}

      {/* Consistency heatmap */}
      <div className="card section-gap">
        <div className="card-title">
          Consistency
          <span className="hint">last 5 weeks · logged meals</span>
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="heatmap">
            {weekChunks.map((wk, ci) => (
              <div className="heatmap-col" key={ci}>
                {wk.map((d) => (
                  <div
                    key={d.date}
                    className={`heat-cell ${heatLevel(d.meals)}`}
                    title={`${d.date}: ${d.meals} meal${d.meals === 1 ? '' : 's'}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 26 }}>
            <div className="wstat">
              <div className="v" style={{ color: 'var(--accent)' }}>
                {summary.streak}
              </div>
              <div className="l">current streak</div>
            </div>
            <div className="wstat">
              <div className="v">{summary.bestStreak}</div>
              <div className="l">best streak</div>
            </div>
          </div>
        </div>
        <div className="heat-legend">
          Less
          <span className="heat-cell" />
          <span className="heat-cell lv1" />
          <span className="heat-cell lv2" />
          <span className="heat-cell lv3" />
          More
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card">
          <div className="card-title">Calories · last 14 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
              <XAxis dataKey="label" {...chartAxis} tickLine={false} axisLine={false} />
              <YAxis {...chartAxis} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={calTarget} stroke="#a3e635" strokeDasharray="5 4" />
              <Area type="monotone" dataKey="calories" stroke="#38bdf8" strokeWidth={2.5} fill="url(#calGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">
            {weights.length >= 2 ? 'Weight · trend' : 'Steps · last 14 days'}
          </div>
          {weights.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={weights.map((w) => ({ ...w, label: fmtDay(w.date) }))}
                margin={{ left: -14, right: 6, top: 6 }}
              >
                <defs>
                  <linearGradient id="dashWGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
                <XAxis dataKey="label" {...chartAxis} tickLine={false} axisLine={false} />
                <YAxis {...chartAxis} tickLine={false} axisLine={false} width={40} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kg`, 'weight']} />
                {goalWeight != null && <ReferenceLine y={goalWeight} stroke="#a3e635" strokeDasharray="5 4" />}
                <Area type="monotone" dataKey="weight" stroke="#38bdf8" strokeWidth={2.5} fill="url(#dashWGrad)" dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
                <XAxis dataKey="label" {...chartAxis} tickLine={false} axisLine={false} />
                <YAxis {...chartAxis} tickLine={false} axisLine={false} width={44} />
                <Tooltip cursor={{ fill: 'rgba(163,230,53,0.08)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="steps" fill="#a3e635" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">
          Quick links
        </div>
        <div className="quick-foods">
          <Link to="/nutrition" className="food-chip">
            <Icon name="nutrition" size={15} /> Log a meal
          </Link>
          <Link to="/weight" className="food-chip">
            <Icon name="weight" size={15} /> Log weight
          </Link>
          <Link to="/activity" className="food-chip">
            <Icon name="activity" size={15} /> Log activity
          </Link>
          <Link to="/settings" className="food-chip">
            <Icon name="settings" size={15} /> Edit targets
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}
