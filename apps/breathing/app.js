import { h, render, $, store, vibrate, wakeLock, todayStr } from '../../shared/lib.js';

// 呼吸法のガイド。円の大きさと振動でリズムを伝えるので、目を閉じていてもできる。
const PATTERNS = {
  '478': { name: '4-7-8 呼吸（眠りたいとき）', steps: [['吸う', 4], ['止める', 7], ['吐く', 8]] },
  box: { name: 'ボックス呼吸（落ち着きたいとき）', steps: [['吸う', 4], ['止める', 4], ['吐く', 4], ['止める', 4]] },
  calm: { name: 'ゆっくり呼吸（リラックス）', steps: [['吸う', 5], ['吐く', 5]] },
};
const db = store('breathing');
const app = $('#app');
const lock = wakeLock();
let key = db.get('key', '478'); let running = false; let sessions = db.get('sessions', {});
const circle = h('div', { class: 'breath-circle' }, h('span', { class: 'breath-label', 'aria-live': 'polite' }, 'はじめる'));
const count = h('p', { class: 'big-number breath-count' }, '');
const roundsIn = h('select', { id: 'rounds' }, [3, 4, 6, 10].map((n) => h('option', { value: n, selected: n === 4 }, `${n}回`)));
const btn = h('button', { class: 'primary big', onclick: () => (running ? (running = false) : run()) }, '▶ はじめる');
const statP = h('p', { class: 'small muted center' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  running = true; btn.textContent = '■ やめる'; lock.on();
  const steps = PATTERNS[key].steps; const rounds = +roundsIn.value;
  for (let r = 0; r < rounds && running; r++) {
    for (const [label, sec] of steps) {
      if (!running) break;
      circle.firstChild.textContent = label;
      circle.className = `breath-circle ${label === '吸う' ? 'in' : label === '吐く' ? 'out' : 'hold'}`;
      circle.style.transitionDuration = `${sec}s`;
      vibrate(label === '吸う' ? [80] : label === '吐く' ? [40, 60, 40] : [20]);
      for (let t = sec; t > 0 && running; t--) { count.textContent = String(t); await sleep(1000); }
    }
  }
  if (running) { sessions[todayStr()] = (sessions[todayStr()] || 0) + 1; db.set('sessions', sessions); circle.firstChild.textContent = 'おつかれさま'; }
  running = false; lock.off(); btn.textContent = '▶ はじめる'; count.textContent = ''; circle.className = 'breath-circle'; drawStat();
}
function drawStat() { statP.textContent = `今日 ${sessions[todayStr()] || 0} 回 ・ 合計 ${Object.values(sessions).reduce((a, b) => a + b, 0)} 回`; }
app.append(h('section', { class: 'card' }, h('div', { class: 'row' },
  h('div', {}, h('label', { for: 'pt' }, '呼吸法'), h('select', { id: 'pt', onchange: (e) => { key = e.target.value; db.set('key', key); } }, Object.entries(PATTERNS).map(([k, p]) => h('option', { value: k, selected: k === key }, p.name)))),
  h('div', { class: 'shrink' }, h('label', { for: 'rounds' }, '回数'), roundsIn))),
h('section', { class: 'card center' }, circle, count, btn, statP));
drawStat();
