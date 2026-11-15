import { today, addDays, diffDays, weekday, wareki, memorials, upcoming, prepFor, weekendBefore, validate, sharePayload, readShare, toIcs, backupDue } from './logic.js';
import { encodeData, decodeData } from '../../shared/urldata.js';

const $ = (s) => document.querySelector(s);
const KEY = 'happy-ideas-hoyo-v1';
const BACKUP_KEY = `${KEY}-backup`;
let data = { version: 1, people: [], events: {} };
let loadError = '';
let editingPerson = null;
let editingEvent = null; // { key, ev }
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
/** 画面下のお知らせ。undo を渡すと「元に戻す」も出す */
function say(s, undo) {
  const st = $('#status'); clearTimeout(timer);
  st.replaceChildren(s, ...(undo ? [' ', el('button', { type: 'button', class: 'undo', onclick: () => { clearTimeout(timer); st.replaceChildren(); undo(); } }, '元に戻す')] : []));
  timer = setTimeout(() => st.replaceChildren(), undo ? 10000 : 6000);
}

// 保存済みの記録が読めないときは、上書きして消さないように保存を止める（復元だけはできる）
try { const raw = localStorage.getItem(KEY); if (raw) data = validate(JSON.parse(raw)); }
catch { loadError = '保存済みの記録を読み込めませんでした。記録を消さないよう、新しい保存を止めています。端末の日付が正しいか確かめて開き直すか、バックアップから復元してください。'; }
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
    data = checked; loadError = ''; showLoadError(); draw(); return true;
  } catch (e) { say(e.name === 'QuotaExceededError' ? '保存容量がいっぱいです。' : `保存できませんでした: ${e.message}`); return false; }
}
const backupMeta = () => { try { return JSON.parse(localStorage.getItem(BACKUP_KEY)) || {}; } catch { return {}; } };
const setBackupMeta = (m) => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ ...backupMeta(), ...m })); } catch { /* 記録には影響しない */ } };

