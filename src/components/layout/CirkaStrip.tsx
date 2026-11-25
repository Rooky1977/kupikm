import { formatKm } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

const SYNC_LABEL: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  sync: 'Sync…',
  local: 'Lokalno',
};

export function CirkaStrip() {
  const getCirka = useAppStore((s) => s.getCirka);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const online = useAppStore((s) => s.online);
  const cirka = getCirka();
  const status = !online ? 'offline' : syncStatus;

  return (
    <div className="cirka-strip" aria-live="polite">
      <div>
        <div className="label">Cirka račun (u korpi)</div>
        <strong>{formatKm(cirka.cartTotal)}</strong>
        <div className="sync-pill">
          {cirka.inCartCount}/{cirka.totalCount} u korpi
        </div>
      </div>
      <div>
        <div className="label">Procijenjeni spisak</div>
        <strong>{formatKm(cirka.estimatedFull)}</strong>
      </div>
      <div>
        <div className="label">Preostali budžet</div>
        <strong
          style={{
            color:
              cirka.budgetPct >= 100
                ? '#fecaca'
                : cirka.budgetPct >= 80
                  ? '#fde68a'
                  : undefined,
          }}
        >
          {formatKm(cirka.budgetRemaining)}
        </strong>
      </div>
      <div>
        <div className="label">Sinhronizacija</div>
        <strong style={{ fontSize: '1.05rem' }}>{SYNC_LABEL[status] ?? status}</strong>
      </div>
    </div>
  );
}
