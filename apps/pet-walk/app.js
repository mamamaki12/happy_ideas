import { h, add, render, $, store, wakeLock, fmtDuration, fmtDistance, fmtTime, fmtDateTime, geoErrorText, toast, vibrate, confirmDelete } from '../../shared/lib.js';
import { trackDistance } from '../walk-tracker/logic.js';

// ペットの散歩記録: ルート・距離・時間に加えて、おしっこ・うんち・水・ごあいさつ（他の犬）を位置つきで記録。
const db = store('pet-walk');
let walks = db.get('walks', []);
const app = $('#app');
const lock = wakeLock();
const EV = { pee: '💧 おしっこ', poo: '💩 うんち', water: '🥤 水', friend: '🐕 ごあいさつ' };
let cur = null; let watchId = null; let iv = 0; let last = null;
const big = h('p', { class: 'big-number' }, '0 m');
const sub = h('p', { class: 'center muted', 'aria-live': 'polite' }, '散歩に出るときにスタート。画面は点けたままにしてください。');
const evBox = h('div', { class: 'grid-2 hidden' });
const histCard = h('section', { class: 'card' });

function update() { if (!cur) return; big.textContent = fmtDistance(trackDistance(cur.pts)); sub.textContent = `${fmtDuration(Date.now() - cur.t)} ・ ${Object.entries(EV).map(([k, l]) => `${l.split(' ')[0]}${cur.ev.filter((e) => e.k === k).length}`).join(' ')}`; }
function toggle() {
  if (!cur) {
    cur = { t: Date.now(), pts: [], ev: [] };
    watchId = navigator.geolocation.watchPosition((p) => { last = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp || Date.now() }; cur.pts.push(last); update(); }, (e) => { sub.textContent = geoErrorText(e); }, { enableHighAccuracy: true, maximumAge: 0 });
    iv = setInterval(update, 1000); lock.on(); btn.textContent = '■ おわり'; btn.classList.remove('primary'); evBox.classList.remove('hidden'); update();
  } else {
    navigator.geolocation.clearWatch(watchId); clearInterval(iv); lock.off();
    walks.unshift({ t: cur.t, ms: Date.now() - cur.t, m: trackDistance(cur.pts), ev: cur.ev.map((e) => ({ k: e.k, t: e.t })) }); walks = walks.slice(0, 100); db.set('walks', walks);
    toast(`おかえりなさい！ ${fmtDistance(trackDistance(cur.pts))}`); cur = null; btn.textContent = '🐾 散歩スタート'; btn.classList.add('primary'); evBox.classList.add('hidden'); big.textContent = '0 m'; drawHist();
  }
}
const btn = h('button', { class: 'primary big', onclick: toggle }, '🐾 散歩スタート');
render(evBox, Object.entries(EV).map(([k, l]) => h('button', { class: 'ev-btn', onclick: () => { if (!cur) return; cur.ev.push({ k, t: Date.now(), lat: last?.lat, lon: last?.lon }); vibrate(30); toast(`${l} ${fmtTime(Date.now())}`); update(); } }, l)));
function drawHist() {
  const today = new Date().toDateString();
  const todayWalks = walks.filter((w) => new Date(w.t).toDateString() === today);
  render(histCard, h('h2', {}, `今日 ${todayWalks.length}回 ・ ${fmtDistance(todayWalks.reduce((a, w) => a + w.m, 0))}`),
    walks.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') : h('ul', { class: 'list' }, walks.slice(0, 20).map((w, i) => h('li', {},
      h('div', { class: 'grow' }, h('b', {}, fmtDateTime(w.t)), h('div', { class: 'sub' }, `${fmtDistance(w.m)} ・ ${fmtDuration(w.ms)} ・ ${Object.keys(EV).map((k) => `${EV[k].split(' ')[0]}${w.ev.filter((e) => e.k === k).length}`).join(' ')}`)),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { walks.splice(i, 1); db.set('walks', walks); drawHist(); } } }, '×')))));
}
add(app, h('section', { class: 'card center' }, big, sub, btn), h('section', { class: 'card' }, evBox), histCard);
drawHist();
