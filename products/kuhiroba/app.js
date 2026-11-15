import { today, countMora, topicFor, findKigo, kigoChoices, checkPost, validate, backupDue, LIMIT } from './logic.js';

const $ = (s) => document.querySelector(s);
const KEY = 'happy-ideas-kuhiroba-v1';
const BACKUP_KEY = `${KEY}-backup`;
const PREFS_KEY = `${KEY}-prefs`; // 端末ID・俳号・いいね／報告した句（句帳とは別に保存）
const API = new URL('../../api/haiku', location.href).href;
let data = { version: 1, entries: [] };
let loadError = '';
let editing = null;
let pendingPhoto = '';
let kigoTouched = false;
let api = null; // null = 確かめ中、true = 広場が使える、false = 準備中
const feed = { mode: 'new', posts: [], next: null, loading: false };
let timer;

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
function say(s, undo) {
  const st = $('#status'); clearTimeout(timer);
  st.replaceChildren(s, ...(undo ? [' ', el('button', { type: 'button', class: 'undo', onclick: () => { clearTimeout(timer); st.replaceChildren(); undo(); } }, '元に戻す')] : []));
  timer = setTimeout(() => st.replaceChildren(), undo ? 10000 : 6000);
}
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }

// 保存済みの句帳が読めないときは、上書きして消さないように保存を止める（復元だけはできる）
try { const raw = localStorage.getItem(KEY); if (raw) data = validate(JSON.parse(raw)); }
catch { loadError = '保存済みの句帳を読み込めませんでした。句帳を消さないよう、新しい保存を止めています。端末の日付が正しいか確かめて開き直すか、バックアップから復元してください。'; }
function showLoadError() {
  let p = $('#load-error');
  if (!loadError) { p?.remove(); return; }
  if (!p) { p = el('p', { id: 'load-error', class: 'load-error', role: 'alert' }); $('main').prepend(p); }
  p.textContent = loadError;
}
function commit(next, restore = false) {
  if (loadError && !restore) { say(loadError); return false; }
  try {
    const checked = validate(next);
    localStorage.setItem(KEY, JSON.stringify(checked));
    data = checked; loadError = ''; draw(); return true;
  } catch (e) { say(e.name === 'QuotaExceededError' ? '保存容量がいっぱいです。写真の付いた句を減らすか、バックアップを保存してから整理してください。' : `保存できませんでした: ${e.message}`); return false; }
}
const backupMeta = () => { try { return JSON.parse(localStorage.getItem(BACKUP_KEY)) || {}; } catch { return {}; } };
const setBackupMeta = (m) => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ ...backupMeta(), ...m })); } catch { /* 句帳には影響しない */ } };
function prefs() {
  let p = {}; try { p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { /* 作り直す */ }
  return { device: /^[a-f0-9]{32}$/.test(p.device) ? p.device : hex(16), name: typeof p.name === 'string' ? p.name.slice(0, LIMIT.name) : '', liked: Array.isArray(p.liked) ? p.liked.slice(-500) : [], reported: Array.isArray(p.reported) ? p.reported.slice(-500) : [] };
}
const setPrefs = (patch) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs(), ...patch })); } catch { /* 表示だけの情報 */ } };

/** 縦書きで見せる（区切りは全角の空き） */
const tate = (text, cls = 'tate') => el('p', { class: cls, lang: 'ja' }, text.split(' ').join('\n'));
const moraText = (e) => { const m = countMora(e.yomi || e.text); return m ? `${m.parts.join('・')}（${m.total}音）` : ''; };
const topic = topicFor(today());
// 広場の準備ができるまで掛けておく、昔の名句（作者の没後100年以上）
const SAMPLES = [['古池や 蛙飛びこむ 水の音', '芭蕉'], ['菜の花や 月は東に 日は西に', '蕪村'], ['やせ蛙 負けるな一茶 これにあり', '一茶'], ['柿食へば 鐘が鳴るなり 法隆寺', '子規']];

function draw() {
  showLoadError();
  drawBook(); drawBackup(); drawPlaza();
}

