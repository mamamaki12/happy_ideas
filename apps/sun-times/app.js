import { h, add, render, $, store, getPosition, fmtTime, fmtDuration, notify, notifyButton, toast } from '../../shared/lib.js';
import { dayInfo } from './logic.js';

// 現在地の日の出・日の入り・ゴールデンアワー・ブルーアワーを計算（通信不要）。
const db = store('sun-times');
let loc = db.get('loc', null);
const app = $('#app');
const out = h('section', { class: 'card' });
const dateIn = h('input', { id: 'd', type: 'date', value: new Date().toISOString().slice(0, 10) });
dateIn.addEventListener('change', draw);

function row(icon, label, a, b) {
  return h('li', {}, h('span', { 'aria-hidden': 'true' }, icon), h('span', { class: 'grow' }, label), h('b', {}, a ? (b ? `${fmtTime(a)} – ${fmtTime(b)}` : fmtTime(a)) : '—'));
}

function draw() {
  if (!loc) { render(out, h('p', { class: 'empty' }, '現在地を取得してください')); return; }
  const [y, m, d] = dateIn.value.split('-').map(Number);
  const i = dayInfo(new Date(y, m - 1, d, 12), loc.lat, loc.lon);
  const now = Date.now();
  const next = [['朝のゴールデンアワー', i.sunrise], ['夕方のゴールデンアワー', i.goldenEveningStart], ['日の入り', i.sunset]].find(([, t]) => t && t.getTime() > now);
  render(out,
    next ? h('p', { class: 'notice' }, `次は「${next[0]}」まで あと ${fmtDuration(next[1] - now)}`) : null,
    h('ul', { class: 'list' },
      row('🌌', '朝のブルーアワー', i.blueMorningStart, i.blueMorningEnd),
      row('🌅', '日の出', i.sunrise),
      row('✨', '朝のゴールデンアワー', i.sunrise, i.goldenMorningEnd),
      row('✨', '夕方のゴールデンアワー', i.goldenEveningStart, i.sunset),
      row('🌇', '日の入り', i.sunset),
      row('🌌', '夕方のブルーアワー', i.blueEveningStart, i.blueEveningEnd)),
    i.sunrise && i.sunset ? h('p', { class: 'small muted' }, `日照時間 ${fmtDuration(i.sunset - i.sunrise)}`) : null,
    h('p', { class: 'small muted' }, `計算地点 ${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`));
  // 夕方のゴールデンアワー15分前に通知（ページを開いている間）
  const g = i.goldenEveningStart?.getTime();
  if (g && g - now > 15 * 60000 && g - now < 12 * 3600000) setTimeout(() => notify('まもなくゴールデンアワー', '15分後から写真がきれいに撮れる時間です'), g - now - 15 * 60000);
}

const locBtn = h('button', { class: 'primary', onclick: async () => {
  try { const p = await getPosition(); loc = { lat: p.coords.latitude, lon: p.coords.longitude }; db.set('loc', loc); draw(); } catch (e) { toast(e.message); }
} }, '📍 現在地で計算');
add(app, h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'd' }, '日付'), dateIn), h('div', { class: 'shrink' }, locBtn)), h('div', { style: { marginTop: '10px' } }, notifyButton())), out);
draw();
