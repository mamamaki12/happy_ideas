import { h, add, render, $, store, uid, share, download, toast, confirmDelete } from '../../shared/lib.js';
import { drawWrapped, canvasToBlob } from '../../shared/canvas-text.js';

// 読んだ本・観た作品・聴いた曲を棚に並べ、月ごとのまとめ画像を作って共有する。
const db = store('shelf');
let items = db.get('items', []);
const app = $('#app');
const TYPES = { book: ['📚', '本', '#e8590c'], movie: ['🎬', '映画・ドラマ', '#7048e8'], music: ['🎧', '音楽', '#1c7ed6'], game: ['🎮', 'ゲーム', '#2f9e44'], other: ['✨', 'その他', '#868e96'] };
let ym = new Date().toISOString().slice(0, 7);
const shelfBox = h('div', { class: 'shelf' });
const save = () => db.set('items', items);

function draw() {
  const list = items.filter((i) => i.ym === ym);
  render(shelfBox, h('div', { class: 'row', style: { alignItems: 'center' } },
    h('input', { id: 'ym', type: 'month', value: ym, 'aria-label': '月', onchange: (e) => { ym = e.target.value; draw(); } }),
    h('button', { class: 'shrink small', disabled: !list.length, onclick: makeCard }, '🖼 まとめ画像')),
  list.length === 0 ? h('p', { class: 'empty' }, 'この月の棚はからっぽです') :
    h('div', { class: 'spines' }, list.map((i) => h('div', { class: 'spine', style: { background: TYPES[i.type][2] }, title: i.title },
      h('span', { class: 'spine-icon' }, TYPES[i.type][0]), h('span', { class: 'spine-title' }, i.title), h('span', { class: 'spine-stars' }, '★'.repeat(i.stars)),
      h('button', { class: 'spine-del', 'aria-label': `${i.title}を削除`, onclick: () => { if (confirmDelete(i.title)) { items = items.filter((x) => x.id !== i.id); save(); draw(); } } }, '×')))));
}

async function makeCard() {
  const list = items.filter((i) => i.ym === ym);
  const W = 1080; const H = 1350; const c = h('canvas', { width: W, height: H }); const ctx = c.getContext('2d');
  ctx.fillStyle = '#faf7f0'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#222'; ctx.font = 'bold 64px system-ui, sans-serif'; ctx.fillText(`${ym.replace('-', '年')}月の わたしの棚`, 70, 130);
  ctx.font = '32px system-ui, sans-serif'; ctx.fillStyle = '#666';
  ctx.fillText(Object.entries(TYPES).map(([k, [ic]]) => { const n = list.filter((i) => i.type === k).length; return n ? `${ic}${n}` : ''; }).join('  '), 70, 190);
  let y = 260;
  for (const i of list.slice(0, 14)) {
    ctx.fillStyle = TYPES[i.type][2]; ctx.fillRect(70, y - 40, 14, 60);
    ctx.fillStyle = '#222'; ctx.font = 'bold 40px system-ui, sans-serif';
    drawWrapped(ctx, `${TYPES[i.type][0]} ${i.title}`, 110, y, 760, 46, 1);
    ctx.fillStyle = '#f59f00'; ctx.font = '36px system-ui'; ctx.fillText('★'.repeat(i.stars), 880, y);
    y += 76;
  }
  if (list.length > 14) { ctx.fillStyle = '#666'; ctx.font = '32px system-ui'; ctx.fillText(`ほか ${list.length - 14} 件`, 110, y); }
  const blob = await canvasToBlob(c);
  const file = new File([blob], `shelf-${ym}.png`, { type: 'image/png' });
  const r = await share({ title: 'わたしの棚', text: `${ym.replace('-', '年')}月の棚`, files: [file] });
  if (r !== 'shared') download(blob, file.name);
}

const tIn = h('input', { id: 'st', required: true, maxlength: 60, placeholder: 'タイトル' });
const typeIn = h('select', { id: 'sty' }, Object.entries(TYPES).map(([k, [ic, l]]) => h('option', { value: k }, `${ic} ${l}`)));
const starIn = h('select', { id: 'ss' }, [5, 4, 3, 2, 1].map((n) => h('option', { value: n }, '★'.repeat(n))));
add(app, h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); items.push({ id: uid(), title: tIn.value.trim(), type: typeIn.value, stars: +starIn.value, ym }); save(); tIn.value = ''; toast('棚に並べました'); draw(); } },
  h('div', { class: 'field' }, h('label', { for: 'st' }, '読んだ・観た・聴いたもの'), tIn),
  h('div', { class: 'row' }, h('div', {}, h('label', { for: 'sty' }, '種類'), typeIn), h('div', {}, h('label', { for: 'ss' }, '評価'), starIn), h('button', { class: 'primary shrink', type: 'submit' }, '並べる'))),
h('section', { class: 'card' }, shelfBox));
draw();
