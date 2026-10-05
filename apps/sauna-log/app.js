import { h, render, $, store, wakeLock, vibrate, fmtDuration, todayStr, fmtDate, uid } from '../../shared/lib.js';

// サ活記録: サウナ → 水風呂 → 休憩 を1タップずつ計測。セット数と「ととのい度」を残す。
const db = store('sauna-log');
let logs = db.get('logs', []);
const app = $('#app');
const lock = wakeLock();
const PHASES = [['sauna', '🔥 サウナ', 8 * 60], ['water', '🧊 水風呂', 60], ['rest', '🪑 休憩', 8 * 60]];
let session = null; let phase = -1; let since = 0; let iv = 0;
const big = h('p', { class: 'big-number' }, '--:--');
const label = h('p', { class: 'center', 'aria-live': 'polite' }, '施設名を入れて「サウナに入る」を押しましょう');
const placeIn = h('input', { id: 'pl', placeholder: '例: 〇〇湯', maxlength: 30, value: db.get('lastPlace', '') });
const btns = h('div', { class: 'grid-3' });
const histCard = h('section', { class: 'card' });

function go(i) {
  if (!session) { session = { id: uid(), date: todayStr(), place: placeIn.value.trim(), sets: [], cur: {} }; db.set('lastPlace', session.place); lock.on(); iv = setInterval(tick, 250); }
  if (phase >= 0) session.cur[PHASES[phase][0]] = Date.now() - since;
  if (i === 0 && session.cur.sauna && phase !== 0) { session.sets.push(session.cur); session.cur = {}; }
  phase = i; since = Date.now(); vibrate(40); drawBtns();
  label.textContent = `${session.sets.length + 1}セット目 ・ ${PHASES[i][1]}`;
}
function tick() {
  if (phase < 0) return;
  const el = Date.now() - since; big.textContent = fmtDuration(el);
  const goal = PHASES[phase][2] * 1000;
  big.classList.toggle('over', el > goal);
  if (el > goal && el - goal < 300) vibrate([100, 60, 100]);
}
function finish(score) {
  if (phase >= 0) session.cur[PHASES[phase][0]] = Date.now() - since;
  if (session.cur.sauna) session.sets.push(session.cur);
  clearInterval(iv); lock.off();
  logs.unshift({ id: session.id, date: session.date, place: session.place, sets: session.sets.length, sauna: session.sets.reduce((s, x) => s + (x.sauna || 0), 0), score });
  db.set('logs', logs); session = null; phase = -1; big.textContent = '--:--'; label.textContent = 'おつかれさまでした！'; drawBtns(); drawHist();
}
function drawBtns() {
  render(btns, PHASES.map(([, l], i) => h('button', { class: `phase${phase === i ? ' on' : ''}`, 'aria-pressed': String(phase === i), onclick: () => go(i) }, l)));
  render(endBox, session ? [h('p', { class: 'small' }, 'ととのい度は？'), h('div', { class: 'btn-row' }, [1, 2, 3, 4, 5].map((n) => h('button', { class: 'small', onclick: () => finish(n), 'aria-label': `ととのい度${n}で終了` }, '♨'.repeat(n))))] : []);
}
const endBox = h('div', { class: 'center' });
function drawHist() {
  const month = logs.filter((x) => x.date.slice(0, 7) === todayStr().slice(0, 7));
  render(histCard, h('h2', {}, `記録（今月 ${month.length}回）`), logs.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') :
    h('ul', { class: 'list' }, logs.slice(0, 20).map((x) => h('li', {}, h('div', { class: 'grow' }, h('b', {}, x.place || 'サウナ'), h('div', { class: 'sub' }, `${fmtDate(x.date)} ・ ${x.sets}セット ・ サウナ計 ${Math.round(x.sauna / 60000)}分`)), h('span', {}, '♨'.repeat(x.score))))));
}
app.append(h('section', { class: 'card' }, h('label', { for: 'pl' }, '施設'), placeIn), h('section', { class: 'card center' }, big, label, btns, endBox, h('p', { class: 'small muted' }, '目安時間（サウナ8分・水風呂1分・休憩8分）を過ぎると振動します。体調に合わせて無理をしないでください。')), histCard);
drawBtns(); drawHist();
