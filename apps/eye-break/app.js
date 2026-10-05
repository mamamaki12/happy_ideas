import { h, $, store, notify, notifyButton, vibrate, fmtDuration, todayStr } from '../../shared/lib.js';

// 20-20-20 ルール: 20分ごとに、20フィート（約6m）先を20秒見る。
const db = store('eye-break');
const app = $('#app');
const WORK = 20 * 60000; const REST = 20000;
let phase = 'idle'; let until = 0; let iv = 0; let count = db.get('count', {});
const big = h('p', { class: 'big-number' }, '20:00');
const msg = h('p', { class: 'center', 'aria-live': 'polite' }, '開始すると20分後に休憩をお知らせします');
const btn = h('button', { class: 'primary big', onclick: toggle }, '▶ 開始');
const statP = h('p', { class: 'center small muted' });
const drawStat = () => { statP.textContent = `今日の休憩 ${count[todayStr()] || 0} 回`; };

function tick() {
  const left = until - Date.now();
  if (left <= 0) {
    if (phase === 'work') { phase = 'rest'; until = Date.now() + REST; vibrate([200, 100, 200]); notify('👀 目の休憩', '6m以上先を20秒ながめましょう'); msg.textContent = '👀 遠くを20秒見てください'; document.body.classList.add('resting'); }
    else { phase = 'work'; until = Date.now() + WORK; count[todayStr()] = (count[todayStr()] || 0) + 1; db.set('count', count); drawStat(); vibrate(80); msg.textContent = 'おかえりなさい。次は20分後'; document.body.classList.remove('resting'); }
  }
  big.textContent = fmtDuration(Math.max(0, until - Date.now()));
}
function toggle() {
  if (phase !== 'idle') { clearInterval(iv); phase = 'idle'; btn.textContent = '▶ 開始'; big.textContent = '20:00'; msg.textContent = '停止しました'; document.body.classList.remove('resting'); return; }
  phase = 'work'; until = Date.now() + WORK; iv = setInterval(tick, 500); btn.textContent = '■ 停止'; msg.textContent = '作業中…（このタブを開いたままにしてください）'; tick();
}
app.append(h('section', { class: 'card center' }, big, msg, btn, statP, h('div', { style: { marginTop: '8px' } }, notifyButton())),
  h('section', { class: 'card' }, h('h2', {}, '20-20-20 ルールとは'), h('p', { class: 'small' }, '画面を20分見たら、20フィート（約6m）以上離れた場所を20秒見る、という目の疲れ対策です。窓の外の景色などがおすすめです。')));
drawStat();
