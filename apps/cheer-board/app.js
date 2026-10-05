import { h, add, render, $, store, wakeLock } from '../../shared/lib.js';

// 大きな文字を流す電光掲示板。横向きにして掲げると、うちわの代わりになる。
const db = store('cheer-board');
const s = db.get('s', { text: 'こっち見て！', fg: '#ffffff', bg: '#ff5fa2', speed: 6, scroll: true });
const app = $('#app');
const lock = wakeLock();
const stage = h('div', { class: 'board hidden', role: 'button', tabindex: 0, 'aria-label': '応援ボード（タップで終了）' }, h('div', { class: 'board-text' }));
const preview = h('div', { class: 'board-preview' }, h('div', { class: 'board-text' }));

function apply(el) {
  el.style.background = s.bg; el.style.color = s.fg;
  const t = el.querySelector('.board-text'); t.textContent = s.text || ' ';
  t.classList.toggle('scroll', s.scroll); t.style.animationDuration = `${Math.max(2, 22 - s.speed * 2)}s`;
}
const field = (k, label, attrs) => h('div', {}, h('label', { for: `b-${k}` }, label), h('input', { id: `b-${k}`, ...attrs, value: s[k], oninput: (e) => { s[k] = attrs.type === 'range' ? +e.target.value : e.target.value; db.set('s', s); apply(preview); } }));
async function show() { apply(stage); stage.classList.remove('hidden'); lock.on(); try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch { /* 非対応 */ } }
function hide() { stage.classList.add('hidden'); lock.off(); if (document.fullscreenElement) document.exitFullscreen?.(); }
stage.addEventListener('click', hide);
stage.addEventListener('keydown', (e) => { if (['Escape', 'Enter'].includes(e.key)) hide(); });
add(app, h('section', { class: 'card' }, preview,
  h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'b-text' }, '文字'), h('input', { id: 'b-text', value: s.text, maxlength: 40, oninput: (e) => { s.text = e.target.value; db.set('s', s); apply(preview); } })),
  h('div', { class: 'row' }, field('fg', '文字色', { type: 'color' }), field('bg', '背景色', { type: 'color' }), field('speed', '速さ', { type: 'range', min: 1, max: 10 })),
  h('label', { class: 'toggle', style: { margin: '10px 0', display: 'flex', gap: '8px', color: 'var(--text)' } }, h('input', { type: 'checkbox', checked: s.scroll, onchange: (e) => { s.scroll = e.target.checked; db.set('s', s); apply(preview); } }), '流す'),
  h('button', { class: 'primary big', onclick: show }, '📣 全画面で表示')), stage);
apply(preview);
