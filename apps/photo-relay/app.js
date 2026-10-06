import { h, add, render, $, download, toast, resizeImage } from '../../shared/lib.js';
import { createPeer, sendChunked } from '../../shared/p2p.js';
import { connectPanel } from '../../shared/p2p-ui.js';
import { blobImg } from '../../shared/camera.js';

// イベントで撮った写真を、近くの人とサーバーなしで直接送り合う。届いた写真はその場で保存できる。
const app = $('#app');
const MAX = 5 * 1024 * 1024;
const gallery = h('div', { class: 'relay-grid' });
const status = h('p', { class: 'small muted', 'aria-live': 'polite' });
let incoming = null; let count = 0;

const peer = createPeer({
  onMessage: (d) => {
    if (typeof d === 'string') {
      let m; try { m = JSON.parse(d); } catch { return; }
      if (m.k === 'start' && Number.isFinite(m.size) && m.size > 0 && m.size <= MAX) { incoming = { parts: [], got: 0, size: m.size, type: /^image\/(jpeg|png|webp)$/.test(m.type) ? m.type : 'image/jpeg' }; status.textContent = '受信中…'; }
      else if (m.k === 'end' && incoming) {
        const blob = new Blob(incoming.parts, { type: incoming.type });
        if (blob.size === incoming.size) showPhoto(blob, false); else toast('写真の受信に失敗しました');
        incoming = null; status.textContent = '';
      }
    } else if (incoming) {
      incoming.got += d.byteLength;
      if (incoming.got > incoming.size) { incoming = null; toast('想定より大きいデータを受け取ったため中止しました'); return; }
      incoming.parts.push(d); status.textContent = `受信中… ${Math.round((incoming.got / incoming.size) * 100)}%`;
    }
  },
});
function showPhoto(blob, mine) {
  const n = ++count;
  gallery.prepend(h('figure', {}, blobImg(blob, { alt: mine ? '送った写真' : '受け取った写真' }), h('figcaption', {}, h('span', { class: 'small' }, mine ? '送信済み' : '📥 受信'), h('button', { class: 'small', onclick: () => download(blob, `photo-${n}.jpg`) }, '保存'))));
}
const fileIn = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden', 'aria-label': '送る写真を選ぶ' });
fileIn.addEventListener('change', async () => {
  for (const f of [...fileIn.files].slice(0, 20)) {
    const blob = await resizeImage(f, 1600, 0.85).catch(() => null); if (!blob) continue;
    status.textContent = '送信中…';
    await sendChunked(peer, { type: 'image/jpeg' }, await blob.arrayBuffer());
    showPhoto(blob, true);
  }
  status.textContent = ''; fileIn.value = '';
});
const sendCard = h('section', { class: 'card hidden' }, h('button', { class: 'primary big', onclick: () => fileIn.click() }, '🖼 写真を選んで送る'), fileIn, status);
add(app, h('section', { class: 'card' }, connectPanel(peer, { onConnected: () => sendCard.classList.remove('hidden') })), sendCard, h('section', { class: 'card' }, h('h2', {}, '写真'), gallery),
  h('p', { class: 'small muted' }, '写真はサーバーを通らず、端末から端末へ直接届きます（1枚5MBまで・長辺1600pxに縮小）。'));
