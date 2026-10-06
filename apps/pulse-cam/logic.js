// 指先カメラ心拍推定: 赤チャンネル平均の時系列 → トレンド除去 → 自己相関で周期を推定。
/** 移動平均でトレンド（ゆっくりした明るさ変化）を除去 */
export function detrend(xs, win = 15) {
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const a = Math.max(0, i - win); const b = Math.min(xs.length, i + win + 1);
    let s = 0; for (let j = a; j < b; j++) s += xs[j];
    out[i] = xs[i] - s / (b - a);
  }
  return out;
}

/** 自己相関で 40〜200 bpm の範囲の周期を探す。信頼度が低いと null */
export function estimateBpm(samples, fps) {
  if (samples.length < fps * 5) return null;
  const x = detrend(samples, Math.round(fps / 2));
  const mean = x.reduce((a, b) => a + b, 0) / x.length;
  const v = x.map((t) => t - mean);
  const energy = v.reduce((a, b) => a + b * b, 0);
  if (energy === 0) return null;
  const minLag = Math.floor((fps * 60) / 200); const maxLag = Math.ceil((fps * 60) / 40);
  let best = 0; let bestLag = 0;
  for (let lag = minLag; lag <= Math.min(maxLag, v.length - 1); lag++) {
    let s = 0; for (let i = 0; i + lag < v.length; i++) s += v[i] * v[i + lag];
    const r = s / energy;
    if (r > best) { best = r; bestLag = lag; }
  }
  if (best < 0.3 || !bestLag) return null;
  return { bpm: Math.round((60 * fps) / bestLag), confidence: best };
}
