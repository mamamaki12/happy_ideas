import { h, render, $, store, getPosition, distance, fmtDistance, toast, vibrate, share, safeHttpUrl } from '../../shared/lib.js';
import { placeForm } from '../../shared/places.js';
import { encodeRally, decodeRally } from './logic.js';
import { drawQr } from '../../shared/qr.js';
import { showQr } from '../../shared/qr-ui.js';
import { drawWrapped, canvasToBlob } from '../../shared/canvas-text.js';
import { download } from '../../shared/lib.js';

// 位置情報スタンプラリー。主催者がチェックポイントを作り、URLで配布。参加者は現地でスタンプを押す。
// ラリーの定義は URL のハッシュに入る（サーバー不要）。
const db = store('stamp-rally');
const app = $('#app');
const RADIUS = 100;

const fromHash = location.hash.startsWith('#r=') ? decodeRally(location.hash.slice(3)) : null;

function play(rally) {
  const key = `stamps:${encodeRally(rally).slice(0, 40)}`;
  const stamps = db.get(key, {});
  const grid = h('div', { class: 'stamp-grid' });
  const msg = h('p', { class: 'center', 'aria-live': 'polite' });
  const draw = (here) => {
    render(grid, rally.points.map((p, i) => {
      const got = stamps[i];
      return h('div', { class: `stamp${got ? ' got' : ''}` }, h('div', { class: 'stamp-ink', 'aria-hidden': 'true' }, got ? '㊞' : String(i + 1)), h('b', {}, p.name),
        h('span', { class: 'small muted' }, got ? '獲得！' : here ? fmtDistance(distance(here, p)) : ''));
    }));
    const n = Object.keys(stamps).length;
    msg.textContent = n === rally.points.length ? '🎉 コンプリート！おめでとうございます' : `${n} / ${rally.points.length} 個`;
    certBtn.classList.toggle('hidden', n !== rally.points.length);
  };
  // コンプリートしたら修了証の画像を作れる（SNSでの拡散・景品引き換え時の提示用）
  const certBtn = h('button', { class: 'primary hidden', onclick: async () => {
    const c = h('canvas', { width: 1080, height: 1080 }); const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff8e6'; ctx.fillRect(0, 0, 1080, 1080); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 16; ctx.strokeRect(40, 40, 1000, 1000);
    ctx.fillStyle = '#e8590c'; ctx.textAlign = 'center'; ctx.font = 'bold 80px system-ui, sans-serif'; ctx.fillText('🏅 コンプリート', 540, 240);
    ctx.fillStyle = '#222'; ctx.font = 'bold 56px system-ui, sans-serif'; drawWrapped(ctx, rally.title, 540, 380, 900, 66, 2);
    ctx.font = '40px system-ui, sans-serif'; ctx.fillText(`${rally.points.length}か所すべてのスタンプを集めました`, 540, 560);
    const last = Math.max(...Object.values(stamps));
    ctx.fillText(new Date(last).toLocaleString('ja-JP', { dateStyle: 'long', timeStyle: 'short' }), 540, 640);
    ctx.font = '120px system-ui'; ctx.fillText('㊞'.repeat(Math.min(5, rally.points.length)), 540, 860);
    const blob = await canvasToBlob(c); const f = new File([blob], 'stamp-rally-complete.png', { type: 'image/png' });
    const r = await share({ title: rally.title, text: `スタンプラリー「${rally.title}」をコンプリートしました！`, files: [f] }); if (r !== 'shared') download(blob, f.name);
  } }, '🏅 修了証を作る');
  const check = async (btn) => {
    btn.disabled = true;
    try {
      const pos = await getPosition({ maximumAge: 0 });
      const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const hit = rally.points.findIndex((p, i) => !stamps[i] && distance(here, p) <= RADIUS + Math.min(pos.coords.accuracy, 100));
      if (hit >= 0) { stamps[hit] = Date.now(); db.set(key, stamps); vibrate([80, 60, 200]); toast(`㊞ ${rally.points[hit].name} のスタンプを獲得！`); }
      else toast(`近くにチェックポイントがありません（${RADIUS}m以内で押せます）`);
      draw(here);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  render(app, h('section', { class: 'card center' }, h('h2', {}, rally.title), msg, h('button', { class: 'primary big', onclick: (e) => check(e.currentTarget) }, '㊞ スタンプを押す'), certBtn), h('section', { class: 'card' }, grid),
    h('p', { class: 'center' }, h('a', { href: './' }, '自分でラリーを作る')));
  draw(null);
  getPosition().then((p) => draw({ lat: p.coords.latitude, lon: p.coords.longitude })).catch(() => {});
}

function create() {
  const draft = db.get('draft', { title: '', points: [] });
  const titleIn = h('input', { id: 'rt', value: draft.title, placeholder: '例: 商店街スタンプラリー', maxlength: 40, oninput: (e) => { draft.title = e.target.value; db.set('draft', draft); } });
  const list = h('ul', { class: 'list' });
  const drawList = () => render(list, draft.points.length ? draft.points.map((p, i) => h('li', {}, h('span', { class: 'grow' }, `${i + 1}. ${p.name}`),
    h('button', { class: 'small ghost', 'aria-label': `${p.name}を削除`, onclick: () => { draft.points.splice(i, 1); db.set('draft', draft); drawList(); } }, '×'))) : h('li', { class: 'empty' }, 'チェックポイントを追加してください'));
  const rallyUrl = () => {
    if (!draft.title || draft.points.length === 0) { toast('タイトルとチェックポイントを入れてください'); return null; }
    const url = new URL(location.href); url.hash = `r=${encodeRally({ title: draft.title, points: draft.points.map(({ name, lat, lon }) => ({ name, lat: +lat.toFixed(6), lon: +lon.toFixed(6) })) })}`;
    return safeHttpUrl(url.href) ? url.href : null;
  };
  const publish = () => { const u = rallyUrl(); if (u) share({ title: draft.title, text: `スタンプラリー「${draft.title}」に参加しよう`, url: u }); };
  // 掲示用ポスター（QRつき）を画像で作る
  const poster = async () => {
    const u = rallyUrl(); if (!u) return;
    const c = h('canvas', { width: 1240, height: 1754 }); const ctx = c.getContext('2d');
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, 1240, 1754);
    ctx.fillStyle = '#e8590c'; ctx.fillRect(0, 0, 1240, 220);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 54px system-ui, sans-serif'; ctx.fillText('スタンプラリー開催中！', 620, 95);
    ctx.font = 'bold 64px system-ui, sans-serif'; drawWrapped(ctx, draft.title, 620, 180, 1100, 70, 1);
    const qr = drawQr(document.createElement('canvas'), u, { size: 760, ecc: 'M' });
    ctx.drawImage(qr, 620 - qr.width / 2, 300);
    ctx.fillStyle = '#222'; ctx.font = '44px system-ui, sans-serif';
    ctx.fillText('① スマホのカメラでQRを読み取る', 620, 1160); ctx.fillText(`② ${draft.points.length}か所のチェックポイントをめぐる`, 620, 1240); ctx.fillText('③ その場で「スタンプを押す」', 620, 1320);
    ctx.fillStyle = '#666'; ctx.font = '32px system-ui, sans-serif'; ctx.fillText('アプリのインストール・会員登録は不要です（位置情報を使います）', 620, 1440);
    ctx.font = '30px system-ui, sans-serif'; drawWrapped(ctx, `チェックポイント: ${draft.points.map((p) => p.name).join('、')}`, 620, 1530, 1100, 44, 4);
    download(await canvasToBlob(c), 'stamp-rally-poster.png');
  };
  render(app, h('p', { class: 'lead' }, 'チェックポイントを登録して、参加用のURLを共有します。サーバー不要で、データはURLに入ります。'),
    h('section', { class: 'card' }, h('label', { for: 'rt' }, 'ラリーの名前'), titleIn, h('h2', { style: { marginTop: '12px' } }, 'チェックポイント'), list,
      h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'primary', onclick: publish }, '参加URLを共有'),
        h('button', { onclick: () => { const u = rallyUrl(); if (u) showQr(u, { title: draft.title, note: '参加者にこのQRを読み取ってもらいます' }); } }, '🔳 QRを表示'),
        h('button', { onclick: poster }, '🖨 ポスターを作る'),
        h('button', { onclick: () => { if (draft.points.length) play({ title: draft.title || '試し遊び', points: draft.points }); } }, '試しに遊ぶ'))),
    placeForm({ idPrefix: 'cp', namePlaceholder: '例: 駅前の時計台', onAdd: (p) => { draft.points.push({ name: p.name, lat: p.lat, lon: p.lon }); db.set('draft', draft); drawList(); } }));
  drawList();
}

if (location.hash.startsWith('#r=') && !fromHash) render(app, h('p', { class: 'error' }, 'ラリーのURLが壊れています'), h('a', { href: './' }, '自分で作る'));
else if (fromHash) play(fromHash); else create();
addEventListener('hashchange', () => location.reload());
