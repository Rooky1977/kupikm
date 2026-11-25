import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { pullNewVersion } from '../../lib/appUpdate';

export function UpdateBanner() {
  const [busy, setBusy] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Provjeri novu verziju svakih 30 min
      window.setInterval(() => {
        void registration.update();
      }, 30 * 60 * 1000);
    },
  });

  const onPull = async () => {
    setBusy(true);
    try {
      if (needRefresh) {
        await updateServiceWorker(true);
      } else {
        await pullNewVersion();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {needRefresh && (
        <div className="update-banner" role="status">
          <span>Dostupna je nova verzija aplikacije.</span>
          <button type="button" className="btn btn-action btn-sm" disabled={busy} onClick={() => void onPull()}>
            {busy ? 'Učitavam…' : 'Povuci novu verziju'}
          </button>
        </div>
      )}
    </>
  );
}

export function PullUpdateButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={compact ? 'btn btn-sm btn-action' : 'btn btn-action'}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void pullNewVersion();
      }}
      title="Preuzmi i učitaj najnoviju verziju"
    >
      {busy ? 'Učitavam…' : compact ? 'Nova verzija' : 'Povuci novu verziju'}
    </button>
  );
}
