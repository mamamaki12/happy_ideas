import { h, render, $, store, getPosition, notify, notifyButton, toast, todayStr } from '../../shared/lib.js';
import { estimateWbgt, wbgtLevel, safeWindows } from './logic.js';

// 現在地の気象予報（Open-Meteo、APIキー不要）から暑さ指数を推定し、外出しやすい時間帯と水分補給を案内する。
const db = store('heat-guard');
const app = $('#app');
const out = h('section', { class: 'card', 'aria-live': 'polite' });
const planCard = h('section', { class: 'card' });
let lastWater = db.get('lastWater', 0);

async function load() {
  render(out, h('p', { class: 'center muted' }, '現在地の予報を取得中…'));
  let pos;
  try { pos = await getPosition({ maximumAge: 600000 }); } catch (e) { return manual(e.message); }
  const { latitude: lat, longitude: lon } = pos.coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,relative_humidity_2m,shortwave_radiation,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,shortwave_radiation,wind_speed_10m&wind_speed_unit=ms&timezone=auto&forecast_days=1`;
  try {
    const res = await fetch(url, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const c = j.current;
    const w = estimateWbgt(c.temperature_2m, c.relative_humidity_2m, (c.shortwave_radiation || 0) / 1000, c.wind_speed_10m);
    const hours = (j.hourly?.time || []).map((t, i) => ({ time: t.slice(11, 16), wbgt: estimateWbgt(j.hourly.temperature_2m[i], j.hourly.relative_humidity_2m[i], (j.hourly.shortwave_radiation[i] || 0) / 1000, j.hourly.wind_speed_10m[i]) }));
    show(w, { temp: c.temperature_2m, rh: c.relative_humidity_2m }, hours);
  } catch { manual('予報を取得できませんでした（オフライン？）'); }
}

function show(w, { temp, rh }, hours = [], target = out) {
  const lv = wbgtLevel(w);
  render(target,
    h('p', { class: 'center' }, h('span', { class: `pill ${lv.cls}`, style: { fontSize: '1rem' } }, lv.label)),
    h('p', { class: 'big-number' }, `${w.toFixed(1)}`),
    h('p', { class: 'center muted small' }, `暑さ指数（WBGT推定）・気温 ${temp}℃ / 湿度 ${rh}%`),
    h('p', {}, lv.advice));
  if (w >= 28 && db.get('alerted') !== todayStr()) { db.set('alerted', todayStr()); notify(`暑さ指数 ${w.toFixed(0)}（${lv.label}）`, lv.advice); }
  if (hours.length) {
    const now = new Date().getHours();
    const future = hours.filter((x) => +x.time.slice(0, 2) >= now);
    const wins = safeWindows(future);
    render(planCard, h('h2', {}, '今日の外出計画'),
      h('div', { class: 'heat-bar', role: 'img', 'aria-label': '時間ごとの暑さ指数' }, hours.map((x) => h('div', { class: `heat-cell ${wbgtLevel(x.wbgt).cls}`, title: `${x.time} ${x.wbgt.toFixed(1)}` }, h('span', {}, x.time.slice(0, 2))))),
      h('p', {}, wins.length ? `比較的安全な時間帯: ${wins.map((x) => (x.start === x.end ? x.start : `${x.start}〜${x.end}`)).join('、')}` : '今日はこの先ずっと厳重警戒以上です。不要な外出は控えましょう。'));
  }
}

function manual(reason) {
  const t = h('input', { id: 'mt', type: 'number', value: 32, step: 0.1 }); const r = h('input', { id: 'mr', type: 'number', value: 60 });
  const sun = h('select', { id: 'ms' }, h('option', { value: 0.8 }, '日なた'), h('option', { value: 0.1 }, '日かげ・くもり'), h('option', { value: 0 }, '室内・夜'));
  const resBox = h('div');
  const calc = () => show(estimateWbgt(+t.value, +r.value, +sun.value, 1), { temp: t.value, rh: r.value }, [], resBox);
  [t, r, sun].forEach((el) => el.addEventListener('input', calc));
  render(out, h('p', { class: 'notice' }, `${reason}。気温と湿度を入れて計算できます。`),
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'mt' }, '気温℃'), t), h('div', {}, h('label', { for: 'mr' }, '湿度%'), r), h('div', {}, h('label', { for: 'ms' }, '場所'), sun)), resBox);
  calc();
}

// 水分補給タイマー
const waterInfo = h('p', { class: 'center', 'aria-live': 'polite' });
const drawWater = () => { const min = lastWater ? Math.round((Date.now() - lastWater) / 60000) : null; waterInfo.textContent = min == null ? 'まだ記録がありません' : `最後に飲んでから ${min} 分`; };
setInterval(() => { drawWater(); if (lastWater && Date.now() - lastWater > 30 * 60000 && !drawWater.warned) { drawWater.warned = true; notify('💧 水分補給の時間です', '30分以上飲んでいません'); } }, 60000);

app.append(out, planCard, h('section', { class: 'card center' }, h('h2', {}, '💧 水分補給'), waterInfo,
  h('div', { class: 'btn-row' }, h('button', { class: 'primary', onclick: () => { lastWater = Date.now(); db.set('lastWater', lastWater); drawWater.warned = false; drawWater(); toast('ごくごく。記録しました'); } }, '飲んだ'), notifyButton()),
  h('p', { class: 'small muted' }, '30分以上飲んでいないと通知します（ページを開いている間）。')),
  h('p', { class: 'small muted center' }, '気象データ: Open-Meteo.com ／ 暑さ指数は推定値です。正式な値は環境省「熱中症予防情報サイト」を確認してください。'));
drawWater(); load();
