import { h, add, render, $, store, getPosition, distance, notify, notifyButton, toast, fmtDate, todayStr, vibrate } from '../../shared/lib.js';
import { placeForm, placeList } from '../../shared/places.js';

// 聖地（作品の舞台・ライブ会場など）を登録し、近づくと通知。訪問するとスタンプが押せる。
const db = store('seichi-map');
let spots = db.get('spots', []);
const app = $('#app');
const save = () => db.set('spots', spots);
const RADIUS = 150; // m
const listBox = h('div');
const statusP = h('p', { class: 'center', 'aria-live': 'polite' });
let here = null; let watchId = null;

function draw() {
  const visited = spots.filter((s) => s.visited).length;
  statusP.textContent = `訪問 ${visited} / ${spots.length} か所`;
  placeList(listBox, spots, {
    here,
    onDelete: (s) => { spots = spots.filter((x) => x.id !== s.id); save(); draw(); },
    extra: (s) => {
      if (s.visited) return h('span', { class: 'pill ok' }, `✓ ${fmtDate(s.visited)}`);
      const near = here && distance(here, s) <= RADIUS;
      return h('button', { class: `small${near ? ' primary' : ''}`, disabled: !near, title: near ? '' : `${RADIUS}m以内で押せます`, onclick: () => { s.visited = todayStr(); save(); vibrate([50, 50, 120]); toast(`📍 ${s.name} を訪問しました！`); draw(); } }, near ? 'スタンプ' : '未訪問');
    },
  });
}

function onPos(p) {
  here = { lat: p.coords.latitude, lon: p.coords.longitude };
  for (const s of spots) {
    if (!s.visited && !s.notified && distance(here, s) <= RADIUS) { s.notified = true; save(); notify('聖地が近くにあります', `${s.name} まであと少し`); }
  }
  draw();
}

const watchBtn = h('button', { class: 'primary', onclick: () => {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; watchBtn.textContent = '📡 巡礼モードを開始'; return; }
  watchId = navigator.geolocation.watchPosition(onPos, (e) => toast(e.message), { enableHighAccuracy: true, maximumAge: 5000 });
  watchBtn.textContent = '⏹ 巡礼モードを終了';
} }, '📡 巡礼モードを開始');

add(app, h('section', { class: 'card' }, statusP, h('div', { class: 'btn-row' }, watchBtn, notifyButton()), h('p', { class: 'small muted' }, `巡礼モード中は、聖地の${RADIUS}m以内に入ると通知します（ページを開いている間のみ）。`)),
  h('section', { class: 'card' }, h('h2', {}, '聖地リスト'), listBox),
  placeForm({ idPrefix: 'sp', namePlaceholder: '例: 第3話の神社', onAdd: (p) => { spots.push(p); save(); draw(); toast('追加しました'); } }));
draw();
getPosition({ maximumAge: 60000 }).then(onPos).catch(() => {});
