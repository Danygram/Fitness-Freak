// Reminder preferences live in localStorage because notifications are
// per-device/browser (permission + delivery only work on this device, and only
// while the app is open — there's no push server). This keeps them honest & local.

export interface ReminderPrefs {
  meals: { breakfast: string | null; lunch: string | null; dinner: string | null };
  water: { enabled: boolean; everyMin: number };
  weighIn: { enabled: boolean; day: number; time: string }; // day 0=Sun..6=Sat
}

const KEY = 'ff_reminders';

export const DEFAULT_PREFS: ReminderPrefs = {
  meals: { breakfast: null, lunch: null, dinner: null },
  water: { enabled: false, everyMin: 120 },
  weighIn: { enabled: false, day: 1, time: '08:00' },
};

export function loadPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      meals: { ...DEFAULT_PREFS.meals, ...(parsed.meals || {}) },
      water: { ...DEFAULT_PREFS.water, ...(parsed.water || {}) },
      weighIn: { ...DEFAULT_PREFS.weighIn, ...(parsed.weighIn || {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReminderPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function notificationStatus(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

// --- "already fired today" bookkeeping so a notification fires once per day ---
function firedKey(id: string, dayISO: string) {
  return `ff_fired_${id}_${dayISO}`;
}

export function hasFired(id: string, dayISO: string): boolean {
  try {
    return localStorage.getItem(firedKey(id, dayISO)) === '1';
  } catch {
    return false;
  }
}

export function markFired(id: string, dayISO: string) {
  try {
    localStorage.setItem(firedKey(id, dayISO), '1');
  } catch {
    /* ignore */
  }
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Runs one scheduler tick: fires due notifications (once/day). Call on an interval
// while the app is open. `today` is the local YYYY-MM-DD.
export function runReminderTick(today: string) {
  const prefs = loadPrefs();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  (['breakfast', 'lunch', 'dinner'] as const).forEach((m) => {
    const t = prefs.meals[m];
    if (t && timeToMin(t) <= nowMin && !hasFired(`meal_${m}`, today)) {
      markFired(`meal_${m}`, today);
      notify('Fitness Freak', `Time to log your ${m} 🍽️`);
    }
  });

  if (
    prefs.weighIn.enabled &&
    now.getDay() === prefs.weighIn.day &&
    timeToMin(prefs.weighIn.time) <= nowMin &&
    !hasFired('weighin', today)
  ) {
    markFired('weighin', today);
    notify('Fitness Freak', 'Time for your weekly weigh-in ⚖️');
  }

  if (prefs.water.enabled) {
    let last = 0;
    try {
      last = Number(localStorage.getItem('ff_water_last') || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - last >= prefs.water.everyMin * 60000) {
      try {
        localStorage.setItem('ff_water_last', String(Date.now()));
      } catch {
        /* ignore */
      }
      if (last) notify('Fitness Freak', 'Time to drink some water 💧');
    }
  }
}

export function notify(title: string, body: string) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', tag: title });
    }
  } catch {
    /* ignore */
  }
}
