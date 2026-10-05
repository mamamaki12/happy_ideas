import { h, render, $, store, uid, vibrate, toast, fmtDate, todayStr, confirmDelete } from '../../shared/lib.js';

// おてつだいをポイントにして、ごほうびと交換する。子どもが自分で押せる大きなボタン。
const db = store('chore-points');
let kids = db.get('kids', [{ id: uid(), name: 'たろう', icon: '🦁' }]);
let cur = db.get('cur', kids[0].id);
let chores = db.get('chores', [['🍽 おさらはこび', 1], ['👕 せんたくものたたみ', 2], ['🛁 おふろそうじ', 3], ['🧸 おかたづけ', 1], ['🌱 みずやり', 1]]);
let rewards = db.get('rewards', [['🍦 アイス', 10], ['📺 テレビ30分', 5], ['🎮 ゲーム30分', 8], ['🎁 おもちゃ', 50]]);
let log = db.get('log', []);
const app = $('#app');
const main = h('div');
const addKid = h('form', { class: 'card row hidden', onsubmit: (e) => { e.preventDefault(); const n = addKid.querySelector('input'); if (!n.value.trim()) return; const k = { id: uid(), name: n.value.trim().slice(0, 10), icon: ['🐰', '🐻', '🐼', '🐸', '🦊'][kids.length % 5] }; kids.push(k); cur = k.id; n.value = ''; addKid.classList.add('hidden'); save(); draw(); } },
  h('div', {}, h('input', { placeholder: 'なまえ', maxlength: 10, 'aria-label': '子どものなまえ' })), h('button', { class: 'shrink primary', type: 'submit' }, '追加'));
const save = () => { db.set('kids', kids); db.set('cur', cur); db.set('log', log); db.set('chores', chores); db.set('rewards', rewards); };
const points = (kid) => log.filter((l) => l.kid === kid).reduce((s, l) => s + l.p, 0);

function draw() {
  const kid = kids.find((k) => k.id === cur) || kids[0]; const pt = points(kid.id);
  render(main,
    h('div', { class: 'tabs', role: 'tablist' }, kids.map((k) => h('button', { role: 'tab', 'aria-selected': String(k.id === kid.id), onclick: () => { cur = k.id; save(); draw(); } }, `${k.icon} ${k.name}`)),
      h('button', { class: 'small', 'aria-label': '子どもを追加', onclick: () => { addKid.classList.toggle('hidden'); addKid.querySelector('input').focus(); } }, '＋')),
    addKid,
    h('section', { class: 'card center' }, h('p', { class: 'big-number' }, `⭐ ${pt}`), h('p', { class: 'muted' }, `${kid.name}のポイント`)),
    h('section', { class: 'card' }, h('h2', {}, 'おてつだいした！'), h('div', { class: 'grid-2' }, chores.map(([l, p]) => h('button', { class: 'chore', onclick: () => { log.unshift({ id: uid(), kid: kid.id, p, l, d: todayStr() }); save(); vibrate([40, 40, 80]); toast(`⭐ +${p}　えらい！`); draw(); } }, h('span', {}, l), h('span', { class: 'pill' }, `+${p}`))))),
    h('section', { class: 'card' }, h('h2', {}, 'ごほうびと交換'), h('div', { class: 'grid-2' }, rewards.map(([l, p]) => h('button', { disabled: pt < p, onclick: () => { if (!confirm(`${l} と交換しますか？（${p}ポイント）`)) return; log.unshift({ id: uid(), kid: kid.id, p: -p, l, d: todayStr() }); save(); toast(`🎉 ${l} ゲット！`); draw(); } }, l, h('span', { class: 'pill' }, `${p}pt`))))),
    h('details', { class: 'card' }, h('summary', {}, 'りれき'), h('ul', { class: 'list' }, log.filter((x) => x.kid === kid.id).slice(0, 30).map((x) => h('li', {}, h('span', { class: 'sub' }, fmtDate(x.d)), h('span', { class: 'grow' }, x.l), h('b', { style: { color: x.p > 0 ? 'var(--ok)' : 'var(--danger)' } }, x.p > 0 ? `+${x.p}` : x.p),
      h('button', { class: 'small ghost', 'aria-label': '取り消し', onclick: () => { if (confirmDelete()) { log = log.filter((y) => y.id !== x.id); save(); draw(); } } }, '×'))))));
}
app.append(main);
draw();
