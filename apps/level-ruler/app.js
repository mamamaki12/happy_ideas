import { h, add, render, $, store, requestOrientation, vibrate } from '../../shared/lib.js';

// 水平器（傾きセンサー）と、画面を使った定規（端末ごとに1回だけ校正する）。
const db = store('level-ruler');
const app = $('#app');
let pxPerMm = db.get('pxPerMm', 96 / 25.4); // CSS px → mm（初期値は96dpi想定）
let tab = 'level';

const tabs = h('div', { class: 'tabs', role: 'tablist' });
const panel = h('section', { class: 'card' });
let cleanup = () => {};

function drawTabs() {
  render(tabs, [['level', '水平器'], ['ruler', '定規']].map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; drawTabs(); draw(); } }, l)));
}

function level() {
  const bubble = h('div', { class: 'bubble' });
  const vial = h('div', { class: 'vial', role: 'img', 'aria-label': '水平器' }, h('div', { class: 'cross' }), bubble);
  const read = h('p', { class: 'big-number', 'aria-live': 'polite' }, '--');
  const hint = h('p', { class: 'center muted' }, 'スマホを平らな面に置くか、側面を当ててください。');
  const startBtn = h('button', { class: 'primary', onclick: start }, 'センサーを使う');
  let wasLevel = false;
  const onOri = (e) => {
    if (e.beta == null) return;
    // 平置き: beta/gamma が 0 に近いほど水平。側面当て: gamma だけ見る
    const flat = Math.abs(e.beta) < 45;
    const x = Math.max(-45, Math.min(45, e.gamma || 0)); const y = flat ? Math.max(-45, Math.min(45, e.beta)) : 0;
    bubble.style.transform = `translate(${(-x / 45) * 90}px, ${(-y / 45) * 90}px)`;
    const tilt = flat ? Math.hypot(x, y) : Math.abs(90 - Math.abs(e.beta));
    read.textContent = `${tilt.toFixed(1)}°`;
    const isLevel = tilt < 0.5;
    vial.classList.toggle('level', isLevel);
    if (isLevel && !wasLevel) vibrate(40);
    wasLevel = isLevel;
  };
  async function start() {
    if (!(await requestOrientation())) { hint.textContent = '傾きセンサーが使えません（PCや許可なしの場合）'; return; }
    startBtn.classList.add('hidden');
    addEventListener('deviceorientation', onOri);
  }
  cleanup = () => removeEventListener('deviceorientation', onOri);
  if (typeof window.DeviceOrientationEvent?.requestPermission !== 'function') start();
  render(panel, vial, read, hint, h('div', { class: 'center' }, startBtn));
}

function ruler() {
  const len = Math.floor((Math.min(innerWidth, 720) - 64) / pxPerMm);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  const w = len * pxPerMm;
  svg.setAttribute('width', w + 2); svg.setAttribute('height', 70); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${len}mmの定規`);
  for (let mm = 0; mm <= len; mm++) {
    const l = document.createElementNS(svgNS, 'line');
    const x = mm * pxPerMm + 1;
    l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', mm % 10 === 0 ? 34 : mm % 5 === 0 ? 24 : 14);
    l.setAttribute('class', 'tick');
    svg.append(l);
    if (mm % 10 === 0) { const t = document.createElementNS(svgNS, 'text'); t.setAttribute('x', x + 2); t.setAttribute('y', 50); t.textContent = String(mm / 10); t.setAttribute('class', 'tick-label'); svg.append(t); }
  }
  // 校正: クレジットカード（85.6mm）の幅に合わせる
  const card = h('div', { class: 'cal-card', style: { width: `${85.6 * pxPerMm}px` } }, 'カード 85.6mm');
  const slider = h('input', { id: 'cal', type: 'range', min: 2, max: 10, step: 0.01, value: pxPerMm, oninput: (e) => { pxPerMm = +e.target.value; card.style.width = `${85.6 * pxPerMm}px`; } });
  render(panel, h('div', { class: 'ruler-wrap' }, svg), h('p', { class: 'muted small' }, '単位: cm。画面の左端から測ります。'),
    h('details', {}, h('summary', {}, '校正する（正確に測りたいとき）'),
      h('p', { class: 'small' }, 'ポイントカードなどを画面に当てて、下の帯の幅をカードに合わせてください。'), card,
      h('label', { for: 'cal' }, '幅の調整'), slider,
      h('button', { class: 'small', onclick: () => { db.set('pxPerMm', pxPerMm); draw(); } }, 'この幅で保存')));
  cleanup = () => {};
}

function draw() { cleanup(); tab === 'level' ? level() : ruler(); }
add(app, tabs, panel);
drawTabs(); draw();
