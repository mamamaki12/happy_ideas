import { h, render, $, store, requestOrientation, vibrate, wakeLock, todayStr } from '../../shared/lib.js';

// スマホの傾き（beta）から首の前傾を推定。うつむくほど首にかかる重さが増える（Hansraj 2014 の目安）。
const LOAD = [[0, 5], [15, 12], [30, 18], [45, 22], [60, 27]];
export const neckLoadKg = (deg) => {
  const d = Math.max(0, Math.min(60, deg));
  for (let i = 1; i < LOAD.length; i++) if (d <= LOAD[i][0]) { const [a, la] = LOAD[i - 1]; const [b, lb] = LOAD[i]; return la + ((lb - la) * (d - a)) / (b - a); }
  return 27;
};

const db = store('neck-angle');
const stats = db.get('stats', {});
const app = $('#app');
const lock = wakeLock();
const face = h('div', { class: 'neck-face', 'aria-hidden': 'true' }, '🙂');
const big = h('p', { class: 'big-number', 'aria-live': 'polite' }, '--');
const msg = h('p', { class: 'center' }, '');
const meter = h('div', { class: 'meter' }, h('div'));
const startBtn = h('button', { class: 'primary big', onclick: start }, '計測をはじめる');
let badSince = null; let samples = 0; let bad = 0;

function onOri(e) {
  if (e.beta == null) return;
  // 画面を目の高さで垂直に持つと beta≈90。下を向くほど beta が小さくなる。
  const neck = Math.max(0, Math.min(60, 90 - e.beta));
  const kg = neckLoadKg(neck);
  big.textContent = `${Math.round(kg)} kg`;
  meter.firstChild.style.width = `${(kg / 27) * 100}%`;
  const isBad = neck > 30;
  face.textContent = neck < 15 ? '🙂' : neck < 30 ? '😐' : '😣';
  msg.textContent = `首の前傾 約${Math.round(neck)}° — ${neck < 15 ? 'いい姿勢です' : neck < 30 ? '少しうつむいています' : 'スマホを目の高さまで上げましょう'}`;
  samples++; if (isBad) bad++;
  if (isBad) { badSince ??= Date.now(); if (Date.now() - badSince > 10000) { vibrate([200, 100, 200]); badSince = Date.now(); } } else badSince = null;
  if (samples % 60 === 0) { stats[todayStr()] = { samples, bad }; db.set('stats', stats); }
}

async function start() {
  if (!(await requestOrientation())) { msg.textContent = '傾きセンサーが使えません'; return; }
  startBtn.classList.add('hidden');
  addEventListener('deviceorientation', onOri);
  lock.on();
}

const today = stats[todayStr()];
app.append(h('section', { class: 'card center' }, face, big, meter, msg, startBtn,
  h('p', { class: 'small muted' }, 'うつむき姿勢が10秒続くと振動でお知らせします（Android）。')),
today ? h('section', { class: 'card' }, h('h2', {}, '今日'), h('p', {}, `うつむき率 ${Math.round((today.bad / Math.max(1, today.samples)) * 100)}%`)) : null);
if (typeof window.DeviceOrientationEvent?.requestPermission !== 'function') start();
