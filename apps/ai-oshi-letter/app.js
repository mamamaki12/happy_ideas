// #110 推しへの手紙アシスト: 箇条書きのメモから、ファンレター・感想ポスト・お祝いメッセージを整える
import { h, add, $, store, toast, share, uid, fmtDateTime } from '../../shared/lib.js';
import { aiNotice, bindAI, copyButton } from '../../shared/ai.js';

const db = store('ai-oshi-letter');
const st = db.get('state', { notes: '', oshi: '', kind: 'ファンレター', length: 'ふつう' });
const drafts = db.get('drafts', []);
const app = $('#app');
const saveSt = () => db.set('state', st);

const oshi = h('input', { id: 'oshi', maxlength: 40, value: st.oshi, placeholder: '例: ひかりちゃん' });
const notes = h('textarea', { id: 'notes', rows: 6, maxlength: 1500, value: st.notes, placeholder: '思いついたことを箇条書きで\n・去年の春に動画で知った\n・仕事で落ち込んだとき歌に救われた\n・ライブのアンコールで手を振ってくれた' });
const kind = h('select', { id: 'kind' }, ['ファンレター', '感想ポスト', 'お祝いメッセージ'].map((v) => h('option', { value: v, selected: v === st.kind }, v)));
const length = h('select', { id: 'length' }, ['短め', 'ふつう', '長め'].map((v) => h('option', { value: v, selected: v === st.length }, v)));
for (const [el, k] of [[oshi, 'oshi'], [notes, 'notes'], [kind, 'kind'], [length, 'length']]) el.addEventListener('input', () => { st[k] = el.value; saveSt(); });
const btn = h('button', { type: 'button', class: 'primary big' }, '文章を整える');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
const draftBox = h('section', { class: 'card' });

function drawDrafts() {
  draftBox.replaceChildren(h('h2', {}, `下書き（${drafts.length}）`));
  add(draftBox, drafts.length ? h('ul', { class: 'list' }, drafts.map((d) => h('li', {}, h('details', { class: 'grow' }, h('summary', {}, `${d.title}（${fmtDateTime(d.at)}）`), h('p', { class: 'ai-text' }, d.text), h('div', { class: 'btn-row' }, copyButton(() => d.text), h('button', { type: 'button', class: 'small danger', onclick: () => { drafts.splice(drafts.indexOf(d), 1); db.set('drafts', drafts); drawDrafts(); } }, '削除')))))) : h('p', { class: 'empty' }, '整えた文章を保存すると、ここに残ります。'));
}

bindAI(btn, out, 'oshi-letter', () => {
  if (!notes.value.trim()) { toast('メモを入力してください'); return null; }
  return { fields: { notes: notes.value, oshi: oshi.value, kind: kind.value, length: length.value } };
}, (r) => {
  const edit = h('textarea', { id: 'result', rows: 10, value: r.text, 'aria-label': '整えた文章（直せます）' });
  const count = h('span', { class: 'small muted' }, `${r.text.length}字`);
  edit.addEventListener('input', () => { count.textContent = `${edit.value.length}字`; });
  return [
    h('div', { class: 'ai-meta' }, h('b', { class: 'grow' }, r.title), count), edit,
    h('div', { class: 'btn-row' }, copyButton(() => edit.value), h('button', { type: 'button', class: 'small', onclick: () => share({ text: edit.value }) }, '共有'),
      h('button', { type: 'button', class: 'small', onclick: () => { drafts.unshift({ id: uid(), title: r.title || st.kind, text: edit.value, at: Date.now() }); drafts.splice(30); db.set('drafts', drafts); drawDrafts(); toast('下書きに保存しました'); } }, '下書きに保存')),
    r.tips.length ? h('div', { class: 'ai-block' }, h('b', {}, '送る前に'), h('ul', {}, r.tips.map((t) => h('li', {}, t)))) : null,
  ];
});

add(app, aiNotice({ sends: '入力したメモ' }),
  h('section', { class: 'card' },
    h('div', { class: 'field' }, h('label', { for: 'oshi' }, '推しの名前'), oshi),
    h('div', { class: 'field' }, h('label', { for: 'notes' }, '伝えたいこと（メモでOK）'), notes),
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'kind' }, '種類'), kind), h('div', {}, h('label', { for: 'length' }, '長さ'), length)),
    btn, out),
  draftBox);
drawDrafts();
