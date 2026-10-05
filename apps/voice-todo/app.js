import { h, render, $, store, uid, toast, confirmDelete } from '../../shared/lib.js';
import { listen, recognitionSupported } from '../../shared/speech.js';
import { splitTasks } from './logic.js';

// 話すだけでToDoを追加。「と」「それから」で区切ると複数件まとめて追加できる。
const db = store('voice-todo');
let todos = db.get('todos', []);
const app = $('#app');
const save = () => db.set('todos', todos);
const live = h('p', { class: 'voice-live', 'aria-live': 'polite' }, '');
const listCard = h('section', { class: 'card' });
const textIn = h('input', { id: 'tx', placeholder: '文字でも追加できます', 'aria-label': 'ToDoを文字で追加' });
let session = null;

function addMany(text) {
  const items = splitTasks(text);
  items.forEach((t) => todos.unshift({ id: uid(), text: t, done: false }));
  save(); draw();
  if (items.length) toast(`${items.length}件追加しました`);
}

const micBtn = h('button', { class: 'mic-btn', 'aria-label': '話して追加', onclick: () => {
  if (session) { session.stop(); return; }
  try {
    micBtn.classList.add('on'); live.textContent = '聞いています…（例:「牛乳を買う、それから銀行に行く」）';
    session = listen({ lang: 'ja-JP', onResult: (f, i) => { live.textContent = f + i; }, onError: (m) => toast(m), onEnd: (f) => { micBtn.classList.remove('on'); session = null; if (f) { addMany(f); live.textContent = `「${f}」`; } else live.textContent = ''; } });
  } catch (e) { micBtn.classList.remove('on'); toast(e.message, 4000); }
} }, '🎤');

function draw() {
  const open = todos.filter((t) => !t.done); const done = todos.filter((t) => t.done);
  const item = (t) => h('li', {},
    h('input', { type: 'checkbox', checked: t.done, 'aria-label': `${t.text}を完了`, onchange: () => { t.done = !t.done; save(); draw(); } }),
    h('span', { class: `grow${t.done ? ' muted' : ''}`, style: t.done ? { textDecoration: 'line-through' } : {} }, t.text),
    h('button', { class: 'small ghost', 'aria-label': `${t.text}を削除`, onclick: () => { todos = todos.filter((x) => x.id !== t.id); save(); draw(); } }, '×'));
  render(listCard, h('h2', {}, `やること（${open.length}）`),
    open.length ? h('ul', { class: 'list' }, open.map(item)) : h('p', { class: 'empty' }, 'ぜんぶ終わりました 🎉'),
    done.length ? h('details', {}, h('summary', {}, `完了 ${done.length}件`), h('ul', { class: 'list' }, done.map(item)),
      h('button', { class: 'small ghost', onclick: () => { if (confirmDelete('完了した項目')) { todos = open; save(); draw(); } } }, '完了を片付ける')) : null);
}

app.append(h('section', { class: 'card center' },
  recognitionSupported() ? micBtn : h('p', { class: 'notice' }, 'このブラウザは音声認識に非対応です。キーボードのマイクボタン（音声入力）も使えます。'),
  live,
  h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (textIn.value.trim()) { addMany(textIn.value); textIn.value = ''; } } }, h('div', {}, textIn), h('button', { class: 'shrink', type: 'submit' }, '追加'))), listCard);
draw();
