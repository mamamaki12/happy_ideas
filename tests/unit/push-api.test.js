// サーバー通知: 購読API（SSRF対策を含む）と、時刻が来た通知の送信（暗号を受信側で復号して確認）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1-fake.js';
import { onRequestPost as subscribe, onRequestDelete as unsubscribe } from '../../functions/api/push/subscribe.js';
import { onRequestGet as getKey } from '../../functions/api/push/key.js';
import { runDue } from '../../server/push/cron.js';
import { b64u, decryptPayload } from '../../server/push/webpush.js';
import { validEndpoint } from '../../server/push/policy.js';

const ORIGIN = 'https://app.example';
const req = (method, body, origin = ORIGIN) => new Request(`${ORIGIN}/api/push/subscribe`, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin } });

async function makeUser() {
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey)); const authSecret = crypto.getRandomValues(new Uint8Array(16));
  return { ua, uaPublicRaw, authSecret, sub: { endpoint: `https://fcm.googleapis.com/fcm/send/${b64u.encode(crypto.getRandomValues(new Uint8Array(12)))}`, keys: { p256dh: b64u.encode(uaPublicRaw), auth: b64u.encode(authSecret) } } };
}
async function vapidEnv() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { VAPID_PUBLIC_KEY: b64u.encode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))), VAPID_PRIVATE_KEY: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d, DB: fakeD1(new URL('../../server/schema.sql', import.meta.url).pathname) };
}

test('push: 送り先は既知の Push サービスだけ（SSRF対策）', () => {
  assert.ok(validEndpoint('https://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(validEndpoint('https://web.push.apple.com/QAbc'));
  assert.ok(validEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x'));
  for (const bad of ['http://fcm.googleapis.com/x', 'https://169.254.169.254/latest', 'https://localhost/x', 'https://evil.com/fcm.googleapis.com', 'https://fcm.googleapis.com.evil.com/x', 'https://fcm.googleapis.com:8443/x', 'javascript:alert(1)', 'not a url']) assert.equal(validEndpoint(bad), false, bad);
});

test('push: 購読と予定の登録・置き換え・解除', async () => {
  const env = await vapidEnv(); const u = await makeUser(); const now = Date.now();
  assert.equal((await (await getKey({ env })).json()).publicKey, env.VAPID_PUBLIC_KEY);
  let r = await subscribe({ request: req('POST', { subscription: u.sub, reminders: [{ at: now + 60000, kind: 'pay' }, { at: now - 1000, kind: 'pay' }, { at: now + 60000, kind: 'evil' }, { at: now + 500 * 86400000, kind: 'event' }] }), env });
  assert.equal(r.status, 200); assert.equal((await r.json()).reminders, 1); // 過去・不明な種類・遠すぎる未来は捨てる
  r = await subscribe({ request: req('POST', { subscription: u.sub, reminders: [{ at: now + 120000, kind: 'event' }, { at: now + 180000, kind: 'result' }] }), env });
  assert.equal((await r.json()).reminders, 2);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM reminders').first()).n, 2); // 置き換え
  assert.equal((await subscribe({ request: req('POST', { subscription: { ...u.sub, endpoint: 'https://evil.example/x' }, reminders: [] }), env })).status, 400);
  assert.equal((await subscribe({ request: req('POST', { subscription: u.sub, reminders: [] }, 'https://evil.example'), env })).status, 403);
  assert.equal((await subscribe({ request: req('POST', { subscription: u.sub, reminders: Array(51).fill({ at: now + 1e5, kind: 'pay' }) }), env })).status, 400);
  assert.equal((await unsubscribe({ request: req('DELETE', { endpoint: u.sub.endpoint }), env })).status, 200);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first()).n, 0);
});

test('push: 時刻が来たものだけ送り、文面に予定の中身は入らない・無効な購読は消す', async () => {
  const env = await vapidEnv(); const a = await makeUser(); const b = await makeUser(); const now = Date.now();
  await subscribe({ request: req('POST', { subscription: a.sub, reminders: [{ at: now + 1000, kind: 'pay' }, { at: now + 3600000, kind: 'event' }] }), env });
  await subscribe({ request: req('POST', { subscription: b.sub, reminders: [{ at: now + 1000, kind: 'result' }] }), env });
  const outbox = [];
  const fetchImpl = async (url, init) => { outbox.push({ url, init }); return new Response(null, { status: url === b.sub.endpoint ? 410 : 201 }); };
  const res = await runDue(env, { now: now + 5000, fetchImpl });
  assert.deepEqual(res, { due: 2, sent: 1, removed: 1 });
  const toA = outbox.find((o) => o.url === a.sub.endpoint);
  assert.match(toA.init.headers.authorization, /^vapid t=.+, k=/);
  const msg = JSON.parse(await decryptPayload(toA.init.body, { uaPublicRaw: a.uaPublicRaw, uaPrivateKey: a.ua.privateKey, authSecret: a.authSecret }));
  assert.equal(msg.title, '🎫 入金期限が近いチケットがあります');
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first()).n, 1); // b（410）は削除
  // もう一度回しても、同じ通知は二重に送らない
  outbox.length = 0;
  assert.equal((await runDue(env, { now: now + 6000, fetchImpl })).due, 0);
  // 1時間後に event が送られる
  assert.equal((await runDue(env, { now: now + 3600001, fetchImpl })).sent, 1);
});
