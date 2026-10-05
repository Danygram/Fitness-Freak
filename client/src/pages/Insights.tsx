import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, todayISO } from '../api';
import type { Settings, WeekReport, WeightLog } from '../types';
import { Empty, PageHeader, Spinner } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { fmtDate, fmtLongDate, fromDays, linearRegression, toDays } from '../lib/stats';

const tooltipStyle = {
  background: '#151f38',
  border: '1px solid #243150',
  borderRadius: 10,
  color: '#e8eefc',
};
const axis = { stroke: '#64748b', fontSize: 12 };

function Delta({
  value,
  unit,
  higherIsBetter,
  digits = 0,
}: {
  value: number;
  unit?: string;
  higherIsBetter?: boolean;
  digits?: number;
}) {
  if (!isFinite(value) || Math.abs(value) < (digits ? 0.05 : 0.5)) {
    return <span className="delta flat">— no change</span>;
  }
  const up = value > 0;
  let cls = 'flat';
  if (higherIsBetter !== undefined) cls = up === higherIsBetter ? 'good' : 'bad';
  return (
    <span className={`delta ${cls}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(digits)}
      {unit} vs last week
    </span>
  );
}

function MetricTile({
  icon,
  label,
  value,
  delta,
}: {
  icon: IconName;
  label: string;
  value: string;
  delta: ReactNode;
}) {
  return (
    <div className="metric-tile">
      <div className="metric-head">
        <span className="metric-ic">
          <Icon name={icon} size={16} />
        </span>
        {label}
      </div>
      <div className="metric-value">{value}</div>
      {delta}
    </div>
  );
}

export default function Insights() {
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [thisWeek, setThisWeek] = useState<WeekReport | null>(null);
  const [lastWeek, setLastWeek] = useState<WeekReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayISO();
    const lastWeekEnd = fromDays(toDays(today) - 7);
    Promise.all([
      api<WeightLog[]>('/weight'),
      api<Settings>('/settings'),
      api<WeekReport>(`/summary/week?end=${today}`),
      api<WeekReport>(`/summary/week?end=${lastWeekEnd}`),
    ])
      .then(([w, s, tw, lw]) => {
        setWeights(w);
        setSettings(s);
        setThisWeek(tw);
        setLastWeek(lw);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !settings || !thisWeek || !lastWeek) return <Spinner />;

  // --- Weight trajectory ----------------------------------------------------
  const goal = settings.goal_weight;
  const pts = weights.map((w) => ({ x: toDays(w.date), y: w.weight }));
  const reg = linearRegression(pts);
  const latest = weights.length ? weights[weights.length - 1].weight : null;

  let projectedDate: string | null = null;
  let ratePerWeek: number | null = null;
  let chartData: { x: number; actual: number | null; trend: number }[] = [];
  let endX = 0;

  if (reg && pts.length >= 2) {
    ratePerWeek = reg.slope * 7;
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;

    if (goal != null && reg.slope !== 0) {
      const goalX = (goal - reg.intercept) / reg.slope;
      const movingToGoal =
        (goal < (latest as number) && reg.slope < 0) || (goal > (latest as number) && reg.slope > 0);
      if (movingToGoal && goalX > lastX && goalX - firstX < 400) {
        projectedDate = fromDays(Math.round(goalX));
        endX = Math.round(goalX);
      }
    }
    if (!endX) endX = lastX + 14;

    const actualByX = new Map(pts.map((p) => [p.x, p.y]));
    const xs = new Set<number>([...pts.map((p) => p.x), endX]);
    chartData = [...xs]
      .sort((a, b) => a - b)
      .map((x) => ({
        x,
        actual: actualByX.has(x) ? (actualByX.get(x) as number) : null,
        trend: Math.round(reg.predict(x) * 10) / 10,
      }));
  }

  const toGo = goal != null && latest != null ? latest - goal : null;

  // --- Weekly recap ---------------------------------------------------------
  const tw = thisWeek;
  const lw = lastWeek;
  const insights: string[] = [];
  if (tw.daysLogged > 0) insights.push(`You logged meals on ${tw.daysLogged} of the last 7 days.`);
  if (tw.avg.protein > 0 && lw.avg.protein > 0) {
    const pct = Math.round(((tw.avg.protein - lw.avg.protein) / lw.avg.protein) * 100);
    if (Math.abs(pct) >= 3)
      insights.push(
        `Protein averaged ${Math.round(tw.avg.protein)}g/day — ${pct > 0 ? 'up' : 'down'} ${Math.abs(
          pct
        )}% vs last week.`
      );
  }
  if (tw.workouts > 0) insights.push(`You trained ${tw.workouts} time${tw.workouts === 1 ? '' : 's'} this week.`);
  if (tw.weightChange != null && Math.abs(tw.weightChange) >= 0.1) {
    insights.push(
      `Weight ${tw.weightChange < 0 ? 'dropped' : 'rose'} ${Math.abs(tw.weightChange).toFixed(
        1
      )} kg over your weigh-ins this week.`
    );
  }
  if (insights.length === 0) insights.push('Log a few days this week and your recap will fill in here.');

  return (
    <>
      <PageHeader title="Insights" subtitle="Where you're heading, and how your week stacked up." />

      {/* Weight trajectory */}
      <div className="card">
        <div className="card-title">
          Weight trajectory
          {goal != null && <span className="hint">goal {goal} kg</span>}
        </div>

        {weights.length < 2 ? (
          <Empty icon={<Icon name="weight" />}>
            Log at least two weigh-ins on the{' '}
            <Link to="/weight" className="inline-link">
              Weight
            </Link>{' '}
            tab to see your projected trajectory.
          </Empty>
        ) : (
          <>
            <div className="wstat-row" style={{ marginBottom: 20 }}>
              <div className="wstat">
                <div className="v">{latest} kg</div>
                <div className="l">current</div>
              </div>
              <div className="wstat">
                <div className="v" style={{ color: ratePerWeek && ratePerWeek < 0 ? 'var(--good)' : undefined }}>
                  {ratePerWeek! > 0 ? '+' : ''}
                  {ratePerWeek!.toFixed(2)}
                </div>
                <div className="l">kg / week (trend)</div>
              </div>
              {toGo != null && (
                <div className="wstat">
                  <div className="v">{toGo.toFixed(1)} kg</div>
                  <div className="l">to goal</div>
                </div>
              )}
              <div className="wstat">
                <div className="v" style={{ fontSize: projectedDate ? 18 : 25 }}>
                  {projectedDate ? fmtLongDate(projectedDate) : '—'}
                </div>
                <div className="l">projected to hit goal</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ left: -12, right: 10, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243150" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  scale="linear"
                  {...axis}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(x) => fmtDate(fromDays(x))}
                  minTickGap={40}
                />
                <YAxis {...axis} tickLine={false} axisLine={false} width={42} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(x) => fmtDate(fromDays(Number(x)))}
                  formatter={(v: number, name) => [`${v} kg`, name === 'actual' ? 'actual' : 'trend']}
                />
                {goal != null && (
                  <ReferenceLine
                    y={goal}
                    stroke="#a3e635"
                    strokeDasharray="5 4"
                    label={{ value: `Goal ${goal}`, fill: '#a3e635', fontSize: 11, position: 'insideTopRight' }}
                  />
                )}
                <Line
                  type="linear"
                  dataKey="trend"
                  name="trend"
                  stroke="#b494f8"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="actual"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#38bdf8' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="macro-dots" style={{ marginTop: 10 }}>
              <span className="macro-dot">
                <span className="dot" style={{ background: '#38bdf8' }} /> Your weigh-ins
              </span>
              <span className="macro-dot">
                <span className="dot" style={{ background: '#b494f8' }} /> Projected trend
              </span>
            </div>
          </>
        )}
      </div>

      {/* Weekly recap */}
      <div className="card section-gap">
        <div className="card-title">
          Weekly recap
          <span className="hint">
            {fmtDate(tw.start)} – {fmtDate(tw.end)}
          </span>
        </div>

        <div className="metric-grid">
          <MetricTile
            icon="flame"
            label="Avg calories / day"
            value={Math.round(tw.avg.calories).toLocaleString()}
            delta={<Delta value={tw.avg.calories - lw.avg.calories} unit=" kcal" />}
          />
          <MetricTile
            icon="bolt"
            label="Avg protein / day"
            value={`${Math.round(tw.avg.protein)}g`}
            delta={<Delta value={tw.avg.protein - lw.avg.protein} unit="g" higherIsBetter />}
          />
          <MetricTile
            icon="drop"
            label="Avg water / day"
            value={`${(tw.avg.water_ml / 1000).toFixed(1)} L`}
            delta={
              <Delta value={(tw.avg.water_ml - lw.avg.water_ml) / 1000} unit=" L" higherIsBetter digits={1} />
            }
          />
          <MetricTile
            icon="activity"
            label="Avg steps / day"
            value={Math.round(tw.avg.steps).toLocaleString()}
            delta={<Delta value={tw.avg.steps - lw.avg.steps} higherIsBetter />}
          />
          <MetricTile
            icon="dumbbell"
            label="Workouts"
            value={String(tw.workouts)}
            delta={<Delta value={tw.workouts - lw.workouts} higherIsBetter />}
          />
          <MetricTile
            icon="weight"
            label="Weight change"
            value={tw.weightChange != null ? `${tw.weightChange > 0 ? '+' : ''}${tw.weightChange.toFixed(1)} kg` : '—'}
            delta={
              tw.weightChange != null && lw.weightChange != null ? (
                <Delta value={tw.weightChange - lw.weightChange} unit=" kg" digits={1} />
              ) : (
                <span className="delta flat">this week</span>
              )
            }
          />
        </div>

        <div className="insight-list">
          {insights.map((t, i) => (
            <div className="insight-row" key={i}>
              <span className="insight-ic">
                <Icon name="sparkle" size={15} />
              </span>
              {t}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
