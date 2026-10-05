import { h, add, render, $, getPosition, mapUrl, share, fmtTime, toast } from '../../shared/lib.js';

// 現在地を地図リンクにして共有する。精度と時刻も添える。アプリを入れていない相手にも届く。
const app = $('#app');
const out = h('section', { class: 'card', 'aria-live': 'polite' });
const btn = h('button', { class: 'primary big', onclick: locate }, '📍 現在地を取得');
let current = null;

async function locate() {
  btn.disabled = true; btn.textContent = '取得中…';
  try {
    const p = await getPosition({ maximumAge: 0 });
    current = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy), t: Date.now() };
    draw();
  } catch (e) { render(out, h('p', { class: 'error' }, e.message)); }
  btn.disabled = false; btn.textContent = '📍 現在地を取り直す';
}

function draw() {
  const url = mapUrl(current.lat, current.lon);
  const text = (msg) => `${msg}\n${fmtTime(current.t)}時点・誤差 約${current.acc}m`;
  const quick = ['いまここにいます', 'もうすぐ着きます', '迎えに来てください', '迷子になりました'];
  render(out,
    h('p', {}, h('b', {}, `${current.lat.toFixed(5)}, ${current.lon.toFixed(5)}`), h('br'), h('span', { class: 'muted small' }, `誤差 約${current.acc}m（${current.acc > 100 ? '屋内では精度が下がります' : '良好'}）・${fmtTime(current.t)}`)),
    h('div', { class: 'grid-2' }, quick.map((q) => h('button', { onclick: () => share({ title: q, text: text(q), url }) }, q))),
    h('div', { class: 'btn-row', style: { marginTop: '10px' } },
      h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener noreferrer' }, '🗺 地図で確認'),
      h('button', { onclick: () => navigator.clipboard?.writeText(url).then(() => toast('リンクをコピーしました'), () => toast('コピーできませんでした')) }, 'リンクをコピー')));
}
add(app, h('section', { class: 'card center' }, btn, h('p', { class: 'small muted' }, '位置はこの端末から相手に直接送られます。サーバーには保存されません。')), out);
