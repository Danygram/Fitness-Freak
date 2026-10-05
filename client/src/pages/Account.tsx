import { useState } from 'react';
import { api, getToken } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Modal } from '../components/ui';
import type { User } from '../types';

export default function Account() {
  const { user, updateUser, logout } = useAuth();

  // profile
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  // export / delete
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await api<{ user: User }>('/auth/profile', {
        method: 'PATCH',
        body: { name, email },
      });
      updateUser(res.user);
      setProfileMsg('Saved ✓');
      setTimeout(() => setProfileMsg(''), 2000);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setSavingPw(true);
    setPwMsg('');
    setPwErr('');
    try {
      await api('/auth/password', {
        method: 'POST',
        body: { currentPassword: currentPw, newPassword: newPw },
      });
      setPwMsg('Password updated ✓');
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => setPwMsg(''), 2500);
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setSavingPw(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch('/api/auth/export', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fitness-freak-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteErr('');
    try {
      await api('/auth/account', { method: 'DELETE', body: { password: deletePw } });
      logout();
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : 'Could not delete account');
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle="Manage your profile, password, and data." />

      <div className="grid cols-2">
        <div className="card">
          <div className="card-title">Profile</div>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {profileMsg && <span className="hint">{profileMsg}</span>}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Change password</div>
          <div className="field">
            <label>Current password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label>New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          {pwErr && <div className="error-text">{pwErr}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn"
              onClick={changePassword}
              disabled={savingPw || !currentPw || newPw.length < 6}
            >
              {savingPw ? 'Updating…' : 'Update password'}
            </button>
            {pwMsg && <span className="hint">{pwMsg}</span>}
          </div>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">Your data</div>
        <p className="hint" style={{ marginBottom: 14 }}>
          Download everything you've logged — meals, weigh-ins, workouts, activity, goals and
          settings — as a single JSON file.
        </p>
        <button className="btn-ghost" onClick={exportData} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Export my data'}
        </button>
      </div>

      <div className="card section-gap" style={{ borderColor: 'rgba(247,109,109,0.3)' }}>
        <div className="card-title" style={{ color: 'var(--danger)' }}>
          Danger zone
        </div>
        <p className="hint" style={{ marginBottom: 14 }}>
          Permanently delete your account and everything in it. This can't be undone.
        </p>
        <button
          className="btn-ghost"
          style={{ borderColor: 'rgba(247,109,109,0.4)', color: 'var(--danger)' }}
          onClick={() => {
            setShowDelete(true);
            setDeletePw('');
            setDeleteErr('');
          }}
        >
          Delete account
        </button>
      </div>

      {showDelete && (
        <Modal title="Delete account" onClose={() => setShowDelete(false)}>
          <p className="hint" style={{ marginBottom: 16 }}>
            This permanently deletes your account and all your data. Enter your password to confirm.
          </p>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {deleteErr && <div className="error-text">{deleteErr}</div>}
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setShowDelete(false)}>
              Cancel
            </button>
            <button
              className="btn"
              style={{ background: 'var(--danger)', color: '#fff', boxShadow: 'none' }}
              onClick={deleteAccount}
              disabled={deleting || !deletePw}
            >
              {deleting ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
