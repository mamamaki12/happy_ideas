import { h, add, render, $, store, share, notify, notifyButton, todayStr, fmtTime, vibrate } from '../../shared/lib.js';
import { streak } from './logic.js';

// 1日1回「元気です」ボタン。押すと家族へ送る文面がすぐ共有できる。高齢の親の見守りに。
const db = store('checkin');
let log = db.get('log', {}); // { date: time }
const cfg = db.get('cfg', { name: '', mood: '' });
const app = $('#app');
const MOODS = [['😊', '元気です'], ['🙂', 'まあまあです'], ['😷', '少し体調が悪いです'], ['🆘', '助けが必要です']];
const top = h('section', { class: 'card center' });
const cal = h('section', { class: 'card' });

function press(mood) {
  log[todayStr()] = Date.now(); db.set('log', log); vibrate([60, 40, 120]);
  const text = `${cfg.name || 'わたし'}は今日も${mood[1]} ${mood[0]}（${fmtTime(Date.now())}）`;
  share({ title: '毎日げんきボタン', text });
  draw();
}
function draw() {
  const done = !!log[todayStr()]; const n = streak(Object.keys(log), todayStr());
  render(top, done ? h('p', { class: 'done-msg' }, `✅ 今日は ${fmtTime(log[todayStr()])} に送りました`) : h('p', {}, '今日の調子をタップして、家族に送りましょう'),
    h('div', { class: 'mood-grid' }, MOODS.map((m) => h('button', { class: `mood${m[0] === '🆘' ? ' sos' : ''}`, onclick: () => press(m) }, h('span', { class: 'mood-icon' }, m[0]), m[1]))),
    h('p', { class: 'small muted' }, `連続 ${n} 日`));
  const days = []; const d = new Date(); d.setDate(d.getDate() - 27);
  for (let i = 0; i < 28; i++) { const k = todayStr(d); days.push(h('div', { class: `cday${log[k] ? ' on' : ''}`, title: k }, String(d.getDate()))); d.setDate(d.getDate() + 1); }
  render(cal, h('h2', {}, '直近4週間'), h('div', { class: 'cgrid' }, days));
}
// 夜8時を過ぎても押していなければ通知（ページを開いている場合）
setInterval(() => { if (!log[todayStr()] && new Date().getHours() >= 20 && db.get('nag') !== todayStr()) { db.set('nag', todayStr()); notify('今日の「げんきボタン」がまだです', 'ご家族が待っています'); } }, 60000);
add(app, top, cal, h('details', { class: 'card' }, h('summary', {}, '設定'),
  h('label', { for: 'nm' }, 'お名前（送る文面に入ります）'), h('input', { id: 'nm', value: cfg.name, maxlength: 20, oninput: (e) => { cfg.name = e.target.value; db.set('cfg', cfg); } }),
  h('div', { style: { marginTop: '10px' } }, notifyButton())));
draw();