// ---- 句帳 ----
function drawBook() {
  $('#book-count').textContent = data.entries.length ? `${data.entries.length}句` : '';
  if (!data.entries.length) { $('#book').replaceChildren(el('p', { class: 'empty' }, 'まだ一句もありません。「＋ 一句よむ」から、どうぞ。')); return; }
  $('#book').replaceChildren(...data.entries.map((e) => el('article', { class: 'entry' },
    e.photo ? el('img', { src: e.photo, alt: '', class: 'thumb' }) : null,
    el('div', { class: 'entry-body' },
      el('p', { class: 'ku' }, e.text.split(' ').join('　')),
      el('p', { class: 'meta' }, [e.date, e.kigo ? `季語「${e.kigo}」` : '', moraText(e)].filter(Boolean).join('・')),
      e.memo ? el('p', { class: 'memo' }, e.memo) : null,
      e.posted ? el('p', { class: 'badge' }, '広場に出しています') : null,
      el('p', { class: 'actions' },
        el('button', { type: 'button', class: 'link', onclick: () => openWrite(e) }, '直す'),
        e.posted ? el('button', { type: 'button', class: 'link', onclick: () => withdraw(e) }, '広場から下げる')
          : api ? el('button', { type: 'button', class: 'link', onclick: () => openWrite(e, { post: true }) }, 'ひろばに出す') : null,
        el('button', { type: 'button', class: 'link quiet', onclick: () => removeEntry(e) }, '削除'))))));
}
function drawBackup() {
  const meta = backupMeta(); const box = $('#backup-reminder');
  $('#backup-last').textContent = meta.last ? `最後のバックアップ: ${meta.last}` : 'まだバックアップを保存していません。';
  if (!backupDue(meta, data.entries.length)) { box.replaceChildren(); return; }
  box.replaceChildren(el('p', {}, '句帳はこのスマホの中にしかありません。そろそろバックアップを保存しておくと安心です。'),
    el('button', { type: 'button', class: 'primary', onclick: () => $('#export').click() }, 'バックアップを保存'),
    el('button', { type: 'button', onclick: () => { setBackupMeta({ snooze: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }); drawBackup(); } }, 'あとで'));
}

// ---- 一句よむ・直す ----
function openWrite(e, { post = false, kigo = '' } = {}) {
  editing = e?.id || null;
  const f = $('#write-form'); f.reset(); $('#write-error').textContent = '';
  $('#write-title').textContent = e ? '句を直す' : kigo ? `お題「${kigo}」でよむ` : '一句よむ';
  f.elements.text.value = e?.text || '';
  f.elements.yomi.value = e?.yomi || '';
  f.elements.kigo.value = e?.kigo || kigo;
  kigoTouched = !!(e?.kigo || kigo);
  f.elements.date.value = e?.date || today();
  f.elements.date.max = today();
  f.elements.memo.value = e?.memo || '';
  f.elements.name.value = prefs().name;
  $('#kigo-list').replaceChildren(...kigoChoices(today()).map((w) => el('option', { value: w })));
  setPhoto(e?.photo || '');
  $('#post-box').hidden = !(api && !e?.posted);
  f.elements.post.checked = post;
  updateMora();
  $('#write-dlg').showModal();
}
function updateMora() {
  const f = $('#write-form');
  const m = countMora(f.elements.yomi.value || f.elements.text.value);
  $('#mora').textContent = m ? `音の数: ${m.parts.join('・')}（${m.total}音）${m.parts.length === 3 && m.parts.join() === '5,7,5' ? ' 五・七・五です' : ''}` : f.elements.text.value.trim() ? '漢字がある句は、「よみ」を入れると音の数を数えます。' : '';
  if (!kigoTouched) f.elements.kigo.value = findKigo(f.elements.text.value);
}
$('#write-form').elements.text.addEventListener('input', updateMora);
$('#write-form').elements.yomi.addEventListener('input', updateMora);
$('#write-form').elements.kigo.addEventListener('input', () => { kigoTouched = true; });

function setPhoto(dataUrl) {
  pendingPhoto = dataUrl;
  $('#photo-preview').hidden = !dataUrl;
  if (dataUrl) $('#photo-img').src = dataUrl; else $('#photo-img').removeAttribute('src');
}
/** 写真を小さく縮めて JPEG にする（撮った場所などの情報はここで消える） */
async function shrinkPhoto(file) {
  const bmp = await createImageBitmap(file);
  let size = 720; let quality = 0.72;
  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, size / Math.max(bmp.width, bmp.height));
    const c = el('canvas', { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', quality);
    if (url.length <= LIMIT.photoB64) { bmp.close?.(); return url; }
    size *= 0.8; quality = Math.max(0.5, quality - 0.05);
  }
  bmp.close?.();
  throw new Error('写真を小さくできませんでした。');
}
$('#photo-input').addEventListener('change', async (ev) => {
  const file = ev.target.files[0]; if (!file) return;
  try { if (file.size > 30 * 1024 * 1024) throw new Error('写真が大きすぎます。'); setPhoto(await shrinkPhoto(file)); }
  catch (err) { $('#write-error').textContent = err.message || '写真を読み込めませんでした。'; }
  finally { ev.target.value = ''; }
});
$('#photo-remove').addEventListener('click', () => setPhoto(''));

