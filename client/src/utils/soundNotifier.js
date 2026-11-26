/**
 * Модуль м'якого, приємного для вух звукового супроводу сповіщень на базі Web Audio API.
 * Не потребує зовнішніх аудіофайлів і генерує теплі гармонійні акорди.
 */

export const SOUND_PRESETS = [
  {
    id: 'kalimba',
    label: 'Тепла калімба',
    description: 'Мʼякий деревʼяний передзвін',
    notes: [587.33, 880.0],
    wave: 'triangle',
    step: 0.14,
    decay: 0.9,
  },
  {
    id: 'chime',
    label: 'Ранковий дзвіночок',
    description: 'Світлий ніжний тризвук',
    notes: [523.25, 659.25, 783.99],
    wave: 'sine',
    step: 0.11,
    decay: 1.05,
  },
  {
    id: 'pulse',
    label: 'Спокійний імпульс',
    description: 'Спокійний двотоновий сигнал',
    notes: [349.23, 523.25],
    wave: 'sine',
    step: 0.16,
    decay: 0.85,
  },
];

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Програє м'яку гармонійну мелодію сповіщення без різких перепадів гучності.
 */
export function playPleasantChime({ presetId = 'kalimba', volume = 0.45 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return false;

  const preset = SOUND_PRESETS.find((p) => p.id === presetId) || SOUND_PRESETS[0];
  const clampedVol = Math.max(0.05, Math.min(1, Number(volume) || 0.45));

  // М'який low-pass фільтр прибирає різкі високі частоти
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, ctx.currentTime);
  filter.connect(ctx.destination);

  const now = ctx.currentTime;

  preset.notes.forEach((freq, index) => {
    const startTime = now + index * preset.step;

    const oscMain = ctx.createOscillator();
    const oscWarm = ctx.createOscillator();
    const gain = ctx.createGain();

    oscMain.type = preset.wave;
    oscMain.frequency.setValueAtTime(freq, startTime);

    oscWarm.type = 'sine';
    oscWarm.frequency.setValueAtTime(freq * 0.5, startTime);

    const peakGain = clampedVol * 0.18;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + preset.decay);

    oscMain.connect(gain);
    oscWarm.connect(gain);
    gain.connect(filter);

    oscMain.start(startTime);
    oscWarm.start(startTime);
    oscMain.stop(startTime + preset.decay + 0.05);
    oscWarm.stop(startTime + preset.decay + 0.05);
  });

  return true;
}
