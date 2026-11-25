import { formatKm } from '../../lib/format';

export function PriceDeltaBadge({ delta }: { delta?: number | null }) {
  if (delta == null) return null;
  if (Math.abs(delta) < 0.005) {
    return <span className="badge">Ista cijena</span>;
  }
  if (delta > 0) {
    return (
      <span className="badge badge-up">
        +{formatKm(delta)} ↑
      </span>
    );
  }
  return (
    <span className="badge badge-down">
      {formatKm(delta)} ↓
    </span>
  );
}
