import { today, nowLocal, addDays, weekday, md, BRISTOL, AMOUNT, STICKERS, KID_EMOJI, validate, lastPoo, daysSince, byDay, summary, reportText, monthCells, stickersIn, recentMeds, backupDue } from './logic.js';

const $ = (s) => document.querySelector(s);
const KEY = 'happy-ideas-ponpon-v1';
const BACKUP_KEY = `${KEY}-backup`;
const UI_KEY = `${KEY}-ui`;
const EMPTY = { version: 1, kids: [], logs: [] };
let data = structuredClone(EMPTY);
let loadError = '';
let ui = { kid: '', month: today().slice(0, 7), day: today() };
let editingKid = null;
let editingLog = null; // { type, id }
let reportDays = 0;
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
try { const u = JSON.parse(localStorage.getItem(UI_KEY)); if (typeof u?.kid === 'string') ui.kid = u.kid; } catch { /* 選んでいた子は覚えていなくてよい */ }
const saveUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({ kid: ui.kid })); } catch { /* 記録には影響しない */ } };

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
  } catch (e) { say(e.name === 'QuotaExceededError' ? '保存容量がいっぱいです。' : `保存できませんでした: ${e.message}`); return false; }
}
const backupMeta = () => { try { return JSON.parse(localStorage.getItem(BACKUP_KEY)) || {}; } catch { return {}; } };
const setBackupMeta = (m) => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ ...backupMeta(), ...m })); } catch { /* 記録には影響しない */ } };

