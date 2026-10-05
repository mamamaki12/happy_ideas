import { h, render, $, store, wakeLock, notify, notifyButton, vibrate, fmtDuration, todayStr } from '../../shared/lib.js';

// 画面を消さないポモドーロタイマー。作業中に他のアプリへ移った回数（離脱）も数える。
const db = store('focus-timer');
const app = $('#app');
const lock = wakeLock();
const cfg = db.get('cfg', { work: 25, rest: 5 });
let stats = db.get('stats', {});
let phase = 'idle'; let until = 0; let iv = 0; let leaves = 0; let task = '';
const big = h('p', { class: 'big-number focus-time' }, fmtDuration(cfg.work * 60000));
const phaseP = h('p', { class: 'center', 'aria-live': 'polite' }, '集中することを書いて開始');
const taskIn = h('input', { id: 'task', placeholder: '例: 企画書の構成を作る', maxlength: 60 });
const btn = h('button', { class: 'primary big', onclick: toggle }, '▶ 集中開始');
const statCard = h('section', { class: 'card' });

document.addEventListener('visibilitychange', () => {
  if (phase === 'work' && document.visibilityState === 'hidden') { leaves++; db.set('leaves', leaves); }
  if (phase === 'work' && document.visibilityState === 'visible' && leaves) phaseP.textContent = `集中中「${task}」・離脱 ${leaves} 回`;
});

function tick() {
  const left = until - Date.now();
  big.textContent = fmtDuration(Math.max(0, left));
  document.title = `${fmtDuration(Math.max(0, left))} ${phase === 'work' ? '集中' : '休憩'}`;
  if (left > 0) return;
  vibrate([200, 100, 200]);
  if (phase === 'work') {
    const d = stats[todayStr()] ||= { n: 0, min: 0, leaves: 0 }; d.n++; d.min += cfg.work; d.leaves += leaves; db.set('stats', stats); drawStats();
    notify('🍅 おつかれさま！', `${cfg.rest}分休憩しましょう`); phase = 'rest'; until = Date.now() + cfg.rest * 60000; phaseP.textContent = '☕ 休憩中';
  } else { notify('休憩おわり', '次の集中を始めましょう'); stop(); }
}
function toggle() { if (phase !== 'idle') return stop(); task = taskIn.value.trim() || '集中'; leaves = 0; phase = 'work'; until = Date.now() + cfg.work * 60000; iv = setInterval(tick, 250); lock.on(); btn.textContent = '■ やめる'; phaseP.textContent = `集中中「${task}」`; tick(); }
function stop() { clearInterval(iv); phase = 'idle'; lock.off(); btn.textContent = '▶ 集中開始'; big.textContent = fmtDuration(cfg.work * 60000); phaseP.textContent = '集中することを書いて開始'; document.title = '集中タイマー'; }
function drawStats() {
  const d = stats[todayStr()] || { n: 0, min: 0, leaves: 0 };
  const days = Object.keys(stats).sort().slice(-7);
  render(statCard, h('h2', {}, '今日'), h('div', { class: 'grid-3' },
    h('div', { class: 'stat' }, h('b', {}, `🍅${d.n}`), h('span', {}, 'ポモドーロ')), h('div', { class: 'stat' }, h('b', {}, `${d.min}分`), h('span', {}, '集中')), h('div', { class: 'stat' }, h('b', {}, String(d.leaves)), h('span', {}, '離脱'))),
    h('p', { class: 'small muted' }, `直近7日: ${days.map((k) => `${k.slice(5)} 🍅${stats[k].n}`).join(' / ') || 'なし'}`));
}
const num = (k, label) => h('div', {}, h('label', { for: `c-${k}` }, label), h('input', { id: `c-${k}`, type: 'number', min: 1, max: 120, value: cfg[k], onchange: (e) => { cfg[k] = Math.max(1, +e.target.value || 1); db.set('cfg', cfg); if (phase === 'idle') big.textContent = fmtDuration(cfg.work * 60000); } }));
app.append(h('section', { class: 'card center' }, big, phaseP, h('div', { class: 'field', style: { textAlign: 'left' } }, h('label', { for: 'task' }, 'いまやること'), taskIn), btn), statCard,
  h('details', { class: 'card' }, h('summary', {}, '設定'), h('div', { class: 'row', style: { marginTop: '8px' } }, num('work', '集中（分）'), num('rest', '休憩（分）')), h('div', { style: { marginTop: '10px' } }, notifyButton())));
drawStats();
