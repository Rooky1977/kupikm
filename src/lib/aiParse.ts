import type { Category, ReceiptItem, Unit } from '../types';
import type { AiProvider, AppSettings } from '../types';
import { normalizeItemKey } from './format';

export interface ParsedReceipt {
  storeName?: string;
  date?: string;
  total?: number;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
    unit?: Unit;
  }>;
  method?: 'gemini' | 'groq' | 'tesseract' | 'text' | 'manual';
}

const SYSTEM_JSON =
  'Parsiraš račun iz BiH marketa (valuta KM). Vrati SAMO čist JSON bez markdowna: {"storeName":"...","date":"YYYY-MM-DD","total":12.34,"items":[{"name":"...","price":1.23,"quantity":1,"unit":"kom"}]}';

function extractJsonObject(content: string): ParsedReceipt {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { items: [] };
  try {
    const parsed = JSON.parse(jsonMatch[0]) as ParsedReceipt;
    return {
      storeName: parsed.storeName,
      date: parsed.date,
      total: parsed.total != null ? Number(parsed.total) : undefined,
      items: (parsed.items ?? [])
        .map((i) => ({
          name: String(i.name ?? '').trim(),
          price: Number(i.price),
          quantity: i.quantity != null ? Number(i.quantity) : 1,
          unit: (i.unit as Unit) ?? 'kom',
        }))
        .filter((i) => i.name && !Number.isNaN(i.price)),
    };
  } catch {
    return { items: [] };
  }
}

function dataUrlToParts(dataUrl: string): { mime: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { mime: 'image/jpeg', base64: dataUrl };
  return { mime: match[1], base64: match[2] };
}

/** Besplatni Google Gemini (vision). */
async function parseWithGemini(dataUrl: string, apiKey: string): Promise<ParsedReceipt> {
  const { mime, base64 } = dataUrlToParts(dataUrl);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${SYSTEM_JSON}\nIzvuci stavke i cijene sa ovog računa.` },
              { inline_data: { mime_type: mime, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    });
    if (!res.ok) {
      lastError = new Error(`Gemini greška (${res.status})`);
      continue;
    }
    const data = await res.json();
    const content =
      data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ??
      '';
    return { ...extractJsonObject(content), method: 'gemini' };
  }
  throw lastError ?? new Error('Gemini nije uspio');
}

/** Besplatni Groq vision (OpenAI-kompatibilan). */
async function parseWithGroqVision(dataUrl: string, apiKey: string): Promise<ParsedReceipt> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_JSON },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Izvuci stavke i cijene sa ovog računa.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq greška (${res.status})`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  return { ...extractJsonObject(content), method: 'groq' };
}

