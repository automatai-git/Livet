import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getDayWindow, setDayWindow, DEFAULT_WINDOW, parseHM } from '../lib/dayWindow';
import { resetUsage } from '../lib/appUsage';
import { canInstall, onInstallAvailable, promptInstall, isIOS, isStandalone } from '../lib/installPrompt';
import { APP_REGISTRY } from '../data/appRegistry';
import AppIcon from '../components/AppIcon';
import TabBar from '../components/shell/TabBar';

// Known offline cache keys — presence means the app works without network.
const CACHE_KEYS = ['life-tree-cache-v1', 'book-cloud-library-v1', 'user-config-cache'];

const You = () => {
  const [user, setUser] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [installable, setInstallable] = useState(canInstall());
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [dayWin, setDayWin] = useState(getDayWindow());
  const [editingWindow, setEditingWindow] = useState(false);
  const [usageCleared, setUsageCleared] = useState(false);

  useEffect(() => {
    // getSession reads the locally persisted session (no network round-trip).
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user ?? null));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const unsub = onInstallAvailable(setInstallable);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      unsub();
    };
  }, []);

  const email = user?.email ?? '';
  const name = email ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : '—';
  const initial = (name[0] || '?').toUpperCase();
  const cachesReady = CACHE_KEYS.some((k) => localStorage.getItem(k) != null);

  const handleInstall = async () => {
    if (isIOS() && !isStandalone()) { setShowIOSHelp((v) => !v); return; }
    if (installable) await promptInstall();
  };

  const saveWindow = (next) => {
    if (parseHM(next.start) != null && parseHM(next.end) != null && parseHM(next.end) > parseHM(next.start)) {
      setDayWindow(next);
    }
    setDayWin(getDayWindow());
  };

  const handleReset = () => {
    resetUsage();
    setUsageCleared(true);
    setTimeout(() => setUsageCleared(false), 2500);
  };

  return (
    <div className="tab-page">
      <h1 className="heading-serif page-display">You<span className="display-dot">.</span></h1>

      <div className="surface-card you-profile">
        <div className="you-avatar heading-serif">{initial}</div>
        <div className="you-profile-body">
          <div className="row-title">{name}</div>
          <div className="row-meta ellipsis">{email ? `${email} · Supabase` : 'Signed in · Supabase'}</div>
        </div>
        <button type="button" className="ghost-pill" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      <div className="surface-card you-card">
        <div className="you-row">
          <span className="status-dot" style={{ background: online ? '#6B9E72' : '#D5D0C2' }} aria-hidden="true" />
          <div className="you-row-title">{online ? 'Synced' : 'Offline'}</div>
          <div className="row-meta">{online ? 'just now' : 'changes queue locally'}</div>
        </div>
        <div className="inset-divider" />
        <div className="you-row">
          <span className="status-dot" style={{ background: '#D5D0C2' }} aria-hidden="true" />
          <div className="you-row-title">Offline cache</div>
          <div className="row-meta">{cachesReady ? `ready · all ${APP_REGISTRY.length} apps` : 'builds as you use the apps'}</div>
        </div>
      </div>

      <div className="eyebrow you-section-label">Settings</div>
      <div className="surface-card you-card">
        <button type="button" className="you-row tappable" onClick={handleInstall}>
          <div className="you-row-title">Install on home screen</div>
          <AppIcon name="chev" size={14} className="row-chev" />
        </button>
        {showIOSHelp && (
          <div className="you-note">
            Tap the <strong>Share</strong> icon in Safari, then <strong>Add to Home Screen</strong>.
          </div>
        )}
        <div className="inset-divider" />
        <button type="button" className="you-row tappable" onClick={() => setEditingWindow((v) => !v)}>
          <div className="you-row-title">Day window</div>
          <div className="row-meta tnum">{dayWin.start} – {dayWin.end}</div>
          <AppIcon name="chev" size={14} className="row-chev" style={{ transform: editingWindow ? 'rotate(90deg)' : 'none' }} />
        </button>
        {editingWindow && (
          <div className="you-note you-window-edit">
            <label>
              Start
              <input
                type="time"
                value={dayWin.start}
                onChange={(e) => saveWindow({ ...dayWin, start: e.target.value })}
              />
            </label>
            <label>
              End
              <input
                type="time"
                value={dayWin.end}
                onChange={(e) => saveWindow({ ...dayWin, end: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="ghost-pill sm"
              onClick={() => { setDayWindow(DEFAULT_WINDOW); setDayWin(DEFAULT_WINDOW); }}
            >
              Reset
            </button>
          </div>
        )}
        <div className="inset-divider" />
        <div className="you-row">
          <div className="you-row-title">Week starts</div>
          <div className="row-meta">Monday</div>
        </div>
        <div className="inset-divider" />
        <button type="button" className="you-row tappable" onClick={handleReset}>
          <div className="you-row-main">
            <div className="you-row-title">Reset usage sorting</div>
            <div className="row-meta">{usageCleared ? 'Cleared — canonical order restored' : 'Clears the localStorage open-counts'}</div>
          </div>
          <AppIcon name="chev" size={14} className="row-chev" />
        </button>
      </div>

      <footer className="you-footer">Livet v3 · one system, {APP_REGISTRY.length} apps</footer>

      <TabBar />
    </div>
  );
};

export default You;
