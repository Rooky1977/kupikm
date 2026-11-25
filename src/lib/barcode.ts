export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

type Detected = { rawValue: string; format?: string };

export async function scanBarcodeFromVideo(
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!isBarcodeDetectorSupported()) return null;

  const Detector = (
    window as unknown as {
      BarcodeDetector: new (opts?: { formats?: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Detected[]>;
      };
    }
  ).BarcodeDetector;

  const detector = new Detector({
    formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code', 'code_39'],
  });

  while (!signal?.aborted) {
    try {
      const codes = await detector.detect(video);
      const hit = codes.find((c) => c.rawValue?.trim());
      if (hit?.rawValue) return hit.rawValue.trim();
    } catch {
      /* frame skip */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

export async function openBarcodeCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch {
    return null;
  }
}

/** Jednostavan vizuelni barkod (trake) za prikaz na kasi. */
export function barcodeBars(value: string): number[] {
  const bars: number[] = [2, 1, 2];
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    bars.push((code % 3) + 1, 1, ((code >> 2) % 3) + 1, 1);
  }
  bars.push(2, 1, 3);
  return bars;
}
