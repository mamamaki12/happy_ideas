import { normalize } from '../../shared/text.js';
/** 予想と実際のセトリを比べる。曲名一致の数、順番まで一致した数、得点 */
export function scoreSetlist(predicted, actual) {
  const p = predicted.map(normalize).filter(Boolean); const a = actual.map(normalize).filter(Boolean);
  const aset = new Set(a);
  const hits = p.filter((x) => aset.has(x)).length;
  const exact = p.filter((x, i) => a[i] === x).length;
  const opener = p[0] && p[0] === a[0];
  const closer = p.length && a.length && p.at(-1) === a.at(-1);
  const score = hits * 10 + exact * 5 + (opener ? 20 : 0) + (closer ? 20 : 0);
  return { hits, exact, opener: !!opener, closer: !!closer, score, rate: a.length ? hits / a.length : 0 };
}
