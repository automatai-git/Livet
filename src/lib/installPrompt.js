// Add-to-home-screen plumbing, moved off the old Dashboard so the You tab
// can trigger it. `beforeinstallprompt` fires once, early — capture it at
// module scope (init runs from main.jsx) and hand it to whoever asks later.

let deferredPrompt = null;
const listeners = new Set();

export const initInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((cb) => cb(true));
  });
};

export const canInstall = () => Boolean(deferredPrompt);

export const onInstallAvailable = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
};

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
