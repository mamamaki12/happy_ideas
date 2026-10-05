// ラリー定義を URL ハッシュ用の文字列にする／戻す（不正な入力は null）
export function encodeRally(r) {
  const bytes = new TextEncoder().encode(JSON.stringify(r));
  let bin = ''; bytes.forEach((x) => { bin += String.fromCharCode(x); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function decodeRally(s) {
  try {
    const r = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
    if (typeof r.title !== 'string' || !Array.isArray(r.points) || r.points.length > 50) return null;
    r.points = r.points.filter((p) => typeof p.name === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lon)).map((p) => ({ name: p.name.slice(0, 40), lat: p.lat, lon: p.lon }));
    r.title = r.title.slice(0, 40);
    return r;
  } catch { return null; }
}

