import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, urlWarnings, parseWifi } from '../../apps/qr-reader/logic.js';
import { estimateBpm, detrend } from '../../apps/pulse-cam/logic.js';
import { scanFilter } from '../../apps/doc-scan/logic.js';

test('qr-reader: 種類の判定', () => {
  assert.equal(classify('https://example.com'), 'url');
  assert.equal(classify('WIFI:T:WPA;S:home;P:pass;;'), 'wifi');
  assert.equal(classify('tel:0312345678'), 'tel');
  assert.equal(classify('4901234567894'), 'product');
  assert.equal(classify('javascript:alert(1)'), 'other-scheme');
  assert.equal(classify('こんにちは'), 'text');
});
test('qr-reader: 危険なURLの警告', () => {
  assert.deepEqual(urlWarnings('https://www.example.co.jp/path'), []);
  assert.ok(urlWarnings('http://example.com').some((w) => w.includes('http')));
  assert.ok(urlWarnings('https://192.168.0.1/login').some((w) => w.includes('IPアドレス')));
  assert.ok(urlWarnings('https://xn--pple-43d.com').some((w) => w.includes('国際化ドメイン')));
  assert.ok(urlWarnings('https://bit.ly/abc').some((w) => w.includes('短縮URL')));
  assert.ok(urlWarnings('https://user@evil.example').some((w) => w.includes('ユーザー名')));
  assert.ok(urlWarnings('https://secure-login.example.com').some((w) => w.includes('login')));
  assert.ok(urlWarnings('javascript:alert(1)').some((w) => w.includes('開きません')));
});
test('qr-reader: Wi-Fi QR の解析（エスケープ含む）', () => {
  assert.deepEqual(parseWifi('WIFI:T:WPA;S:my\\;home;P:p\\:ss;H:true;;'), { ssid: 'my;home', password: 'p:ss', security: 'WPA', hidden: true });
  assert.equal(parseWifi('WIFI:S:open;;').security, 'nopass');
});

test('pulse-cam: 合成した脈波から心拍数を推定', () => {
  const fps = 30;
  for (const bpm of [55, 72, 110]) {
    const xs = Array.from({ length: fps * 20 }, (_, i) => 150 + 3 * Math.sin((2 * Math.PI * bpm * i) / (60 * fps)) + i * 0.02 + (Math.random() - 0.5) * 0.8);
    const r = estimateBpm(xs, fps);
    assert.ok(r, `bpm ${bpm} を推定できない`);
    assert.ok(Math.abs(r.bpm - bpm) <= 4, `期待 ${bpm} 実際 ${r.bpm}`);
  }
});
test('pulse-cam: ノイズだけ・短すぎるデータは null', () => {
  assert.equal(estimateBpm([1, 2, 3], 30), null);
  assert.equal(estimateBpm(new Array(300).fill(100), 30), null);
  assert.equal(detrend([1, 1, 1], 1).every((v) => v === 0), true);
});

test('doc-scan: 白黒化', () => {
  const d = new Uint8ClampedArray([10, 10, 10, 255, 200, 200, 200, 255, 120, 120, 120, 255]);
  scanFilter(d, { mode: 'bw', threshold: 0.5 });
  assert.deepEqual([d[0], d[4], d[8]], [0, 255, 255]);
  const g = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
  scanFilter(g, { mode: 'gray' });
  assert.deepEqual([g[0], g[4]], [0, 255]);
});
