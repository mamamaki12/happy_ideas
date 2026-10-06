/** タップ時刻（ms）と拍の間隔から、各タップのずれ（ms、+は遅れ）と平均・ばらつきを出す */
export function analyzeTaps(taps, start, interval) {
  const offsets = taps.map((t) => { const k = Math.round((t - start) / interval); return t - (start + k * interval); });
  if (!offsets.length) return { offsets, mean: 0, sd: 0, grade: '-' };
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  const sd = Math.sqrt(offsets.reduce((a, b) => a + (b - mean) ** 2, 0) / offsets.length);
  const absMean = offsets.reduce((a, b) => a + Math.abs(b), 0) / offsets.length;
  const grade = absMean < 25 ? 'S' : absMean < 45 ? 'A' : absMean < 70 ? 'B' : absMean < 110 ? 'C' : 'D';
  return { offsets, mean, sd, absMean, grade };
}
