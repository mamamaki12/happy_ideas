// ラリーメーカーのロジック（DOM非依存）
// ラリーの定義は URL のハッシュに入れる。deflate 圧縮 + Base64URL で短くして、QRを読みやすくする。

const b64u = (bytes) => { let s = ''; bytes.forEach((x) => { s += String.fromCharCode(x); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes, stream, limit = Infinity) {
  const out = []; let n = 0;
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length; if (n > limit) { reader.cancel(); throw new Error('データが大きすぎます'); }
    out.push(value);
  }
  const res = new Uint8Array(n); let o = 0; out.forEach((c) => { res.set(c, o); o += c.length; });
  return res;
}

export async function packRally(rally) {
  const json = new TextEncoder().encode(JSON.stringify(rally));
  return b64u(await pipe(json, new CompressionStream('deflate-raw')));
}

/** 圧縮を展開して検証する。不正なら null（展開後 64KB までに制限して圧縮爆弾を防ぐ） */
export async function unpackRally(code) {
  try {
    if (typeof code !== 'string' || code.length > 8000 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const json = await pipe(unb64u(code), new DecompressionStream('deflate-raw'), 65536);
    return sanitizeRally(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json)));
  } catch { return null; }
}

const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
export function sanitizeRally(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.p)) return null;
  const points = r.p.slice(0, 30).map((p) => ({
    n: s(p?.n, 30), h: s(p?.h, 80),
    a: Number.isFinite(p?.a) && Math.abs(p.a) <= 90 ? p.a : NaN, o: Number.isFinite(p?.o) && Math.abs(p.o) <= 180 ? p.o : NaN,
    r: Number.isFinite(p?.r) ? Math.min(500, Math.max(30, p.r)) : 80,
  })).filter((p) => p.n && Number.isFinite(p.a) && Number.isFinite(p.o));
  if (!points.length) return null;
  return {
    v: 2, id: s(r.id, 16) || 'rally', t: s(r.t, 40) || 'スタンプラリー', d: s(r.d, 200), g: s(r.g, 120),
    from: date(r.from), to: date(r.to), c: /^#[0-9a-f]{6}$/i.test(r.c) ? r.c : '#e8590c', p: points,
  };
}

/** 開催期間の判定 */
export function periodState(r, today) {
  if (r.from && today < r.from) return 'before';
  if (r.to && today > r.to) return 'after';
  return 'open';
}

const R = 6371000; const rad = (d) => (d * Math.PI) / 180;
export function distance(a, b) {
  const dLat = rad(b.lat - a.lat); const dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/**
 * スタンプを押せるか判定する。
 * - GPS の精度が悪すぎる（150m超）ときは押せない
 * - 直前のスタンプから時速200km以上で移動していたら、位置偽装の疑いとして押せない
 * @returns {{ok: true, index: number} | {ok: false, reason: string, nearest?: number, dist?: number}}
 */
export function tryStamp(rally, stamps, pos) {
  if (!(pos.acc <= 150)) return { ok: false, reason: 'GPSの精度が低いため押せません。空が見える場所でもう一度お試しください' };
  const last = Object.values(stamps).sort((x, y) => y.t - x.t)[0];
  if (last && Number.isFinite(last.lat)) {
    const sec = (pos.t - last.t) / 1000;
    if (sec > 0 && distance(last, pos) / sec > 55) return { ok: false, reason: '移動が速すぎます。少し時間をおいてお試しください' };
  }
  let nearest = -1; let best = Infinity;
  rally.p.forEach((p, i) => {
    if (stamps[i]) return;
    const d = distance(pos, { lat: p.a, lon: p.o });
    if (d < best) { best = d; nearest = i; }
  });
  if (nearest < 0) return { ok: false, reason: 'すべてのスタンプを集めました' };
  const allow = rally.p[nearest].r + Math.min(pos.acc, 50);
  return best <= allow ? { ok: true, index: nearest } : { ok: false, reason: `いちばん近い「${rally.p[nearest].n}」まであと約${Math.round(best - rally.p[nearest].r)}m`, nearest, dist: best };
}
