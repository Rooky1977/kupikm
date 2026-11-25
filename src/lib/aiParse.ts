import { normalizeItemKey, uid } from './format';

export interface ParsedPriceLine {
  name: string;
  price: number;
  quantity?: number;
}

/**
 * Jednostavan lokalni parser za tekst računa/kataloga.
 * Ako postoji OpenAI API ključ, pokušava LLM ekstrakciju; inače regex fallback.
 */
export async function parseReceiptText(
  text: string,
  apiKey?: string,
): Promise<ParsedPriceLine[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (apiKey) {
    try {
      return await parseWithOpenAI(trimmed, apiKey);
    } catch {
      // fallback na lokalni parser
    }
  }

  return parseLocally(trimmed);
}

async function parseWithOpenAI(text: string, apiKey: string): Promise<ParsedPriceLine[]> {
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
            'Izvuci stavke i cijene sa računa/kataloga (BiH, KM). Vrati samo JSON niz objekata: [{"name":"...","price":1.23,"quantity":1}]',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) throw new Error('AI zahtjev nije uspio');
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return parseLocally(text);
  return JSON.parse(jsonMatch[0]) as ParsedPriceLine[];
}

function parseLocally(text: string): ParsedPriceLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedPriceLine[] = [];

  for (const line of lines) {
    // npr. "Mlijeko 2.8% ........ 2,19" ili "Banane 2.69 KM"
    const match = line.match(
      /^(.+?)\s+[.\-…]{0,12}\s*(\d+[.,]\d{1,2})\s*(?:KM|km)?$/i,
    );
    if (!match) continue;
    const name = match[1].replace(/[.\-…]+\s*$/, '').trim();
    const price = Number(match[2].replace(',', '.'));
    if (!name || Number.isNaN(price)) continue;
    results.push({ name, price, quantity: 1 });
  }

  return results;
}

export function parsedToPriceEntries(
  lines: ParsedPriceLine[],
  storeId: string,
) {
  const now = new Date().toISOString();
  return lines.map((line) => ({
    id: uid('price'),
    itemKey: normalizeItemKey(line.name),
    storeId,
    price: line.price,
    recordedAt: now,
    source: 'ai' as const,
  }));
}
