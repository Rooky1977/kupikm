import type { Category, ReceiptItem, Unit } from '../types';
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
}

export async function parseReceiptText(
  text: string,
  apiKey?: string,
): Promise<ParsedReceipt> {
  const trimmed = text.trim();
  if (!trimmed) return { items: [] };

  if (apiKey) {
    try {
      return await parseWithOpenAI(trimmed, apiKey);
    } catch {
      /* fallback */
    }
  }
  return parseLocally(trimmed);
}

export async function parseReceiptImage(
  dataUrl: string,
  apiKey?: string,
): Promise<ParsedReceipt> {
  if (!apiKey) {
    return {
      items: [],
      storeName: undefined,
      total: undefined,
    };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Parsiraš račun iz BiH marketa (KM). Vrati SAMO JSON: {"storeName":"...","date":"ISO","total":12.34,"items":[{"name":"...","price":1.23,"quantity":1,"unit":"kom"}]}',
          },
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
    if (!res.ok) throw new Error('AI nije uspio');
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { items: [] };
    const parsed = JSON.parse(jsonMatch[0]) as ParsedReceipt;
    return {
      storeName: parsed.storeName,
      date: parsed.date,
      total: parsed.total,
      items: (parsed.items ?? []).map((i) => ({
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity ?? 1,
        unit: i.unit ?? 'kom',
      })),
    };
  } catch {
    return { items: [] };
  }
}

async function parseWithOpenAI(text: string, apiKey: string): Promise<ParsedReceipt> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Parsiraš tekst računa iz BiH (KM). Vrati SAMO JSON: {"storeName":"...","date":"ISO","total":12.34,"items":[{"name":"...","price":1.23,"quantity":1,"unit":"kom"}]}',
        },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error('AI nije uspio');
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return parseLocally(text);
  return JSON.parse(jsonMatch[0]) as ParsedReceipt;
}

function parseLocally(text: string): ParsedReceipt {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedReceipt['items'] = [];
  let storeName: string | undefined;
  let total: number | undefined;

  for (const line of lines) {
    if (/^(bingo|konzum|mercator|amko|dm|robot|lidl|đurić|djuric|crvena)/i.test(line) && !storeName) {
      storeName = line;
      continue;
    }
    const totalMatch = line.match(/^(?:ukupno|total|suma)\s*:?\s*(\d+[.,]\d{1,2})/i);
    if (totalMatch) {
      total = Number(totalMatch[1].replace(',', '.'));
      continue;
    }
    const match = line.match(/^(.+?)\s+[.\-…]{0,12}\s*(\d+[.,]\d{1,2})\s*(?:KM|km)?$/i);
    if (!match) continue;
    const name = match[1].replace(/[.\-…]+\s*$/, '').trim();
    const price = Number(match[2].replace(',', '.'));
    if (!name || Number.isNaN(price)) continue;
    items.push({ name, price, quantity: 1, unit: 'kom' });
  }

  if (total == null && items.length) {
    total = items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0);
  }

  return { storeName, total, items };
}

export function guessCategory(name: string): Category {
  const k = normalizeItemKey(name);
  if (/mlijeko|jogurt|pavlaka|jaja|sir|mleko/.test(k)) return 'mlijecno';
  if (/hljeb|hleb|somun|kifla|pecivo|lepinja/.test(k)) return 'pekara';
  if (/pile|meso|june|virsle|batak/.test(k)) return 'meso';
  if (/banana|jabuk|krompir|luk|paradajz|voce|povrce/.test(k)) return 'voce-povrce';
  if (/voda|sok|cola|caj|pivo/.test(k)) return 'pice';
  if (/deterdzent|pasta|sampon|gel|toalet|sapun|sudje/.test(k)) return 'hemija';
  return 'ostalo';
}

export function toReceiptItems(
  parsed: ParsedReceipt['items'],
): ReceiptItem[] {
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
