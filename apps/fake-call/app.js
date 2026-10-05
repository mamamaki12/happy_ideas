import { h, add, render, $, store, vibrate, getPosition, mapUrl, share, toast, wakeLock } from '../../shared/lib.js';

// 夜道や気まずい場面で使う「偽の着信」と、現在地をすぐ送るボタン。
const db = store('fake-call');
const s = db.get('s', { caller: 'お母さん', delay: 10 });
const app = $('#app');
const lock = wakeLock();
const screenEl = h('div', { class: 'call hidden', role: 'dialog', 'aria-modal': 'true', 'aria-label': '着信画面' });
let actx = null; let ringTimer = 0; let callTimer = 0;

function ringtone() {
  actx = new AudioContext();
  const beep = () => { [0, 0.25].forEach((t) => { const o = actx.createOscillator(); const g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.25, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.2); o.connect(g).connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.22); }); vibrate([400, 200, 400]); };
  beep(); ringTimer = setInterval(beep, 2000);
}
function endCall() { clearInterval(ringTimer); clearInterval(callTimer); actx?.close(); actx = null; vibrate(0); screenEl.classList.add('hidden'); lock.off(); }
function incoming() {
  lock.on(); ringtone();
  render(screenEl, h('p', { class: 'call-sub' }, '携帯電話'), h('p', { class: 'call-name' }, s.caller), h('div', { class: 'call-btns' },
    h('button', { class: 'call-no', 'aria-label': '拒否', onclick: endCall }, '✕'),
    h('button', { class: 'call-yes', 'aria-label': '応答', onclick: answer }, '✆')));
  screenEl.classList.remove('hidden');
}
function answer() {
  clearInterval(ringTimer); actx?.close(); actx = null; vibrate(0);
  const t0 = Date.now(); const timer = h('p', { class: 'call-sub' }, '00:00');
  callTimer = setInterval(() => { const sec = Math.floor((Date.now() - t0) / 1000); timer.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }, 1000);
  render(screenEl, h('p', { class: 'call-name' }, s.caller), timer, h('p', { class: 'call-sub' }, '（話しているふりをしてください）'), h('div', { class: 'call-btns' }, h('button', { class: 'call-no', 'aria-label': '通話終了', onclick: endCall }, '✕')));
}
const callerIn = h('input', { id: 'cl', value: s.caller, maxlength: 20, oninput: (e) => { s.caller = e.target.value; db.set('s', s); } });
const delayIn = h('select', { id: 'dl', onchange: (e) => { s.delay = +e.target.value; db.set('s', s); } }, [0, 5, 10, 30, 60].map((n) => h('option', { value: n, selected: n === s.delay }, n ? `${n}秒後` : 'すぐ')));
add(app, 
  h('section', { class: 'card' }, h('h2', {}, '📞 偽の着信'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'cl' }, 'かけてくる人'), callerIn), h('div', {}, h('label', { for: 'dl' }, 'タイミング'), delayIn)),
    h('button', { class: 'primary big', style: { marginTop: '10px' }, onclick: () => { toast(s.delay ? `${s.delay}秒後に着信します` : '着信します'); setTimeout(incoming, s.delay * 1000); } }, '着信を予約')),
  h('section', { class: 'card' }, h('h2', {}, '📍 いまの場所を送る'),
    h('button', { class: 'big', onclick: async () => { try { const p = await getPosition({ maximumAge: 0 }); share({ title: '現在地', text: `いまここを歩いています（誤差${Math.round(p.coords.accuracy)}m）`, url: mapUrl(p.coords.latitude, p.coords.longitude) }); } catch (e) { toast(e.message); } } }, '家族に現在地を送る'),
    h('p', { class: 'small muted' }, '危険を感じたら迷わず110番してください。')), screenEl);
