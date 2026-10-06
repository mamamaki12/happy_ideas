import { h, add, render, $, store, wakeLock } from '../../shared/lib.js';
import { speak, synthesisSupported } from '../../shared/speech.js';
import { LANGS, PHRASES } from './phrases.js';

// 指さし会話帳。相手の言語を選び、フレーズをタップすると大きく表示して読み上げる。
const db = store('phrase-board');
const s = db.get('s', { mine: 'ja', theirs: 'en' });
const app = $('#app');
const lock = wakeLock();
let cat = Object.keys(PHRASES)[0];
const tabs = h('div', { class: 'tabs', role: 'tablist' });
const list = h('div', { class: 'phrase-list' });
const sel = (id, key) => h('select', { id, onchange: (e) => { s[key] = e.target.value; db.set('s', s); draw(); } }, Object.entries(LANGS).map(([k, [l]]) => h('option', { value: k, selected: k === s[key] }, l)));

function showBig(p) {
  const ov = h('div', { class: 'phrase-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'フレーズを見せる', tabindex: '-1' },
    h('p', { class: 'phrase-big' }, p[s.theirs]), h('p', { class: 'phrase-sub' }, p[s.mine]),
    h('div', { class: 'btn-row' },
      h('button', { onclick: () => speak(p[s.theirs], { lang: LANGS[s.theirs][1], rate: 0.9 }), disabled: !synthesisSupported() }, '🔊 もう一度'),
      h('button', { class: 'primary', onclick: () => { ov.remove(); lock.off(); } }, '閉じる')));
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ov.remove(); lock.off(); } });
  document.body.append(ov); ov.focus(); lock.on();
  speak(p[s.theirs], { lang: LANGS[s.theirs][1], rate: 0.9 });
}

function draw() {
  render(tabs, Object.keys(PHRASES).map((c) => h('button', { role: 'tab', 'aria-selected': String(c === cat), onclick: () => { cat = c; draw(); } }, c)));
  render(list, PHRASES[cat].map((p) => h('button', { class: 'phrase', onclick: () => showBig(p) }, h('span', { class: 'p-mine' }, p[s.mine]), h('span', { class: 'p-theirs' }, p[s.theirs]))));
}
add(app, h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'mine' }, 'わたし'), sel('mine', 'mine')), h('div', {}, h('label', { for: 'theirs' }, '相手'), sel('theirs', 'theirs')))),
  tabs, list, h('p', { class: 'small muted center' }, 'タップすると大きく表示して読み上げます。通信なしで使えます。'));
draw();
