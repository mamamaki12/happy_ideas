import { h, add, render, $, store, toast, share, download, getPosition, vibrate, confirmDelete, todayStr, uid, distance as dist2 } from '../../shared/lib.js';
import { parseCoords } from '../../shared/places.js';
import { compassTo } from '../../shared/compass.js';
import { drawQr } from '../../shared/qr.js';
import { showQr } from '../../shared/qr-ui.js';
import { drawWrapped, canvasToBlob } from '../../shared/canvas-text.js';
import { packRally, unpackRally, sanitizeRally, periodState, tryStamp } from './logic.js';
import { darkenFor } from '../../shared/color.js';

// ラリーメーカー: サーバーなしで動く位置情報スタンプラリー。主催者はURL（QR）を配るだけ、参加者はアプリ不要。
const db = store('rally');
const app = $('#app');
const WD = '日月火水木金土';
const fmtD = (s) => { if (!s) return ''; const d = new Date(`${s}T00:00:00`); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; };
const setTheme = (c) => { document.documentElement.style.setProperty('--rally', darkenFor(c)); // 白文字が読める濃さにする
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c); };

// ───────────────── 参加者 ─────────────────
const I18N = {
  ja: {
    preview: '👀 プレビュー中（スタンプは保存されません）', period: (a, b) => `開催期間: ${a || '〜'} 〜 ${b}`, count: '個', stamps: 'スタンプの数',
    before: (d) => `まだ始まっていません（${d}から）`, after: 'このラリーは終了しました', press: '📍 スタンプを押す', checking: '位置を確認中…', guide: '🧭 次のポイントへ案内',
    got: '獲得！', hint: 'ヒント', gotToast: (n) => `㊞ ${n} のスタンプを獲得！`,
    accuracy: 'GPSの精度が低いため押せません。空が見える場所でもう一度お試しください', speed: '移動が速すぎます。少し時間をおいてお試しください', done: 'すべてのスタンプを集めました',
    far: (n, m) => `いちばん近い「${n}」まであと約${m}m`, all: (n) => `${n}か所すべて達成`, at: '達成', staff: '受付スタッフの方へ: 時計が動いていて、背景が流れていれば本物の画面です（スクリーンショットではありません）',
    share: '🖼 記念画像をシェア', back: '編集に戻る', certText: (t) => `「${t}」をコンプリートしました！`, certSub: (n) => `${n}か所のスタンプを集めました`, lang: 'English',
  },
  en: {
    preview: '👀 Preview (stamps are not saved)', period: (a, b) => `Period: ${a || '…'} – ${b}`, count: '', stamps: 'Stamps collected',
    before: (d) => `Not started yet (from ${d})`, after: 'This rally has ended', press: '📍 Get stamp', checking: 'Checking location…', guide: '🧭 Guide me to the next spot',
    got: 'Got it!', hint: 'Hint', gotToast: (n) => `㊞ Stamp collected at ${n}!`,
    accuracy: 'GPS accuracy is too low. Please try again where you can see the sky', speed: 'You are moving too fast. Please wait a moment and try again', done: 'You have collected all stamps',
    far: (n, m) => `The nearest spot "${n}" is about ${m} m away`, all: (n) => `All ${n} spots completed`, at: 'Completed', staff: 'For staff: if the clock is ticking and the background is moving, this is a live screen (not a screenshot)',
    share: '🖼 Share your badge', back: 'Back to editor', certText: (t) => `I completed "${t}"!`, certSub: (n) => `Collected ${n} stamps`, lang: '日本語',
  },
};
let lang = db.get('lang', (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en');

function play(r, { preview = false } = {}) {
  const T = () => I18N[lang];
  document.documentElement.lang = lang;
  setTheme(r.c);
  const key = `st:${r.id}`;
  const stamps = preview ? {} : db.get(key, {});
  const period = periodState(r, todayStr());
  const total = r.p.length;
  let compass = null; let clock = 0;
  const main = h('div');
  const saveStamps = () => { if (!preview) db.set(key, stamps); };

  function draw(msg) {
    compass?.stop(); clearInterval(clock);
    const n = Object.keys(stamps).length;
    if (n === total) return complete();
    const intro = h('section', { class: 'card rally-intro' },
      h('div', { class: 'lang-row' }, h('button', { class: 'small', onclick: () => { lang = lang === 'ja' ? 'en' : 'ja'; db.set('lang', lang); document.documentElement.lang = lang; draw(); } }, `🌐 ${T().lang}`)),
      preview ? h('p', { class: 'notice' }, T().preview) : null,
      h('h2', {}, r.t), r.d ? h('p', {}, r.d) : null,
      (r.from || r.to) ? h('p', { class: 'small muted' }, T().period(lang === 'ja' ? fmtD(r.from) : r.from, lang === 'ja' ? fmtD(r.to) : r.to)) : null,
      r.g ? h('p', { class: 'goal' }, `🎁 ${r.g}`) : null,
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': n, 'aria-label': T().stamps }, h('div', { style: { width: `${(n / total) * 100}%` } })),
      h('p', { class: 'center' }, h('b', { class: 'count' }, `${n} / ${total}`), T().count ? ` ${T().count}` : null));
    const stampBtn = h('button', { class: 'rally-btn big', disabled: period !== 'open', onclick: () => press(stampBtn) }, T().press);
    const guideBox = h('div');
    render(main, intro,
      period === 'before' ? h('p', { class: 'notice' }, T().before(lang === 'ja' ? fmtD(r.from) : r.from)) : period === 'after' ? h('p', { class: 'notice' }, T().after) : null,
      h('section', { class: 'card center' }, stampBtn, msg ? h('p', { class: 'small', 'aria-live': 'polite' }, msg) : null,
        h('button', { class: 'small', onclick: () => guide(guideBox) }, T().guide), guideBox),
      h('section', { class: 'card' }, h('div', { class: 'stamp-grid' }, r.p.map((p, i) => h('div', { class: `stamp${stamps[i] ? ' got' : ''}` },
        h('div', { class: 'ink', 'aria-hidden': 'true' }, stamps[i] ? '㊞' : String(i + 1)), h('b', {}, p.n), stamps[i] ? h('small', {}, T().got) : p.h ? h('small', { class: 'hint' }, `${T().hint}: ${p.h}`) : null)))));
  }
  async function press(btn) {
    compass?.stop(); compass = null; // 案内中の watchPosition と取り合わないように止める
    btn.disabled = true; btn.textContent = T().checking;
    try {
      const pos = await getPosition({ maximumAge: 0, timeout: 20000 });
      const res = tryStamp(r, stamps, { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, t: Date.now() });
      if (res.ok) {
        stamps[res.index] = { t: Date.now(), lat: pos.coords.latitude, lon: pos.coords.longitude }; saveStamps();
        vibrate([80, 60, 200]); toast(T().gotToast(r.p[res.index].n));
        draw(); const el = main.querySelectorAll('.stamp')[res.index]; el?.classList.add('just');
      } else draw(res.code === 'far' ? T().far(r.p[res.nearest].n, res.meters) : T()[res.code]);
    } catch (e) { draw(e.message); }
  }
  function guide(box) {
    getPosition({ maximumAge: 10000 }).then((pos) => {
      const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const rest = r.p.map((p, i) => ({ ...p, i })).filter((p) => !stamps[p.i]).sort((a, b) => dist2(here, { lat: a.a, lon: a.o }) - dist2(here, { lat: b.a, lon: b.o }));
      if (!rest.length) return;
      const t = rest[0]; compass?.stop(); compass = compassTo({ lat: t.a, lon: t.o });
      render(box, h('p', {}, h('b', {}, `${t.i + 1}. ${t.n}`), t.h ? ` — ${t.h}` : ''), compass.el); compass.start();
    }).catch((e) => toast(e.message));
  }
  function complete() {
    const last = Math.max(...Object.values(stamps).map((x) => x.t));
    const now = h('p', { class: 'live-clock', 'aria-live': 'off' });
    const tick = () => { now.textContent = new Date().toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-US'); };
    tick(); clock = setInterval(tick, 1000);
    render(main, h('section', { class: 'complete' },
      h('p', { class: 'complete-badge' }, '🏅'), h('h2', {}, 'COMPLETE!'), h('p', { class: 'complete-title' }, r.t),
      h('p', {}, T().all(total)), h('p', { class: 'small' }, `${T().at}: ${new Date(last).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}`),
      now, r.g ? h('p', { class: 'goal' }, `🎁 ${r.g}`) : null,
      h('p', { class: 'small staff' }, T().staff)),
    h('div', { class: 'btn-row' }, h('button', { class: 'rally-btn', onclick: certificate }, T().share),
      preview ? h('button', { onclick: () => location.reload() }, T().back) : null));
    if (!preview) vibrate([100, 50, 100, 50, 300]);
  }
  async function certificate() {
    const c = h('canvas', { width: 1080, height: 1080 }); const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 1080, 1080); g.addColorStop(0, r.c); g.addColorStop(1, '#222');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1080); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '160px system-ui'; ctx.fillText('🏅', 540, 290);
    ctx.font = 'bold 84px system-ui, sans-serif'; ctx.fillText('COMPLETE!', 540, 420);
    ctx.font = 'bold 54px system-ui, sans-serif'; drawWrapped(ctx, r.t, 540, 540, 920, 66, 2);
    ctx.font = '40px system-ui, sans-serif'; ctx.fillText(T().certSub(total), 540, 720);
    ctx.font = '96px system-ui'; ctx.fillText('㊞'.repeat(Math.min(6, total)), 540, 900);
    const blob = await canvasToBlob(c); const f = new File([blob], 'rally-complete.png', { type: 'image/png' });
    const res = await share({ title: r.t, text: T().certText(r.t), files: [f] }); if (res !== 'shared') download(blob, f.name);
  }
  add(app, main); draw();
}

// ───────────────── 主催者 ─────────────────
function editor() {
  const d = db.get('draft', { id: uid().slice(0, 8), t: '', d: '', g: '', from: '', to: '', c: '#e8590c', p: [] });
  const save = () => db.set('draft', d);
  setTheme(d.c);
  const list = h('ol', { class: 'cp-list' });
  const publishBox = h('div');
  const field = (k, label, { tag = 'input', ...attrs } = {}) => h('div', { class: 'field' }, h('label', { for: `r-${k}` }, label),
    h(tag, { id: `r-${k}`, value: d[k], ...attrs, oninput: (e) => { d[k] = e.target.value; save(); if (k === 'c') setTheme(d.c); publishBox.replaceChildren(); } }));

  function drawList() {
    render(list, d.p.length ? d.p.map((p, i) => h('li', {},
      h('div', { class: 'grow' }, h('b', {}, p.n), h('div', { class: 'sub' }, `半径${p.r}m${p.h ? ` ・ ヒント: ${p.h}` : ''}`)),
      h('button', { class: 'small ghost', 'aria-label': `${p.n}を上へ`, disabled: i === 0, onclick: () => { [d.p[i - 1], d.p[i]] = [d.p[i], d.p[i - 1]]; save(); drawList(); } }, '↑'),
      h('button', { class: 'small ghost', 'aria-label': `${p.n}を削除`, onclick: () => { if (confirmDelete(p.n)) { d.p.splice(i, 1); save(); drawList(); } } }, '×'))) : h('li', { class: 'empty' }, 'チェックポイントを追加してください（最大30か所）'));
    publishBox.replaceChildren();
  }

  const name = h('input', { id: 'cp-n', maxlength: 30, placeholder: '例: 駅前の時計台' });
  const hint = h('input', { id: 'cp-h', maxlength: 80, placeholder: '例: 青い屋根のお店の向かい（任意）' });
  const radius = h('select', { id: 'cp-r' }, [30, 50, 80, 150, 300].map((v) => h('option', { value: v, selected: v === 80 }, `${v}m${v === 80 ? '（おすすめ）' : v >= 150 ? '（公園など広い場所）' : ''}`)));
  const coord = h('input', { id: 'cp-c', placeholder: '35.6812, 139.7671 または地図のURL' });
  const addPoint = (lat, lon) => {
    if (!name.value.trim()) return toast('チェックポイントの名前を入れてください');
    if (d.p.length >= 30) return toast('チェックポイントは30か所までです');
    if (d.p.some((p) => dist2({ lat: p.a, lon: p.o }, { lat, lon }) < 20)) toast('近くに別のチェックポイントがあります（20m以内）');
    d.p.push({ n: name.value.trim(), h: hint.value.trim(), a: +lat.toFixed(6), o: +lon.toFixed(6), r: +radius.value });
    save(); name.value = ''; hint.value = ''; coord.value = ''; drawList(); name.focus();
  };

  async function publish() {
    const r = sanitizeRally({ ...d, t: d.t || 'スタンプラリー' });
    if (!r) return toast('チェックポイントを1か所以上追加してください');
    const code = await packRally(r);
    const url = new URL(location.href); url.search = ''; url.hash = `z=${code}`;
    const u = url.href;
    render(publishBox, h('div', { class: 'notice' }, `参加用URLができました（${u.length}文字）。${u.length > 1500 ? 'チェックポイントが多いのでQRが細かくなります。ポスターは大きめに印刷してください。' : ''}`),
      h('div', { class: 'grid-2' },
        h('button', { class: 'rally-btn', onclick: () => share({ title: r.t, text: `スタンプラリー「${r.t}」に参加しよう！`, url: u }) }, '📤 URLを送る'),
        h('button', { onclick: () => showQr(u, { title: r.t, note: '参加者にこのQRを読み取ってもらいます' }) }, '🔳 QRを表示'),
        h('button', { onclick: () => poster(r, u) }, '🖨 ポスター（A4）'),
        h('button', { onclick: () => signs(r) }, '🪧 チェックポイント看板')),
      h('button', { class: 'ghost small', style: { marginTop: '8px' }, onclick: () => { app.replaceChildren(); play(r, { preview: true }); window.scrollTo(0, 0); } }, '👀 参加者の画面を試す'));
  }

  add(app,
    h('section', { class: 'card' }, h('h2', {}, '① ラリーの基本'), field('t', 'ラリーの名前', { maxlength: 40, placeholder: '例: 〇〇商店街 秋のスタンプラリー' }),
      field('d', '説明', { tag: 'textarea', rows: 2, maxlength: 200, placeholder: '例: 5つのお店をめぐってスタンプを集めよう' }),
      field('g', 'ゴールしたら（景品など）', { maxlength: 120, placeholder: '例: 全部集めたら商店街事務所で画面を見せてね。先着100名に粗品' }),
      h('div', { class: 'row' }, h('div', {}, field('from', '開始日', { type: 'date' })), h('div', {}, field('to', '終了日', { type: 'date' })), h('div', { class: 'shrink' }, field('c', 'テーマ色', { type: 'color' })))),
    h('section', { class: 'card' }, h('h2', {}, '② チェックポイント'), list,
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'cp-n' }, '名前'), name),
      h('div', { class: 'field' }, h('label', { for: 'cp-h' }, 'ヒント'), hint),
      h('div', { class: 'field' }, h('label', { for: 'cp-r' }, '押せる範囲'), radius),
      h('div', { class: 'btn-row' },
        h('button', { class: 'rally-btn', onclick: async (e) => { const b = e.currentTarget; b.disabled = true; try { const p = await getPosition({ maximumAge: 0 }); if (p.coords.accuracy > 60) toast(`GPSの誤差が${Math.round(p.coords.accuracy)}mあります。屋外で登録するのがおすすめです`); addPoint(p.coords.latitude, p.coords.longitude); } catch (err) { toast(err.message); } b.disabled = false; } }, '📍 いまいる場所を追加')),
      h('details', { style: { marginTop: '10px' } }, h('summary', {}, '座標や地図のURLで追加（下見なしで作るとき）'),
        h('div', { class: 'field', style: { marginTop: '8px' } }, h('label', { for: 'cp-c' }, '座標または地図URL'), coord),
        h('button', { class: 'small', onclick: () => { const c = parseCoords(coord.value); if (!c) return toast('座標を読み取れませんでした'); addPoint(c.lat, c.lon); } }, '座標で追加'))),
    h('section', { class: 'card' }, h('h2', {}, '③ 公開'), h('button', { class: 'rally-btn big', onclick: publish }, '参加用のURLとQRを作る'), publishBox,
      h('p', { class: 'small muted' }, 'ラリーの内容はすべてURLの中に入ります。サーバーに保存しないので、費用はかかりません。内容を変えたら、URLとQRを作り直してください。'),
      h('p', { class: 'small' }, h('a', { href: '../privacy.html' }, 'プライバシーポリシー'))),
    h('details', { class: 'card' }, h('summary', {}, '新しいラリーを作る（今の下書きを消す）'), h('button', { class: 'small danger', style: { marginTop: '8px' }, onclick: () => { if (confirmDelete('今の下書き')) { db.remove('draft'); location.reload(); } } }, '下書きを消す')));
  drawList();
}