$('#write-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const old = data.entries.find((x) => x.id === editing);
  const e = { id: editing || crypto.randomUUID(), text: String(f.get('text')).replace(/[\s　]+/g, ' ').trim(), yomi: String(f.get('yomi')).trim(), kigo: String(f.get('kigo')).trim(), date: String(f.get('date')), memo: String(f.get('memo')), photo: pendingPhoto };
  if (old?.posted) e.posted = old.posted;
  const wantPost = api && !e.posted && f.get('post') === 'on';
  const name = String(f.get('name')).trim();
  if (wantPost) {
    try { checkPost({ text: e.text, kigo: e.kigo, name }); } catch (err) { $('#write-error').textContent = err.message; return; }
  }
  const next = { ...data, entries: editing ? data.entries.map((x) => (x.id === editing ? e : x)) : [e, ...data.entries] };
  try { validate(next); } catch { $('#write-error').textContent = '入力を確かめてください（句は40文字まで、日付は今日まで）。'; return; }
  if (!commit(next)) return;
  $('#write-dlg').close();
  if (!wantPost) { say(editing ? '直しました。' : '句帳に保存しました。'); return; }
  setPrefs({ name });
  await postEntry(e, name);
});

// ---- 広場 ----
async function call(path, body) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || '広場に届きませんでした。少しあとで、もう一度どうぞ。'), { status: res.status });
  return json;
}
async function postEntry(e, name) {
  say('広場に出しています…');
  try {
    const token = hex(32);
    const r = await call('', { text: e.text, kigo: e.kigo, name, photo: e.photo ? e.photo.split(',')[1] : undefined, tokenHash: await sha256(token) });
    const cur = data.entries.find((x) => x.id === e.id);
    if (cur) commit({ ...data, entries: data.entries.map((x) => (x.id === e.id ? { ...x, posted: { id: r.id, token } } : x)) });
    say('広場に出しました。'); setMode(feed.mode, true);
  } catch (err) { say(`句帳には保存しました。${err.message}`); }
}
async function withdraw(e, { quiet = false } = {}) {
  if (!quiet && !confirm('この句を広場から下げますか？（句帳には残ります）')) return false;
  try { await call(`/${e.posted.id}/delete`, { token: e.posted.token }); }
  catch (err) { if (err.status !== 403) { say(err.message); return false; } } // 403 = 合言葉が合わない（別の端末のバックアップを復元したときなど）ので、句帳の印だけ外す
  const { posted, ...rest } = e;
  commit({ ...data, entries: data.entries.map((x) => (x.id === e.id ? rest : x)) });
  feed.posts = feed.posts.filter((p) => p.id !== posted.id); drawPlaza();
  if (!quiet) say('広場から下げました。');
  return true;
}
async function removeEntry(e) {
  if (e.posted) {
    if (!confirm('この句は広場に出ています。広場から下げて、句帳からも削除しますか？')) return;
    if (!await withdraw(e, { quiet: true })) return;
    e = data.entries.find((x) => x.id === e.id) || e;
  } else if (!confirm('この句を句帳から削除しますか？')) return;
  const before = structuredClone(data);
  if (commit({ ...data, entries: data.entries.filter((x) => x.id !== e.id) })) say('削除しました。', () => { if (commit(before)) say('元に戻しました。'); });
}

