import { h, add, render, $, store, uid, share, download, todayStr, toast, confirmDelete } from '../../shared/lib.js';
import { encodeData, decodeData, str } from '../../shared/urldata.js';
import { toIcs } from './logic.js';
import { showQr } from '../../shared/qr-ui.js';

// 家族の予定（参観日・ゴミ当番・送迎など）を URL で送る。受け取った人はアプリなしで見られ、カレンダーに追加できる。
const db = store('family-schedule');
const app = $('#app');
const WD = '日月火水木金土';
const fmt = (e) => { const d = new Date(`${e.date}T00:00:00`); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})${e.time ? ` ${e.time}` : ''}`; };
const clean = (d) => (d && Array.isArray(d.events) ? { title: str(d.title, 40, '家族の予定'), events: d.events.slice(0, 100).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e?.date)).map((e) => ({ date: e.date, time: /^\d{2}:\d{2}$/.test(e.time) ? e.time : '', title: str(e.title, 60, '予定'), who: str(e.who, 20) })) } : null);

function listView(events) {
  return h('ul', { class: 'list' }, [...events].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((e) => h('li', { class: e.date < todayStr() ? 'past' : '' }, h('b', { class: 'when' }, fmt(e)), h('span', { class: 'grow' }, e.title), e.who ? h('span', { class: 'pill' }, e.who) : null)));
}
const icsBtn = (title, events) => h('button', { onclick: () => download(new Blob([toIcs(events)], { type: 'text/calendar' }), `family-schedule-${todayStr()}.ics`) }, '📅 カレンダーに追加（.ics）');

const shared = location.hash.startsWith('#s=') ? clean(decodeData(location.hash.slice(3))) : null;
if (location.hash.startsWith('#s=') && !shared) add(app, h('p', { class: 'error' }, '予定のURLが壊れています'));
else if (shared) add(app, h('section', { class: 'card' }, h('h2', {}, shared.title), listView(shared.events), h('div', { class: 'btn-row', style: { marginTop: '10px' } }, icsBtn(shared.title, shared.events))), h('p', { class: 'center' }, h('a', { href: './' }, '自分で予定表を作る')));
else {
  const d = db.get('d', { title: '家族の予定', events: [] });
  const save = () => db.set('d', d);
  const box = h('div');
  const draw = () => render(box, d.events.length ? [listView(d.events), h('details', {}, h('summary', {}, '予定を削除'), h('ul', { class: 'list' }, d.events.map((e) => h('li', {}, h('span', { class: 'grow' }, `${fmt(e)} ${e.title}`), h('button', { class: 'small ghost', 'aria-label': `${e.title}を削除`, onclick: () => { if (confirmDelete(e.title)) { d.events = d.events.filter((x) => x.id !== e.id); save(); draw(); } } }, '×')))))] : h('p', { class: 'empty' }, '予定を追加しましょう'));
  const f = { date: h('input', { id: 'fd', type: 'date', required: true, value: todayStr() }), time: h('input', { id: 'ft', type: 'time' }), title: h('input', { id: 'fti', required: true, maxlength: 60, placeholder: '例: 参観日' }), who: h('input', { id: 'fw', maxlength: 20, placeholder: '例: パパ' }) };
  add(app, h('section', { class: 'card' }, h('label', { for: 'st' }, '予定表の名前'), h('input', { id: 'st', value: d.title, maxlength: 40, oninput: (e) => { d.title = e.target.value; save(); } })),
    h('section', { class: 'card' }, box, h('div', { class: 'btn-row', style: { marginTop: '10px' } },
      h('button', { class: 'primary', onclick: () => { if (!d.events.length) return toast('予定を追加してください'); const url = new URL(location.href); url.hash = `s=${encodeData({ title: d.title, events: d.events.map(({ date, time, title, who }) => ({ date, time, title, who })) })}`; share({ title: d.title, text: `${d.title}を送ります（アプリ不要で見られます）`, url: url.href }); } }, '📤 URLで送る'),
      h('button', { onclick: () => { if (!d.events.length) return toast('予定を追加してください'); const url = new URL(location.href); url.hash = `s=${encodeData({ title: d.title, events: d.events.map(({ date, time, title, who }) => ({ date, time, title, who })) })}`; showQr(url.href, { title: d.title, note: '家族のスマホで読み取ると予定表が開きます' }); } }, '🔳 QR'), icsBtn(d.title, d.events))),
    h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); d.events.push({ id: uid(), date: f.date.value, time: f.time.value, title: f.title.value.trim(), who: f.who.value.trim() }); save(); f.title.value = ''; draw(); } },
      h('h2', {}, '予定を追加'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'fd' }, '日付'), f.date), h('div', {}, h('label', { for: 'ft' }, '時刻（任意）'), f.time)),
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'fti' }, '内容'), f.title), h('div', {}, h('label', { for: 'fw' }, '担当'), f.who)), h('button', { class: 'primary', type: 'submit', style: { marginTop: '10px' } }, '追加')));
  draw();
}
addEventListener('hashchange', () => location.reload());
