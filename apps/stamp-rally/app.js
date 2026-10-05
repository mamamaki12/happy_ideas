import { h, render, $, store, getPosition, distance, fmtDistance, toast, vibrate, share, safeHttpUrl } from '../../shared/lib.js';
import { placeForm } from '../../shared/places.js';
import { encodeRally, decodeRally } from './logic.js';

// 位置情報スタンプラリー。主催者がチェックポイントを作り、URLで配布。参加者は現地でスタンプを押す。
// ラリーの定義は URL のハッシュに入る（サーバー不要）。
const db = store('stamp-rally');
const app = $('#app');
const RADIUS = 100;

const fromHash = location.hash.startsWith('#r=') ? decodeRally(location.hash.slice(3)) : null;

function play(rally) {
  const key = `stamps:${encodeRally(rally).slice(0, 40)}`;
  const stamps = db.get(key, {});
  const grid = h('div', { class: 'stamp-grid' });
  const msg = h('p', { class: 'center', 'aria-live': 'polite' });
  const draw = (here) => {
    render(grid, rally.points.map((p, i) => {
      const got = stamps[i];
      return h('div', { class: `stamp${got ? ' got' : ''}` }, h('div', { class: 'stamp-ink', 'aria-hidden': 'true' }, got ? '㊞' : String(i + 1)), h('b', {}, p.name),
        h('span', { class: 'small muted' }, got ? '獲得！' : here ? fmtDistance(distance(here, p)) : ''));
    }));
    const n = Object.keys(stamps).length;
    msg.textContent = n === rally.points.length ? '🎉 コンプリート！おめでとうございます' : `${n} / ${rally.points.length} 個`;
  };
  const check = async (btn) => {
    btn.disabled = true;
    try {
      const pos = await getPosition({ maximumAge: 0 });
      const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const hit = rally.points.findIndex((p, i) => !stamps[i] && distance(here, p) <= RADIUS + Math.min(pos.coords.accuracy, 100));
      if (hit >= 0) { stamps[hit] = Date.now(); db.set(key, stamps); vibrate([80, 60, 200]); toast(`㊞ ${rally.points[hit].name} のスタンプを獲得！`); }
      else toast(`近くにチェックポイントがありません（${RADIUS}m以内で押せます）`);
      draw(here);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  render(app, h('section', { class: 'card center' }, h('h2', {}, rally.title), msg, h('button', { class: 'primary big', onclick: (e) => check(e.currentTarget) }, '㊞ スタンプを押す')), h('section', { class: 'card' }, grid),
    h('p', { class: 'center' }, h('a', { href: './' }, '自分でラリーを作る')));
  draw(null);
  getPosition().then((p) => draw({ lat: p.coords.latitude, lon: p.coords.longitude })).catch(() => {});
}

function create() {
  const draft = db.get('draft', { title: '', points: [] });
  const titleIn = h('input', { id: 'rt', value: draft.title, placeholder: '例: 商店街スタンプラリー', maxlength: 40, oninput: (e) => { draft.title = e.target.value; db.set('draft', draft); } });
  const list = h('ul', { class: 'list' });
  const drawList = () => render(list, draft.points.length ? draft.points.map((p, i) => h('li', {}, h('span', { class: 'grow' }, `${i + 1}. ${p.name}`),
    h('button', { class: 'small ghost', 'aria-label': `${p.name}を削除`, onclick: () => { draft.points.splice(i, 1); db.set('draft', draft); drawList(); } }, '×'))) : h('li', { class: 'empty' }, 'チェックポイントを追加してください'));
  const publish = () => {
    if (!draft.title || draft.points.length === 0) return toast('タイトルとチェックポイントを入れてください');
    const url = new URL(location.href); url.hash = `r=${encodeRally({ title: draft.title, points: draft.points.map(({ name, lat, lon }) => ({ name, lat: +lat.toFixed(6), lon: +lon.toFixed(6) })) })}`;
    if (!safeHttpUrl(url.href)) return;
    share({ title: draft.title, text: `スタンプラリー「${draft.title}」に参加しよう`, url: url.href });
  };
  render(app, h('p', { class: 'lead' }, 'チェックポイントを登録して、参加用のURLを共有します。サーバー不要で、データはURLに入ります。'),
    h('section', { class: 'card' }, h('label', { for: 'rt' }, 'ラリーの名前'), titleIn, h('h2', { style: { marginTop: '12px' } }, 'チェックポイント'), list,
      h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'primary', onclick: publish }, '参加URLを共有'),
        h('button', { onclick: () => { if (draft.points.length) play({ title: draft.title || '試し遊び', points: draft.points }); } }, '試しに遊ぶ'))),
    placeForm({ idPrefix: 'cp', namePlaceholder: '例: 駅前の時計台', onAdd: (p) => { draft.points.push({ name: p.name, lat: p.lat, lon: p.lon }); db.set('draft', draft); drawList(); } }));
  drawList();
}

if (location.hash.startsWith('#r=') && !fromHash) render(app, h('p', { class: 'error' }, 'ラリーのURLが壊れています'), h('a', { href: './' }, '自分で作る'));
else if (fromHash) play(fromHash); else create();
addEventListener('hashchange', () => location.reload());
