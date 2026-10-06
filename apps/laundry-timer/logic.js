/** 乾きやすさ指数（0〜100）: 飽差（空気がまだ含める水分量 g/m³）に比例 */
export function dryIndex(temp, rh) {
  const es = 6.1078 * 10 ** ((7.5 * temp) / (temp + 237.3)); // 飽和水蒸気圧 hPa
  const absSat = (217 * es) / (temp + 273.15); // 飽和水蒸気量 g/m³
  const deficit = absSat * (1 - rh / 100);
  return Math.max(0, Math.min(100, Math.round((deficit / 12) * 100)));
}
