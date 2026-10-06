// 複数地点の地理的な中心（球面上の重心）。日付変更線をまたいでも正しく計算できる。
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
export function centroid(points) {
  if (!points.length) return null;
  let x = 0; let y = 0; let z = 0;
  for (const p of points) {
    const la = rad(p.lat); const lo = rad(p.lon);
    x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la);
  }
  x /= points.length; y /= points.length; z /= points.length;
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) };
}
