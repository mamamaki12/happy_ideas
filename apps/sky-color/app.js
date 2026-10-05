import { h, render, $, store, todayStr, toast, share, fmtDate } from '../../shared/lib.js';
import { cameraPanel } from '../../shared/camera.js';

// 空を撮ると、画像の上半分の平均色を「きょうの空の色」として保存する。写真自体は保存しない。
const db = store('sky-color');
let days = db.get('days', {}); // { 'YYYY-MM-DD': '#rrggbb' }
const app = $('#app');

export function averageColor(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, Math.max(1, Math.floor(height / 2))).data;
  let r = 0; let g = 0; let b = 0; let n = 0;
  for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  const hx = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}
function colorName(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
  if (l < 50) return '夜空'; if (max - min < 20) return l > 180 ? '白い空' : 'くもり空';
  if (b >= r && b >= g) return l > 170 ? '淡い青空' : '青空';
  if (r > b && r > g) return '夕焼け'; return '緑がかった空';
}

const today = h('section', { class: 'card center', 'aria-live': 'polite' });
const grid = h('section', { class: 'card' });

const cam = cameraPanel({ label: '空を撮る', maxSide: 400, onPhoto: async (blob, canvas) => {
  let c = canvas;
  if (!c) { const bmp = await createImageBitmap(blob); c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); }
  days[todayStr()] = averageColor(c);
  db.set('days', days); cam.stop(); toast('きょうの空を保存しました'); draw();
} });

function draw() {
  const c = days[todayStr()];
  render(today,
    c ? h('div', { class: 'swatch', style: { background: c }, role: 'img', 'aria-label': `きょうの空の色 ${c}` }) : h('p', { class: 'muted' }, 'まだ撮っていません。窓の外を見上げてみましょう。'),
    c ? h('p', {}, h('b', {}, colorName(c)), ` ${c}`) : null,
    c ? h('button', { class: 'small', onclick: () => share({ title: 'きょうの空', text: `きょうの空は「${colorName(c)}」${c} でした` }) }, '共有') : null);
  const keys = Object.keys(days).sort().reverse();
  render(grid, h('h2', {}, `空の色見本（${keys.length}日）`),
    keys.length === 0 ? h('p', { class: 'empty' }, '毎日1枚撮ると、色のカレンダーができます') :
      h('div', { class: 'sky-grid' }, keys.map((k) => h('div', { class: 'sky-chip', style: { background: days[k] }, title: `${k} ${days[k]}`, role: 'img', 'aria-label': `${k} ${colorName(days[k])}` }, h('span', {}, fmtDate(k))))));
}

app.append(h('section', { class: 'card' }, cam.el), today, grid);
draw();
