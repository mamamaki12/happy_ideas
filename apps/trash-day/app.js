import { h, add, render, $, store, uid, toast, notify, notifyButton, todayStr, confirmDelete } from '../../shared/lib.js';
import { WEEKDAYS, isCollectionDay, nextCollection, describe } from './logic.js';

const db = store('trash-day');
const DEFAULTS = [
  { id: 'burn', name: '燃えるゴミ', icon: '🔥', rule: { type: 'weekly', days: [1, 4] } },
  { id: 'plastic', name: 'プラスチック', icon: '♻️', rule: { type: 'weekly', days: [3] } },
  { id: 'can', name: '缶・びん', icon: '🥫', rule: { type: 'nth', weeks: [2, 4], days: [5] } },
];
let kinds = db.get('kinds', DEFAULTS);
const app = $('#app');
const save = () => db.set('kinds', kinds);

const todayCard = h('section', { class: 'card', 'aria-live': 'polite' });
const listCard = h('section', { class: 'card' });

function dayLabel(d) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((d - t) / 86400000);
  const base = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  return diff === 0 ? `今日 ${base}` : diff === 1 ? `明日 ${base}` : `${diff}日後 ${base}`;
}

function draw() {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const today = kinds.filter((k) => isCollectionDay(k.rule, now));
  const tmr = kinds.filter((k) => isCollectionDay(k.rule, tomorrow));
  render(todayCard,
    h('h2', {}, '今日のゴミ'),
    h('p', { class: 'big-number', style: { fontSize: '2rem' } }, today.length ? today.map((k) => `${k.icon} ${k.name}`).join('　') : 'なし'),
    h('p', { class: 'center muted' }, `明日: ${tmr.length ? tmr.map((k) => k.name).join('、') : 'なし'}`),
    h('div', { class: 'center' }, notifyButton()));
  render(listCard, h('h2', {}, '収集ルール'),
    h('ul', { class: 'list' }, kinds.map((k) => h('li', {},
      h('span', { style: { fontSize: '1.5rem' } }, k.icon),
      h('div', { class: 'grow' }, h('b', {}, k.name), h('div', { class: 'sub' }, `${describe(k.rule)} ／ 次: ${dayLabel(nextCollection(k.rule))}`)),
      h('button', { class: 'small ghost', 'aria-label': `${k.name}を削除`, onclick: () => { if (confirmDelete(k.name)) { kinds = kinds.filter((x) => x.id !== k.id); save(); draw(); } } }, '×')))));
  // 夜（18時以降）に明日の分を1日1回通知
  if (tmr.length && now.getHours() >= 18 && db.get('notified') !== todayStr()) {
    db.set('notified', todayStr());
    notify('明日はゴミの日です', tmr.map((k) => k.name).join('、'));
  }
}

// 追加フォーム
const nameIn = h('input', { id: 'kn', placeholder: '例: ペットボトル', required: true });
const iconIn = h('input', { id: 'ki', value: '🗑️', maxlength: 4, style: { width: '70px' } });
const typeIn = h('select', { id: 'kt' }, h('option', { value: 'weekly' }, '毎週'), h('option', { value: 'nth' }, '第◯週'));
const dayBoxes = WEEKDAYS.map((w, i) => h('label', { class: 'pill', style: { cursor: 'pointer' } }, h('input', { type: 'checkbox', value: i }), ` ${w}`));
const weekBoxes = [1, 2, 3, 4, 5].map((n) => h('label', { class: 'pill', style: { cursor: 'pointer' } }, h('input', { type: 'checkbox', value: n }), ` 第${n}`));
const weekRow = h('div', { class: 'btn-row hidden', style: { marginBottom: '10px' } }, weekBoxes);
typeIn.addEventListener('change', () => weekRow.classList.toggle('hidden', typeIn.value !== 'nth'));
const checked = (boxes) => boxes.map((l) => l.querySelector('input')).filter((i) => i.checked).map((i) => +i.value);

const form = h('form', { class: 'card', onsubmit: (e) => {
  e.preventDefault();
  const days = checked(dayBoxes); const weeks = checked(weekBoxes);
  if (!days.length) return toast('曜日を選んでください');
  if (typeIn.value === 'nth' && !weeks.length) return toast('第何週かを選んでください');
  kinds.push({ id: uid(), name: nameIn.value.trim(), icon: iconIn.value || '🗑️', rule: typeIn.value === 'nth' ? { type: 'nth', weeks, days } : { type: 'weekly', days } });
  save(); nameIn.value = ''; toast('追加しました'); draw();
} },
  h('h2', {}, '種類を追加'),
  h('div', { class: 'row' }, h('div', {}, h('label', { for: 'kn' }, '名前'), nameIn), h('div', { class: 'shrink' }, h('label', { for: 'ki' }, '絵文字'), iconIn)),
  h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'kt' }, '頻度'), typeIn),
  weekRow,
  h('div', { class: 'btn-row', style: { marginBottom: '12px' } }, dayBoxes),
  h('button', { class: 'primary', type: 'submit' }, '追加'));

add(app, todayCard, listCard, form);
draw();
