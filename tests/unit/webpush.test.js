// Web Push の暗号化を RFC 8291 の公開テストベクトルで検証する
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { b64u, encryptPayload, decryptPayload, importEcdhPrivate, vapidAuth, sendPush } from '../../server/push/webpush.js';

// RFC 8291 Appendix A（例のメッセージ）
const V = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

test('webpush: RFC 8291 のテストベクトルと一致する', async () => {
  const asPublicRaw = b64u.decode(V.asPublic);
  const asPrivateKey = await importEcdhPrivate(asPublicRaw, b64u.decode(V.asPrivate));
  const body = await encryptPayload(V.plaintext, { p256dh: V.uaPublic, auth: V.auth }, { asPublicRaw, asPrivateKey, salt: b64u.decode(V.salt) });
  assert.equal(b64u.encode(body), V.body);
});

test('webpush: 受信側で復号できる（ランダムな鍵）', async () => {
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const msg = JSON.stringify({ title: '🎫 入金期限が近いチケットがあります', url: '/products/oshi-techo/#tickets' });
  const body = await encryptPayload(msg, { p256dh: b64u.encode(uaPublicRaw), auth: b64u.encode(authSecret) });
  assert.equal(await decryptPayload(body, { uaPublicRaw, uaPrivateKey: ua.privateKey, authSecret }), msg);
  // RFC のベクトルも受信側で復号できる
  const vUa = await importEcdhPrivate(b64u.decode(V.uaPublic), b64u.decode(V.uaPrivate));
  assert.equal(await decryptPayload(b64u.decode(V.body), { uaPublicRaw: b64u.decode(V.uaPublic), uaPrivateKey: vUa, authSecret: b64u.decode(V.auth) }), V.plaintext);
});

test('webpush: VAPID の署名が公開鍵で検証できる・送信リクエストの形', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const vapid = { publicKey: b64u.encode(pubRaw), privateKey: jwk.d, subject: 'mailto:test@example.com' };
  const h = await vapidAuth('https://push.example.net/send/abc', vapid, { now: 1_800_000_000_000 });
  const [, t, k] = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, vapid.publicKey);
  const [hd, cl, sig] = t.split('.');
  const claims = JSON.parse(new TextDecoder().decode(b64u.decode(cl)));
  assert.equal(claims.aud, 'https://push.example.net'); assert.equal(claims.sub, vapid.subject); assert.equal(claims.exp, 1_800_000_000 + 43200);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, b64u.decode(sig), new TextEncoder().encode(`${hd}.${cl}`)));

  let captured;
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey)); const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const r = await sendPush({ endpoint: 'https://push.example.net/send/abc', keys: { p256dh: b64u.encode(uaPublicRaw), auth: b64u.encode(authSecret) } }, { title: 'x' }, vapid,
    { fetchImpl: async (url, init) => { captured = { url, init }; return new Response(null, { status: 410 }); } });
  assert.equal(r.gone, true);
  assert.equal(captured.init.headers['content-encoding'], 'aes128gcm');
  assert.equal(await decryptPayload(captured.init.body, { uaPublicRaw, uaPrivateKey: ua.privateKey, authSecret }), '{"title":"x"}');
});