async function poster(r, url) {
  const W = 1240; const H = 1754; const c = h('canvas', { width: W, height: H }); const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = r.c; ctx.fillRect(0, 0, W, 260);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 50px system-ui, sans-serif'; ctx.fillText('スタンプラリー開催中！', W / 2, 90);
  ctx.font = 'bold 70px system-ui, sans-serif'; drawWrapped(ctx, r.t, W / 2, 190, 1120, 76, 1);
  ctx.fillStyle = '#333'; ctx.font = '36px system-ui, sans-serif';
  let y = 330; if (r.d) y += drawWrapped(ctx, r.d, W / 2, y, 1100, 48, 2) * 48;
  if (r.from || r.to) { ctx.fillText(`期間: ${fmtD(r.from)} 〜 ${fmtD(r.to)}`, W / 2, y + 10); y += 60; }
  const qr = drawQr(document.createElement('canvas'), url, { size: 760, ecc: url.length > 1500 ? 'L' : 'M' });
  ctx.drawImage(qr, W / 2 - qr.width / 2, y + 10); y += qr.height + 70;
  ctx.fillStyle = '#222'; ctx.font = 'bold 40px system-ui, sans-serif';
  ['① スマホのカメラでQRを読み取る', `② ${r.p.length}か所のチェックポイントをめぐる`, '③ 現地で「スタンプを押す」'].forEach((t, i) => ctx.fillText(t, W / 2, y + i * 62));
  y += 210; ctx.font = '32px system-ui, sans-serif'; ctx.fillStyle = '#555';
  if (r.g) { drawWrapped(ctx, `🎁 ${r.g}`, W / 2, y, 1100, 44, 2); y += 100; }
  ctx.fillText('アプリのインストール・会員登録は不要です（位置情報を使います）', W / 2, Math.min(y, H - 60));
  download(await canvasToBlob(c), 'rally-poster.png');
}

