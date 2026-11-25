import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

const UNDO_MS = 6000;

export function UndoToast() {
  const undo = useAppStore((s) => s.undo);
  const performUndo = useAppStore((s) => s.performUndo);
  const clearUndo = useAppStore((s) => s.clearUndo);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => clearUndo(), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undo, clearUndo]);

  if (!undo) return null;

  return (
    <div className="undo-toast" role="status">
      <span>{undo.message}</span>
      <button type="button" className="btn btn-sm btn-action" onClick={() => performUndo()}>
        Poništi
      </button>
    </div>
  );
}
