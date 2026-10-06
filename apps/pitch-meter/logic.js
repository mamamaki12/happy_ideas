// 音程検出（自己相関 + 放物線補間）と音名変換
const NOTES = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
const NOTES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function detectPitch(buf, sampleRate, { minHz = 70, maxHz = 1100, minRms = 0.01 } = {}) {
  const n = buf.length;
  let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / n) < minRms) return null;
  const minLag = Math.floor(sampleRate / maxHz); const maxLag = Math.min(n - 1, Math.ceil(sampleRate / minHz));
  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1 && lag < n; lag++) {
    let s = 0; for (let i = 0; i + lag < n; i++) s += buf[i] * buf[i + lag];
    corr[lag] = s;
  }
  let best = -1; let bestLag = -1;
  // 最初に大きく相関する山（倍音の取り違えを防ぐため、最大値の90%を超えた最初の山）
  let peakMax = 0; for (let l = minLag; l <= maxLag; l++) peakMax = Math.max(peakMax, corr[l]);
  for (let l = minLag + 1; l < maxLag; l++) {
    if (corr[l] > corr[l - 1] && corr[l] >= corr[l + 1] && corr[l] > 0.9 * peakMax) { best = corr[l]; bestLag = l; break; }
  }
  if (bestLag < 0 || best <= 0) return null;
  const a = corr[bestLag - 1]; const b = corr[bestLag]; const c = corr[bestLag + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0;
  return sampleRate / (bestLag + shift);
}

/** 周波数 → { name: 'ラ4', en: 'A4', cents: -12, midi: 69 } */
export function noteOf(freq) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const r = Math.round(midi);
  const cents = Math.round((midi - r) * 100);
  const octave = Math.floor(r / 12) - 1;
  return { name: `${NOTES[((r % 12) + 12) % 12]}${octave}`, en: `${NOTES_EN[((r % 12) + 12) % 12]}${octave}`, cents, midi: r };
}
