// 1日の回数制限の共通部品（server/limits.js）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1-fake.js';
import { ipv6Prefix64, clientKey, overRateLimit } from '../../server/limits.js';

const SCHEMA = new URL('../../server/schema.sql', import.meta.url).pathname;
const reqFrom = (ip, extra = {}) => new Request('https://app.example/api/x', { method: 'POST', headers: { ...(ip ? { 'cf-connecting-ip': ip } : {}), ...extra } });

test('limits: IPv6 は /64 にまとめる（書き方の違いも同じに）', () => {
  assert.equal(ipv6Prefix64('2001:db8:abcd:12::1'), '2001:db8:abcd:12::/64');
  assert.equal(ipv6Prefix64('2001:0DB8:ABCD:0012:ffff:ffff:ffff:ffff'), '2001:db8:abcd:12::/64');
  assert.equal(ipv6Prefix64('2001:db8::'), '2001:db8:0:0::/64');
  assert.equal(ipv6Prefix64('::1'), '0:0:0:0::/64');
  assert.equal(ipv6Prefix64('fe80::1%eth0'), 'fe80:0:0:0::/64');
  assert.equal(ipv6Prefix64('64:ff9b::192.0.2.1'), '64:ff9b:0:0::/64');
  assert.equal(ipv6Prefix64('::ffff:198.51.100.7'), '198.51.100.7'); // IPv4 を IPv6 の形で書いたもの
  for (const bad of ['1::2::3', '2001:db8:1:2:3:4:5:6:7', 'gggg::1', '2001:db8:1:2:3:4:5']) assert.equal(ipv6Prefix64(bad), null, bad);
});

test('limits: 数える単位は CF-Connecting-IP だけ（X-Forwarded-For は書き換えられるので使わない）', () => {
  assert.equal(clientKey(reqFrom('203.0.113.5', { 'x-forwarded-for': '192.0.2.99' })), '203.0.113.5');
  assert.equal(clientKey(reqFrom('', { 'x-forwarded-for': '192.0.2.99' })), 'unknown');
  assert.equal(clientKey(reqFrom('2001:db8:abcd:12:aaaa:bbbb:cccc:dddd')), '2001:db8:abcd:12::/64');
});

test('limits: 上限まで数えて止める。回線ごとに別々で、IPはそのまま保存しない', async () => {
  const env = { DB: fakeD1(SCHEMA) };
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await overRateLimit(env, reqFrom('203.0.113.5'), 'test', 3));
  assert.deepEqual(results, [false, false, false, true]);
  assert.equal(await overRateLimit(env, reqFrom('203.0.113.6'), 'test', 3), false);
  assert.equal(await overRateLimit(env, reqFrom('203.0.113.5'), 'other-scope', 3), false); // 用途ごとに別
  const keys = (await env.DB.prepare('SELECT k FROM rate_limits').all()).results.map((r) => r.k);
  assert.ok(keys.every((k) => /^[0-9a-f]{64}$/.test(k)));
});

test('limits: 表がない（schema.sql の入れ直し前）・データベースの失敗では止めない', async () => {
  const broken = { DB: { prepare() { throw new Error('no such table: rate_limits'); } } };
  assert.equal(await overRateLimit(broken, reqFrom('203.0.113.5'), 'test', 0), false);
});
