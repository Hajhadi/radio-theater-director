// Audio playback and synthesis utilities

let currentPlayingAudio: HTMLAudioElement | null = null;
let currentAudioContext: AudioContext | null = null;

export function stopCurrentAudio() {
  if (currentPlayingAudio) {
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentPlayingAudio = null;
  }
  if (currentAudioContext && currentAudioContext.state !== 'closed') {
    try {
      currentAudioContext.close();
    } catch {
      // ignore
    }
    currentAudioContext = null;
  }
}

export function playBase64Wav(
  base64Audio: string,
  onEnded?: () => void,
  onError?: (err: any) => void
): HTMLAudioElement {
  stopCurrentAudio();

  const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
  currentPlayingAudio = audio;

  audio.onended = () => {
    if (currentPlayingAudio === audio) {
      currentPlayingAudio = null;
    }
    onEnded?.();
  };

  audio.onerror = (e) => {
    console.error('Audio playback error:', e);
    onError?.(e);
  };

  audio.play().catch((err) => {
    console.warn('Audio play request failed (likely autoplay policy):', err);
    onError?.(err);
  });

  return audio;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadBase64Wav(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  downloadBlob(blob, filename);
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '۰۰:۰۰';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const toPersianDigits = (num: number) =>
    num.toString().padStart(2, '0').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  return `${toPersianDigits(mins)}:${toPersianDigits(secs)}`;
}

// Generate realistic atmospheric sound effects using Web Audio API
export async function playAtmosphericSfx(sfxType: string, durationSec = 2.5) {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  currentAudioContext = ctx;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.3, now);
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);

  const lower = (sfxType || '').toLowerCase();

  if (lower.includes('باد') || lower.includes('wind') || lower.includes('طوفان')) {
    // Pink noise / wind whistle
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.15;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, now);
    filter.frequency.linearRampToValueAtTime(750, now + durationSec / 2);
    filter.frequency.linearRampToValueAtTime(320, now + durationSec);

    noise.connect(filter);
    filter.connect(masterGain);
    noise.start(now);
    noise.stop(now + durationSec);
  } else if (lower.includes('زنگ') || lower.includes('bell') || lower.includes('ساعت')) {
    // Chime bell
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1760, now);
    osc1.connect(masterGain);
    osc2.connect(masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec);
    osc2.stop(now + durationSec);
  } else if (lower.includes('در') || lower.includes('door') || lower.includes('قدم') || lower.includes('گام')) {
    // Thump / footsteps
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.3);
    osc.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  } else {
    // Gentle dramatic sub-drone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.connect(masterGain);
    osc.start(now);
    osc.stop(now + durationSec);
  }
}

// Fallback browser speech if API is unreachable or during offline development
export function speakWithBrowserSpeech(text: string, voiceType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('مرورگر شما از SpeechSynthesis پشتیبانی نمی‌کند.'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fa-IR';

    // Try finding Persian voice
    const voices = window.speechSynthesis.getVoices();
    const faVoice = voices.find((v) => v.lang.startsWith('fa') || v.name.includes('Persian'));
    if (faVoice) {
      utterance.voice = faVoice;
    }

    if (voiceType === 'Fenrir' || voiceType === 'Charon') {
      utterance.pitch = 0.8;
      utterance.rate = 0.9;
    } else if (voiceType === 'Puck') {
      utterance.pitch = 1.2;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 0.95;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
  });
}
