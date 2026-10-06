// 「ホーム画面に追加」の案内。Android は標準のインストール画面を出し、iPhone は手順を表示する。
// iPhone では、ホーム画面に追加しないと通知が受け取れない（iOS 16.4〜）。
import { h, add, store } from './lib.js';

export function installHint(container, { appName, ns, reason = '通知を受け取ったり、すぐに開けるようになります' }) {
  const db = store(ns);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone || db.get('installHintClosed', false)) return;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  let deferred = null;
  const box = h('aside', { class: 'install-hint hidden', 'aria-label': 'ホーム画面に追加' });
  const close = () => { box.remove(); db.set('installHintClosed', true); };
  const body = (...children) => add(box, h('span', { class: 'ih-icon', 'aria-hidden': 'true' }, '📲'), h('div', { class: 'grow' }, h('b', {}, `${appName}をホーム画面に追加`), h('div', { class: 'small' }, ...children)), h('button', { class: 'small ghost', 'aria-label': '閉じる', onclick: close }, '×'));
  if (ios) {
    body(`Safari の 共有ボタン（□↑）→「ホーム画面に追加」。${reason}`);
    box.classList.remove('hidden');
  } else {
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); deferred = e;
      body(reason, ' ', h('button', { class: 'small primary', onclick: async () => { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); if (r?.outcome === 'accepted') close(); } }, '追加する'));
      box.classList.remove('hidden');
    }, { once: true });
  }
  container.prepend(box);
}
