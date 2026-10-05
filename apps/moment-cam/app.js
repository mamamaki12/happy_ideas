import { h, add, render, $, store, blobStore, uid, startCamera, stopStream, notify, notifyButton, toast, fmtDateTime, todayStr, download, confirmDelete } from '../../shared/lib.js';
import { blobImg } from '../../shared/camera.js';

// 1日1回ランダムな時刻に「いま」を撮る。背面→前面の順に撮って1枚に合成する。端末内だけのBeReal。
const db = store('moment-cam');
const photos = blobStore('moment-cam');
let moments = db.get('moments', []);
const app = $('#app');
const LIMIT = 120; // 秒
const save = () => db.set('moments', moments);

/** 今日のランダムな時刻（10時〜21時）。日付ごとに1回だけ決める */
function todaysTime() {
  let plan = db.get('plan');
  if (!plan || plan.date !== todayStr()) {
    const d = new Date(); d.setHours(10, 0, 0, 0);
    plan = { date: todayStr(), at: d.getTime() + Math.floor(Math.random() * 11 * 3600_000) };
    db.set('plan', plan);
  }
  return plan.at;
}

const statusCard = h('section', { class: 'card center', 'aria-live': 'polite' });
const shootCard = h('section', { class: 'card hidden' });
const feed = h('section', { class: 'card' });
let countdown = null;

function drawStatus() {
  const at = todaysTime(); const now = Date.now();
  const done = moments.some((m) => m.date === todayStr());
  render(statusCard,
    done ? h('p', {}, '✅ 今日の「いま」は撮影済みです') :
      now < at ? h('p', {}, `今日のタイミングはまだ秘密です…（このページを開いていれば時間になったら通知します）`) :
        h('div', {}, h('p', { class: 'big-number', style: { fontSize: '2rem' } }, '⚡ いまを撮る時間！'), h('button', { class: 'primary big', onclick: openShoot }, '撮影する')),
    h('div', { class: 'btn-row', style: { justifyContent: 'center', marginTop: '8px' } }, notifyButton(), h('button', { class: 'small', onclick: openShoot }, '今すぐ撮る（練習）')));
  if (!done && now < at) setTimeout(() => { notify('⚡ いまを撮る時間です', '2分以内に、いまの景色と自分を撮ろう'); drawStatus(); }, Math.min(at - now, 2 ** 31 - 1));
}

async function grab(facingMode) {
  const v = h('video', { playsinline: true, muted: true, autoplay: true, class: 'moment-live', 'aria-label': 'カメラ映像' });
  render(shootCard, h('p', { class: 'center' }, facingMode === 'environment' ? '① いま見ている景色' : '② 自分'), v, h('p', { class: 'center big-number moment-count' }, ''));
  const s = await startCamera(v, { facingMode, width: 960, height: 1280 });
  await new Promise((r) => setTimeout(r, 1500)); // 露出が落ち着くまで待つ
  const c = h('canvas', { width: v.videoWidth, height: v.videoHeight });
  const ctx = c.getContext('2d');
  if (facingMode === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(v, 0, 0);
  stopStream(s);
  return c;
}

async function openShoot() {
  shootCard.classList.remove('hidden');
  const started = Date.now();
  countdown = setInterval(() => { const el = $('.moment-count', shootCard); if (el) el.textContent = `${Math.max(0, LIMIT - Math.round((Date.now() - started) / 1000))}`; }, 500);
  try {
    const back = await grab('environment');
    let front = null;
    try { front = await grab('user'); } catch { /* 前面カメラがない端末 */ }
    const out = h('canvas', { width: back.width, height: back.height });
    const ctx = out.getContext('2d');
    ctx.drawImage(back, 0, 0);
    if (front) {
      const w = out.width * 0.32; const hh = (front.height / front.width) * w; const m = out.width * 0.04;
      ctx.fillStyle = '#000'; ctx.fillRect(m - 4, m - 4, w + 8, hh + 8);
      ctx.drawImage(front, m, m, w, hh);
    }
    const late = Date.now() - started > LIMIT * 1000;
    const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.85));
    const id = uid();
    await photos.set(id, blob);
    moments.unshift({ id, date: todayStr(), t: Date.now(), late });
    save(); toast(late ? '撮影しました（遅刻）' : '撮影しました');
  } catch (e) { toast(e.message, 4000); }
  clearInterval(countdown); shootCard.classList.add('hidden'); render(shootCard);
  drawStatus(); drawFeed();
}

function drawFeed() {
  render(feed, h('h2', {}, `これまでの「いま」（${moments.length}）`),
    moments.length === 0 ? h('p', { class: 'empty' }, '最初の1枚を撮りましょう') :
      h('div', { class: 'moment-grid' }, moments.map((m) => {
        const fig = h('figure', {}, h('div', { class: 'thumb moment-thumb' }), h('figcaption', { class: 'small' }, fmtDateTime(m.t), m.late ? ' ⏰遅刻' : '',
          h('button', { class: 'small ghost', 'aria-label': '保存', onclick: async () => { const b = await photos.get(m.id); if (b) download(b, `moment-${m.date}.jpg`); } }, '⬇'),
          h('button', { class: 'small ghost', 'aria-label': '削除', onclick: async () => { if (!confirmDelete()) return; moments = moments.filter((x) => x.id !== m.id); save(); await photos.del(m.id).catch(() => {}); drawFeed(); drawStatus(); } }, '×')));
        photos.get(m.id).then((b) => b && fig.firstChild.replaceWith(blobImg(b, { class: 'thumb moment-thumb', alt: `${fmtDateTime(m.t)}の写真` }))).catch(() => {});
        return fig;
      })));
}

add(app, statusCard, shootCard, feed);
drawStatus(); drawFeed();
