// #103 冷蔵庫の写真で献立: 冷蔵庫の中を撮ると、ある食材で作れる料理を3つ提案してくれる
import { h, add, $, store, toast, share } from '../../shared/lib.js';
import { aiNotice, bindAI, imagePayload, photoPicker } from '../../shared/ai.js';

const db = store('ai-fridge-recipe');
const prefs = db.get('prefs', { servings: 2, minutes: '20', avoid: '' });
const favs = db.get('favs', []);
const app = $('#app');

const photo = photoPicker({ label: '冷蔵庫の中を撮る・選ぶ' });
const servings = h('select', { id: 'servings' }, [1, 2, 3, 4, 5, 6].map((n) => h('option', { value: n, selected: n === prefs.servings }, `${n}人分`)));
const minutes = h('select', { id: 'minutes' }, [['10', '10分以内'], ['20', '20分以内'], ['40', '40分以内']].map(([v, l]) => h('option', { value: v, selected: v === prefs.minutes }, l)));
const avoid = h('input', { id: 'avoid', maxlength: 100, value: prefs.avoid, placeholder: '例: えび、そば（アレルギーなど）' });
const btn = h('button', { type: 'button', class: 'primary big' }, '献立を考えてもらう');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
const favBox = h('section', { class: 'card' });

const recipeText = (r) => `【${r.name}】${r.minutes}分\n材料: ${[...r.uses, ...r.extra].join('、')}\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
function recipeCard(r, { fav } = {}) {
  return h('article', { class: 'ai-block' },
    h('div', { class: 'ai-meta' }, h('b', { class: 'grow' }, r.name), h('span', { class: 'pill' }, `${r.minutes}分`)),
    h('div', { class: 'small' }, '使う食材: ', r.uses.join('、') || '—'),
    r.extra.length ? h('div', { class: 'small muted' }, 'ほかに: ', r.extra.join('、')) : null,
    h('ol', {}, r.steps.map((s) => h('li', {}, s))),
    r.tip ? h('p', { class: 'small' }, `💡 ${r.tip}`) : null,
    h('div', { class: 'btn-row' },
      fav ? null : h('button', { type: 'button', class: 'small', onclick: () => { favs.unshift(r); favs.splice(30); db.set('favs', favs); drawFavs(); toast('お気に入りに保存しました'); } }, '☆ 保存'),
      h('button', { type: 'button', class: 'small', onclick: () => share({ title: r.name, text: recipeText(r) }) }, '共有'),
      fav ? h('button', { type: 'button', class: 'small danger', onclick: () => { favs.splice(favs.indexOf(r), 1); db.set('favs', favs); drawFavs(); } }, '削除') : null));
}
function drawFavs() {
  favBox.replaceChildren(h('h2', {}, `お気に入り（${favs.length}）`));
  add(favBox, favs.length ? favs.map((r) => h('details', {}, h('summary', {}, r.name), recipeCard(r, { fav: true }))) : h('p', { class: 'empty' }, '気に入った献立を「☆ 保存」すると、ここに残ります。'));
}

bindAI(btn, out, 'fridge-recipe', async () => {
  if (!photo.blob) { toast('先に冷蔵庫の写真を撮るか選んでください'); return null; }
  Object.assign(prefs, { servings: +servings.value, minutes: minutes.value, avoid: avoid.value.trim() });
  db.set('prefs', prefs);
  return { fields: { servings: prefs.servings, minutes: prefs.minutes, avoid: prefs.avoid }, image: await imagePayload(photo.blob) };
}, (r) => [
  r.ingredients.length ? h('div', {}, h('h3', {}, '見つけた食材'), h('div', { class: 'ai-meta' }, r.ingredients.map((x) => h('span', { class: 'pill' }, x)))) : null,
  h('h3', {}, '今日の献立案'),
  r.recipes.length ? r.recipes.map((x) => recipeCard(x)) : h('p', { class: 'empty' }, '食材を見つけられませんでした。明るい場所で撮り直してください。'),
  r.note ? h('p', { class: 'small' }, `🧊 ${r.note}`) : null,
  h('p', { class: 'ai-disclaimer' }, 'アレルギーがある場合は、材料をご自身でも必ず確認してください。'),
]);

add(app, aiNotice({ sends: '撮った写真と条件' }),
  h('section', { class: 'card' }, photo.el,
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'servings' }, '人数'), servings), h('div', {}, h('label', { for: 'minutes' }, '調理時間'), minutes)),
    h('div', { class: 'field' }, h('label', { for: 'avoid' }, '使わない食材'), avoid), btn, out),
  favBox);
drawFavs();
