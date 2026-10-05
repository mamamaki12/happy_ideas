import { h, render, $, toast, download } from '../../shared/lib.js';
import { cameraPanel } from '../../shared/camera.js';
import { scanFilter } from './logic.js';

// 書類を撮って白黒/グレーに補正し、PNGで保存する。処理はすべて端末内。
const app = $('#app');
const pages = []; // { canvas, original }
const out = h('section', { class: 'card' });
const modeIn = h('select', { id: 'mode' }, h('option', { value: 'bw' }, '白黒（文字くっきり）'), h('option', { value: 'gray' }, 'グレー（写真入り）'));
const thIn = h('input', { id: 'th', type: 'range', min: 30, max: 80, value: 55 });

function process(src) {
  const c = h('canvas', { width: src.width, height: src.height });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  scanFilter(img.data, { mode: modeIn.value, threshold: +thIn.value / 100 });
  ctx.putImageData(img, 0, 0);
  return c;
}

async function addPage(blob, canvas) {
  let src = canvas;
  if (!src) { const bmp = await createImageBitmap(blob); src = h('canvas', { width: bmp.width, height: bmp.height }); src.getContext('2d').drawImage(bmp, 0, 0); }
  pages.push({ original: src, canvas: process(src) });
  toast(`${pages.length}ページ目を追加しました`);
  draw();
}

function reprocess() { pages.forEach((p) => { p.canvas = process(p.original); }); draw(); }
modeIn.addEventListener('change', reprocess);
thIn.addEventListener('change', reprocess);

function draw() {
  render(out, h('h2', {}, `スキャン結果（${pages.length}ページ）`),
    pages.length === 0 ? h('p', { class: 'empty' }, '書類を明るい場所で、真上から撮りましょう') :
      h('div', { class: 'pages' }, pages.map((p, i) => {
        p.canvas.className = 'page';
        p.canvas.setAttribute('role', 'img'); p.canvas.setAttribute('aria-label', `${i + 1}ページ目`);
        return h('figure', {}, p.canvas, h('figcaption', { class: 'btn-row' },
          h('button', { class: 'small', onclick: () => p.canvas.toBlob((b) => download(b, `scan-${i + 1}.png`), 'image/png') }, '保存'),
          h('button', { class: 'small ghost', 'aria-label': `${i + 1}ページ目を削除`, onclick: () => { pages.splice(i, 1); draw(); } }, '削除')));
      })));
}

const cam = cameraPanel({ label: 'ページを撮る', maxSide: 1800, onPhoto: addPage });
app.append(h('section', { class: 'card' }, cam.el,
  h('div', { class: 'row', style: { marginTop: '12px' } }, h('div', {}, h('label', { for: 'mode' }, '仕上がり'), modeIn), h('div', {}, h('label', { for: 'th' }, '白黒のしきい値'), thIn))), out);
draw();
