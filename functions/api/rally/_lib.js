// ラリー集計APIの共通処理（Cloudflare Pages Functions）
export const ID_RE = /^[A-Za-z0-9_-]{6,32}$/;
export const HEX64 = /^[0-9a-f]{64}$/;
export const MAX_EVENTS_PER_RALLY = 50000;

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
export async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** 本文を読む（4KBまで・JSONのみ） */
export async function readJson(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) throw new Error('content-type');
  const text = await request.text();
  if (text.length > 4096) throw new Error('too large');
  return JSON.parse(text);
}
/** 同じオリジン以外からの書き込みを拒否（CSRF・他サイトからの水増し対策） */
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
/** 定数時間の文字列比較 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
