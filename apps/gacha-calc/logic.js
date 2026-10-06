/** n回引いて1回以上当たる確率 */
export const probAtLeastOne = (p, n) => 1 - (1 - p) ** n;
/** 確率 target 以上で1回は当たるのに必要な回数 */
export const pullsFor = (p, target) => (p <= 0 ? Infinity : p >= 1 ? 1 : Math.ceil(Math.log(1 - target) / Math.log(1 - p)));
/** 天井（pity）込みの期待回数。天井 c 回目で確定。 */
export function expectedPulls(p, ceiling = Infinity) {
  if (p <= 0) return ceiling;
  if (!Number.isFinite(ceiling)) return 1 / p;
  // E = Σ_{k=1}^{c-1} k p(1-p)^{k-1} + c (1-p)^{c-1}
  return (1 - (1 - p) ** ceiling) / p;
}
