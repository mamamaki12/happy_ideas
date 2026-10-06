// QRコード生成（同梱した qrcode-generator を使用）。UTF-8 でエンコードし、Canvas に描く。
import qrcode from './vendor/qrcode-generator.mjs';

qrcode.stringToBytes = (s) => [...new TextEncoder().encode(s)];

/** QRのモジュール行列（true=黒）を返す。文字数に合わせて型番を自動選択 */
export function qrMatrix(text, ecc = 'M') {
  const q = qrcode(0, ecc);
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}

/** Canvas に描く（周囲に4モジュールの余白） */
export function drawQr(canvas, text, { size = 512, ecc = 'M', fg = '#000', bg = '#fff' } = {}) {
  const m = qrMatrix(text, ecc);
  const n = m.length + 8; const cell = Math.floor(size / n); const px = cell * n;
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, px, px); ctx.fillStyle = fg;
  m.forEach((row, r) => row.forEach((dark, c) => { if (dark) ctx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell); }));
  return canvas;
}
