import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { useProtocol } from '../../context/ProtocolContext';
import { useNotifications } from '../../context/NotificationContext';
import { ublApi } from '../../services/ublApi';
import type { Entity, UserSettings } from '../../types';

function dicebearAvatar(seed: string) {
  const s = encodeURIComponent(seed.trim() || 'User');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
}

function maskToken(t?: string | null) {
  if (!t) return '';
  if (t.length <= 10) return '••••••••';
  return `${t.slice(0, 6)}••••••${t.slice(-4)}`;
}

const SettingsSection: React.FC = () => {
  const { session, updateMe, logout } = useOnboarding();
  const { updateEntity } = useProtocol();
  const { notify } = useNotifications();
  const { theme, toggleTheme, fontSize, setFontSize, audioEnabled, setAudioEnabled } = useTheme();

  const me = session?.user;
  const tenant = session?.tenant;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Partial<Entity>>({});

  const [settings, setSettings] = useState<UserSettings>({
    theme,
    fontSize,
    audioEnabled,
    notificationsEnabled: true
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load server-side preferences (best effort; local settings remain source of truth for instant UX)
  useEffect(() => {
    let alive = true;
    if (!session?.token) return;
    ublApi
      .getSettings()
      .then((s) => {
        if (!alive) return;
        const merged: UserSettings = {
          theme: (s.theme || theme) as any,
          fontSize: (s.fontSize || fontSize) as any,
          audioEnabled: typeof s.audioEnabled === 'boolean' ? s.audioEnabled : audioEnabled,
          notificationsEnabled: typeof s.notificationsEnabled === 'boolean' ? s.notificationsEnabled : true
        };
        setSettings(merged);
        // Sync local UI controls with stored settings.
        if (merged.theme && merged.theme !== theme) toggleTheme();
        if (merged.fontSize && merged.fontSize !== fontSize) setFontSize(merged.fontSize);
        if (typeof merged.audioEnabled === 'boolean' && merged.audioEnabled !== audioEnabled) {
          setAudioEnabled(merged.audioEnabled);
        }
        setSettingsLoaded(true);
      })
      .catch(() => {
        setSettingsLoaded(true);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    // Keep settings state in sync with current UI settings.
    setSettings((prev) => ({ ...prev, theme, fontSize, audioEnabled }));
  }, [theme, fontSize, audioEnabled]);

  const statusPill = useMemo(() => {
    const s = me?.status || 'online';
    return s === 'online'
      ? { label: 'Online', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
      : { label: 'Offline', cls: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
  }, [me?.status]);

  const canSave = useMemo(() => {
    if (!isEditing) return false;
    const nameOk = typeof profileDraft.name === 'string' ? profileDraft.name.trim().length >= 2 : true;
    return nameOk;
  }, [isEditing, profileDraft]);

  const startEdit = () => {
    if (!me) return;
    setIsEditing(true);
    setProfileDraft({
      name: me.name,
      role: me.role,
      phone: me.phone,
      about: me.about,
      avatar: me.avatar,
      status: me.status
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setProfileDraft({});
  };

  const saveProfile = async () => {
    if (!me || !canSave) return;
    setIsSaving(true);
    try {
      const patch: Partial<Entity> = {
        name: profileDraft.name?.trim(),
        role: profileDraft.role?.trim(),
        phone: profileDraft.phone?.trim(),
        about: profileDraft.about || '',
        avatar: profileDraft.avatar,
        status: profileDraft.status
      };
      const updated = await updateMe(patch);
      await updateEntity(updated);
      notify({ type: 'success', title: 'Saved', message: 'Account details updated.' });
      setIsEditing(false);
    } catch (e: any) {
      notify({ type: 'error', title: 'Save Failed', message: e.message || 'Could not update your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const persistSettings = async (patch: Partial<UserSettings>) => {
    try {
      await ublApi.updateSettings(patch);
      notify({ type: 'success', title: 'Settings Updated', message: 'Preferences synced to your node.' });
    } catch (e: any) {
      notify({ type: 'warning', title: 'Local Only', message: e.message || 'Saved locally; server sync failed.' });
    }
  };

  const randomizeAvatar = () => {
    const seed = `${profileDraft.name || me?.name || 'User'}-${Math.random().toString(16).slice(2, 8)}`;
    setProfileDraft((prev) => ({ ...prev, avatar: dicebearAvatar(seed) }));
  };

  const exportSnapshot = async () => {
    try {
      const snap = await ublApi.bootstrap();
      const payload = {
        exportedAt: new Date().toISOString(),
        tenant,
        user: me,
        snapshot: snap
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ubl-snapshot-${tenant?.id || 'tenant'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify({ type: 'success', title: 'Exported', message: 'Workspace snapshot downloaded.' });
    } catch (e: any) {
      notify({ type: 'error', title: 'Export Failed', message: e.message || 'Could not export snapshot.' });
    }
  };

  if (!me || !tenant) {
    return (
      <div className="text-sm text-[var(--text-muted)]">No active session.</div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border-primary)]">
        <i className="fas fa-sliders text-blue-500 text-[10px]"></i>
        <h4 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Protocol Settings</h4>
      </div>

      {/* ACCOUNT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Account</p>
            <p className="text-[9px] text-[var(--text-muted)] font-medium">Identity bound to ledger signatures.</p>
          </div>
          {!isEditing ? (
            <button
              onClick={startEdit}
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={cancelEdit}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="p-5 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)] space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={(isEditing ? (profileDraft.avatar as string) : me.avatar) || me.avatar}
              alt={me.name}
              className="w-14 h-14 rounded-2xl border border-[var(--border-primary)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-main)] truncate">{me.name}</p>
                <span className={`text-[8px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${statusPill.cls}`}>{statusPill.label}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-medium">{me.role || 'Member'} • {tenant.domain}</p>
              <p className="text-[9px] text-[var(--text-muted)] font-mono">TOKEN: {maskToken(session.token)}</p>
            </div>
          </div>

          {isEditing && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={randomizeAvatar}
                className="px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/50"
                type="button"
              >
                Randomize Avatar
              </button>
              <button
                onClick={() => setProfileDraft((p) => ({ ...p, status: (p.status === 'online' ? 'offline' : 'online') as any }))}
                className="px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/50"
                type="button"
              >
                Toggle Status
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</label>
              <input
                disabled={!isEditing}
                value={(isEditing ? (profileDraft.name as string) : me.name) || ''}
                onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
                className="mt-2 w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Role</label>
              <input
                disabled={!isEditing}
                value={(isEditing ? (profileDraft.role as string) : me.role) || ''}
                onChange={(e) => setProfileDraft((p) => ({ ...p, role: e.target.value }))}
                className="mt-2 w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Phone</label>
              <input
                disabled={!isEditing}
                value={(isEditing ? (profileDraft.phone as string) : me.phone) || ''}
                onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+351 …"
                className="mt-2 w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">About</label>
              <textarea
                disabled={!isEditing}
                rows={3}
                value={(isEditing ? (profileDraft.about as string) : me.about) || ''}
                onChange={(e) => setProfileDraft((p) => ({ ...p, about: e.target.value }))}
                className="mt-2 w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none disabled:opacity-60"
              />
            </div>
          </div>

          {isEditing && (
            <button
              onClick={saveProfile}
              disabled={!canSave || isSaving}
              className={`w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${
                !canSave || isSaving
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/10'
              }`}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-primary)]">
            <button
              onClick={() => navigator.clipboard.writeText(session.token)}
              className="px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/50"
              type="button"
            >
              Copy Token
            </button>
            <button
              onClick={() => logout()}
              className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
              type="button"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Workspace</p>
          <p className="text-[9px] text-[var(--text-muted)] font-medium">Tenant namespace + invite handshake.</p>
        </div>

        <div className="p-5 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)] space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">{tenant.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium">DOMAIN: {tenant.domain}</p>
            </div>
            <span className="text-[8px] px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 font-black uppercase tracking-widest">
              {tenant.tier}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {tenant.namespaceHash && (
              <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Namespace Hash</p>
                  <p className="text-[11px] font-mono text-[var(--text-main)]">{tenant.namespaceHash}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(String(tenant.namespaceHash))}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500"
                >
                  Copy
                </button>
              </div>
            )}
            {tenant.inviteCode && (
              <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Invite Code</p>
                  <p className="text-[11px] font-mono text-[var(--text-main)]">{tenant.inviteCode}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(String(tenant.inviteCode))}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREFERENCES */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Preferences</p>
          <p className="text-[9px] text-[var(--text-muted)] font-medium">UI + notification behavior.</p>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)] transition-all hover:border-blue-500/30">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800 text-amber-400' : 'bg-white text-blue-500 shadow-sm'}`}>
              <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
            </div>
            <div>
              <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Interface Theme</p>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">Light vs Dark nodes.</p>
            </div>
          </div>
          <button
            onClick={() => {
              toggleTheme();
              persistSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
            }}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        {/* Font size */}
        <div className="p-4 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <i className="fas fa-font"></i>
            </div>
            <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Typography Scale</p>
          </div>
          <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-primary)] shadow-inner">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => {
                  setFontSize(size);
                  persistSettings({ fontSize: size });
                }}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  fontSize === size
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-50'
                }`}
              >
                {size === 'sm' ? 'Tight' : size === 'md' ? 'Standard' : 'Relaxed'}
              </button>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)] transition-all hover:border-blue-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <i className={`fas ${audioEnabled ? 'fa-volume-high text-emerald-500' : 'fa-volume-xmark text-slate-300'}`}></i>
            </div>
            <div>
              <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Audio Feedback</p>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">Signal ledger confirmations.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              persistSettings({ audioEnabled: !audioEnabled });
            }}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${audioEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${audioEnabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)] transition-all hover:border-blue-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <i className={`fas ${settings.notificationsEnabled ? 'fa-bell text-blue-500' : 'fa-bell-slash text-slate-300'}`}></i>
            </div>
            <div>
              <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Notifications</p>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">Toasts for important events.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !settings.notificationsEnabled;
              setSettings((p) => ({ ...p, notificationsEnabled: next }));
              persistSettings({ notificationsEnabled: next });
            }}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${settings.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            disabled={!settingsLoaded}
            title={!settingsLoaded ? 'Loading…' : ''}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${settings.notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
      </div>

      {/* DATA */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Data</p>
          <p className="text-[9px] text-[var(--text-muted)] font-medium">Export + cache controls.</p>
        </div>

        <div className="p-5 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-primary)] space-y-3">
          <button
            onClick={exportSnapshot}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-black/10 active:scale-95"
            type="button"
          >
            Export Workspace Snapshot
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('ubl_theme');
              localStorage.removeItem('ubl_font_size');
              localStorage.removeItem('ubl_audio_enabled');
              notify({ type: 'success', title: 'Reset', message: 'UI preferences reset (reload to apply defaults).' });
            }}
            className="w-full py-3 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-main)] hover:bg-white/50 active:scale-95"
            type="button"
          >
            Reset UI Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
