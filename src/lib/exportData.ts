import type { ArchiveEntry, Receipt } from '../types';

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportArchiveJson(archive: ArchiveEntry[], receipts: Receipt[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    archive,
    receipts: receipts.map((r) => {
      const { imageDataUrl: _img, ...rest } = r;
      return rest;
    }),
  };
  downloadBlob(
    `kupikm-arhiva-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  );
}

export function exportArchiveCsv(archive: ArchiveEntry[], receipts: Receipt[]) {
  const lines = [
    'tip;id;naziv;radnja;cijena_km;kolicina;ukupno_km;datum',
    ...archive.map(
      (a) =>
        `cijena;${a.id};"${a.itemName.replace(/"/g, '""')}";"${a.storeName}";${a.unitPrice};${a.quantity};${a.lineTotal};${a.recordedAt}`,
    ),
    ...receipts.map(
      (r) =>
        `racun;${r.id};"Račun ${r.storeName}";"${r.storeName}";${r.total};${r.items.length};${r.total};${r.date}`,
    ),
  ];
  downloadBlob(
    `kupikm-arhiva-${new Date().toISOString().slice(0, 10)}.csv`,
    lines.join('\n'),
    'text/csv;charset=utf-8',
  );
}
