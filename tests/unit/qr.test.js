// QRコード: 生成した行列を実際のデコーダー（jsQR）で読み戻して検証する
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { qrMatrix } from '../../shared/qr.js';

function decode(m, scale = 4) {
  const n = m.length + 8; const w = n * scale;
  const data = new Uint8ClampedArray(w * w * 4).fill(255);
  m.forEach((row, r) => row.forEach((dark, c) => {
    if (!dark) return;
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) { const i = (((r + 4) * scale + y) * w + (c + 4) * scale + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0; }
  }));
  return jsQR(data, w, w)?.data ?? null;
}

test('QR: URL・日本語・長いデータを生成して読み戻せる', () => {
  for (const text of [
    'https://example.github.io/happy_ideas/apps/stamp-rally/#r=eyJ0aXRsZSI6IuWVhuW6l-ihl-OCueOCv-ODs-ODlyJ9',
    '推し活手帳でいっしょに記録しよう！',
    'x'.repeat(1200),
  ]) assert.equal(decode(qrMatrix(text)), text);
});
test('QR: 誤り訂正レベルで大きさが変わる', () => {
  assert.ok(qrMatrix('hello', 'H').length >= qrMatrix('hello', 'L').length);
});
