import { h, add, $, store, share, download } from '../../shared/lib.js';
import { drawWrapped, canvasToBlob } from '../../shared/canvas-text.js';

// ひとことを画像カードにして送る。LINEやメールにそのまま貼れる。
const db = store('thanks-card');
const s = db.get('s', { to: '', msg: 'いつもありがとう！', from: '', theme: 'sun' });
const THEMES = { sun: ['#fff4e6', '#e8590c', '🌻'], sky: ['#e7f5ff', '#1c7ed6', '☁️'], sakura: ['#fff0f6', '#d6336c', '🌸'], leaf: ['#ebfbee', '#2f9e44', '🍀'], night: ['#1b1b3a', '#ffd43b', '🌙'] };
const app = $('#app');
const canvas = h('canvas', { class: 'card-canvas', width: 1080, height: 1080, role: 'img', 'aria-label': 'カードのプレビュー' });

function paint() {
  const [bg, fg, icon] = THEMES[s.theme]; const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1080);
  ctx.strokeStyle = fg; ctx.lineWidth = 10; ctx.setLineDash([30, 20]); ctx.strokeRect(50, 50, 980, 980); ctx.setLineDash([]);
  ctx.font = '120px system-ui'; ctx.textAlign = 'center'; ctx.fillText(icon, 540, 220);
  ctx.fillStyle = fg; ctx.font = 'bold 56px system-ui, sans-serif'; if (s.to) ctx.fillText(`${s.to} へ`, 540, 330);
  ctx.fillStyle = s.theme === 'night' ? '#f1f3f5' : '#212529'; ctx.font = 'bold 72px system-ui, sans-serif';
  const lines = Math.min(5, Math.ceil(ctx.measureText(s.msg).width / 820) || 1);
  drawWrapped(ctx, s.msg || ' ', 540, 560 - (lines - 1) * 45, 820, 92, 5);
  ctx.fillStyle = fg; ctx.font = '48px system-ui, sans-serif'; if (s.from) ctx.fillText(`${s.from} より`, 540, 930);
}
const upd = (k) => (e) => { s[k] = e.target.value; db.set('s', s); paint(); };
async function send() {
  const blob = await canvasToBlob(canvas); const file = new File([blob], 'thanks.png', { type: 'image/png' });
  const r = await share({ title: 'ありがとうカード', text: s.msg, files: [file] });
  if (r !== 'shared') download(blob, file.name);
}
add(app, h('section', { class: 'card' }, canvas),
  h('section', { class: 'card' },
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'to' }, 'だれへ'), h('input', { id: 'to', value: s.to, maxlength: 20, oninput: upd('to') })), h('div', {}, h('label', { for: 'fr' }, 'だれから'), h('input', { id: 'fr', value: s.from, maxlength: 20, oninput: upd('from') }))),
    h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'msg' }, 'メッセージ'), h('textarea', { id: 'msg', rows: 3, maxlength: 80, value: s.msg, oninput: upd('msg') })),
    h('div', { class: 'field' }, h('label', { for: 'th' }, 'デザイン'), h('select', { id: 'th', onchange: upd('theme') }, Object.entries(THEMES).map(([k, [, , ic]]) => h('option', { value: k, selected: k === s.theme }, `${ic} ${k}`)))),
    h('button', { class: 'primary big', onclick: send }, '💌 送る / 保存')));
paint();
