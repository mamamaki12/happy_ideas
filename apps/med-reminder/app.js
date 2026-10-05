import { h, render, $, store, uid, notify, notifyButton, todayStr, toast, confirmDelete, fmtTime } from '../../shared/lib.js';
import { doseStatus } from './logic.js';

// 薬ごとに時刻を設定。時間になったら通知し、飲んだら1タップで記録。飲み忘れは赤く出る。
const db = store('med-reminder');
let meds = db.get('meds', []);
let taken = db.get('taken', {}); // { 'YYYY-MM-DD': { medId: ['08:00'] } }
const app = $('#app');
const todayCard = h('section', { class: 'card' });
const save = () => { db.set('meds', meds); db.set('taken', taken); };
const LABEL = { taken: ['✅ 飲んだ', 'ok'], missed: ['⚠ 飲み忘れ', 'danger'], due: ['⏰ 今', 'warn'], upcoming: ['予定', ''] };

function draw() {
  const day = taken[todayStr()] ||= {};
  const rows = meds.flatMap((m) => doseStatus(m.times, day[m.id] || []).map((d) => ({ m, ...d }))).sort((a, b) => a.time.localeCompare(b.time));
  const done = rows.filter((r) => r.state === 'taken').length;
  render(todayCard, h('h2', {}, `今日のお薬（${done}/${rows.length}）`),
    rows.length === 0 ? h('p', { class: 'empty' }, '下からお薬を登録してください') :
      h('ul', { class: 'list' }, rows.map((r) => h('li', {}, h('b', {}, r.time), h('span', { class: 'grow' }, `${r.m.name} ${r.m.dose || ''}`),
        h('span', { class: `pill ${LABEL[r.state][1]}` }, LABEL[r.state][0]),
        r.state === 'taken' ? h('button', { class: 'small ghost', 'aria-label': '取り消し', onclick: () => { day[r.m.id] = (day[r.m.id] || []).filter((t) => t !== r.time); save(); draw(); } }, '↩') :
          h('button', { class: 'small primary', onclick: () => { (day[r.m.id] ||= []).push(r.time); save(); toast(`${r.m.name} を記録しました`); draw(); } }, '飲んだ')))));
}
// 1分ごとに確認して、時刻ちょうどの未服用を通知
setInterval(() => {
  const hhmm = fmtTime(Date.now()); const day = taken[todayStr()] || {};
  for (const m of meds) if (m.times.includes(hhmm) && !(day[m.id] || []).includes(hhmm)) notify(`💊 ${m.name} の時間です`, m.dose || '');
  draw();
}, 60000);

const nameIn = h('input', { id: 'mn', required: true, placeholder: '例: 血圧の薬' });
const doseIn = h('input', { id: 'md', placeholder: '例: 1錠' });
const timesIn = h('input', { id: 'mt', placeholder: '08:00, 20:00', value: '08:00' });
const form = h('form', { class: 'card', onsubmit: (e) => {
  e.preventDefault();
  const times = timesIn.value.split(/[,、\s]+/).map((t) => t.trim()).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, '0'));
  if (!times.length) return toast('時刻を 08:00 の形で入れてください');
  meds.push({ id: uid(), name: nameIn.value.trim(), dose: doseIn.value.trim(), times: [...new Set(times)].sort() });
  save(); nameIn.value = ''; doseIn.value = ''; draw(); drawMeds();
} }, h('h2', {}, 'お薬を登録'),
  h('div', { class: 'row' }, h('div', {}, h('label', { for: 'mn' }, '名前'), nameIn), h('div', {}, h('label', { for: 'md' }, '量'), doseIn)),
  h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'mt' }, '時刻（カンマ区切り）'), timesIn),
  h('button', { class: 'primary', type: 'submit' }, '登録'));
const medsCard = h('details', { class: 'card' });
function drawMeds() {
  render(medsCard, h('summary', {}, `登録中のお薬（${meds.length}）`), h('ul', { class: 'list' }, meds.map((m) => h('li', {}, h('span', { class: 'grow' }, `${m.name} ${m.dose} ／ ${m.times.join('・')}`),
    h('button', { class: 'small ghost', 'aria-label': `${m.name}を削除`, onclick: () => { if (confirmDelete(m.name)) { meds = meds.filter((x) => x.id !== m.id); save(); draw(); drawMeds(); } } }, '×')))));
}
app.append(todayCard, h('div', { class: 'card' }, notifyButton(), h('p', { class: 'small muted' }, '※ 通知はこのページを開いている間に届きます。確実に知らせるにはスマホのアラームも併用してください。')), form, medsCard);
draw(); drawMeds();