const person = (id) => data.people.find((p) => p.id === id);
const dateText = (s) => `${s.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`)}（${weekday(s)}）`;
const yen = (n) => `${new Intl.NumberFormat('ja-JP').format(n)}円`;
function untilText(d) {
  const n = diffDays(today(), d);
  return n === 0 ? '今日' : n === 1 ? '明日' : n > 0 ? `あと${n}日` : `${-n}日前`;
}

function draw() {
  showLoadError();
  drawUpcoming(); drawPeople(); drawBackup();
  $('#demo').hidden = data.people.some((p) => p.id.startsWith('demo-'));
  for (const id of ['#ics', '#share-all']) $(id).disabled = !data.people.length;
}

function drawUpcoming() {
  const from = addDays(today(), -1);
  const list = upcoming(data.people, from, 400).filter((ev) => !(data.events[ev.key]?.done) && (data.events[ev.key]?.date || ev.date) >= today()).slice(0, 12);
  if (!list.length) {
    $('#upcoming').replaceChildren(el('div', { class: 'empty' }, el('p', {}, data.people.length ? 'この1年に予定している法要はありません。故人のカードの「法要の一覧」から先の予定も見られます。' : '故人を登録すると、ここにこれからの法要が並びます。')));
    return;
  }
  $('#upcoming').replaceChildren(...list.map((ev) => {
    const p = person(ev.person); const st = data.events[ev.key] || {};
    const date = st.date || ev.date;
    const tasks = prepFor(ev.kind); const doneTasks = tasks.filter(([id]) => st.tasks?.[id]).length;
    const nextTask = tasks.find(([id]) => !st.tasks?.[id]);
    return el('article', { class: `event ${ev.group}` },
      el('div', { class: 'when' }, el('strong', {}, untilText(date)), el('span', {}, dateText(date))),
      el('div', { class: 'what' },
        el('h3', {}, `${p.name}さん ${ev.label}`),
        el('p', { class: 'muted' }, [wareki(date), st.date && st.date !== ev.date ? `（本来の日 ${dateText(ev.date)}）` : '', st.time ? ` ${st.time}` : '', st.place ? ` ・${st.place}` : ''].join('')),
        tasks.length ? el('p', { class: 'prep' }, `準備 ${doneTasks}/${tasks.length}`, nextTask ? ` ・次は「${nextTask[1]}」（${dateText(addDays(date, -nextTask[2]))}まで）` : ' ・すべて済み') : null),
      el('button', { type: 'button', onclick: () => openEvent(ev) }, ev.group === 'shotsuki' ? 'メモ' : '準備を開く'));
  }));
}

function drawPeople() {
  if (!data.people.length) { $('#people').replaceChildren(); return; }
  $('#people').replaceChildren(...data.people.map((p) => {
    const next = memorials(p).find((m) => m.date >= today());
    return el('article', { class: 'card' },
      el('h3', {}, p.name, p.relation ? el('small', {}, `（${p.relation}）`) : null),
      p.kaimyo ? el('p', { class: 'kaimyo' }, p.kaimyo) : null,
      el('p', {}, `命日 ${dateText(p.death)}`, el('br'), el('span', { class: 'muted' }, `${wareki(p.death)}・月命日は毎月${Number(p.death.slice(8))}日`)),
      next ? el('p', { class: 'next' }, `次の法要: ${next.label} ${dateText(next.date)}`) : el('p', { class: 'next' }, '五十回忌まで済んでいます。'),
      p.memo ? el('p', { class: 'note' }, p.memo) : null,
      el('div', { class: 'actions' },
        el('button', { type: 'button', onclick: () => openList(p) }, '法要の一覧'),
        el('button', { type: 'button', onclick: () => shareLink([p]) }, '家族に送る'),
        el('button', { type: 'button', onclick: () => openPerson(p) }, '編集'),
        el('button', { type: 'button', onclick: () => removePerson(p) }, '削除')));
  }));
}

function drawBackup() {
  const meta = backupMeta(); const box = $('#backup-reminder');
  $('#backup-last').textContent = meta.last ? `最後のバックアップ: ${meta.last}` : 'まだバックアップを保存していません。';
  const real = data.people.filter((p) => !p.id.startsWith('demo-')).length;
  if (!backupDue(meta, real)) { box.replaceChildren(); return; }
  box.replaceChildren(el('p', {}, '記録はこの端末の中だけにあります。機種変更やブラウザのデータ削除に備えて、バックアップを保存しておきましょう。'),
    el('button', { type: 'button', class: 'primary', onclick: () => $('#export').click() }, 'バックアップを保存'),
    el('button', { type: 'button', onclick: () => { setBackupMeta({ snooze: addDays(today(), 7) }); drawBackup(); } }, 'あとで'));
}

// ---- 故人の登録・編集 ----
function openPerson(p) {
  editingPerson = p?.id || null;
  const f = $('#person-form'); f.reset(); $('#person-error').textContent = '';
  $('#person-title').textContent = p ? '故人を編集' : '故人を登録';
  for (const k of ['name', 'death', 'relation', 'kaimyo', 'memo']) f.elements.namedItem(k).value = p ? p[k] : '';
  f.elements.kansai.checked = !!p?.kansai;
  f.elements.death.max = today();
  $('#person-dlg').showModal();
}
$('#person-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const p = { id: editingPerson || crypto.randomUUID(), name: String(f.get('name')).trim(), death: String(f.get('death')), relation: String(f.get('relation')).trim(), kaimyo: String(f.get('kaimyo')).trim(), kansai: f.get('kansai') === 'on', memo: String(f.get('memo')) };
  const next = { ...data, people: editingPerson ? data.people.map((x) => (x.id === editingPerson ? p : x)) : [...data.people, p] };
  // 命日を変えたら、動かした予定日はもとの日に合わせて作り直す必要があるので消す（準備のチェックやメモは残す）
  const old = person(editingPerson);
  if (old && old.death !== p.death) next.events = Object.fromEntries(Object.entries(data.events).map(([k, v]) => [k, k.startsWith(`${p.id}:`) ? (({ date, ...rest }) => rest)(v) : v]));
  try { validate(next); } catch { $('#person-error').textContent = '入力を確かめてください。命日は今日より前の日にしてください。登録できるのは50人までです。'; return; }
  if (commit(next)) { $('#person-dlg').close(); say(editingPerson ? '保存しました。' : `${p.name}さんを登録しました。これからの法要を並べました。`); }
});
function removePerson(p) {
  if (!confirm(`${p.name}さんと、その法要の記録を削除しますか？`)) return;
  const before = structuredClone(data);
  const events = Object.fromEntries(Object.entries(data.events).filter(([k]) => !k.startsWith(`${p.id}:`)));
  if (commit({ ...data, people: data.people.filter((x) => x.id !== p.id), events })) say(`${p.name}さんを削除しました。`, () => { if (commit(before)) say('元に戻しました。'); });
}

// ---- 法要ごとの準備 ----
function openEvent(ev) {
  const st = data.events[ev.key] || {}; const p = person(ev.person);
  editingEvent = { key: ev.key, ev };
  const f = $('#event-form'); f.reset(); $('#event-error').textContent = '';
  $('#event-title').textContent = `${p.name}さん ${ev.label}`;
  $('#event-sub').textContent = `本来の日: ${dateText(ev.date)}（${wareki(ev.date)}）`;
  f.elements.date.value = st.date || ev.date;
  f.elements.time.value = st.time || '';
  f.elements.place.value = st.place || '';
  f.elements.ofuse.value = st.ofuse ?? '';
  f.elements.memo.value = st.memo || '';
  f.elements.done.checked = !!st.done;
  drawTasks(ev, st);
  $('#event-dlg').showModal();
}
function drawTasks(ev, st) {
  const tasks = prepFor(ev.kind); const box = $('#tasks');
  box.hidden = !tasks.length;
  const date = $('#event-form').elements.date.value || ev.date;
  box.replaceChildren(el('legend', {}, '準備の目安（一般的な例）'), ...tasks.map(([id, label, before]) => {
    const due = addDays(date, -before);
    return el('label', { class: 'check task' }, el('input', { type: 'checkbox', name: `task-${id}`, checked: !!st.tasks?.[id] }), el('span', {}, label, el('small', {}, ` ${dateText(due)}まで${due < today() && !st.tasks?.[id] ? '（過ぎています）' : ''}`)));
  }));
}
$('#event-form').elements.date.addEventListener('change', () => { if (editingEvent) drawTasks(editingEvent.ev, collectEvent()); });
$('#to-weekend').addEventListener('click', () => { const { ev } = editingEvent; const f = $('#event-form'); f.elements.date.value = weekendBefore(ev.date); drawTasks(ev, collectEvent()); say(`${dateText(f.elements.date.value)}にしました。保存すると反映されます。`); });
$('#to-original').addEventListener('click', () => { const { ev } = editingEvent; const f = $('#event-form'); f.elements.date.value = ev.date; drawTasks(ev, collectEvent()); });
function collectEvent() {
  const f = $('#event-form'); const { ev } = editingEvent;
  const out = {};
  if (f.elements.date.value && f.elements.date.value !== ev.date) out.date = f.elements.date.value;
  if (f.elements.time.value) out.time = f.elements.time.value;
  if (f.elements.place.value.trim()) out.place = f.elements.place.value.trim();
  if (f.elements.ofuse.value !== '') out.ofuse = Number(f.elements.ofuse.value);
  if (f.elements.memo.value) out.memo = f.elements.memo.value;
  if (f.elements.done.checked) out.done = true;
  const tasks = Object.fromEntries(prepFor(ev.kind).filter(([id]) => f.elements.namedItem(`task-${id}`)?.checked).map(([id]) => [id, true]));
  if (Object.keys(tasks).length) out.tasks = tasks;
  return out;
}
$('#event-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const st = collectEvent();
  const events = { ...data.events };
  if (Object.keys(st).length) events[editingEvent.key] = st; else delete events[editingEvent.key];
  try { validate({ ...data, events }); } catch { $('#event-error').textContent = '入力を確かめてください（お布施は0〜1,000万円の整数）。'; return; }
  if (commit({ ...data, events })) { $('#event-dlg').close(); say(st.done ? 'おつかれさまでした。済んだ法要として記録しました。' : '保存しました。'); }
});

function openList(p) {
  $('#list-title').textContent = `${p.name}さんの法要`;
  const t = today();
  $('#all-list').replaceChildren(...memorials(p).map((m) => {
    const key = `${p.id}:${m.kind}`; const st = data.events[key] || {}; const date = st.date || m.date;
    return el('li', { class: date < t ? 'past' : '' }, el('span', { class: 'label' }, m.label), el('span', {}, dateText(date), st.done ? ' ✓済み' : date < t ? '' : `（${untilText(date)}）`),
      date >= addDays(t, -60) ? el('button', { type: 'button', onclick: () => { $('#list-dlg').close(); openEvent({ ...m, person: p.id, key }); } }, '開く') : el('span', {}));
  }));
  $('#list-dlg').showModal();
}

// ---- 家族と共有 ----
async function shareLink(people) {
  const url = `${location.origin}${location.pathname}#share=${encodeData(sharePayload(people))}`;
  const text = `${people.map((p) => `${p.name}さん`).join('・')}の法要の予定です。開くと四十九日や年忌の日がわかります（法要ごよみ）。`;
  if (!confirm('リンクには、お名前・命日・続柄・戒名が入ります（予定のメモやお布施は入りません）。送ってよいですか？')) return;
  try {
    if (navigator.share) { await navigator.share({ title: '法要ごよみ', text, url }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); say('リンクをコピーしました。LINE やメールに貼り付けて送ってください。'); }
  catch { prompt('このリンクをコピーして送ってください。', url); }
}
$('#share-all').addEventListener('click', () => shareLink(data.people.filter((p) => !p.id.startsWith('demo-')).length ? data.people.filter((p) => !p.id.startsWith('demo-')) : data.people));