const kid = () => data.kids.find((k) => k.id === ui.kid) || data.kids[0];
const newId = () => crypto.randomUUID();
const randomSticker = () => crypto.getRandomValues(new Uint8Array(1))[0] % STICKERS.length;
const dayText = (d) => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日（${weekday(d)}）`;

function draw() {
  showLoadError();
  $('#app').hidden = !data.kids.length;
  document.body.classList.toggle('has-kids', data.kids.length > 0);
  $('#demo').hidden = data.kids.some((k) => k.id.startsWith('demo-'));
  drawBackup();
  const k = kid();
  if (!k) return;
  ui.kid = k.id;
  drawKids(k); drawToday(k); drawCalendar(k); drawStickers(k);
  if (reportDays) drawReport(k, reportDays);
}

function drawKids(k) {
  $('#kids').replaceChildren(...data.kids.map((x) => el('button', { type: 'button', class: 'kid', 'aria-pressed': String(x.id === k.id), onclick: () => { ui.kid = x.id; saveUi(); reportDays = 0; $('#report').hidden = true; draw(); } }, el('span', { 'aria-hidden': 'true' }, x.emoji), x.name)),
    el('button', { type: 'button', class: 'kid ghost', onclick: () => openKid(k) }, `${k.name}を編集`),
    data.kids.length < 10 ? el('button', { type: 'button', class: 'kid ghost', onclick: () => openKid() }, '＋ 子ども') : null);
}

function describe(l) {
  if (l.type === 'poo') {
    const b = BRISTOL[l.bristol - 1];
    return [`うんち ${b.label}`, l.amount ? `（${AMOUNT[l.amount]}）` : '', l.pain ? '・痛がった' : '', l.blood ? '・血がついていた' : ''].join('');
  }
  if (l.type === 'med') return `おくすり ${l.med}${l.dose ? ` ${l.dose}` : ''}`;
  return 'トイレにすわった';
}
const ICON = { poo: '💩', med: '💊', sit: '🚽' };
function logItems(list, emptyText) {
  if (!list.length) return [el('li', { class: 'none' }, emptyText)];
  return list.map((l) => el('li', { class: `log ${l.type}${l.type === 'poo' ? ` ${BRISTOL[l.bristol - 1].group}` : ''}` },
    el('span', { class: 'icon', 'aria-hidden': 'true' }, ICON[l.type]),
    el('span', { class: 'time' }, l.at.slice(11)),
    el('span', { class: 'desc' }, describe(l), l.sticker !== undefined ? el('span', { class: 'mini-sticker', 'aria-label': 'シール' }, ` ${STICKERS[l.sticker]}`) : null, l.memo ? el('small', {}, l.memo) : null),
    el('span', { class: 'log-actions' },
      el('button', { type: 'button', onclick: () => openLog(l.type, l) }, 'なおす'),
      el('button', { type: 'button', onclick: () => removeLog(l) }, 'けす'))));
}

function drawToday(k) {
  $('#today-title').textContent = `${k.emoji} ${k.name}のきょう`;
  const n = daysSince(data.logs, k.id);
  const since = $('#since');
  since.className = `since${n !== null && n >= 3 ? ' warn' : ''}`;
  if (n === null) since.textContent = 'まだうんちの記録がありません。出たら「うんち出た」を押してね。';
  else if (n === 0) since.textContent = 'きょうは出たよ！';
  else if (n === 1) since.textContent = '最後のうんちは きのうです。';
  else {
    const last = lastPoo(data.logs, k.id, `${today()}T23:59`);
    since.replaceChildren(el('strong', {}, `${n}日`), ` 出ていません（最後は ${dayText(last.at.slice(0, 10))}）`,
      n >= 3 ? el('small', {}, 'おなかの様子を見てあげてください。気になるときは小児科に相談を。') : null);
  }
  const t = today();
  $('#today-list').replaceChildren(...logItems(data.logs.filter((l) => l.kid === k.id && l.at.startsWith(t)), 'まだ記録はありません。'));
}

function drawCalendar(k) {
  const [y, m] = ui.month.split('-').map(Number);
  $('#month-title').textContent = `${y}年${m}月`;
  $('#next-month').disabled = ui.month >= today().slice(0, 7);
  const cells = monthCells(y, m);
  const days = byDay(data.logs, k.id, cells.find(Boolean), cells.findLast(Boolean));
  const t = today();
  $('#calendar').replaceChildren(...cells.map((d) => {
    if (!d) return el('span', { class: 'cell blank', 'aria-hidden': 'true' });
    const v = days.get(d);
    const label = [dayText(d), v.poo.length ? `うんち${v.poo.length}回` : d <= t ? 'うんちなし' : '', v.med.length ? 'おくすりあり' : ''].filter(Boolean).join(' ');
    return el('button', { type: 'button', class: `cell${d === t ? ' is-today' : ''}${d > t ? ' future' : ''}`, 'aria-pressed': String(d === ui.day), 'aria-label': label, disabled: d > t, onclick: () => { ui.day = d; drawCalendar(k); } },
      el('span', { class: 'num' }, Number(d.slice(8))),
      el('span', { class: 'marks' }, ...v.poo.slice(0, 3).map((p) => el('span', { class: `dot ${BRISTOL[p.bristol - 1].group}` })), v.poo.length > 3 ? el('span', { class: 'more' }, '+') : null, v.med.length ? el('span', { class: 'pill' }, '💊') : null));
  }));
  $('#day-title').textContent = `${dayText(ui.day)}の記録`;
  $('#day-list').replaceChildren(...logItems(data.logs.filter((l) => l.kid === k.id && l.at.startsWith(ui.day)), 'この日の記録はありません。'));
}
function moveMonth(n) {
  const [y, m] = ui.month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  ui.month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  ui.day = ui.month === today().slice(0, 7) ? today() : `${ui.month}-01`;
  draw();
}
$('#prev-month').addEventListener('click', () => moveMonth(-1));
$('#next-month').addEventListener('click', () => moveMonth(1));

function drawStickers(k) {
  const list = stickersIn(data.logs, k.id, ui.month);
  const [, m] = ui.month.split('-').map(Number);
  $('#sticker-count').textContent = list.length ? `${m}月は ${list.length}まい あつめたよ！` : `${m}月のシールは まだないよ。うんちが出たり、トイレにすわったりするともらえるよ。`;
  $('#stickers').replaceChildren(...list.map((l) => el('span', { class: 'sticker', title: md(l.at.slice(0, 10)) }, STICKERS[l.sticker])));
}

function drawBackup() {
  const meta = backupMeta(); const box = $('#backup-reminder');
  $('#backup-last').textContent = meta.last ? `最後のバックアップ: ${meta.last}` : 'まだバックアップを保存していません。';
  const real = data.logs.filter((l) => !l.kid.startsWith('demo-')).length;
  if (!backupDue(meta, real)) { box.replaceChildren(); return; }
  box.replaceChildren(el('p', {}, '記録はこの端末の中だけにあります。機種変更やブラウザのデータ削除に備えて、バックアップを保存しておきましょう。'),
    el('button', { type: 'button', class: 'primary', onclick: () => $('#export').click() }, 'バックアップを保存'),
    el('button', { type: 'button', onclick: () => { setBackupMeta({ snooze: addDays(today(), 7) }); drawBackup(); } }, 'あとで'));
}

// ---- 子どもの登録・編集 ----
function openKid(k) {
  editingKid = k?.id || null;
  const f = $('#kid-form'); f.reset(); $('#kid-error').textContent = '';
  $('#kid-title').textContent = k ? `${k.name}を編集` : '子どもを登録';
  f.elements.name.value = k?.name || '';
  const used = new Set(data.kids.map((x) => x.emoji));
  const pick = k?.emoji || KID_EMOJI.find((e) => !used.has(e)) || KID_EMOJI[0];
  $('#emoji-choices').replaceChildren(...KID_EMOJI.map((e, i) => el('label', { class: 'emoji' }, el('input', { type: 'radio', name: 'emoji', value: e, checked: e === pick, 'aria-label': `マーク${i + 1}` }), el('span', { 'aria-hidden': 'true' }, e))));
  $('#kid-delete').hidden = !k;
  $('#kid-dlg').showModal();
}
$('#kid-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const k = { id: editingKid || newId(), name: String(f.get('name')).trim(), emoji: String(f.get('emoji')) };
  const next = { ...data, kids: editingKid ? data.kids.map((x) => (x.id === editingKid ? k : x)) : [...data.kids, k] };
  try { validate(next); } catch { $('#kid-error').textContent = '呼び名を20文字までで入れてください。登録できるのは10人までです。'; return; }
  if (commit(next)) { ui.kid = k.id; saveUi(); draw(); $('#kid-dlg').close(); say(editingKid ? '保存しました。' : `${k.name}を登録しました。うんちが出たら「うんち出た」を押してね。`); }
});
$('#kid-delete').addEventListener('click', () => {
  const k = data.kids.find((x) => x.id === editingKid);
  if (!k || !confirm(`${k.name}と、その記録をすべて削除しますか？`)) return;
  const before = structuredClone(data);
  if (commit({ ...data, kids: data.kids.filter((x) => x.id !== k.id), logs: data.logs.filter((l) => l.kid !== k.id) })) {
    $('#kid-dlg').close(); say(`${k.name}を削除しました。`, () => { if (commit(before)) say('元に戻しました。'); });
  }
});

// ---- 記録の入力 ----
$('#bristol').replaceChildren(...BRISTOL.map((b) => el('label', { class: `bristol-opt ${b.group}` },
  el('input', { type: 'radio', name: 'bristol', value: b.n, required: true }),
  el('span', { class: `blob b${b.n}`, 'aria-hidden': 'true' }),
  el('span', {}, el('strong', {}, b.label), el('small', {}, b.desc)))));

const TITLES = { poo: 'うんち', med: 'おくすり', sit: 'トイレにすわった' };
function setSection(id, on) {
  const box = $(id); box.hidden = !on;
  for (const input of box.querySelectorAll('input')) input.disabled = !on;
}
function openLog(type, l) {
  const k = kid(); if (!k) return;
  editingLog = { type, id: l?.id || null };
  const f = $('#log-form'); f.reset(); $('#log-error').textContent = '';
  $('#log-title').textContent = `${k.emoji} ${k.name}の${TITLES[type]}${l ? '（なおす）' : ''}`;
  setSection('#poo-fields', type === 'poo'); setSection('#med-fields', type === 'med');
  f.elements.med.required = type === 'med';
  f.elements.at.value = l?.at || nowLocal();
  f.elements.at.max = `${today()}T23:59`;
  f.elements.memo.value = l?.memo || '';
  if (type === 'poo' && l) {
    f.querySelector(`input[name="bristol"][value="${l.bristol}"]`).checked = true;
    if (l.amount) f.querySelector(`input[name="amount"][value="${l.amount}"]`).checked = true;
    f.elements.pain.checked = !!l.pain; f.elements.blood.checked = !!l.blood;
  }
  if (type === 'med') {
    const meds = recentMeds(data.logs, k.id);
    $('#med-names').replaceChildren(...meds.map((x) => el('option', { value: x.med })));
    f.elements.med.value = l?.med || meds[0]?.med || '';
    f.elements.dose.value = l ? l.dose || '' : meds[0]?.dose || '';
  }
  $('#log-dlg').showModal();
}
$('#log-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target); const k = kid();
  const { type, id } = editingLog;
  const old = data.logs.find((l) => l.id === id);
  const l = { id: id || newId(), kid: k.id, type, at: String(f.get('at')) };
  if (type === 'poo') {
    l.bristol = Number(f.get('bristol'));
    if (f.get('amount')) l.amount = Number(f.get('amount'));
    if (f.get('pain')) l.pain = true;
    if (f.get('blood')) l.blood = true;
  }
  if (type === 'med') { l.med = String(f.get('med')).trim(); l.dose = String(f.get('dose')).trim(); }
  if (type !== 'med') l.sticker = old?.sticker ?? randomSticker();
  const memo = String(f.get('memo')); if (memo) l.memo = memo;
  const next = { ...data, logs: id ? data.logs.map((x) => (x.id === id ? l : x)) : [...data.logs, l] };
  try { validate(next); } catch { $('#log-error').textContent = '入力を確かめてください。日時は今日までにしてください。'; return; }
  if (!commit(next)) return;
  $('#log-dlg').close();
  ui.day = l.at.slice(0, 10); ui.month = ui.day.slice(0, 7); draw();
  if (!id && type !== 'med') reward(l); else say(id ? 'なおしました。' : 'おくすりを記録しました。');
});
function reward(l) {
  $('#sticker-big').textContent = STICKERS[l.sticker];
  $('#sticker-title').textContent = l.type === 'poo' ? 'うんち出たね！やったね！' : 'トイレにすわれたね！えらい！';
  const n = stickersIn(data.logs, l.kid, l.at.slice(0, 7)).length;
  $('#sticker-text').textContent = `シールを1まいもらったよ。${Number(l.at.slice(5, 7))}月は ${n}まい目！`;
  $('#sticker-dlg').showModal();
}
function removeLog(l) {
  const before = structuredClone(data);
  if (commit({ ...data, logs: data.logs.filter((x) => x.id !== l.id) })) say('記録を消しました。', () => { if (commit(before)) say('元に戻しました。'); });
}
$('#log-poo').addEventListener('click', () => openLog('poo'));
$('#log-med').addEventListener('click', () => openLog('med'));
$('#log-sit').addEventListener('click', () => {
  const k = kid(); if (!k) return;
  const l = { id: newId(), kid: k.id, type: 'sit', at: nowLocal(), sticker: randomSticker() };
  if (commit({ ...data, logs: [...data.logs, l] })) { ui.day = today(); ui.month = ui.day.slice(0, 7); draw(); reward(l); }
});

// ---- 受診用まとめ ----
function drawReport(k, n) {
  const to = today(); const from = addDays(to, -(n - 1));
  const s = summary(data.logs, k.id, from, to);
  $('#report-title').textContent = `${k.name}のうんちの記録 ${md(from)}〜${md(to)}（${n}日間）`;
  const hardText = s.pooCount ? `${s.hard}回（${Math.round((s.hard / s.pooCount) * 100)}%）` : '—';
  const stats = [['うんちの回数', `${s.pooCount}回（1週間あたり ${s.perWeek}回）`], ['出た日', `${s.pooDays}日／${s.n}日`], ['出なかった日が続いた最長', `${s.longestGap}日`],
    ['かたいうんち（コロコロ・ゴツゴツ）', hardText], ['痛がった・出にくかった', `${s.pain}回`], ['血がついていた', `${s.blood}回`],
    ['おくすり', s.meds.length ? s.meds.map((m) => `${m.name} ${m.days}日`).join('・') : '記録なし']];
  if (s.sits) stats.splice(5, 0, ['トイレにすわった（出なかった）', `${s.sits}回`]);
  $('#report-stats').replaceChildren(...stats.flatMap(([a, b]) => [el('dt', {}, a), el('dd', {}, b)]));
  $('#report-rows').replaceChildren(...[...s.days].reverse().map(([d, v]) => el('tr', {},
    el('th', { scope: 'row' }, `${md(d)}（${weekday(d)}）`),
    el('td', {}, v.poo.length ? v.poo.map((p) => `${p.at.slice(11)} ${BRISTOL[p.bristol - 1].label}(${p.bristol})${p.pain ? ' 痛' : ''}${p.blood ? ' 血' : ''}`).join(' / ') : 'なし'),
    el('td', {}, [...new Set(v.med.map((m) => `${m.med}${m.dose ? ` ${m.dose}` : ''}`))].join('・')),
    el('td', {}, [...v.poo, ...v.med, ...v.sit].map((x) => x.memo).filter(Boolean).join(' / ')))));
  $('#report').hidden = false;
  return s;
}
for (const n of [14, 28]) $(`#report-${n}`).addEventListener('click', () => { const k = kid(); if (!k) return; reportDays = n; drawReport(k, n); $('#report').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('#report-close').addEventListener('click', () => { reportDays = 0; $('#report').hidden = true; });
$('#print').addEventListener('click', () => window.print());
$('#copy-report').addEventListener('click', async () => {
  const k = kid(); if (!k || !reportDays) return;
  const to = today(); const text = reportText(k.name, summary(data.logs, k.id, addDays(to, -(reportDays - 1)), to));
  try { await navigator.clipboard.writeText(text); say('まとめの文章をコピーしました。'); return; } catch { /* 下で共有を試す */ }
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  say('コピーできませんでした。印刷するか、画面を見せてください。');
});

