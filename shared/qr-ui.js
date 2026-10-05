// URLをQRコードで見せるダイアログ（対面で渡すとき・ポスターに貼るとき）
import { h, add, download, wakeLock } from './lib.js';
import { drawQr } from './qr.js';
import { canvasToBlob } from './canvas-text.js';

export function showQr(url, { title = 'QRコード', note = 'スマホのカメラで読み取ってください' } = {}) {
  const lock = wakeLock();
  const canvas = drawQr(h('canvas', { class: 'qr-canvas', role: 'img', 'aria-label': `${title}のQRコード` }), url, { size: 640 });
  const close = () => { lock.off(); dlg.remove(); };
  const dlg = h('div', { class: 'qr-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' });
  add(dlg, h('div', { class: 'qr-box' }, h('h2', {}, title), canvas, h('p', { class: 'small muted' }, note),
    h('div', { class: 'btn-row' }, h('button', { onclick: async () => download(await canvasToBlob(canvas), 'qr.png') }, '画像で保存'), h('button', { class: 'primary', onclick: close }, '閉じる'))));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.append(dlg); dlg.focus(); lock.on();
  return dlg;
}
