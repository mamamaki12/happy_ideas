import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packRally, unpackRally, sanitizeRally, periodState, tryStamp } from '../../products/rally/logic.js';

const rally = { v: 2, id: 'abc', t: '商店街ラリー', d: '説明', g: '景品', from: '2026-10-01', to: '2026-10-31', c: '#e8590c', p: [
  { n: '時計台', h: '駅前', a: 35.6812, o: 139.7671, r: 80 }, { n: 'パン屋', h: '', a: 35.6850, o: 139.7671, r: 50 }] };

test('rally: 圧縮して往復できる・圧縮で短くなる', async () => {
  const big = { ...rally, p: Array.from({ length: 20 }, (_, i) => ({ n: `チェックポイント${i}`, h: '青い看板のお店の向かい側', a: 35.6 + i / 1000, o: 139.7, r: 80 })) };
  const code = await packRally(big);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await unpackRally(code), sanitizeRally(big));
  assert.ok(code.length < Buffer.from(JSON.stringify(big)).toString('base64').length * 0.6, '圧縮が効いていない');
});

test('rally: 壊れたデータ・圧縮爆弾・不正値を拒否', async () => {
  assert.equal(await unpackRally('!!!'), null);
  assert.equal(await unpackRally('AAAA'), null);
  // 展開すると巨大になるデータ（64KB超）は拒否
  const bomb = await packRally({ p: [{ n: 'a', a: 1, o: 1 }], d: 'x'.repeat(200000) });
  assert.ok(bomb.length < 8000);
  assert.equal(await unpackRally(bomb), null);
  assert.equal(sanitizeRally({ p: [] }), null);
  const s = sanitizeRally({ t: 1, c: 'red', p: [{ n: 'ok', a: 1, o: 2, r: 9999 }, { n: 'bad', a: 200, o: 0 }, { n: '', a: 1, o: 1 }] });
  assert.equal(s.t, 'スタンプラリー'); assert.equal(s.c, '#e8590c'); assert.equal(s.p.length, 1); assert.equal(s.p[0].r, 500);
});

test('rally: 開催期間', () => {
  assert.equal(periodState(rally, '2026-09-30'), 'before');
  assert.equal(periodState(rally, '2026-10-15'), 'open');
  assert.equal(periodState(rally, '2026-11-01'), 'after');
  assert.equal(periodState({ ...rally, from: '', to: '' }, '2030-01-01'), 'open');
});

test('rally: スタンプの判定（範囲・精度・移動速度）', () => {
  const at = (lat, lon, acc = 10, t = 1e6) => ({ lat, lon, acc, t });
  assert.deepEqual(tryStamp(rally, {}, at(35.6812, 139.7671)), { ok: true, index: 0 });
  assert.equal(tryStamp(rally, {}, at(35.6812, 139.7671, 300)).ok, false); // 精度が悪い
  const far = tryStamp(rally, {}, at(35.6900, 139.7671));
  assert.equal(far.ok, false); assert.equal(far.code, 'far'); assert.equal(far.nearest, 1); assert.ok(far.meters > 500 && far.meters < 600);
  // 1秒前に時計台で押したのに、もうパン屋（約420m先）にいる → 偽装の疑い
  const st = { 0: { t: 1e6 - 1000, lat: 35.6812, lon: 139.7671 } };
  assert.equal(tryStamp(rally, st, at(35.6850, 139.7671)).code, 'speed');
  // 5分後ならOK
  assert.deepEqual(tryStamp(rally, st, at(35.6850, 139.7671, 10, 1e6 + 300000)), { ok: true, index: 1 });
  assert.equal(tryStamp(rally, { 0: {}, 1: {} }, at(0, 0)).code, 'done');
  assert.equal(tryStamp(rally, {}, at(35.6812, 139.7671, 300)).code, 'accuracy');
});
