import { h, render, $, store } from '../../shared/lib.js';

// 指でなぞって書く練習帳。お手本を薄く表示し、書いた線の重なり具合で採点。書いた筆順を再生できる。
const db = store('kanji-pad');
const SETS = { 'ひらがな': [...'あいうえおかきくけこさしすせそ'], 'カタカナ': [...'アイウエオカキクケコ'], '小1の漢字': [...'一二三四五六七八九十日月火水木金土山川田人口目耳手足'], 'abc': [...'abcdefghij'] };
const app = $('#app');
let set = db.get('set', 'ひらがな'); let idx = 0; let strokes = []; let cur = null; let scores = db.get('scores', {});
const SIZE = 600;
const canvas = h('canvas', { class: 'pad', width: SIZE, height: SIZE, role: 'img', 'aria-label': '書き込み欄' });
const ctx = canvas.getContext('2d');
const info = h('p', { class: 'center', 'aria-live': 'polite' });
const nav = h('div', { class: 'char-nav' });

function guide() {
  const css = getComputedStyle(document.documentElement);
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = css.getPropertyValue('--border'); ctx.setLineDash([12, 12]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(SIZE / 2, 0); ctx.lineTo(SIZE / 2, SIZE); ctx.moveTo(0, SIZE / 2); ctx.lineTo(SIZE, SIZE / 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(128,128,128,.22)'; ctx.font = `${SIZE * 0.78}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(SETS[set][idx], SIZE / 2, SIZE / 2 + SIZE * 0.04);
}
function drawStrokes(list = strokes) {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text'); ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of list) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
}
function redraw() { guide(); drawStrokes(); }
const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE]; };
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); cur = [pos(e)]; strokes.push(cur); });
canvas.addEventListener('pointermove', (e) => { if (!cur) return; cur.push(pos(e)); redraw(); });
canvas.addEventListener('pointerup', () => { cur = null; });

/** お手本（文字の形）と書いた線のピクセルの重なりで採点（IoU） */
function score() {
  const off = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d'); x.scale(120 / SIZE, 120 / SIZE); draw(x); return x.getImageData(0, 0, 120, 120).data; };
  const ref = off((x) => { x.font = `${SIZE * 0.78}px "Hiragino Mincho ProN", "Yu Mincho", serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.lineWidth = 30; x.strokeStyle = '#000'; x.strokeText(SETS[set][idx], SIZE / 2, SIZE / 2 + SIZE * 0.04); x.fillText(SETS[set][idx], SIZE / 2, SIZE / 2 + SIZE * 0.04); });
  const mine = off((x) => { x.lineWidth = 30; x.lineCap = 'round'; x.strokeStyle = '#000'; for (const s of strokes) { x.beginPath(); s.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); } });
  let inter = 0; let uni = 0;
  for (let i = 3; i < ref.length; i += 4) { const a = ref[i] > 40; const b = mine[i] > 40; if (a && b) inter++; if (a || b) uni++; }
  return uni ? Math.round((inter / uni) * 100) : 0;
}
async function replay() {
  const copy = strokes.map((s) => s.slice()); guide();
  for (let k = 0; k < copy.length; k++) {
    for (let i = 2; i <= copy[k].length; i += 2) { guide(); drawStrokes([...copy.slice(0, k), copy[k].slice(0, i)]); await new Promise((r) => requestAnimationFrame(r)); }
  }
}
function drawNav() {
  render(nav, SETS[set].map((ch, i) => h('button', { class: `small${i === idx ? ' primary' : ''}`, 'aria-label': `${ch}${scores[`${set}:${ch}`] ? ` ${scores[`${set}:${ch}`]}点` : ''}`, onclick: () => { idx = i; strokes = []; redraw(); drawNav(); info.textContent = ''; } }, ch)));
}
app.append(h('section', { class: 'card' }, h('label', { for: 'set' }, 'れんしゅう'), h('select', { id: 'set', onchange: (e) => { set = e.target.value; db.set('set', set); idx = 0; strokes = []; redraw(); drawNav(); } }, Object.keys(SETS).map((k) => h('option', { selected: k === set }, k))), nav),
  h('section', { class: 'card center' }, canvas, info, h('div', { class: 'btn-row' },
    h('button', { onclick: () => { strokes.pop(); redraw(); } }, '↩ 1画もどす'), h('button', { onclick: () => { strokes = []; redraw(); info.textContent = ''; } }, '🗑 けす'),
    h('button', { onclick: replay, disabled: false }, '▶ 書き順再生'),
    h('button', { class: 'primary', onclick: () => { const sc = score(); const k = `${set}:${SETS[set][idx]}`; scores[k] = Math.max(scores[k] || 0, sc); db.set('scores', scores); info.textContent = `${sc}点 ${sc >= 55 ? '💮 よくできました' : sc >= 35 ? '👍 おしい' : 'お手本をなぞってみよう'}（画数 ${strokes.length}）`; drawNav(); } }, '💮 できた'))));
redraw(); drawNav();
