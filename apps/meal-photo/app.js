import { h, add, render, $, store, blobStore, uid, toast, todayStr, fmtTime, pad, confirmDelete } from '../../shared/lib.js';
import { cameraPanel, blobImg } from '../../shared/camera.js';

// 食事を撮るだけの記録。月カレンダーに1日の写真を並べて振り返る。
const db = store('meal-photo');
const photos = blobStore('meal-photo');
let meals = db.get('meals', []);
const app = $('#app');
const save = () => db.set('meals', meals);
let ym = todayStr().slice(0, 7);
let selected = todayStr();

const MEALS = ['朝', '昼', '夜', '間食'];
const guess = () => { const hr = new Date().getHours(); return hr < 10 ? '朝' : hr < 15 ? '昼' : hr < 21 ? '夜' : '間食'; };
const kindIn = h('select', { id: 'kind', 'aria-label': '食事の種類' }, MEALS.map((m) => h('option', { selected: m === guess() }, m)));

const cam = cameraPanel({ label: '食事を撮る', maxSide: 900, onPhoto: async (blob) => {
  const id = uid();
  try { await photos.set(id, blob); } catch { toast('写真を保存できませんでした'); return; }
  meals.push({ id, date: todayStr(), t: Date.now(), kind: kindIn.value });
  save(); selected = todayStr(); ym = selected.slice(0, 7); toast(`${kindIn.value}ごはんを記録しました`); draw();
} });

const calCard = h('section', { class: 'card' });
const dayCard = h('section', { class: 'card' });

function draw() {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1); const days = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(h('div', { class: 'cal-cell empty-cell', 'aria-hidden': 'true' }));
  for (let d = 1; d <= days; d++) {
    const ds = `${ym}-${pad(d)}`; const n = meals.filter((x) => x.date === ds).length;
    cells.push(h('button', { class: `cal-cell${ds === selected ? ' sel' : ''}${ds === todayStr() ? ' today' : ''}`, 'aria-label': `${m}月${d}日 ${n}食`, 'aria-pressed': String(ds === selected), onclick: () => { selected = ds; draw(); } },
      h('span', {}, String(d)), h('span', { class: 'dots', 'aria-hidden': 'true' }, '●'.repeat(Math.min(n, 4)))));
  }
  const nav = (n) => { const d = new Date(y, m - 1 + n, 1); ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; draw(); };
  const logged = new Set(meals.filter((x) => x.date.startsWith(ym)).map((x) => x.date)).size;
  render(calCard,
    h('div', { class: 'row', style: { alignItems: 'center' } },
      h('button', { class: 'small shrink', 'aria-label': '前の月', onclick: () => nav(-1) }, '◀'),
      h('h2', { class: 'center', style: { margin: 0 } }, `${y}年${m}月`),
      h('button', { class: 'small shrink', 'aria-label': '次の月', onclick: () => nav(1) }, '▶')),
    h('div', { class: 'cal-head', 'aria-hidden': 'true' }, ['日', '月', '火', '水', '木', '金', '土'].map((w) => h('span', {}, w))),
    h('div', { class: 'cal' }, cells),
    h('p', { class: 'muted small center' }, `この月は ${logged} 日記録しました`));
  const list = meals.filter((x) => x.date === selected).sort((a, b) => a.t - b.t);
  render(dayCard, h('h2', {}, `${selected.slice(5).replace('-', '/')} の食事`),
    list.length === 0 ? h('p', { class: 'empty' }, '記録なし') :
      h('div', { class: 'meal-grid' }, list.map((x) => {
        const fig = h('figure', { class: 'meal' }, h('div', { class: 'thumb big-thumb' }), h('figcaption', {}, `${x.kind} ${fmtTime(x.t)}`,
          h('button', { class: 'small ghost', 'aria-label': '削除', onclick: async () => { if (!confirmDelete()) return; meals = meals.filter((y2) => y2.id !== x.id); save(); await photos.del(x.id).catch(() => {}); draw(); } }, '×')));
        photos.get(x.id).then((b) => b && fig.firstChild.replaceWith(blobImg(b, { class: 'thumb big-thumb', alt: `${x.kind}の食事` }))).catch(() => {});
        return fig;
      })));
}

add(app, h('section', { class: 'card' }, h('div', { class: 'field' }, kindIn), cam.el), calCard, dayCard);
draw();