async function parseWithGroqText(text: string, apiKey: string): Promise<ParsedReceipt> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_JSON },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq greška (${res.status})`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  return { ...extractJsonObject(content), method: 'groq' };
}

async function parseWithGeminiText(text: string, apiKey: string): Promise<ParsedReceipt> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_JSON}\n\nTekst računa:\n${text}` }] }],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini greška (${res.status})`);
  const data = await res.json();
  const content =
    data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ??
    '';
  return { ...extractJsonObject(content), method: 'gemini' };
}

/** Lokalni OCR u pregledniku — bez API ključa. */
export async function ocrWithTesseract(
  dataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const result = await worker.recognize(dataUrl);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

export function parseLocally(text: string): ParsedReceipt {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedReceipt['items'] = [];
  let storeName: string | undefined;
  let total: number | undefined;

  for (const line of lines) {
    if (
      /^(bingo|konzum|mercator|amko|dm|robot|lidl|đurić|djuric|crvena|penny|flory|spar)/i.test(line) &&
      !storeName
    ) {
      storeName = line;
      continue;
    }
    const totalMatch = line.match(/^(?:ukupno|total|suma|za platiti)\s*:?\s*(\d+[.,]\d{1,2})/i);
    if (totalMatch) {
      total = Number(totalMatch[1].replace(',', '.'));
      continue;
    }
    // količina x cijena ... iznos  ILI  naziv .... cijena
    const qtyPrice = line.match(
      /^(.+?)\s+(\d+[.,]?\d*)\s*[x×*]\s*(\d+[.,]\d{1,2})\s+(\d+[.,]\d{1,2})\s*(?:KM)?$/i,
    );
    if (qtyPrice) {
      const name = qtyPrice[1].replace(/[.\-…]+\s*$/, '').trim();
      const quantity = Number(qtyPrice[2].replace(',', '.'));
      const unitPrice = Number(qtyPrice[3].replace(',', '.'));
      if (name && !Number.isNaN(unitPrice)) {
        items.push({ name, price: unitPrice, quantity: quantity || 1, unit: 'kom' });
        continue;
      }
    }
    const match = line.match(/^(.+?)\s+[.\-…]{0,16}\s*(\d+[.,]\d{1,2})\s*(?:KM|km)?$/i);
    if (!match) continue;
    const name = match[1].replace(/[.\-…]+\s*$/, '').trim();
    const price = Number(match[2].replace(',', '.'));
    if (!name || name.length < 2 || Number.isNaN(price)) continue;
    if (/^\d+$/.test(name)) continue;
    items.push({ name, price, quantity: 1, unit: 'kom' });
  }

  if (total == null && items.length) {
    total = items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0);
  }

  return { storeName, total, items, method: 'text' };
}

export async function parseReceiptText(
  text: string,
  settings?: Pick<AppSettings, 'aiProvider' | 'geminiApiKey' | 'groqApiKey'>,
): Promise<ParsedReceipt> {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], method: 'manual' };

  const provider: AiProvider = settings?.aiProvider ?? 'auto';
  const gemini = settings?.geminiApiKey?.trim();
  const groq = settings?.groqApiKey?.trim();

  const tryGemini = provider === 'gemini' || provider === 'auto';
  const tryGroq = provider === 'groq' || provider === 'auto';

  if (tryGemini && gemini) {
    try {
      return await parseWithGeminiText(trimmed, gemini);
    } catch {
      /* next */
    }
  }
  if (tryGroq && groq) {
    try {
      return await parseWithGroqText(trimmed, groq);
    } catch {
      /* next */
    }
  }

  return parseLocally(trimmed);
}

/**
 * Parsiranje slike računa:
 * 1) Gemini (besplatni ključ) 2) Groq 3) Tesseract OCR lokalno (bez ključa)
 */
export async function parseReceiptImage(
  dataUrl: string,
  settings: Pick<AppSettings, 'aiProvider' | 'geminiApiKey' | 'groqApiKey'>,
  onProgress?: (msg: string) => void,
): Promise<ParsedReceipt> {
  const provider = settings.aiProvider ?? 'auto';
  const gemini = settings.geminiApiKey?.trim();
  const groq = settings.groqApiKey?.trim();

  const tryGemini = provider === 'gemini' || provider === 'auto';
  const tryGroq = provider === 'groq' || provider === 'auto';
  const tryTess = provider === 'tesseract' || provider === 'auto';

  if (tryGemini && gemini) {
    try {
      onProgress?.('Čitam račun preko besplatnog Gemini AI…');
      const result = await parseWithGemini(dataUrl, gemini);
      if (result.items.length) return result;
    } catch {
      onProgress?.('Gemini nije uspio, pokušavam sljedeću opciju…');
    }
  }

  if (tryGroq && groq) {
    try {
      onProgress?.('Čitam račun preko besplatnog Groq AI…');
      const result = await parseWithGroqVision(dataUrl, groq);
      if (result.items.length) return result;
    } catch {
      onProgress?.('Groq vision nije uspio…');
    }
  }

  if (tryTess || true) {
    onProgress?.('Lokalno čitam tekst sa slike (Tesseract, besplatno)…');
    try {
      const ocrText = await ocrWithTesseract(dataUrl, (pct) => {
        onProgress?.(`Lokalni OCR: ${pct}%`);
      });

      if (tryGroq && groq && ocrText.trim()) {
        try {
          onProgress?.('Dorađujem OCR tekst preko Groq…');
          const refined = await parseWithGroqText(ocrText, groq);
          if (refined.items.length) return refined;
        } catch {
          /* local */
        }
      }
      if (tryGemini && gemini && ocrText.trim()) {
        try {
          onProgress?.('Dorađujem OCR tekst preko Gemini…');
          const refined = await parseWithGeminiText(ocrText, gemini);
          if (refined.items.length) return refined;
        } catch {
          /* local */
        }
      }

      const local = parseLocally(ocrText);
      return { ...local, method: 'tesseract' };
    } catch {
      onProgress?.('OCR nije uspio — unesi stavke ručno.');
      return { items: [], method: 'manual' };
    }
  }

  return { items: [], method: 'manual' };
}

export function guessCategory(name: string): Category {
  const k = normalizeItemKey(name);
  if (/marlboro|winston|cigaret|duvan|upaljac|rothmans|davidoff/.test(k)) return 'cigarete';
  if (/mlijeko|jogurt|pavlaka|jaja|sir|mleko|kajmak|maslac/.test(k)) return 'mlijecno';
  if (/hljeb|hleb|somun|kifla|pecivo|lepinja|spaghetti|tjestenina|riza|riža|burek/.test(k))
    return 'pekara';
  if (/ulje|floriol|secer|šećer|brasno|brašno|kafa|sol|vegeta|kecap|majoneza/.test(k))
    return 'ostava';
  if (/pile|meso|june|virsle|batak|riba|sunka|šunka|kobasica/.test(k)) return 'meso';
  if (/banana|jabuk|krompir|luk|paradajz|voce|povrce|mrkva|krastavac/.test(k)) return 'voce-povrce';
  if (/cokolada|čokolada|keks|cips|čips|sladoled|bombone|nutella/.test(k)) return 'slatkisi';
  if (/voda|sok|cola|pivo|vino|rakija|energy/.test(k)) return 'pice';
  if (/deterdzent|pasta|sampon|gel|toalet|sapun|sudje|ubrusi|pelene/.test(k)) return 'hemija';
  if (/baterij|sijalic|igla|alat|odvijac|cekic|auto|vrt|sraf|lokomotiva/.test(k)) return 'kucanstvo';
  return 'ostalo';
}

export function toReceiptItems(parsed: ParsedReceipt['items']): ReceiptItem[] {
  return parsed.map((i) => {
    const qty = i.quantity ?? 1;
    const unitPrice = i.price;
    return {
      name: i.name,
      quantity: qty,
      unit: i.unit ?? 'kom',
      unitPrice,
      lineTotal: Math.round(unitPrice * qty * 100) / 100,
      category: guessCategory(i.name),
    };
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Čitanje fajla nije uspjelo'));
    reader.readAsDataURL(file);
  });
}

export function describeScanMethod(method?: ParsedReceipt['method']): string {
  switch (method) {
    case 'gemini':
      return 'Gemini AI (besplatno)';
    case 'groq':
      return 'Groq AI (besplatno)';
    case 'tesseract':
      return 'Lokalni OCR (besplatno, bez ključa)';
    case 'text':
      return 'Tekstualni parser (besplatno)';
    default:
      return 'Ručni unos';
  }
}
