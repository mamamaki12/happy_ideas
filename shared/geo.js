// 位置計算（DOMに依存しない純粋関数）。lib.js からも再エクスポートする。
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
/** 2点間の距離（メートル、球面近似） */
export function distance(a, b) {
  const dLat = rad(b.lat - a.lat); const dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
/** a から b への方位角（度、北=0 時計回り） */
export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
