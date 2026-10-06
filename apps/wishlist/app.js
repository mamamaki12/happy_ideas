import { h, add, render, $, store, uid, share, toast, safeHttpUrl, confirmDelete } from '../../shared/lib.js';
import { encodeData, decodeData, str } from '../../shared/urldata.js';
import { showQr } from '../../shared/qr-ui.js';

// ほしいものリストを URL で渡す。受け取った人は「これを贈ります」と返事でき、プレゼントのかぶりを防ぐ。
const db = store('wishlist');
const app = $('#app');
const shared = location.hash.startsWith('#w=') ? decodeData(location.hash.slice(3)) : null;

function sanitize(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.items)) return null;
  return { owner: str(d.owner, 20, '名前なし'), items: d.items.slice(0, 50).map((i) => ({ name: str(i?.name, 60), url: safeHttpUrl(str(i?.url, 300))?.href || '', note: str(i?.note, 80) })).filter((i) => i.name) };
}

function viewShared(d) {
  const claimed = db.get(`claimed:${location.hash.slice(3, 40)}`, []);
  const list = h('ul', { class: 'list' });
  const drawList = () => render(list, d.items.map((it, i) => h('li', { style: { flexWrap: 'wrap' } },
    h('div', { class: 'grow' }, h('b', {}, it.name), it.note ? h('div', { class: 'sub' }, it.note) : null, it.url ? h('a', { href: it.url, target: '_blank', rel: 'noopener noreferrer nofollow', class: 'small' }, '🔗 商品ページ') : null),
    claimed.includes(i) ? h('span', { class: 'pill ok' }, '贈る予定') : h('button', { class: 'small primary', onclick: () => {
      claimed.push(i); db.set(`claimed:${location.hash.slice(3, 40)}`, claimed); drawList();
      share({ title: 'プレゼント', text: `${d.owner}さんへ: リストの「${it.name}」を贈ります🎁（かぶらないように他の人にも伝えてね）` });
    } }, 'これを贈る'))));
  render(app, h('section', { class: 'card' }, h('h2', {}, `🎁 ${d.owner}さんのほしいもの`), list,
    h('p', { class: 'small muted' }, '「これを贈る」を押すと、本人やほかの贈り主に送るメッセージが作られます（サーバーがないので自動では共有されません）。')),
  h('p', { class: 'center' }, h('a', { href: './' }, '自分のリストを作る')));
  drawList();
}

function edit() {
  const d = db.get('mine', { owner: '', items: [] });
  const save = () => db.set('mine', d);
  const list = h('ul', { class: 'list' });
  const drawList = () => render(list, d.items.length ? d.items.map((it) => h('li', {}, h('div', { class: 'grow' }, h('b', {}, it.name), h('div', { class: 'sub' }, [it.note, it.url ? '🔗' : ''].filter(Boolean).join(' '))),
    h('button', { class: 'small ghost', 'aria-label': `${it.name}を削除`, onclick: () => { if (confirmDelete(it.name)) { d.items = d.items.filter((x) => x.id !== it.id); save(); drawList(); } } }, '×'))) : h('li', { class: 'empty' }, 'ほしいものを追加しましょう'));
  const n = h('input', { id: 'wn', required: true, maxlength: 60, placeholder: '例: 電気ケトル' }); const u = h('input', { id: 'wu', type: 'url', placeholder: 'https://…（任意）', maxlength: 300 }); const no = h('input', { id: 'wno', maxlength: 80, placeholder: '色やサイズなど（任意）' });
  add(app, h('section', { class: 'card' }, h('label', { for: 'wo' }, 'あなたの名前'), h('input', { id: 'wo', value: d.owner, maxlength: 20, oninput: (e) => { d.owner = e.target.value; save(); } })),
    h('section', { class: 'card' }, h('h2', {}, 'ほしいもの'), list,
      h('button', { class: 'primary big', style: { marginTop: '10px' }, onclick: () => {
        if (!d.items.length) return toast('ほしいものを追加してください');
        const url = new URL(location.href); url.hash = `w=${encodeData({ owner: d.owner || '名前なし', items: d.items.map(({ name, url: link, note }) => ({ name, url: link, note })) })}`;
        share({ title: 'ほしいものリスト', text: `${d.owner || ''}のほしいものリストです🎁`, url: url.href });
      } }, 'リストのURLを共有'),
      h('button', { style: { marginTop: '8px', width: '100%' }, onclick: () => { if (!d.items.length) return toast('ほしいものを追加してください'); const url = new URL(location.href); url.hash = `w=${encodeData({ owner: d.owner || '名前なし', items: d.items.map(({ name, url: link, note }) => ({ name, url: link, note })) })}`; showQr(url.href, { title: 'ほしいものリスト' }); } }, '🔳 QRで見せる')),
    h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); const link = u.value.trim(); if (link && !safeHttpUrl(link)) return toast('URLは http(s) で入れてください'); d.items.push({ id: uid(), name: n.value.trim(), url: link, note: no.value.trim() }); save(); n.value = ''; u.value = ''; no.value = ''; drawList(); } },
      h('h2', {}, '追加'), h('div', { class: 'field' }, h('label', { for: 'wn' }, '名前'), n), h('div', { class: 'field' }, h('label', { for: 'wu' }, '商品ページ'), u), h('div', { class: 'field' }, h('label', { for: 'wno' }, 'メモ'), no), h('button', { class: 'shrink', type: 'submit' }, '追加')));
  drawList();
}
const valid = sanitize(shared);
if (location.hash.startsWith('#w=') && !valid) add(app, h('p', { class: 'error' }, 'リストのURLが壊れています'), h('a', { href: './' }, '自分のリストを作る'));
else if (valid) viewShared(valid); else edit();
addEventListener('hashchange', () => location.reload());
