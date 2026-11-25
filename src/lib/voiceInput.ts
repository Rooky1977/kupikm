type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(getSpeechRecognitionCtor());
}

export function startVoiceCapture(opts: {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}): { stop: () => void } | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    opts.onError('Glasovni unos nije podržan u ovom pregledniku.');
    return null;
  }

  const rec = new Ctor();
  rec.lang = 'bs-BA';
  rec.continuous = true;
  rec.interimResults = true;

  let stopped = false;
  rec.onresult = (ev) => {
    let interim = '';
    let finalText = '';
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (!r) continue;
      if (r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    if (interim) opts.onPartial?.(interim.trim());
    if (finalText.trim()) opts.onFinal(finalText.trim());
  };
  rec.onerror = (ev) => {
    if (ev.error === 'aborted' || ev.error === 'no-speech') return;
    opts.onError(
      ev.error === 'not-allowed'
        ? 'Dozvoli pristup mikrofonu za glasovni unos.'
        : `Glasovna greška: ${ev.error}`,
    );
  };
  rec.onend = () => {
    if (!stopped) {
      try {
        rec.start();
      } catch {
        opts.onEnd?.();
      }
    } else {
      opts.onEnd?.();
    }
  };

  try {
    rec.start();
  } catch {
    opts.onError('Nije moguće pokrenuti glasovni unos.');
    return null;
  }

  return {
    stop: () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
