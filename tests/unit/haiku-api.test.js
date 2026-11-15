// 句ひろばAPI（Cloudflare Pages Functions）を、本物のSQLiteで動かして検証する
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1-fake.js';
import { onRequestGet as list, onRequestPost as create } from '../../functions/api/haiku/index.js';
import { onRequestPost as like } from '../../functions/api/haiku/[id]/like.js';
import { onRequestPost as report } from '../../functions/api/haiku/[id]/report.js';
import { onRequestPost as remove } from '../../functions/api/haiku/[id]/delete.js';
import { onRequestGet as photo } from '../../functions/api/haiku/[id]/photo.js';
import { sha256hex } from '../../functions/api/haiku/_lib.js';
import { LIMITS } from '../../server/limits.js';

const ORIGIN = 'https://kuhiroba.example';
const req = (path, { method = 'POST', body, headers = {} } = {}) => new Request(`${ORIGIN}${path}`, { method, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers } });
const TOKEN = 'a'.repeat(64);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 0xff, 0xd9]).toString('base64');
const newEnv = () => ({ DB: fakeD1(new URL('../../server/schema.sql', import.meta.url).pathname) });
const post = async (env, body, headers) => create({ request: req('/api/haiku', { body: { tokenHash: await sha256hex(TOKEN), ...body }, headers }), env });
const feed = async (env, qs = '') => (await list({ request: req(`/api/haiku${qs}`, { method: 'GET' }), env })).json();
const act = (fn, env, id, body, headers) => fn({ request: req(`/api/haiku/${id}/x`, { body, headers }), env, params: { id } });
const ip = (n) => ({ 'cf-connecting-ip': `198.51.100.${n}` });

test('haiku-api: 投稿すると広場に新しい順で並ぶ。俳号がなければ「よみ人しらず」', async () => {
  const env = newEnv();
  const a = await post(env, { text: '古池や　蛙飛びこむ　水の音', kigo: '蛙', name: '芭蕉' });
  assert.equal(a.status, 201);
  const { id } = await a.json();
  assert.match(id, /^[a-f0-9]{32}$/);
  await new Promise((r) => setTimeout(r, 2));
  assert.equal((await post(env, { text: '柿食へば 鐘が鳴るなり 法隆寺', kigo: '柿' })).status, 201);
  const f = await feed(env);
  assert.deepEqual(f.posts.map((p) => p.kigo), ['柿', '蛙']);
  assert.equal(f.posts[0].name, 'よみ人しらず');
  assert.equal(f.posts[1].text, '古池や 蛙飛びこむ 水の音'); // 空白はそろえる
  assert.equal(f.next, null);
  assert.deepEqual((await feed(env, `?kigo=${encodeURIComponent('蛙')}`)).posts.map((p) => p.name), ['芭蕉']);
  assert.equal('token_hash' in f.posts[0], false); // 削除用の合言葉のハッシュは返さない
});

