import { h, add, render, $, store, startCamera, stopStream, toast, share, download, todayStr } from '../../shared/lib.js';

// 推しと撮れるカメラ: ライブ映像にフレーム（推し色・日付・ひとこと）を重ね、合成した画像を保存・共有する。
const db = store('oshi-camera');
const s = db.get('s', { color: '#ff5fa2', text: '推しとおでかけ', frame: 'hearts' });
const app = $('#app');
let stream = null;

const video = h('video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'カメラ映像' });
const overlay = h('canvas', { class: 'overlay', 'aria-hidden': 'true' });
const box = h('div', { class: 'video-box' }, video, overlay);
const result = h('div', { class: 'card hidden' });
const err = h('p', { class: 'error hidden', role: 'alert' });

const FRAMES = { hearts: '♡ ハート', stars: '☆ キラキラ', film: '🎞 フィルム', simple: '▢ シンプル' };

/** フレームを描く（ライブ表示と合成で共用） */
function drawFrame(ctx, w, hgt) {
  const u = Math.min(w, hgt) / 100;
  ctx.save();
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  if (s.frame === 'film') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, 9 * u); ctx.fillRect(0, hgt - 9 * u, w, 9 * u);
    ctx.fillStyle = '#eee';
    for (let x = 2 * u; x < w; x += 7 * u) { ctx.fillRect(x, 2.5 * u, 3.5 * u, 4 * u); ctx.fillRect(x, hgt - 6.5 * u, 3.5 * u, 4 * u); }
  } else {
    ctx.lineWidth = 3 * u; ctx.strokeRect(2.5 * u, 2.5 * u, w - 5 * u, hgt - 5 * u);
    if (s.frame !== 'simple') {
      ctx.font = `${7 * u}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const glyph = s.frame === 'hearts' ? '♥' : '★';
      [[8, 8], [92, 8], [8, 92], [92, 92]].forEach(([px, py]) => ctx.fillText(glyph, (px / 100) * w, (py / 100) * hgt));
    }
  }
  // ひとこと + 日付
  const label = `${s.text}  ${todayStr().replaceAll('-', '.')}`;
  ctx.font = `bold ${5 * u}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(label).width + 6 * u;
  const y = hgt - (s.frame === 'film' ? 13 : 7) * u;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.roundRect?.(w / 2 - tw / 2, y - 6 * u, tw, 8.5 * u, 4 * u); ctx.fill();
  ctx.fillStyle = s.color; ctx.fillText(label, w / 2, y);
  ctx.restore();
}

function redrawOverlay() {
  const w = video.videoWidth || 720; const hh = video.videoHeight || 960;
  overlay.width = w; overlay.height = hh;
  const ctx = overlay.getContext('2d'); ctx.clearRect(0, 0, w, hh); drawFrame(ctx, w, hh);
}

async function start() {
  try {
    stream = await startCamera(video, { facingMode: 'environment' });
    err.classList.add('hidden');
    video.addEventListener('loadedmetadata', redrawOverlay, { once: true });
    redrawOverlay();
  } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

let ready = null; // カメラ起動中の Promise（起動前に撮影ボタンを押しても待ってから撮る）
async function shoot() {
  await ready;
  if (!stream) { ready = start(); await ready; if (!stream) return; }
  if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadeddata', r, { once: true }));
  const w = video.videoWidth; const hh = video.videoHeight;
  const c = h('canvas', { width: w, height: hh });
  const ctx = c.getContext('2d');
  ctx.drawImage(video, 0, 0, w, hh); drawFrame(ctx, w, hh);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const url = URL.createObjectURL(blob);
  const name = `oshi-${Date.now()}.jpg`;
  render(result, h('img', { src: url, alt: '撮影した写真', class: 'shot' }),
    h('div', { class: 'btn-row', style: { marginTop: '10px' } },
      h('button', { class: 'primary', onclick: () => download(blob, name) }, '保存'),
      h('button', { onclick: () => share({ title: s.text, files: [new File([blob], name, { type: 'image/jpeg' })], text: s.text }) }, '共有')));
  result.classList.remove('hidden');
  result.scrollIntoView({ behavior: 'smooth' });
}

const colorIn = h('input', { id: 'oc', type: 'color', value: s.color });
const textIn = h('input', { id: 'ot', value: s.text, maxlength: 24 });
const frameIn = h('select', { id: 'of' }, Object.entries(FRAMES).map(([k, l]) => h('option', { value: k, selected: k === s.frame }, l)));
const onChange = () => { s.color = colorIn.value; s.text = textIn.value; s.frame = frameIn.value; db.set('s', s); redrawOverlay(); };
[colorIn, textIn, frameIn].forEach((el) => el.addEventListener('input', onChange));

add(app, 
  h('section', { class: 'card' }, err, box,
    h('div', { class: 'btn-row' }, h('button', { class: 'primary big', onclick: shoot }, '📸 撮る'),
      h('button', { onclick: async () => { stopStream(stream); const cur = video.style.transform ? 'environment' : 'user'; stream = await startCamera(video, { facingMode: cur }).catch((e) => { toast(e.message); return null; }); video.style.transform = cur === 'user' ? 'scaleX(-1)' : ''; }, 'aria-label': 'カメラ切り替え' }, '🔄'))),
  h('section', { class: 'card' }, h('h2', {}, 'フレーム'),
    h('div', { class: 'row' }, h('div', { class: 'shrink' }, h('label', { for: 'oc' }, '推し色'), colorIn), h('div', {}, h('label', { for: 'of' }, '種類'), frameIn)),
    h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'ot' }, 'ひとこと'), textIn)),
  result);
ready = start();
addEventListener('pagehide', () => stopStream(stream));
