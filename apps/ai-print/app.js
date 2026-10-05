// #101 プリント整理AI: お知らせプリントを撮ると、予定・持ち物・やることに分けてくれる
import { h, add, $, store, uid, download, toast, fmtDate, daysUntil } from '../../shared/lib.js';
import { aiNotice, bindAI, imagePayload, photoPicker } from '../../shared/ai.js';
import { toIcs } from '../family-schedule/logic.js';

const db = store('ai-print');
const saved = db.get('prints', []);
const app = $('#app');
const save = () => db.set('prints', saved);

const photo = photoPicker({ label: 'プリントを撮る・選ぶ' });
const note = h('input', { id: 'note', placeholder: '例: 2年1組・下の子の分', maxlength: 200 });
const btn = h('button', { type: 'button', class: 'primary big' }, 'AIで整理する');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
const list = h('section', { class: 'card' });

function view(p, { onSave } = {}) {
  const left = (d) => { const n = daysUntil(d); return n < 0 ? '期限切れ' : n === 0 ? '今日' : `あと${n}日`; };
  return h('div', { class: 'ai-out' },
    h('h3', {}, p.title || 'お知らせ'), p.summary ? h('p', { class: 'ai-text' }, p.summary) : null,
    p.events.length ? [h('h3', {}, '📅 予定'), h('ul', { class: 'list' }, p.events.map((e) => h('li', {}, h('div', { class: 'grow' }, h('b', {}, e.title), h('div', { class: 'sub' }, `${e.date ? fmtDate(e.date) : '日付不明'} ${e.time}`, e.note ? ` ・ ${e.note}` : ''))))),
      h('button', { type: 'button', class: 'small', disabled: !p.events.some((e) => e.date), onclick: () => { download(new Blob([toIcs(p.events.filter((e) => e.date))], { type: 'text/calendar' }), 'print-events.ics'); toast('カレンダー用のファイルを保存しました'); } }, 'カレンダーに追加（.ics）')] : null,
    p.items.length ? [h('h3', {}, '🎒 持ち物'), h('ul', { class: 'list' }, p.items.map((it, i) => {
      const id = `it-${p.id || 'new'}-${i}`;
      return h('li', {}, h('input', { type: 'checkbox', id, checked: !!p.checked?.[i], onchange: (e) => { p.checked = p.checked || []; p.checked[i] = e.target.checked; save(); } }), h('label', { for: id, class: 'grow' }, it));
    }))] : null,
    p.todos.length ? [h('h3', {}, '✅ やること'), h('ul', { class: 'list' }, p.todos.map((t) => h('li', {}, h('span', { class: 'grow' }, t.text), t.due ? h('span', { class: `pill ${daysUntil(t.due) <= 2 ? 'danger' : 'warn'}` }, `${fmtDate(t.due)}まで（${left(t.due)}）`) : null)))] : null,
    onSave ? h('button', { type: 'button', class: 'primary', onclick: onSave }, 'このプリントを保存') : null,
    h('p', { class: 'ai-disclaimer' }, 'AIの読み取りは間違えることがあります。日付と金額は元のプリントで確認してください。'));
}

function drawList() {
  list.replaceChildren(h('h2', {}, `保存したプリント（${saved.length}）`));
  if (!saved.length) { add(list, h('p', { class: 'empty' }, 'まだありません。プリントを撮って「AIで整理する」を押すと、ここに保存できます。')); return; }
  const soon = saved.flatMap((p) => p.todos.filter((t) => t.due && daysUntil(t.due) >= 0).map((t) => ({ ...t, from: p.title }))).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  if (soon.length) add(list, h('div', { class: 'ai-block' }, h('b', {}, '近い締め切り'), soon.map((t) => h('div', { class: 'small' }, `${fmtDate(t.due)} ${t.text}（${t.from}）`))));
  for (const p of saved) {
    add(list, h('details', {}, h('summary', {}, `${p.title || 'お知らせ'}${p.note ? `（${p.note}）` : ''}`), view(p),
      h('button', { type: 'button', class: 'small danger', onclick: () => { if (!confirm('このプリントを削除しますか？')) return; saved.splice(saved.indexOf(p), 1); save(); drawList(); } }, '削除')));
  }
}

bindAI(btn, out, 'print-sorter', async () => {
  if (!photo.blob) { toast('先にプリントの写真を撮るか選んでください'); return null; }
  return { fields: { note: note.value }, image: await imagePayload(photo.blob) };
}, (r) => {
  const p = { ...r, id: uid(), note: note.value.trim(), at: Date.now() };
  return view(p, { onSave: () => { saved.unshift(p); save(); drawList(); out.replaceChildren(); toast('保存しました'); } });
});

add(app, aiNotice({ sends: '撮ったプリントの写真とメモ' }),
  h('section', { class: 'card' }, h('h2', {}, 'プリントを読み取る'), photo.el, h('div', { class: 'field' }, h('label', { for: 'note' }, 'メモ（任意）'), note), btn, out),
  list);
drawList();