test('haiku-api: URL・長すぎる句・写真でないもの・他サイトからの送信は受け付けない', async () => {
  const env = newEnv();
  for (const body of [{ text: 'https://spam.example を見て' }, { text: 'www.example.jp へ' }, { text: 'あ'.repeat(41) }, { text: 'あ' }, { text: '秋の風‮逆さ' }, { text: '秋の風 吹いて', name: '@spam_account' }, { text: '秋の風 吹いて', photo: Buffer.from('<svg/>').toString('base64') }, { text: '秋の風 吹いて', photo: 'not base64!' }]) {
    assert.equal((await post(env, body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await create({ request: req('/api/haiku', { body: { text: '秋の風 吹いて', tokenHash: 'zz' } }), env })).status, 400);
  assert.equal((await post(env, { text: '秋の風 吹いて' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(env, { text: '秋の風 吹いて', photo: 'A'.repeat(200000) })).status, 400); // 大きすぎる
  assert.equal((await feed(env)).posts.length, 0);
});

test('haiku-api: 写真は付けた句だけ JPEG で返す', async () => {
  const env = newEnv();
  const { id } = await (await post(env, { text: '名月や 池をめぐりて 夜もすがら', photo: JPEG })).json();
  assert.equal((await feed(env)).posts[0].photo, true);
  const r = await photo({ env, params: { id } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.match(r.headers.get('content-security-policy'), /sandbox/);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()).toString('base64'), JPEG);
  const { id: id2 } = await (await post(env, { text: '写真なしの 句もあります よ' })).json();
  assert.equal((await photo({ env, params: { id: id2 } })).status, 404);
  assert.equal((await photo({ env, params: { id: '../../etc' } })).status, 404);
});

test('haiku-api: いいねは同じ端末から何度押しても1回', async () => {
  const env = newEnv();
  const { id } = await (await post(env, { text: '閑かさや 岩にしみ入る 蝉の声' })).json();
  const d1 = '1'.repeat(32); const d2 = '2'.repeat(32);
  assert.equal((await (await act(like, env, id, { device: d1 })).json()).likes, 1);
  assert.equal((await (await act(like, env, id, { device: d1 })).json()).likes, 1);
  assert.equal((await (await act(like, env, id, { device: d2 })).json()).likes, 2);
  assert.equal((await act(like, env, id, { device: 'bad' })).status, 400);
  assert.equal((await act(like, env, 'f'.repeat(32), { device: d1 })).status, 404);
  assert.equal((await feed(env)).posts[0].likes, 2);
});

test('haiku-api: 端末IDを変えながらのいいねは、同じ回線から1日の上限まで', async () => {
  const env = newEnv();
  const { id } = await (await post(env, { text: '五月雨を あつめて早し 最上川' })).json();
  const dev = (i) => i.toString(16).padStart(32, '0');
  for (let i = 0; i < LIMITS.haikuLike; i++) assert.equal((await act(like, env, id, { device: dev(i) }, ip(5))).status, 200);
  assert.equal((await act(like, env, id, { device: dev(99999) }, ip(5))).status, 429);
  assert.equal((await act(like, env, id, { device: dev(0) }, ip(5))).status, 200); // もう押した端末はそのまま
});

test('haiku-api: 別々の回線から3件報告されると広場と写真から消える。同じ回線は何度でも1件', async () => {
  const env = newEnv();
  const { id } = await (await post(env, { text: '報告される 句のテストです よ', photo: JPEG })).json();
  for (let i = 0; i < 5; i++) await act(report, env, id, {}, ip(1)); // 1人が何度押しても1件
  await act(report, env, id, {}, ip(2));
  assert.equal((await feed(env)).posts.length, 1);
  await act(report, env, id, {}, ip(3));
  assert.equal((await feed(env)).posts.length, 0);
  assert.equal((await photo({ env, params: { id } })).status, 404);
  assert.equal((await act(like, env, id, { device: '1'.repeat(32) })).status, 404);
});

test('haiku-api: 投稿した端末の合言葉でだけ下げられる', async () => {
  const env = newEnv();
  const { id } = await (await post(env, { text: '下げる句の テストをします ね', photo: JPEG })).json();
  assert.equal((await act(remove, env, id, { token: 'b'.repeat(64) })).status, 403);
  assert.equal((await act(remove, env, id, { token: 'nope' })).status, 400);
  assert.equal((await act(remove, env, id, { token: TOKEN }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await feed(env)).posts.length, 1);
  assert.equal((await act(remove, env, id, { token: TOKEN })).status, 200);
  assert.equal((await feed(env)).posts.length, 0);
  assert.equal((await photo({ env, params: { id } })).status, 404);
});

test('haiku-api: 投稿は同じ回線から1日の上限まで', async () => {
  const env = newEnv();
  for (let i = 0; i < LIMITS.haikuPost; i++) assert.equal((await post(env, { text: `テストの句 その${i} です` }, ip(9))).status, 201);
  assert.equal((await post(env, { text: 'もう一句 よみたいけれど 明日にね' }, ip(9))).status, 429);
  assert.equal((await post(env, { text: '別の家 からならまだ 出せますよ' }, ip(10))).status, 201);
});

test('haiku-api: 30件ずつ読み、続きは before で読む', async () => {
  const env = newEnv();
  for (let i = 0; i < 35; i++) { await post(env, { text: `句の番号は ${String(i).padStart(2, '0')}番 です` }, ip(100 + i)); await new Promise((r) => setTimeout(r, 1)); }
  const first = await feed(env);
  assert.equal(first.posts.length, 30);
  assert.ok(first.next);
  const second = await feed(env, `?before=${first.next}`);
  assert.equal(second.posts.length, 5);
  assert.equal(second.next, null);
  assert.equal(new Set([...first.posts, ...second.posts].map((p) => p.id)).size, 35);
});
