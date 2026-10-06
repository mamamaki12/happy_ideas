import { h, add, render, $, store } from '../../shared/lib.js';

// 停電時のモード。バッテリー残量（Battery Status API）から残り時間の目安を出し、暗い画面で必要な情報だけ表示。
const db = store('power-outage');
const app = $('#app');
const batCard = h('section', { class: 'card center', 'aria-live': 'polite' });
const TIPS = ['画面の明るさを最低にする', '機内モードにして、必要なときだけ通信する（災害時はWi-Fi「00000JAPAN」が無料開放されることがあります）', '使わないアプリを終了する', '低電力モード／省電力モードをオンにする', '冷蔵庫はなるべく開けない（4時間ほどは保冷できます）', 'ブレーカーを落とし、復旧時の通電火災を防ぐ', '懐中電灯やランタンは足元に。ろうそくは火事の原因になるので避ける'];
const checks = db.get('checks', {});

async function drawBattery() {
  if (!navigator.getBattery) { render(batCard, h('p', {}, '🔋 この端末・ブラウザはバッテリー残量を取得できません（iPhoneなど）'), h('p', { class: 'small muted' }, '設定アプリの「バッテリー」で確認してください。')); return; }
  const b = await navigator.getBattery();
  const upd = () => {
    const pct = Math.round(b.level * 100);
    // 1時間あたりの消費: 待機中 約3%、画面オン 約15% の目安
    const idleH = (pct / 3).toFixed(0); const activeH = (pct / 15).toFixed(1);
    render(batCard, h('p', { class: 'big-number' }, `${pct}%`), h('div', { class: 'meter' }, h('div', { style: { width: `${pct}%`, background: pct < 20 ? 'var(--danger)' : 'var(--ok)' } })),
      h('p', {}, b.charging ? '⚡ 充電中' : `待機中心なら 約${idleH}時間 ・ 画面を使い続けると 約${activeH}時間`),
      h('p', { class: 'small muted' }, '※ 目安です。端末や使い方で大きく変わります。'));
  };
  upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
}
const tipList = h('ul', { class: 'list' }, TIPS.map((t, i) => h('li', {}, h('input', { type: 'checkbox', id: `tp${i}`, checked: !!checks[i], onchange: (e) => { checks[i] = e.target.checked; db.set('checks', checks); } }), h('label', { for: `tp${i}`, class: 'grow', style: { color: 'var(--text)', margin: 0, fontSize: '.95rem' } }, t))));
const darkBtn = h('button', { class: 'big', onclick: () => { document.body.classList.toggle('blackout'); darkBtn.textContent = document.body.classList.contains('blackout') ? '☀ 通常表示' : '🌑 真っ黒表示（省電力）'; } }, '🌑 真っ黒表示（省電力）');
add(app, batCard, h('section', { class: 'card' }, h('h2', {}, 'やることリスト'), tipList), h('section', { class: 'card' }, darkBtn, h('p', { class: 'small muted' }, '有機ELの画面では黒い表示ほど電気を使いません。')));
drawBattery();
