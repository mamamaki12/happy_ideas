import { h, add, render, $, store, wakeLock, vibrate } from '../../shared/lib.js';
import { speak, stopSpeaking } from '../../shared/speech.js';

// 声で案内するストレッチ。画面を見なくていいので、デスクワークの合間や寝る前に。
const ROUTINES = {
  desk: { name: 'デスクワークの合間（3分）', steps: [['首を右にゆっくり倒します', 20], ['首を左にゆっくり倒します', 20], ['肩を後ろに大きく回します', 20], ['両手を組んで、上にぐーっと伸びます', 20], ['胸を開いて、肩甲骨を寄せます', 20], ['座ったまま、上半身を右にひねります', 20], ['左にひねります', 20], ['深呼吸をして、おしまいです', 20]] },
  sleep: { name: '寝る前（4分）', steps: [['仰向けになって、全身の力を抜きます', 30], ['両ひざを抱えて、腰を伸ばします', 30], ['ひざを右に倒して、腰をひねります', 30], ['左に倒します', 30], ['足首をゆっくり回します', 30], ['ゆっくり呼吸をして、おやすみなさい', 30]] },
  morning: { name: '朝のめざめ（2分）', steps: [['その場で大きく伸びをします', 15], ['腕を前後に振ります', 15], ['かかとを上げ下げします', 20], ['上半身を左右に倒します', 20], ['深呼吸を3回します', 20], ['今日もいい一日を', 10]] },
};
const db = store('stretch-coach');
const app = $('#app');
const lock = wakeLock();
let key = db.get('key', 'desk'); let running = false; let streak = db.get('done', []);
const ring = h('div', { class: 'ring', role: 'img', 'aria-label': '残り時間' }, h('span', { class: 'ring-num' }, ''));
const now = h('p', { class: 'center step-now', 'aria-live': 'polite' }, 'はじめるを押してください');
const stepsBox = h('ol', { class: 'steps' });
const btn = h('button', { class: 'primary big', onclick: () => (running ? stop() : run()) }, '▶ はじめる');

function drawSteps(active = -1) { render(stepsBox, ROUTINES[key].steps.map(([t, sec], i) => h('li', { class: i === active ? 'active' : i < active ? 'past' : '' }, `${t}（${sec}秒）`))); }
async function run() {
  running = true; btn.textContent = '■ やめる'; lock.on();
  const steps = ROUTINES[key].steps;
  for (let i = 0; i < steps.length && running; i++) {
    const [text, sec] = steps[i];
    drawSteps(i); now.textContent = text; vibrate(60);
    await speak(text, { rate: 0.95 });
    for (let t = sec; t > 0 && running; t--) {
      ring.style.setProperty('--p', `${((sec - t) / sec) * 100}%`); ring.firstChild.textContent = String(t);
      if (t === 3) speak('さん、に、いち', { rate: 1.1 });
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (running) { const d = new Date().toISOString().slice(0, 10); if (!streak.includes(d)) { streak.push(d); db.set('done', streak); } now.textContent = 'おつかれさまでした！'; speak('おつかれさまでした'); }
  stop(false);
}
function stop(cancel = true) { running = false; if (cancel) stopSpeaking(); lock.off(); btn.textContent = '▶ はじめる'; ring.style.setProperty('--p', '0%'); ring.firstChild.textContent = ''; drawSteps(); drawStats(); }
const statsP = h('p', { class: 'center small muted' });
function drawStats() { statsP.textContent = `これまで ${streak.length} 日実施`; }

add(app, h('section', { class: 'card' }, h('label', { for: 'rt' }, 'メニュー'), h('select', { id: 'rt', onchange: (e) => { key = e.target.value; db.set('key', key); drawSteps(); } }, Object.entries(ROUTINES).map(([k, r]) => h('option', { value: k, selected: k === key }, r.name)))),
  h('section', { class: 'card center' }, ring, now, btn, statsP), h('section', { class: 'card' }, stepsBox));
drawSteps(); drawStats();
