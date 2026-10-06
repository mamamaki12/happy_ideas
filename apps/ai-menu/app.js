// #106 メニューまるわかり: 外国語・日本語のメニューを撮ると、選んだ言語で料理の説明とアレルゲンの目安を出す
import { h, add, $, store, toast } from '../../shared/lib.js';
import { aiNotice, bindAI, imagePayload, photoPicker } from '../../shared/ai.js';
import { speak, synthesisSupported } from '../../shared/speech.js';

const db = store('ai-menu');
const LANGS = [['ja', '日本語'], ['en', 'English'], ['zh-Hans', '简体中文'], ['ko', '한국어']];
const guess = () => { const l = (navigator.language || 'ja').toLowerCase(); return l.startsWith('zh') ? 'zh-Hans' : l.startsWith('ko') ? 'ko' : l.startsWith('en') ? 'en' : 'ja'; };
const prefs = db.get('prefs', { lang: guess(), avoid: '' });
const app = $('#app');

const photo = photoPicker({ label: 'メニューを撮る・選ぶ / Scan a menu' });
const lang = h('select', { id: 'lang' }, LANGS.map(([v, l]) => h('option', { value: v, selected: v === prefs.lang }, l)));
const avoid = h('input', { id: 'avoid', maxlength: 100, value: prefs.avoid, placeholder: '例: えび、豚肉、アルコール / e.g. pork, peanuts' });
const btn = h('button', { type: 'button', class: 'primary big' }, '説明してもらう / Explain');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
const show = h('div', { class: 'menu-show hidden', role: 'dialog', 'aria-modal': 'true', 'aria-label': '店員さんに見せる' });

function showToStaff(item) {
  show.replaceChildren(
    h('p', { class: 'small' }, 'これをください / I would like this'),
    h('p', { class: 'menu-show-name', lang: 'ja' }, item.original),
    h('p', { class: 'small' }, item.price),
    h('div', { class: 'btn-row' },
      synthesisSupported() ? h('button', { type: 'button', onclick: () => speak(`${item.original}をください`, { lang: 'ja-JP' }) }, '🔊 読み上げ') : null,
      h('button', { type: 'button', class: 'primary', onclick: () => show.classList.add('hidden') }, '閉じる / Close')));
  show.classList.remove('hidden');
  show.querySelector('button.primary').focus();
}

bindAI(btn, out, 'menu-reader', async () => {
  if (!photo.blob) { toast('先にメニューの写真を撮るか選んでください / Take a photo first'); return null; }
  Object.assign(prefs, { lang: lang.value, avoid: avoid.value.trim() }); db.set('prefs', prefs);
  return { fields: { lang: prefs.lang, avoid: prefs.avoid }, image: await imagePayload(photo.blob) };
}, (r) => [
  r.items.length ? h('ul', { class: 'list menu-list' }, r.items.map((it) => h('li', { class: it.warn ? 'warn-item' : '' },
    h('div', { class: 'grow' },
      h('div', { class: 'ai-meta' }, it.warn ? h('span', { class: 'pill danger' }, '⚠ 避けたい食材') : null, h('b', {}, it.name), it.price ? h('span', { class: 'small muted' }, it.price) : null),
      it.original && it.original !== it.name ? h('div', { class: 'small muted', lang: 'ja' }, it.original) : null,
      h('div', { class: 'small' }, it.desc),
      it.flags.length ? h('div', { class: 'ai-meta' }, it.flags.map((f) => h('span', { class: 'pill' }, f))) : null),
    h('button', { type: 'button', class: 'small', onclick: () => showToStaff(it) }, '見せる')))) : h('p', { class: 'empty' }, 'メニューを読み取れませんでした。正面から明るく撮ってください。'),
  r.note ? h('p', { class: 'ai-disclaimer' }, r.note) : null,
]);

addEventListener('keydown', (e) => { if (e.key === 'Escape') show.classList.add('hidden'); });
add(app, aiNotice({ sends: '撮ったメニューの写真' }),
  h('section', { class: 'card' }, photo.el,
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'lang' }, '説明の言語 / Language'), lang)),
    h('div', { class: 'field' }, h('label', { for: 'avoid' }, '避けたい食材 / Avoid'), avoid), btn, out),
  show);