// ---- バックアップ ----
function download(name, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('#export').addEventListener('click', () => {
  if (loadError) { say('保存済みの記録を読み込めていないため、バックアップを作れません。'); return; }
  download(`ponpon-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
  setBackupMeta({ last: today() }); drawBackup(); say('バックアップの保存を開始しました。');
});
$('#import').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('ファイルが大きすぎます。');
    const next = validate(JSON.parse(await file.text()));
    if (confirm(`${next.kids.length}人分・${next.logs.length}件の記録で、今の記録を置き換えます。よろしいですか？`) && commit(next, true)) say('バックアップを復元しました。');
  } catch (err) { say(`復元できませんでした: ${err.message}`); } finally { e.target.value = ''; }
});

// ---- サンプル ----
$('#add-kid').addEventListener('click', () => openKid());
$('#demo').addEventListener('click', () => {
  if (data.kids.some((k) => k.id.startsWith('demo-')) || data.kids.length >= 10) return;
  const id = 'demo-1';
  const t = today(); const logs = [];
  // 3週間前から昨日まで。最初はかたく間があき、おくすりを始めてから整っていく例
  const poo = [[-21, 1, true], [-18, 2, true], [-15, 1, true], [-13, 2, false], [-11, 3, false], [-10, 3, false], [-8, 4, false], [-7, 4, false], [-5, 3, false], [-4, 4, false], [-3, 5, false], [-2, 4, false], [-1, 4, false]];
  poo.forEach(([d, b, pain], i) => logs.push({ id: `demo-p${i}`, kid: id, type: 'poo', at: `${addDays(t, d)}T19:${String(10 + i).padStart(2, '0')}`, bristol: b, amount: 2, ...(pain ? { pain: true } : {}), sticker: i % STICKERS.length }));
  for (let d = -16; d <= -1; d++) logs.push({ id: `demo-m${-d}`, kid: id, type: 'med', at: `${addDays(t, d)}T08:00`, med: '酸化マグネシウム', dose: '1包' });
  for (const d of [-17, -16, -12, -9]) logs.push({ id: `demo-s${-d}`, kid: id, type: 'sit', at: `${addDays(t, d)}T07:40`, sticker: (-d) % STICKERS.length });
  logs[0].memo = 'サンプルです。小児科で相談し、おくすりを始めた';
  if (commit({ ...data, kids: [...data.kids, { id, name: 'はるくん（サンプル）', emoji: '🐻' }], logs: [...data.logs, ...logs] })) { ui.kid = id; saveUi(); draw(); say('サンプルを追加しました。「はるくん（サンプル）を編集」から削除できます。'); }
});

for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => b.closest('dialog').close());
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  try { data = e.newValue ? validate(JSON.parse(e.newValue)) : structuredClone(EMPTY); loadError = ''; draw(); for (const d of document.querySelectorAll('dialog[open]')) d.close(); }
  catch { say('別のタブのデータを読み込めませんでした。'); }
});
draw();