// 各チェックポイントに貼る看板（1枚の画像に全部並べて印刷・切り取り）
async function signs(r) {
  const cols = 2; const cw = 620; const ch = 440; const rows = Math.ceil(r.p.length / cols);
  const c = h('canvas', { width: cols * cw, height: rows * ch }); const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  r.p.forEach((p, i) => {
    const x = (i % cols) * cw; const y = Math.floor(i / cols) * ch;
    ctx.setLineDash([12, 10]); ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.strokeRect(x + 10, y + 10, cw - 20, ch - 20); ctx.setLineDash([]);
    ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(x + cw / 2, y + 120, 70, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 80px system-ui, sans-serif'; ctx.fillText(String(i + 1), x + cw / 2, y + 148);
    ctx.fillStyle = '#222'; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.fillText('チェックポイント', x + cw / 2, y + 240);
    ctx.font = 'bold 44px system-ui, sans-serif'; drawWrapped(ctx, p.n, x + cw / 2, y + 300, cw - 80, 50, 1);
    ctx.font = '26px system-ui, sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('ここで「スタンプを押す」をタップ！', x + cw / 2, y + 370);
    ctx.font = '22px system-ui, sans-serif'; ctx.fillText(r.t.slice(0, 26), x + cw / 2, y + 408);
  });
  download(await canvasToBlob(c), 'rally-checkpoints.png');
}

// ───────────────── 起動 ─────────────────
(async () => {
  if (location.hash.startsWith('#z=')) {
    const r = await unpackRally(location.hash.slice(3));
    if (!r) { add(app, h('p', { class: 'error' }, 'ラリーのURLが壊れているか、対応していない形式です。'), h('a', { href: './' }, 'ラリーを作る')); return; }
    document.title = r.t;
    play(r);
  } else editor();
  addEventListener('hashchange', () => location.reload());
})();
