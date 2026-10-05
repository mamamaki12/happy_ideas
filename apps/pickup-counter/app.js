import { h, render, $, store, todayStr, fmtTime } from '../../shared/lib.js';

// 「スマホを見た回数」を数える試み。Webアプリは他アプリの使用を検知できないので、
// ホーム画面に追加したこのページに戻るたびに「用があった？ なんとなく？」を1タップで記録する。
const db = store('pickup-counter');
let log = db.get('log', {}); // { date: [{t, why}] }
const app = $('#app');
const big = h('p', { class: 'big-number' });
const ask = h('section', { class: 'card center ask hidden' });
const statCard = h('section', { class: 'card' });
const WHY = [['need', '✅ 用があった'], ['habit', '🌀 なんとなく'], ['notif', '🔔 通知を見た']];

function record(why) { (log[todayStr()] ||= []).push({ t: Date.now(), why }); db.set('log', log); ask.classList.add('hidden'); draw(); }
function prompt() {
  render(ask, h('p', {}, 'いま、スマホを手に取ったのは？'), h('div', { class: 'grid-3' }, WHY.map(([k, l]) => h('button', { onclick: () => record(k) }, l))));
  ask.classList.remove('hidden');
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prompt(); });

function draw() {
  const today = log[todayStr()] || [];
  const habit = today.filter((x) => x.why === 'habit').length;
  big.textContent = `${today.length} 回`;
  const byHour = Array(24).fill(0); today.forEach((x) => { byHour[new Date(x.t).getHours()]++; });
  const max = Math.max(1, ...byHour);
  render(statCard, h('h2', {}, '今日'),
    h('div', { class: 'grid-3' }, WHY.map(([k, l]) => h('div', { class: 'stat' }, h('b', {}, String(today.filter((x) => x.why === k).length)), h('span', {}, l.slice(2))))),
    today.length ? h('p', { class: 'small' }, `「なんとなく」は ${Math.round((habit / today.length) * 100)}%。最後は ${fmtTime(today.at(-1).t)}。`) : null,
    h('div', { class: 'hours', role: 'img', 'aria-label': '時間帯別の回数' }, byHour.map((n, i) => h('div', { class: 'hr', title: `${i}時 ${n}回` }, h('div', { style: { height: `${(n / max) * 100}%` } })))),
    h('p', { class: 'small muted' }, '0時 ………… 12時 ………… 23時'));
}
app.append(h('p', { class: 'notice' }, '使い方: このページをホーム画面に追加し、スマホを見るたびに最初にここを開きます。ブラウザの制約で、他のアプリの使用は自動では数えられません（これ自体が検証結果です）。'),
  h('section', { class: 'card center' }, big, h('button', { onclick: prompt }, '＋ 手動で記録')), ask, statCard);
draw(); prompt();
