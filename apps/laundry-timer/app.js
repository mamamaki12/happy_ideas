import { h, render, $, store, getPosition, notify, notifyButton, fmtTime, fmtDuration, toast } from '../../shared/lib.js';
import { dryIndex } from './logic.js';

// 洗濯・乾燥の終了時刻を通知。現在地の気温・湿度から「部屋干しの乾きやすさ」も出す。
const db = store('laundry-timer');
let timers = db.get('timers', []);
const app = $('#app');
const PRESETS = [['🌀 洗濯', 45], ['🔥 乾燥', 120], ['🧺 洗濯＋乾燥', 180], ['🧦 部屋干し確認', 360]];
const listCard = h('section', { class: 'card', 'aria-live': 'polite' });
const dryCard = h('section', { class: 'card' });
const save = () => db.set('timers', timers);

function start(label, min) {
  timers.push({ id: Date.now(), label, end: Date.now() + min * 60000, done: false });
  save(); draw(); toast(`${label}: ${fmtTime(Date.now() + min * 60000)} にお知らせします`);
}
function draw() {
  const now = Date.now();
  render(listCard, h('h2', {}, 'タイマー'),
    timers.length === 0 ? h('p', { class: 'empty' }, '下のボタンで開始') :
      h('ul', { class: 'list' }, timers.map((t) => h('li', {}, h('span', { class: 'grow' }, t.label, h('div', { class: 'sub' }, `${fmtTime(t.end)} 終了予定`)),
        h('b', {}, t.end <= now ? '✅ 終了' : fmtDuration(t.end - now)),
        h('button', { class: 'small ghost', 'aria-label': `${t.label}を削除`, onclick: () => { timers = timers.filter((x) => x.id !== t.id); save(); draw(); } }, '×')))));
}
setInterval(() => {
  const now = Date.now();
  for (const t of timers) if (!t.done && t.end <= now) { t.done = true; save(); notify(`${t.label} が終わりました`, '取り出しましょう'); }
  draw();
}, 1000);

async function loadDry() {
  render(dryCard, h('h2', {}, '部屋干しの乾きやすさ'), h('p', { class: 'muted' }, '取得中…'));
  try {
    const p = await getPosition({ maximumAge: 600000 });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude.toFixed(2)}&longitude=${p.coords.longitude.toFixed(2)}&current=temperature_2m,relative_humidity_2m&timezone=auto`, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    const j = await res.json();
    showDry(j.current.temperature_2m, j.current.relative_humidity_2m, '屋外の現在値');
  } catch { manualDry(); }
}
function showDry(temp, rh, src) {
  const d = dryIndex(+temp, +rh);
  const msg = d >= 60 ? 'よく乾きます' : d >= 35 ? 'ふつう。風を当てると早く乾きます' : '乾きにくい日。除湿機やエアコンの除湿を';
  render(dryCard, h('h2', {}, '部屋干しの乾きやすさ'), h('p', { class: 'big-number' }, `${d}`), h('div', { class: 'meter' }, h('div', { style: { width: `${d}%` } })),
    h('p', {}, msg), h('p', { class: 'small muted' }, `${src}: 気温 ${temp}℃ / 湿度 ${rh}%`), h('button', { class: 'small', onclick: manualDry }, '室温・湿度を手入力'));
}
function manualDry() {
  const t = h('input', { id: 'dt', type: 'number', value: 22 }); const r = h('input', { id: 'dr', type: 'number', value: 60 });
  const go = h('button', { class: 'shrink', onclick: () => showDry(t.value, r.value, '手入力') }, '計算');
  render(dryCard, h('h2', {}, '部屋干しの乾きやすさ'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'dt' }, '室温℃'), t), h('div', {}, h('label', { for: 'dr' }, '湿度%'), r), go));
}

app.append(h('section', { class: 'card' }, h('div', { class: 'grid-2' }, PRESETS.map(([l, m]) => h('button', { onclick: () => start(l, m) }, `${l}`, h('span', { class: 'small muted' }, ` ${m}分`)))), h('div', { style: { marginTop: '10px' } }, notifyButton()),
  h('p', { class: 'small muted' }, '※ Webアプリの通知は、ページを開いている（バックグラウンド含む）間だけ確実に届きます。')), listCard, dryCard);
draw(); loadDry();
