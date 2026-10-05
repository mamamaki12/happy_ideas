/** 単価（1単位あたりの価格）。count×amount が総量。 */
export const unitPrice = ({ price, count = 1, amount = 1 }) => {
  const q = count * amount;
  return price > 0 && q > 0 ? price / q : null;
};
/** 一番安い候補のインデックスと、各候補の「最安比 +%」 */
export function compare(options) {
  const units = options.map(unitPrice);
  const valid = units.filter((u) => u != null);
  if (!valid.length) return { best: -1, units, diffs: units.map(() => null) };
  const min = Math.min(...valid);
  return { best: units.indexOf(min), units, diffs: units.map((u) => (u == null ? null : ((u - min) / min) * 100)) };
}
