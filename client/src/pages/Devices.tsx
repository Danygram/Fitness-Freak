import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Device, IntegrationStatus } from '../types';
import { Empty, Modal, PageHeader, Spinner, Switch } from '../components/ui';
import { Icon, type IconName } from '../components/icons';

const CATALOG: { type: string; label: string; icon: IconName }[] = [
  { type: 'apple_watch', label: 'Apple Watch', icon: 'watch' },
  { type: 'fitbit', label: 'Fitbit', icon: 'band' },
  { type: 'whoop', label: 'WHOOP', icon: 'band' },
  { type: 'garmin', label: 'Garmin', icon: 'watch' },
  { type: 'oura', label: 'Oura Ring', icon: 'ring' },
  { type: 'samsung', label: 'Galaxy Watch', icon: 'watch' },
  { type: 'google_fit', label: 'Google Fit', icon: 'activity' },
  { type: 'polar', label: 'Polar', icon: 'watch' },
  { type: 'other', label: 'Other device', icon: 'watch' },
];

function catalogFor(type: string) {
  return CATALOG.find((c) => c.type === type) ?? CATALOG[CATALOG.length - 1];
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never synced';
  const then = new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const diff = (Date.now() - then) / 1000;
  if (diff < 45) return 'synced just now';
  if (diff < 3600) return `synced ${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `synced ${Math.floor(diff / 3600)} h ago`;
  return `synced ${Math.floor(diff / 86400)} d ago`;
}

function batteryColor(pct: number) {
  if (pct <= 15) return 'var(--danger)';
  if (pct <= 40) return 'var(--amber)';
  return 'var(--accent)';
}

function Battery({ pct }: { pct: number }) {
  return (
    <div className="device-battery">
      <div className="battery">
        <div className="fill" style={{ width: `${pct}%`, background: batteryColor(pct) }} />
      </div>
      <span className="battery-pct" style={{ color: batteryColor(pct) }}>
        {pct}%
      </span>
    </div>
  );
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // add form
  const [type, setType] = useState('apple_watch');
  const [name, setName] = useState('');
  const [battery, setBattery] = useState('85');
  const [adding, setAdding] = useState(false);

  // Google Health (Fitbit Air) integration
  const [integ, setInteg] = useState<IntegrationStatus | null>(null);
  const [integMsg, setIntegMsg] = useState('');
  const [integBusy, setIntegBusy] = useState(false);

  function loadStatus() {
    return api<IntegrationStatus>('/integrations/status').then(setInteg).catch(() => {});
  }

  useEffect(() => {
    Promise.all([api<Device[]>('/devices'), api<IntegrationStatus>('/integrations/status')])
      .then(([d, s]) => {
        setDevices(d);
        setInteg(s);
      })
      .finally(() => setLoading(false));

    // Handle the OAuth redirect result (?connected=google_health | error)
    const params = new URLSearchParams(window.location.search);
    const c = params.get('connected');
    if (c === 'google_health') setIntegMsg('✅ Fitbit Air connected via Google Health. Hit Sync to pull your data.');
    else if (c === 'error') setIntegMsg('Couldn’t complete the connection — please try again.');
    if (c) window.history.replaceState({}, '', '/devices');
  }, []);

  async function connectGoogleHealth() {
    setIntegBusy(true);
    setIntegMsg('');
    try {
      const { url } = await api<{ url: string }>('/integrations/google_health/connect');
      window.location.href = url;
    } catch (err) {
      setIntegMsg(err instanceof Error ? err.message : 'Could not start connection');
      setIntegBusy(false);
    }
  }

  async function syncGoogleHealth() {
    setIntegBusy(true);
    setIntegMsg('');
    try {
      const r = await api<{ steps: number; workouts: number; activeMinutes: number; warnings: string[] }>(
        '/integrations/google_health/sync',
        { method: 'POST' }
      );
      const parts: string[] = [];
      if (r.steps) parts.push(`${r.steps.toLocaleString()} steps`);
      if (r.workouts) parts.push(`${r.workouts} workout${r.workouts === 1 ? '' : 's'}`);
      if (r.activeMinutes) parts.push(`${r.activeMinutes} active min`);
      setIntegMsg(
        parts.length ? `Synced: ${parts.join(' · ')} for today.` : 'Synced — no new data for today yet.'
      );
      await loadStatus();
    } catch (err) {
      setIntegMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIntegBusy(false);
    }
  }

  async function disconnectGoogleHealth() {
    setIntegBusy(true);
    try {
      await api('/integrations/google_health', { method: 'DELETE' });
      await loadStatus();
      setIntegMsg('Disconnected from Google Health.');
    } finally {
      setIntegBusy(false);
    }
  }

  async function addDevice() {
    const finalName = name.trim() || catalogFor(type).label;
    setAdding(true);
    try {
      const created = await api<Device>('/devices', {
        method: 'POST',
        body: { name: finalName, type, battery: Number(battery) || 100 },
      });
      setDevices((prev) => [created, ...prev]);
      setName('');
      setBattery('85');
      setType('apple_watch');
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  }

  async function sync(d: Device) {
    setSyncingId(d.id);
    try {
      const updated = await api<Device>(`/devices/${d.id}/sync`, { method: 'POST' });
      setDevices((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
    } finally {
      setSyncingId(null);
    }
  }

  async function toggleConnected(d: Device) {
    const updated = await api<Device>(`/devices/${d.id}`, {
      method: 'PUT',
      body: { connected: d.connected ? false : true },
    });
    setDevices((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
  }

  async function remove(id: number) {
    await api(`/devices/${id}`, { method: 'DELETE' });
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Devices" subtitle="Your connected watches, bands and trackers." />

      {/* Real integration: Fitbit Air via the Google Health API */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          Connected services
          <span className="hint">live sync from your fitness account</span>
        </div>
        <div className="device-head" style={{ marginBottom: 14 }}>
          <div
            className="device-ic"
            style={
              integ?.connected
                ? undefined
                : { color: 'var(--text-faint)', background: 'var(--surface-3)' }
            }
          >
            <Icon name="band" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="device-name">Fitbit Air</div>
            <div className="device-brand">Google Health API · steps, workouts, heart rate, sleep</div>
          </div>
          <span className={`device-status ${integ?.connected ? 'on' : 'off'}`}>
            {integ?.connected ? (
              <>
                <Icon name="bluetooth" /> Connected
              </>
            ) : (
              'Not connected'
            )}
          </span>
        </div>

        {!integ?.configured ? (
          <p className="hint">
            Setup needed: add your <code>GOOGLE_HEALTH_CLIENT_ID</code> and{' '}
            <code>GOOGLE_HEALTH_CLIENT_SECRET</code> to <code>server/.env</code> (see{' '}
            <code>server/.env.example</code>), then restart the server. This links your real
            Fitbit Air account via Google.
          </p>
        ) : integ.connected ? (
          <div className="device-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button className="btn btn-sm" onClick={syncGoogleHealth} disabled={integBusy}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name="refresh" size={14} /> {integBusy ? 'Syncing…' : 'Sync now'}
              </span>
            </button>
            {integ.last_synced && (
              <span className="device-synced">last synced {new Date(integ.last_synced.replace(' ', 'T') + 'Z').toLocaleString()}</span>
            )}
            <span className="spacer" />
            <button className="btn-ghost btn-sm" onClick={disconnectGoogleHealth} disabled={integBusy}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="btn" onClick={connectGoogleHealth} disabled={integBusy}>
            {integBusy ? 'Redirecting…' : 'Connect Fitbit Air'}
          </button>
        )}

        {integMsg && (
          <p className="hint" style={{ marginTop: 12, color: 'var(--accent)' }}>
            {integMsg}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <button className="btn" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? 'Close' : '＋ Add a device'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Add a device</div>
          <div className="pill-tabs">
            {CATALOG.map((c) => (
              <button
                key={c.type}
                className={`pill${type === c.type ? ' active' : ''}`}
                onClick={() => setType(c.type)}
              >
                <Icon name={c.icon} size={15} /> {c.label}
              </button>
            ))}
          </div>
          <div className="form-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Device name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={catalogFor(type).label}
              />
            </div>
            <div className="field">
              <label>Battery (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={battery}
                onChange={(e) => setBattery(e.target.value)}
              />
            </div>
          </div>
          <button className="btn" onClick={addDevice} disabled={adding}>
            {adding ? 'Pairing…' : 'Add device'}
          </button>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="card">
          <Empty icon={<Icon name="watch" />}>
            No devices yet. Add your Apple Watch, WHOOP, Fitbit or any tracker above.
          </Empty>
        </div>
      ) : (
        <div className="device-grid">
          {devices.map((d) => {
            const cat = catalogFor(d.type);
            const connected = !!d.connected;
            return (
              <div className="card" key={d.id}>
                <div className="device-head">
                  <div className="device-ic" style={connected ? undefined : { color: 'var(--text-faint)', background: 'var(--surface-3)' }}>
                    <Icon name={cat.icon} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="device-name">{d.name}</div>
                    <div className="device-brand">{cat.label}</div>
                  </div>
                  <span className={`device-status ${connected ? 'on' : 'off'}`}>
                    {connected ? (
                      <>
                        <Icon name="bluetooth" /> Connected
                      </>
                    ) : (
                      'Disconnected'
                    )}
                  </span>
                </div>

                <div className="device-meta">
                  <Battery pct={d.battery} />
                  <span className="device-synced">{connected ? timeAgo(d.last_synced) : 'offline'}</span>
                </div>

                <div className="device-actions">
                  <button className="btn-ghost btn-sm" onClick={() => sync(d)} disabled={!connected || syncingId === d.id}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Icon name="refresh" size={14} /> {syncingId === d.id ? 'Syncing…' : 'Sync'}
                    </span>
                  </button>
                  <label
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}
                  >
                    <Switch checked={connected} onChange={() => toggleConnected(d)} />
                  </label>
                  <span className="spacer" />
                  <button className="btn-icon btn-icon-edit" onClick={() => setEditing(d)} title="Edit">
                    <Icon name="edit" />
                  </button>
                  <button className="btn-icon" onClick={() => remove(d.id)} title="Remove">
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditDeviceModal
          device={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            setDevices((prev) => prev.map((x) => (x.id === u.id ? u : x)));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function EditDeviceModal({
  device,
  onClose,
  onSaved,
}: {
  device: Device;
  onClose: () => void;
  onSaved: (d: Device) => void;
}) {
  const [name, setName] = useState(device.name);
  const [type, setType] = useState(device.type);
  const [battery, setBattery] = useState(String(device.battery));
  const [connected, setConnected] = useState(!!device.connected);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await api<Device>(`/devices/${device.id}`, {
        method: 'PUT',
        body: { name: name.trim() || device.name, type, battery: Number(battery) || 0, connected },
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit device" onClose={onClose}>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {CATALOG.map((c) => (
              <option key={c.type} value={c.type}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Battery (%)</label>
          <input type="number" min={0} max={100} value={battery} onChange={(e) => setBattery(e.target.value)} />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-dim)' }}>
        <Switch checked={connected} onChange={setConnected} /> Connected
      </label>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}
