type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
};

let sentinel: WakeLockSentinelLike | null = null;
let desired = false;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function requestLock(): Promise<boolean> {
  if (!isWakeLockSupported() || !desired) return false;
  try {
    const nav = navigator as Navigator & {
      wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    sentinel = await nav.wakeLock.request('screen');
    sentinel.addEventListener?.('release', () => {
      sentinel = null;
      if (desired && document.visibilityState === 'visible') {
        void requestLock();
      }
    });
    return true;
  } catch {
    sentinel = null;
    return false;
  }
}

export async function enableWakeLock(): Promise<{ ok: boolean; fallback: boolean }> {
  desired = true;
  if (!isWakeLockSupported()) {
    // Fallback: no-op flag; UI može držati video/audio trick nije potreban
    return { ok: false, fallback: true };
  }
  const ok = await requestLock();
  return { ok, fallback: !ok };
}

export async function disableWakeLock(): Promise<void> {
  desired = false;
  try {
    await sentinel?.release();
  } catch {
    /* ignore */
  }
  sentinel = null;
}

export function isWakeLockActive(): boolean {
  return Boolean(sentinel);
}

/** Reaktiviraj nakon povratka na tab. */
export function bindWakeLockVisibility(): () => void {
  const onVis = () => {
    if (document.visibilityState === 'visible' && desired) void requestLock();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => document.removeEventListener('visibilitychange', onVis);
}
