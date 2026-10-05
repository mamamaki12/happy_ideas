import { h, add, render, $, getPosition, notify, notifyButton, todayStr, store } from '../../shared/lib.js';
import { rainLevel, summarize } from './logic.js';

// これから48時間の雨を「いつ何をするか」に変換する。洗濯物・傘・大雨への備えまで。
const db = store('rain-timeline');
const app = $('#app');
const out = h('section', { class: 'card', 'aria-live': 'polite' });
const tl = h('section', { class: 'card' });

async function load() {
  render(out, h('p', { class: 'muted center' }, '予報を取得中…'));
  try {
    const p = await getPosition({ maximumAge: 600000 });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude.toFixed(2)}&longitude=${p.coords.longitude.toFixed(2)}&hourly=precipitation,precipitation_probability&forecast_hours=48&timezone=auto`, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    if (!res.ok) throw new Error();
    const j = await res.json();
    const hours = j.hourly.time.map((t, i) => ({ time: t, mm: j.hourly.precipitation[i] ?? 0, prob: j.hourly.precipitation_probability?.[i] ?? 0 }));
    show(hours);
  } catch (e) { render(out, h('p', { class: 'error' }, e?.message && !e.message.startsWith('HTTP') ? e.message : '予報を取得できませんでした（オフライン？）'), h('button', { onclick: load }, '再読み込み')); }
}
const hm = (t) => `${+t.slice(8, 10) === new Date().getDate() ? '' : '明日'}${+t.slice(11, 13)}時`;
function show(hours) {
  const s = summarize(hours);
  render(out, h('p', { class: 'big-number', style: { fontSize: '2.2rem' } }, s.start ? `☔ ${hm(s.start)}から` : '☀ 48時間 雨なし'),
    h('ul', { class: 'list' },
      h('li', {}, h('span', { class: 'grow' }, '👕 洗濯物（12時間以内）'), h('b', {}, s.laundry ? '外に干してOK' : '部屋干しがおすすめ')),
      s.start ? h('li', {}, h('span', { class: 'grow' }, '🌂 雨が強いとき'), h('b', {}, s.peak ? `${hm(s.peak.time)} ${s.peak.mm.toFixed(1)}mm/h（${s.maxLevel.label}）` : '—')) : null,
      s.start ? h('li', {}, h('span', { class: 'grow' }, '🌤 やむのは'), h('b', {}, s.end ? hm(s.end) : '48時間以内にはやまない')) : null),
    s.maxLevel.act ? h('p', { class: `notice` }, `💡 ${s.maxLevel.act}`) : null,
    h('p', { class: 'small muted' }, '気象データ: Open-Meteo.com ／ 大雨のときは自治体の避難情報を必ず確認してください。'));
  render(tl, h('h2', {}, '時間ごと'), h('div', { class: 'rain-bars', role: 'img', 'aria-label': '48時間の雨量' }, hours.map((x) => h('div', { class: `rb ${rainLevel(x.mm).cls}`, title: `${hm(x.time)} ${x.mm}mm ${x.prob}%` }, h('div', { style: { height: `${Math.min(100, x.mm * 5 + (x.prob > 0 ? 3 : 0))}%` } }), +x.time.slice(11, 13) % 6 === 0 ? h('span', {}, +x.time.slice(11, 13)) : null))),
    h('ul', { class: 'list' }, hours.filter((x) => x.mm >= 1).slice(0, 12).map((x) => h('li', {}, h('b', {}, hm(x.time)), h('span', { class: 'grow' }, `${x.mm}mm（${x.prob}%）`), h('span', { class: `pill ${rainLevel(x.mm).cls}` }, rainLevel(x.mm).label)))));
  if (s.maxLevel.cls === 'danger' && db.get('n') !== todayStr()) { db.set('n', todayStr()); notify('大雨の予報です', `${hm(s.peak.time)}ごろ ${s.peak.mm}mm/h。${s.maxLevel.act}`); }
}
add(app, out, tl, h('div', { class: 'center' }, notifyButton()));
load();