function readIncoming() {
  const m = location.hash.match(/^#share=([A-Za-z0-9_-]+)$/);
  if (!m) return;
  const list = readShare(decodeData(m[1]));
  history.replaceState(null, '', location.pathname + location.search);
  if (!list) { say('共有のリンクを読み込めませんでした。リンクが途中で切れていないか確かめてください。'); return; }
  const fresh = list.filter((x) => !data.people.some((p) => p.name === x.name && p.death === x.death));
  const box = $('#incoming');
  if (!fresh.length) { say('共有された方は、もう登録されています。'); return; }
  box.replaceChildren(el('p', {}, `家族から、${fresh.map((x) => `${x.name}さん（命日 ${dateText(x.death)}）`).join('・')}の予定が届きました。この端末に登録しますか？`),
    el('button', { type: 'button', class: 'primary', onclick: () => { if (commit({ ...data, people: [...data.people, ...fresh.map((x) => ({ ...x, id: crypto.randomUUID() }))] })) { box.replaceChildren(); say('登録しました。'); } } }, '登録する'),
    el('button', { type: 'button', onclick: () => box.replaceChildren() }, '登録しない'));
}

// ---- カレンダー・バックアップ ----
function download(name, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('#ics').addEventListener('click', async () => {
  if (!data.people.length) return;
  const body = toIcs(data.people, data.events, today(), 10);
  const name = `hoyo-${today()}.ics`;
  const file = new File([body], name, { type: 'text/calendar' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: '法要ごよみ' }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  download(name, body, 'text/calendar;charset=utf-8');
  say('カレンダー用ファイルを保存しました。開くとカレンダーに追加できます。');
});
$('#export').addEventListener('click', () => {
  if (loadError) { say('保存済みの記録を読み込めていないため、バックアップを作れません。'); return; }
  download(`hoyo-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
  setBackupMeta({ last: today() }); drawBackup(); say('バックアップの保存を開始しました。');
});
$('#import').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('ファイルが大きすぎます。');
    const next = validate(JSON.parse(await file.text()));
    if (confirm(`${next.people.length}人分の記録で、今の記録を置き換えます。よろしいですか？`) && commit(next, true)) say('バックアップを復元しました。');
  } catch (err) { say(`復元できませんでした: ${err.message}`); } finally { e.target.value = ''; }
});

$('#add').addEventListener('click', () => openPerson());
$('#demo').addEventListener('click', () => {
  if (data.people.some((p) => p.id.startsWith('demo-'))) return;
  const ago = (days) => addDays(today(), -days);
  const samples = [
    { id: 'demo-1', name: '祖母（サンプル）', relation: '祖母', kaimyo: '', death: ago(320), kansai: false, memo: 'サンプルです。編集・削除できます。' },
    { id: 'demo-2', name: '祖父（サンプル）', relation: '祖父', kaimyo: '', death: ago(365 * 6 - 40), kansai: false, memo: '' },
  ];
  if (commit({ ...data, people: [...data.people, ...samples] })) say('サンプルを追加しました。カードの「削除」で消せます。');
});
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => b.closest('dialog').close());
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  try { data = e.newValue ? validate(JSON.parse(e.newValue)) : { version: 1, people: [], events: {} }; loadError = ''; draw(); for (const d of document.querySelectorAll('dialog[open]')) d.close(); }
  catch { say('別のタブのデータを読み込めませんでした。'); }
});
window.addEventListener('hashchange', readIncoming);
draw();
readIncoming();