function setMode(mode, reload = false) {
  if (feed.mode === mode && !reload) return;
  feed.mode = mode; feed.posts = []; feed.next = null;
  $('#tab-new').setAttribute('aria-pressed', String(mode === 'new'));
  $('#tab-topic').setAttribute('aria-pressed', String(mode === 'topic'));
  loadFeed();
}
async function loadFeed() {
  if (feed.loading) return;
  feed.loading = true; drawPlaza();
  try {
    const q = new URLSearchParams();
    if (feed.mode === 'topic') q.set('kigo', topic.word);
    if (feed.next) q.set('before', feed.next);
    const qs = q.toString();
    const res = await fetch(`${API}${qs ? `?${qs}` : ''}`, { credentials: 'omit' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) throw new Error('no api');
    const json = await res.json();
    if (!Array.isArray(json.posts)) throw new Error('no api');
    // サーバーから来た値も形を確かめてから使う（表示は文字として出すだけ）
    const ok = (x) => x && /^[a-f0-9]{32}$/.test(x.id) && typeof x.text === 'string' && typeof x.name === 'string' && typeof x.kigo === 'string' && Number.isInteger(x.likes) && Number.isFinite(x.created);
    feed.posts.push(...json.posts.filter(ok).filter((x) => !feed.posts.some((p) => p.id === x.id))); feed.next = json.next || null;
    if (api !== true) { api = true; drawBook(); }
  } catch { if (api === null) api = false; else say('広場を読み込めませんでした。'); }
  feed.loading = false; drawPlaza();
}
function drawPlaza() {
  const st = $('#plaza-status');
  $('#tab-topic').textContent = `お題「${topic.word}」`;
  for (const id of ['#tab-new', '#tab-topic']) $(id).disabled = !api;
  if (api === false) {
    st.textContent = '広場は準備中です。いまは句帳に書きためておけます。準備ができるまで、昔の名句を掛けておきます。';
    $('#plaza').replaceChildren(...SAMPLES.map(([text, name]) => el('div', { class: 'hang sample' }, el('div', { class: 'slip' }, tate(text), el('p', { class: 'by' }, name)))));
    $('#more').hidden = true; return;
  }
  const p = prefs(); const mine = new Set(data.entries.filter((e) => e.posted).map((e) => e.posted.id));
  const posts = feed.posts.filter((x) => !p.reported.includes(x.id));
  st.textContent = feed.loading && !posts.length ? '広場を読み込んでいます…' : !posts.length ? (feed.mode === 'topic' ? `お題「${topic.word}」の句はまだありません。最初の一句をどうぞ。` : 'まだ句がありません。最初の一句をどうぞ。') : '';
  $('#plaza').replaceChildren(...posts.map((x) => {
    const liked = p.liked.includes(x.id);
    return el('article', { class: 'hang' },
      el('div', { class: 'slip' }, tate(x.text), el('p', { class: 'by' }, x.name)),
      x.photo ? el('img', { src: `${API}/${x.id}/photo`, alt: '', class: 'thumb', loading: 'lazy' }) : null,
      el('p', { class: 'meta' }, [x.kigo ? `季語「${x.kigo}」` : '', new Date(x.created).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })].filter(Boolean).join('・')),
      el('p', { class: 'actions' },
        el('button', { type: 'button', class: 'like', 'aria-pressed': String(liked), 'aria-label': `いいね ${x.likes}`, onclick: () => likePost(x) }, liked ? '♥' : '♡', ` ${x.likes}`),
        mine.has(x.id) ? el('span', { class: 'badge' }, 'わたしの句') : el('button', { type: 'button', class: 'link quiet', onclick: () => reportPost(x) }, '報告')));
  }));
  $('#more').hidden = !feed.next;
}
async function likePost(x) {
  const p = prefs();
  if (p.liked.includes(x.id)) return;
  try {
    const r = await call(`/${x.id}/like`, { device: p.device });
    x.likes = r.likes; setPrefs({ device: p.device, liked: [...p.liked, x.id] }); drawPlaza();
  } catch (err) { say(err.status === 429 ? '今日はこれ以上いいねできません。' : err.message); }
}
async function reportPost(x) {
  if (!confirm('この句を「広場のきまり」に反するものとして報告しますか？ 別々の人から3回報告されると見えなくなります。')) return;
  try { await call(`/${x.id}/report`, {}); } catch (err) { say(err.message); return; }
  setPrefs({ reported: [...prefs().reported, x.id] }); drawPlaza(); say('報告しました。この句はあなたの画面に出なくなります。');
}
$('#tab-new').addEventListener('click', () => setMode('new'));
$('#tab-topic').addEventListener('click', () => setMode('topic'));
$('#more').addEventListener('click', loadFeed);

// ---- バックアップ ----
function download(name, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('#export').addEventListener('click', () => {
  if (loadError) { say('保存済みの句帳を読み込めていないため、バックアップを作れません。'); return; }
  download(`kuhiroba-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
  setBackupMeta({ last: today() }); drawBackup(); say('バックアップを保存しました。');
});
$('#import').addEventListener('change', async (ev) => {
  const file = ev.target.files[0]; if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error('ファイルが大きすぎます。');
    const next = validate(JSON.parse(await file.text()));
    if (confirm(`${next.entries.length}句の句帳で、今の句帳を置き換えます。よろしいですか？`) && commit(next, true)) say('バックアップを復元しました。');
  } catch (err) { say(`復元できませんでした: ${err.message}`); } finally { ev.target.value = ''; }
});

// ---- はじめに ----
$('#topic-word').textContent = topic.word;
document.querySelector('.topic-slip').textContent = topic.word;
$('#topic-season').textContent = `（${topic.season}の季語）`;
$('#topic-hint').textContent = topic.hint;
$('#write').addEventListener('click', () => openWrite());
$('#write-topic').addEventListener('click', () => openWrite(null, { kigo: topic.word }));
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => b.closest('dialog').close());
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  try { data = e.newValue ? validate(JSON.parse(e.newValue)) : { version: 1, entries: [] }; loadError = ''; draw(); }
  catch { say('別のタブの句帳を読み込めませんでした。'); }
});
draw();
loadFeed();
