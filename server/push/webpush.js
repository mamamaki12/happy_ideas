// Web Push の送信側（RFC 8291 のメッセージ暗号化 aes128gcm と RFC 8292 の VAPID）。
// Cloudflare Workers / Node 22 の Web Crypto だけで動く（外部ライブラリなし）。
const enc = new TextEncoder();
const subtle = globalThis.crypto.subtle;

export const b64u = {
  encode(buf) { const b = new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  decode(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); },
};
const concat = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };

async function hmac(key, data) { const k = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await subtle.sign('HMAC', k, data)); }
/** HKDF（RFC 5869）。出力は length バイト（32以下） */
async function hkdf(salt, ikm, info, length) { const prk = await hmac(salt, ikm); return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, length); }

/** 生の公開鍵（65バイト、0x04始まり）と秘密鍵 d から ECDH 鍵を作る */
export async function importEcdhPrivate(publicRaw, dBytes) {
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u.encode(publicRaw.slice(1, 33)), y: b64u.encode(publicRaw.slice(33, 65)), d: b64u.encode(dBytes), ext: true };
  return subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
}

/**
 * ペイロードを暗号化する（RFC 8291）。テストのために ephemeral 鍵と salt を外から渡せる。
 * @returns {Promise<Uint8Array>} リクエスト本文（aes128gcm ヘッダー付き）
 */
export async function encryptPayload(plaintext, { p256dh, auth }, { asPublicRaw, asPrivateKey, salt } = {}) {
  const uaPublic = b64u.decode(p256dh); const authSecret = b64u.decode(auth);
  if (!asPrivateKey) {
    const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    asPrivateKey = kp.privateKey; asPublicRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  }
  salt ||= crypto.getRandomValues(new Uint8Array(16));
  const uaKey = await subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivateKey, 256));
  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublicRaw), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const data = concat(typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext, new Uint8Array([2])); // 最後のレコード（区切り 0x02）
  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data));
  const rs = new Uint8Array([0, 0, 16, 0]); // レコードサイズ 4096
  return concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw, ct);
}

/** 受信側の復号（テスト用。ブラウザが内部でやっていることと同じ） */
export async function decryptPayload(body, { uaPublicRaw, uaPrivateKey, authSecret }) {
  const salt = body.slice(0, 16); const idlen = body[20]; const asPublic = body.slice(21, 21 + idlen); const ct = body.slice(21 + idlen);
  const asKey = await subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPrivateKey, 256));
  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublicRaw, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  let end = pt.length - 1; while (end >= 0 && pt[end] === 0) end--; // パディングを除く
  return new TextDecoder().decode(pt.slice(0, end)); // 最後の区切りバイト（0x02）を除く
}

/** VAPID（RFC 8292）の Authorization ヘッダー。vapid = { publicKey: b64u(65bytes), privateKey: b64u(32bytes d), subject: 'mailto:...' } */
export async function vapidAuth(endpoint, vapid, { now = Date.now() } = {}) {
  const pub = b64u.decode(vapid.publicKey);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u.encode(pub.slice(1, 33)), y: b64u.encode(pub.slice(33, 65)), d: vapid.privateKey, ext: true };
  const key = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64u.encode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.encode(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })));
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${b64u.encode(sig)}, k=${vapid.publicKey}`;
}

/** 1件送る。410/404 は購読が無効になったという意味 */
export async function sendPush(subscription, payload, vapid, { fetchImpl = fetch, ttl = 3600 } = {}) {
  const body = await encryptPayload(JSON.stringify(payload), subscription.keys);
  const res = await fetchImpl(subscription.endpoint, {
    method: 'POST', body,
    headers: { 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(ttl), urgency: 'normal', authorization: await vapidAuth(subscription.endpoint, vapid) },
  });
  return { status: res.status, gone: res.status === 404 || res.status === 410 };
}
