import { h, render, $, store, requestOrientation, wakeLock, fmtDuration, vibrate, todayStr, notify } from '../../shared/lib.js';

// スマホを伏せて置いている間だけ時間が貯まる。持ち上げたら終了。
const db = store('phone-down');
let best = db.get('best', 0);
let history = db.get('history', []);
const app = $('#app');
const lock = wakeLock();
const big = h('p', { class: 'big-number', 'aria-live': 'off' }, '00:00');
const msg = h('p', { class: 'center', 'aria-live': 'polite' }, '目標時間を選んで、スマホを画面を下にして置いてください。');
const goalIn = h('select', { id: 'goal' }, [5, 15, 25, 45, 60, 90].map((m) => h('option', { value: m, selected: m === 25 }, `${m}分`)));
const startBtn = h('button', { class: 'primary big', onclick: arm }, 'はじめる');
const histCard = h('section', { class: 'card' });
let state = 'idle'; let downAt = 0; let raf = 0;

const isFaceDown = (e) => e.beta != null && Math.abs(e.beta) > 150 && Math.abs(e.gamma || 0) < 30;

function onOri(e) {
  if (e.beta == null) return; // センサーなし端末の空イベントは無視
  if (state === 'armed' && isFaceDown(e)) { state = 'down'; downAt = Date.now(); msg.textContent = 'いいですね。そのまま置いておきましょう。'; tick(); }
  else if (state === 'down' && !isFaceDown(e)) finish();
}
function tick() {
  if (state !== 'down') return;
  const el = Date.now() - downAt;
  big.textContent = fmtDuration(el);
  if (el >= +goalIn.value * 60000 && !tick.done) { tick.done = true; vibrate([300, 100, 300]); notify('🎉 目標達成！', `${goalIn.value}分スマホを置けました`); }
  raf = requestAnimationFrame(tick);
}
async function arm() {
  if (!(await requestOrientation())) { msg.textContent = '傾きセンサーが使えないため、この端末では試せません。'; return; }
  tick.done = false; state = 'armed'; startBtn.classList.add('hidden'); lock.on();
  msg.textContent = 'スマホを伏せて置いてください…';
  addEventListener('deviceorientation', onOri);
}
function finish() {
  cancelAnimationFrame(raf); removeEventListener('deviceorientation', onOri); lock.off();
  const el = Date.now() - downAt; const ok = el >= +goalIn.value * 60000;
  state = 'idle'; startBtn.classList.remove('hidden');
  msg.textContent = ok ? `🎉 達成！ ${fmtDuration(el)} 置けました` : `持ち上げました。${fmtDuration(el)} でした`;
  if (el > best) { best = el; db.set('best', best); }
  history.unshift({ date: todayStr(), ms: el, ok }); history = history.slice(0, 30); db.set('history', history);
  drawHist();
}
function drawHist() {
  const todayMs = history.filter((x) => x.date === todayStr()).reduce((s, x) => s + x.ms, 0);
  render(histCard, h('div', { class: 'grid-3' },
    h('div', { class: 'stat' }, h('b', {}, fmtDuration(todayMs)), h('span', {}, '今日の合計')),
    h('div', { class: 'stat' }, h('b', {}, fmtDuration(best)), h('span', {}, '最長記録')),
    h('div', { class: 'stat' }, h('b', {}, String(history.filter((x) => x.ok).length)), h('span', {}, '達成回数'))));
}
app.append(h('section', { class: 'card center' }, big, msg, h('div', { class: 'field' }, h('label', { for: 'goal' }, '目標'), goalIn), startBtn), histCard);
drawHist();
