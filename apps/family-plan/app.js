import { h, add, render, $, store, share, download } from '../../shared/lib.js';
import { drawWrapped, canvasToBlob } from '../../shared/canvas-text.js';

// 災害時の家族の約束（集合場所・連絡手段・役割）を決めて、1枚の画像カードにする。冷蔵庫に貼ったりLINEで共有したり。
const db = store('family-plan');
const FIELDS = [['meet1', '第1集合場所（家の近く）', '例: 〇〇公園の時計の下'], ['meet2', '第2集合場所（避難所）', '例: 〇〇小学校 体育館'], ['contact', '連絡手段', '例: 災害用伝言ダイヤル171 → LINEグループ'], ['relay', '遠くの親戚（三角連絡）', '例: 大阪のおばあちゃん 06-xxxx'], ['kids', '子どもの引き取り', '例: 学校で待機、迎えはママ'], ['pets', 'ペット', '例: キャリーに入れて一緒に避難'], ['memo', 'そのほか', '例: 家の鍵は玄関の植木鉢の下']];
const d = db.get('d', {});
const app = $('#app');
const canvas = h('canvas', { class: 'plan-canvas', width: 1080, height: 1500, role: 'img', 'aria-label': '家族の防災カード' });

function paint() {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1080, 1500);
  ctx.fillStyle = '#c92a2a'; ctx.fillRect(0, 0, 1080, 150);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 64px system-ui, sans-serif'; ctx.fillText('🏠 わが家の防災の約束', 50, 100);
  let y = 230;
  for (const [k, label] of FIELDS) {
    if (!d[k]) continue;
    ctx.fillStyle = '#c92a2a'; ctx.font = 'bold 36px system-ui, sans-serif'; ctx.fillText(label, 50, y);
    ctx.fillStyle = '#111'; ctx.font = '44px system-ui, sans-serif';
    const n = drawWrapped(ctx, d[k], 50, y + 62, 980, 56, 3);
    y += 62 + n * 56 + 40;
  }
  ctx.fillStyle = '#666'; ctx.font = '30px system-ui'; ctx.fillText('災害用伝言ダイヤル 171 ／ 毎月1日・15日に体験利用できます', 50, 1450);
}
const form = h('section', { class: 'card' }, FIELDS.map(([k, l, ph]) => h('div', { class: 'field' }, h('label', { for: `fp-${k}` }, l), h('textarea', { id: `fp-${k}`, rows: 2, maxlength: 120, placeholder: ph, value: d[k] || '', oninput: (e) => { d[k] = e.target.value; db.set('d', d); paint(); } }))));
async function send() { const blob = await canvasToBlob(canvas); const file = new File([blob], 'bousai-plan.png', { type: 'image/png' }); const r = await share({ title: 'わが家の防災の約束', text: '家族の集合場所と連絡方法です', files: [file] }); if (r !== 'shared') download(blob, file.name); }
add(app, form, h('section', { class: 'card' }, h('h2', {}, 'カード'), canvas, h('button', { class: 'primary big', style: { marginTop: '10px' }, onclick: send }, '📤 家族に送る / 保存')));
paint();
