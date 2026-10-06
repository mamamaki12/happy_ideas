/** RGBA配列をスキャン風に処理する（グレースケール → 明るさ正規化 → しきい値/強調）。in-place。 */
export function scanFilter(data, { mode = 'bw', threshold = 0.55 } = {}) {
  let lo = 255; let hi = 0;
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[j] = g; if (g < lo) lo = g; if (g > hi) hi = g;
  }
  const span = Math.max(1, hi - lo);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const n = (gray[j] - lo) / span; // 0..1
    const v = mode === 'bw' ? (n > threshold ? 255 : 0) : Math.round(255 * Math.min(1, Math.max(0, (n - 0.15) / 0.7)));
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  return data;
}
