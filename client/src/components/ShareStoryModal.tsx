import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui';
import { Icon } from './icons';
import { renderStory, renderStatsStory, estimateCalories, type StatsDeltas } from '../lib/storyCard';
import type { Session } from '../types';

type Mode = 'solid' | 'overlay' | 'stats';

function computeDeltas(session: Session, sessions: Session[], weightKg: number): StatsDeltas {
  const prior = sessions.filter((s) => s.type === session.type && s.id !== session.id);
  if (prior.length === 0) return {};
  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const pct = (cur: number, avg: number) => (avg > 0 ? ((cur - avg) / avg) * 100 : null);
  const curPace = session.distance_km > 0 ? session.duration_sec / session.distance_km : 0;
  const paceVals = prior.filter((s) => s.distance_km > 0).map((s) => s.duration_sec / s.distance_km);
  const curCal = estimateCalories(session.type, session.distance_km, weightKg);
  return {
    distance: pct(session.distance_km, mean(prior.map((s) => s.distance_km))),
    time: pct(session.duration_sec, mean(prior.map((s) => s.duration_sec))),
    pace: paceVals.length ? pct(curPace, mean(paceVals)) : null,
    calories: pct(curCal, mean(prior.map((s) => estimateCalories(s.type, s.distance_km, weightKg)))),
  };
}

export function ShareStoryModal({
  session,
  sessions = [],
  weightKg,
  userName,
  onClose,
}: {
  session: Session;
  sessions?: Session[];
  weightKg: number;
  userName?: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('solid');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    setNote('');
    const calories = estimateCalories(session.type, session.distance_km, weightKg);
    const data = {
      type: session.type,
      title: session.title,
      date: session.date,
      distanceKm: session.distance_km,
      durationSec: session.duration_sec,
      calories,
      userName,
    };
    const job =
      mode === 'stats'
        ? renderStatsStory(canvas, data, computeDeltas(session, sessions, weightKg))
        : renderStory(canvas, data, { transparent: mode === 'overlay' });
    job.then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const transparentMode = mode === 'overlay' || mode === 'stats';

  const filename = `fitness-freak-${session.type}-${session.date}${mode !== 'solid' ? `-${mode}` : ''}.png`;

  function toBlob(): Promise<Blob | null> {
    return new Promise((res) => canvasRef.current?.toBlob((b) => res(b), 'image/png'));
  }

  async function download() {
    const blob = await toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    setNote('');
    try {
      const blob = await toBlob();
      if (!blob) return;
      const Clip = (window as any).ClipboardItem;
      if (!Clip || !navigator.clipboard?.write) {
        await download();
        setNote("Your browser can't copy images — downloaded it instead.");
        return;
      }
      await navigator.clipboard.write([new Clip({ 'image/png': blob })]);
      setNote('Copied! Paste it onto your photo in Instagram, Canva, Photos, etc.');
    } catch {
      await download();
      setNote("Couldn't copy here — downloaded it instead so you can drop it on your photo.");
    }
  }

  async function share() {
    setBusy(true);
    setNote('');
    try {
      const blob = await toBlob();
      if (!blob) return;
      const file = new File([blob], filename, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: any) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'My activity',
          text: `${session.distance_km.toFixed(2)} km with Fitness Freak`,
        });
      } else {
        await download();
        setNote('Saved the image — open Instagram and add it to your story.');
      }
    } catch {
      /* user cancelled share */
    } finally {
      setBusy(false);
    }
  }

  const checker = transparentMode
    ? {
        backgroundColor: '#0f131a',
        backgroundImage:
          'linear-gradient(45deg,#242b38 25%,transparent 25%),linear-gradient(-45deg,#242b38 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#242b38 75%),linear-gradient(-45deg,transparent 75%,#242b38 75%)',
        backgroundSize: '22px 22px',
        backgroundPosition: '0 0,0 11px,11px -11px,-11px 0',
      }
    : { background: 'var(--bg)' };

  const HINTS: Record<Mode, string> = {
    solid: 'A 9:16 story card — share straight to Instagram, or download it.',
    overlay: 'A transparent PNG — copy it and paste it on top of your own run photo.',
    stats: 'A translucent stats card to drop over your run photo — with how this one compares to your average.',
  };

  return (
    <Modal title="Share your activity" onClose={onClose}>
      <div className="pill-tabs" style={{ marginBottom: 14 }}>
        <button className={`pill${mode === 'solid' ? ' active' : ''}`} onClick={() => setMode('solid')}>
          Card
        </button>
        <button className={`pill${mode === 'stats' ? ' active' : ''}`} onClick={() => setMode('stats')}>
          Stats overlay
        </button>
        <button className={`pill${mode === 'overlay' ? ' active' : ''}`} onClick={() => setMode('overlay')}>
          Transparent
        </button>
      </div>
      <p className="hint" style={{ marginBottom: 14 }}>
        {HINTS[mode]}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          padding: 14,
          ...checker,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            height: '56vh',
            maxHeight: 500,
            width: 'auto',
            borderRadius: 14,
            boxShadow: '0 12px 40px -10px rgba(0,0,0,0.6)',
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
      </div>

      {note && (
        <p className="hint" style={{ marginTop: 12, color: 'var(--accent)' }}>
          {note}
        </p>
      )}

      <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
        <button className="btn-ghost" onClick={copy} disabled={!ready}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="copy" size={15} /> Copy
          </span>
        </button>
        <button className="btn-ghost" onClick={download} disabled={!ready}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="download" size={15} /> Download
          </span>
        </button>
        <button className="btn" onClick={share} disabled={!ready || busy}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="share" size={15} /> {busy ? 'Opening…' : 'Share'}
          </span>
        </button>
      </div>
    </Modal>
  );
}
