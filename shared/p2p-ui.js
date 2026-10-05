// 接続コードの受け渡しUI（招待する / 招待された の2つの手順）
import { h, render, share, toast } from './lib.js';

export function connectPanel(peer, { onConnected } = {}) {
  const box = h('div', { class: 'p2p' });
  const codeArea = (label, value) => h('div', { class: 'field' }, h('label', {}, label), h('textarea', { rows: 3, readonly: true, value, 'aria-label': label, class: 'code' }),
    h('div', { class: 'btn-row' }, h('button', { class: 'small', onclick: () => share({ title: '接続コード', text: value }) }, '送る'), h('button', { class: 'small', onclick: () => navigator.clipboard?.writeText(value).then(() => toast('コピーしました'), () => toast('コピーできませんでした')) }, 'コピー')));
  const pasteArea = (label, onOk, btnLabel) => { const ta = h('textarea', { rows: 3, 'aria-label': label, placeholder: 'ここに貼り付け', class: 'code' }); return h('div', { class: 'field' }, h('label', {}, label), ta, h('button', { class: 'primary', onclick: async (e) => { e.currentTarget.disabled = true; try { await onOk(ta.value); } catch (err) { toast(err.message, 4000); e.currentTarget.disabled = false; } } }, btnLabel)); };

  const start = () => render(box,
    h('p', { class: 'small muted' }, 'サーバーを使わずに、2台のスマホを直接つなぎます。どちらか一方が「招待する」を押してください。'),
    h('div', { class: 'grid-2' },
      h('button', { class: 'primary', onclick: async (e) => { e.currentTarget.disabled = true; e.currentTarget.textContent = '準備中…'; const code = await peer.invite(); render(box, h('p', {}, '① この招待コードを相手に送ってください'), codeArea('招待コード', code), pasteArea('② 相手から届いた返事コード', async (c) => { await peer.finish(c); render(box, h('p', { class: 'center' }, '接続中…')); }, 'つなぐ')); } }, '📨 招待する'),
      h('button', { onclick: () => render(box, pasteArea('① 相手から届いた招待コード', async (c) => { const ans = await peer.accept(c); render(box, h('p', {}, '② この返事コードを相手に送り返してください'), codeArea('返事コード', ans), h('p', { class: 'center muted' }, '相手が「つなぐ」を押すと接続されます')); }, '返事コードを作る')) }, '📩 招待された')));
  const prev = peer.pc.onconnectionstatechange;
  peer.pc.onconnectionstatechange = (e) => {
    prev?.(e);
    const st = peer.pc.connectionState;
    if (st === 'connected') { render(box, h('p', { class: 'pill ok' }, '✅ つながりました')); onConnected?.(); }
    if (st === 'failed') render(box, h('p', { class: 'error' }, '接続できませんでした。同じWi-Fiにつなぐか、モバイル回線同士で試してください（会社などのネットワークでは制限されることがあります）。'));
  };
  start();
  return box;
}
