// Renders a 1080×1920 (9:16) Instagram-story image for a logged activity,
// drawn on a canvas so the export is pixel-perfect and dependency-free.

export interface StoryData {
  type: string;
  title?: string | null;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  durationSec: number;
  calories: number;
  userName?: string;
}

const TYPE_LABEL: Record<string, string> = {
  walk: 'WALK',
  run: 'RUN',
  ride: 'RIDE',
  hike: 'HIKE',
};

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function fmtPace(secPerKm: number) {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad(s)}`;
}

export function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderStory(
  canvas: HTMLCanvasElement,
  d: StoryData,
  opts: { transparent?: boolean } = {},
) {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const M = 96;
  const CX = W / 2;
  const transparent = !!opts.transparent;

  // Make sure our web fonts are ready so canvas text uses them.
  try {
    await Promise.all([
      (document as any).fonts.load('700 300px "Space Grotesk"'),
      (document as any).fonts.load('600 80px "Space Grotesk"'),
      (document as any).fonts.load('800 44px "Plus Jakarta Sans"'),
      (document as any).fonts.load('600 36px "Plus Jakarta Sans"'),
      (document as any).fonts.ready,
    ]);
  } catch {
    /* fonts may already be loaded */
  }

  // --- Background ---
  let g: CanvasGradient;
  if (transparent) {
    // No fill — keep it see-through for overlaying on a photo. Add gentle scrims
    // behind the text zones + drop shadows so it stays readable over anything.
    ctx.clearRect(0, 0, W, H);

    const topScrim = ctx.createLinearGradient(0, 0, 0, 660);
    topScrim.addColorStop(0, 'rgba(0,0,0,0.5)');
    topScrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, W, 660);

    const botScrim = ctx.createLinearGradient(0, 1060, 0, H);
    botScrim.addColorStop(0, 'rgba(0,0,0,0)');
    botScrim.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = botScrim;
    ctx.fillRect(0, 1060, W, H - 1060);

    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
  } else {
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, W, H);

    g = ctx.createRadialGradient(W * 0.82, H * 0.1, 0, W * 0.82, H * 0.1, W * 1.0);
    g.addColorStop(0, 'rgba(182,242,61,0.18)');
    g.addColorStop(1, 'rgba(182,242,61,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    g = ctx.createRadialGradient(W * 0.1, H * 0.88, 0, W * 0.1, H * 0.88, W * 1.0);
    g.addColorStop(0, 'rgba(88,203,245,0.16)');
    g.addColorStop(1, 'rgba(88,203,245,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // faint diagonal beams for texture
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let i = -2; i < 10; i++) {
      const x = i * 150;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 320, H);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Header: brand + date ---
  const logoY = 110;
  const logoS = 78;
  g = ctx.createLinearGradient(M, logoY, M + logoS, logoY + logoS);
  g.addColorStop(0, '#b6f23d');
  g.addColorStop(1, '#7bd62e');
  ctx.fillStyle = g;
  roundRect(ctx, M, logoY, logoS, logoS, 22);
  ctx.fill();
  // dumbbell glyph
  ctx.strokeStyle = '#0b1004';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const lcx = M + logoS / 2;
  const lcy = logoY + logoS / 2;
  ctx.beginPath();
  ctx.moveTo(lcx - 22, lcy - 12);
  ctx.lineTo(lcx - 22, lcy + 12);
  ctx.moveTo(lcx - 14, lcy - 18);
  ctx.lineTo(lcx - 14, lcy + 18);
  ctx.moveTo(lcx + 14, lcy - 18);
  ctx.lineTo(lcx + 14, lcy + 18);
  ctx.moveTo(lcx + 22, lcy - 12);
  ctx.lineTo(lcx + 22, lcy + 12);
  ctx.moveTo(lcx - 14, lcy);
  ctx.lineTo(lcx + 14, lcy);
  ctx.stroke();

  ctx.fillStyle = '#f4f6fa';
  ctx.font = '800 42px "Plus Jakarta Sans"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '-1px';
  ctx.fillText('Fitness Freak', M + logoS + 26, logoY + logoS / 2 + 2);

  ctx.font = '600 30px "Plus Jakarta Sans"';
  ctx.fillStyle = '#99a3b2';
  ctx.textAlign = 'right';
  ctx.letterSpacing = '0px';
  ctx.fillText(fmtDate(d.date), W - M, logoY + logoS / 2 + 2);

  // --- Activity type pill + title ---
  const label = TYPE_LABEL[d.type] || d.type.toUpperCase();
  ctx.font = '700 34px "Plus Jakarta Sans"';
  ctx.letterSpacing = '4px';
  const pillTextW = ctx.measureText(label).width;
  const pillW = pillTextW + 64;
  const pillH = 70;
  const pillX = CX - pillW / 2;
  const pillY = 300;
  ctx.fillStyle = 'rgba(182,242,61,0.14)';
  roundRect(ctx, pillX, pillY, pillW, pillH, 35);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(182,242,61,0.5)';
  roundRect(ctx, pillX, pillY, pillW, pillH, 35);
  ctx.stroke();
  ctx.fillStyle = '#b6f23d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, CX, pillY + pillH / 2 + 2);
  ctx.letterSpacing = '0px';

  if (d.title) {
    ctx.font = '600 44px "Plus Jakarta Sans"';
    ctx.fillStyle = '#e8eefc';
    ctx.fillText(d.title, CX, pillY + pillH + 70);
  }

  // --- Hero distance ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#99a3b2';
  ctx.font = '700 32px "Plus Jakarta Sans"';
  ctx.letterSpacing = '6px';
  ctx.fillText('DISTANCE', CX, 650);
  ctx.letterSpacing = '0px';

  const distStr = d.distanceKm.toFixed(2);
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 300px "Space Grotesk"';
  const distW = ctx.measureText(distStr).width;
  ctx.font = '600 110px "Space Grotesk"';
  const unitW = ctx.measureText(' km').width;
  const totalW = distW + unitW;
  const startX = CX - totalW / 2;
  const baseY = 900;

  const grad = ctx.createLinearGradient(startX, 0, startX + distW, 0);
  grad.addColorStop(0, '#d6ff5c');
  grad.addColorStop(1, '#58cbf5');
  ctx.textAlign = 'left';
  ctx.font = '700 300px "Space Grotesk"';
  ctx.fillStyle = grad;
  ctx.fillText(distStr, startX, baseY);

  ctx.font = '600 110px "Space Grotesk"';
  ctx.fillStyle = '#5f6b7a';
  ctx.fillText(' km', startX + distW, baseY);

  // --- Divider ---
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, 1120);
  ctx.lineTo(W - M, 1120);
  ctx.stroke();

  // --- Stats row ---
  const paceSecPerKm = d.distanceKm > 0 ? d.durationSec / d.distanceKm : 0;
  const stats = [
    { label: 'TIME', value: fmtDuration(d.durationSec) },
    { label: 'PACE  (MIN/KM)', value: fmtPace(paceSecPerKm) },
    { label: 'CALORIES', value: String(Math.round(d.calories)) },
  ];
  const colY = 1250;
  stats.forEach((s, i) => {
    const cx = M + ((W - 2 * M) / 3) * (i + 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8b94a6';
    ctx.font = '700 26px "Plus Jakarta Sans"';
    ctx.letterSpacing = '2px';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s.label, cx, colY);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#f4f6fa';
    ctx.font = '600 82px "Space Grotesk"';
    ctx.fillText(s.value, cx, colY + 92);
  });

  // --- Decorative route wave ---
  const waveY = 1560;
  const waveLeft = M;
  const waveRight = W - M;
  const amp = 66;
  ctx.save();
  ctx.shadowColor = 'rgba(182,242,61,0.5)';
  ctx.shadowBlur = 24;
  const wg = ctx.createLinearGradient(waveLeft, 0, waveRight, 0);
  wg.addColorStop(0, '#b6f23d');
  wg.addColorStop(0.5, '#58cbf5');
  wg.addColorStop(1, '#b494f8');
  ctx.strokeStyle = wg;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = waveLeft + (waveRight - waveLeft) * t;
    const y =
      waveY -
      Math.sin(t * Math.PI * 3) * amp * (0.5 + 0.5 * Math.sin(t * Math.PI)) -
      Math.sin(t * Math.PI * 7) * 14;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // --- Footer ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const footY = 1800;
  if (d.userName) {
    ctx.fillStyle = '#5f6b7a';
    ctx.font = '600 30px "Plus Jakarta Sans"';
    ctx.letterSpacing = '1px';
    ctx.fillText(d.userName.toUpperCase(), CX, footY - 44);
  }
  ctx.fillStyle = '#b6f23d';
  ctx.font = '700 30px "Plus Jakarta Sans"';
  ctx.letterSpacing = '3px';
  ctx.fillText('TRACKED WITH FITNESS FREAK', CX, footY);
  ctx.letterSpacing = '0px';
}

export interface StatsDeltas {
  distance?: number | null;
  time?: number | null;
  pace?: number | null;
  calories?: number | null;
}

// A translucent "stats" card: a semi-transparent panel with label + big-value
// rows and a right-side "▲ %" comparison, plus a branded footer strip. Designed
// to sit on top of your own run photo (canvas stays transparent around the panel).
export async function renderStatsStory(
  canvas: HTMLCanvasElement,
  d: StoryData,
  deltas: StatsDeltas = {},
) {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  try {
    await Promise.all([
      (document as any).fonts.load('700 72px "Space Grotesk"'),
      (document as any).fonts.load('800 44px "Plus Jakarta Sans"'),
      (document as any).fonts.ready,
    ]);
  } catch {
    /* fonts may already be loaded */
  }

  ctx.clearRect(0, 0, W, H);

  // --- Panel ---
  const px = 66;
  const pw = W - px * 2;
  const py = 300;
  const ph = 1320;
  const r = 46;
  const pad = 58;
  const left = px + pad;
  const right = px + pw - pad;

  // translucent fill + hairline
  const pg = ctx.createLinearGradient(0, py, 0, py + ph);
  pg.addColorStop(0, 'rgba(18,22,30,0.62)');
  pg.addColorStop(1, 'rgba(9,11,15,0.66)');
  roundRect(ctx, px, py, pw, ph, r);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, px, py, pw, ph, r);
  ctx.stroke();

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;

  // --- Header ---
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#99a3b2';
  ctx.font = '700 26px "Plus Jakarta Sans"';
  ctx.letterSpacing = '5px';
  ctx.fillText('TOP ACTIVITY', left, py + 86);
  ctx.letterSpacing = '0px';

  const typeLabel = (TYPE_LABEL[d.type] || d.type).toUpperCase();
  ctx.fillStyle = '#b6f23d';
  ctx.font = '700 84px "Space Grotesk"';
  ctx.fillText(typeLabel, left, py + 172);

  if (d.title) {
    ctx.fillStyle = '#c7cedb';
    ctx.font = '600 34px "Plus Jakarta Sans"';
    ctx.fillText(d.title, left, py + 220);
  }

  // badge top-right: lime rounded square w/ dumbbell
  const bs = 116;
  const bx = px + pw - pad - bs;
  const by = py + 64;
  const bg = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
  bg.addColorStop(0, '#b6f23d');
  bg.addColorStop(1, '#7bd62e');
  roundRect(ctx, bx, by, bs, bs, 28);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#0b1004';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const dcx = bx + bs / 2;
  const dcy = by + bs / 2;
  ctx.beginPath();
  ctx.moveTo(dcx - 30, dcy - 16);
  ctx.lineTo(dcx - 30, dcy + 16);
  ctx.moveTo(dcx - 20, dcy - 24);
  ctx.lineTo(dcx - 20, dcy + 24);
  ctx.moveTo(dcx + 20, dcy - 24);
  ctx.lineTo(dcx + 20, dcy + 24);
  ctx.moveTo(dcx + 30, dcy - 16);
  ctx.lineTo(dcx + 30, dcy + 16);
  ctx.moveTo(dcx - 20, dcy);
  ctx.lineTo(dcx + 20, dcy);
  ctx.stroke();
  ctx.fillStyle = '#8b94a6';
  ctx.font = '700 22px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillText(fmtDate(d.date).toUpperCase(), bx + bs / 2, by + bs + 34);
  ctx.letterSpacing = '0px';

  // --- Stat rows ---
  const pace = d.distanceKm > 0 ? d.durationSec / d.distanceKm : 0;
  const rows: { label: string; value: string; delta?: number | null }[] = [
    { label: 'Distance', value: `${d.distanceKm.toFixed(2)} km`, delta: deltas.distance },
    { label: 'Total Time', value: fmtDuration(d.durationSec), delta: deltas.time },
    { label: 'Pace', value: `${fmtPace(pace)} /km`, delta: deltas.pace },
    { label: 'Calories', value: `${Math.round(d.calories)} kcal`, delta: deltas.calories },
  ];

  const rowsTop = py + 320;
  const rowH = (ph - 320 - 120) / rows.length;
  rows.forEach((row, i) => {
    const y = rowsTop + rowH * i;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#99a3b2';
    ctx.font = '600 28px "Plus Jakarta Sans"';
    ctx.fillText(row.label, left, y + 8);

    ctx.fillStyle = '#f4f6fa';
    ctx.font = '700 76px "Space Grotesk"';
    ctx.fillText(row.value, left, y + 82);

    if (row.delta != null && isFinite(row.delta) && Math.abs(row.delta) >= 1) {
      const up = row.delta > 0;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#b6f23d';
      ctx.font = '700 40px "Plus Jakarta Sans"';
      ctx.fillText(`${up ? '▲' : '▼'} ${Math.abs(Math.round(row.delta))}%`, right, y + 28);
      ctx.fillStyle = '#6b7585';
      ctx.font = '600 24px "Plus Jakarta Sans"';
      ctx.fillText('vs your average', right, y + 66);
    }

    if (i < rows.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, y + rowH - 44);
      ctx.lineTo(right, y + rowH - 44);
      ctx.stroke();
    }
  });

  // --- Footer banner (brand strip, clipped to the panel's rounded bottom) ---
  ctx.shadowBlur = 0;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, r);
  ctx.clip();
  const bandH = 92;
  const bandY = py + ph - bandH;
  const band = ctx.createLinearGradient(px, 0, px + pw, 0);
  band.addColorStop(0, '#c7ff4a');
  band.addColorStop(1, '#8fe02e');
  ctx.fillStyle = band;
  ctx.fillRect(px, bandY, pw, bandH);
  ctx.fillStyle = '#0b1004';
  ctx.font = '800 32px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '3px';
  ctx.fillText('FITNESS FREAK · YOUR ACTIVITY', px + pw / 2, bandY + bandH / 2 + 1);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

// Walking/running/cycling calorie estimate (kcal) from distance & body weight.
export function estimateCalories(type: string, distanceKm: number, weightKg: number) {
  const perKgPerKm: Record<string, number> = { walk: 0.53, hike: 0.62, run: 1.03, ride: 0.28 };
  const f = perKgPerKm[type] ?? 0.53;
  return Math.max(0, f * weightKg * distanceKm);
}
