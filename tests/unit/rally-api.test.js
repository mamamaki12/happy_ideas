// ラリー集計API（Cloudflare Pages Functions）を、本物のSQLiteで動かして検証する
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1-fake.js';
import { onRequestPost as register } from '../../functions/api/rally/index.js';
import { onRequestPost as event } from '../../functions/api/rally/[id]/event.js';
import { onRequestGet as stats } from '../../functions/api/rally/[id]/stats.js';
import { sha256hex } from '../../functions/api/rally/_lib.js';

const ORIGIN = 'https://rally.example';
const req = (path, { method = 'POST', body, headers = {} } = {}) => new Request(`${ORIGIN}${path}`, { method, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers } });
const KEY = 'k'.repeat(48);

async function setup() {
  const env = { DB: fakeD1(new URL('../../server/schema.sql', import.meta.url).pathname) };
  const r = await register({ request: req('/api/rally', { body: { id: 'rally001', keyHash: await sha256hex(KEY), points: 3 } }), env });
  assert.equal(r.status, 201);
  return env;
}
const send = (env, body, id = 'rally001', headers) => event({ request: req(`/api/rally/${id}/event`, { body, headers }), env, params: { id } });
const getStats = (env, key = KEY, id = 'rally001') => stats({ request: req(`/api/rally/${id}/stats`, { method: 'GET', headers: { 'x-rally-key': key } }), env, params: { id } });

test('rally-api: 集計（重複は数えない）', async () => {
  const env = await setup();
  const a = 'a'.repeat(16); const b = 'b'.repeat(16);
  for (const [dev, type, idx] of [[a, 'start'], [a, 'start'], [a, 'stamp', 0], [a, 'stamp', 0], [a, 'stamp', 1], [b, 'start'], [b, 'stamp', 0], [a, 'complete']]) {
    assert.equal((await send(env, { device: dev, type, idx })).status, 202);
  }
  const s = await (await getStats(env)).json();
  assert.equal(s.starts, 2); assert.equal(s.completes, 1); assert.deepEqual(s.stamps, [2, 1, 0]);
  assert.equal(s.days.length, 1); assert.equal(s.days[0].n, 2);
});

test('rally-api: 主催者キーがないと見られない・IDの乗っ取りを防ぐ', async () => {
  const env = await setup();
  assert.equal((await getStats(env, 'x'.repeat(48))).status, 401);
  assert.equal((await getStats(env, '')).status, 401);
  assert.equal((await getStats(env, KEY, 'nope0000')).status, 401);
  const takeover = await register({ request: req('/api/rally', { body: { id: 'rally001', keyHash: await sha256hex('evil'.repeat(12)), points: 3 } }), env });
  assert.equal(takeover.status, 409);
  const same = await register({ request: req('/api/rally', { body: { id: 'rally001', keyHash: await sha256hex(KEY), points: 5 } }), env });
  assert.equal(same.status, 200); // 本人は更新できる
});

test('rally-api: 不正な入力・他サイトからの送信を拒否', async () => {
  const env = await setup();
  const dev = 'c'.repeat(16);
  assert.equal((await send(env, { device: dev, type: 'stamp', idx: 99 })).status, 400); // 範囲外
  assert.equal((await send(env, { device: 'NOT-HEX', type: 'start' })).status, 400);
  assert.equal((await send(env, { device: dev, type: 'hack' })).status, 400);
  assert.equal((await send(env, { device: dev, type: 'start' }, 'unknown1')).status, 404);
  assert.equal((await send(env, { device: dev, type: 'start' }, 'rally001', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await send(env, 'x'.repeat(5000))).status, 400); // 大きすぎる
  assert.equal((await send(env, '{broken')).status, 400);
  const bad = await register({ request: req('/api/rally', { body: { id: '../etc', keyHash: 'zz', points: 3 } }), env });
  assert.equal(bad.status, 400);
  // SQLインジェクションを試しても、ただの文字列として扱われる
  assert.equal((await send(env, { device: dev, type: "start'); DROP TABLE events;--" })).status, 400);
  assert.equal((await (await getStats(env)).json()).starts, 0);
});
