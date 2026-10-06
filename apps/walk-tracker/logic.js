import { distance } from '../../shared/geo.js';
/** GPSの点列から距離を合計する。精度の悪い点と、ありえない速度（GPSの飛び）は除外。 */
export function trackDistance(points, { maxAcc = 50, maxSpeed = 12 } = {}) {
  let total = 0; let prev = null;
  for (const p of points) {
    if (p.acc > maxAcc) continue;
    if (prev) {
      const d = distance(prev, p); const dt = (p.t - prev.t) / 1000;
      if (dt > 0 && d / dt > maxSpeed) continue; // 時速43km超はGPSの飛びとみなす
      if (d < 2) continue; // 静止中の揺らぎ
      total += d;
    }
    prev = p;
  }
  return total;
}
