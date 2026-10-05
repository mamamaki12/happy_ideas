// データを URL のハッシュに入れて共有する（サーバー不要）。UTF-8 → Base64URL。
export function encodeData(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = ''; bytes.forEach((x) => { bin += String.fromCharCode(x); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** 解析に失敗したら null。サイズ上限つき */
export function decodeData(s, maxLen = 20000) {
  if (typeof s !== 'string' || s.length > maxLen || !/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); }
  catch { return null; }
}
/** 文字列なら長さを切り詰め、そうでなければ fallback */
export const str = (v, max, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback);
