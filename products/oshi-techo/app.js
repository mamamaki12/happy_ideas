import { h, add, render, $, store, uid, yen, todayStr, fmtDate, daysUntil, toast, share, download, startCamera, stopStream, notify, notifyButton, confirmDelete } from '../../shared/lib.js';
import { drawWrapped, canvasToBlob } from '../../shared/canvas-text.js';
import { inkFor, darkenFor } from '../../shared/color.js';
import { installHint } from '../../shared/install-hint.js';
import { SPEND_KINDS, nextEvent, spendTotal, yearSummary, validateBackup, daysBetween, TICKET_STATUS, ticketAlerts, ticketStats } from './logic.js';

// 推し活手帳: 推しごとの支出・参戦予定・写真をひとつに。データは端末の中だけ。
const db = store('oshi-techo');
const S = {
  oshis: db.get('oshis', []),
  entries: db.get('entries', []),
  budget: db.get('budget', 30000),
  cur: db.get('cur', null),
  tickets: db.get('tickets', []),
};
const save = () => { db.set('oshis', S.oshis); db.set('entries', S.entries); db.set('budget', S.budget); db.set('cur', S.cur); db.set('tickets', S.tickets); };
const app = $('#app');
const view = h('div', { class: 'view' });
const nav = h('nav', { class: 'tabbar', 'aria-label': 'メニュー' });
const TABS = [['home', '🏠', 'ホーム'], ['tickets', '🎫', '当落'], ['log', '📒', '記録'], ['camera', '📸', 'カメラ'], ['wrapped', '🎉', 'まとめ']];
const curOshi = () => S.oshis.find((o) => o.id === S.cur) || S.oshis[0];
const oshiById = (id) => S.oshis.find((o) => o.id === id) || S.oshis[0];

function theme() {
  const o = curOshi();
  const c = o?.color || '#ff5fa2';
  const root = document.documentElement.style;
  root.setProperty('--oshi', c);
  root.setProperty('--oshi-ink', inkFor(c)); // 推し色のボタン上の文字
  root.setProperty('--oshi-strong', darkenFor(c)); // 白背景の上で読める濃さの推し色（見出しや主役カード）
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', o?.color || '#ff5fa2');
}
function route() { return (location.hash.slice(1) || 'home').split('?')[0]; }
function go(r) { location.hash = r; }
addEventListener('hashchange', draw);

// ── はじめての設定 ──
function onboarding() {
  const name = h('input', { id: 'ob-name', required: true, maxlength: 30, placeholder: '例: 〇〇ちゃん' });
  const color = h('input', { id: 'ob-color', type: 'color', value: '#ff5fa2' });
  const emoji = h('input', { id: 'ob-emoji', value: '💖', maxlength: 4 });
  const since = h('input', { id: 'ob-since', type: 'date' });
  render(view, h('section', { class: 'ob' },
    h('p', { class: 'ob-icon', 'aria-hidden': 'true' }, '📔'), h('h2', {}, '推し活手帳へようこそ'),
    h('p', { class: 'muted' }, '推しごとの支出、ライブの予定、思い出の写真をひとつに。データはこのスマホの中だけに保存されます。'),
    h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); const o = { id: uid(), name: name.value.trim(), color: color.value, emoji: emoji.value || '⭐', since: since.value }; S.oshis.push(o); S.cur = o.id; save(); theme(); go('home'); draw(); } },
      h('div', { class: 'field' }, h('label', { for: 'ob-name' }, '推しの名前'), name),
      h('div', { class: 'row' }, h('div', { class: 'shrink' }, h('label', { for: 'ob-color' }, '推し色'), color), h('div', { class: 'shrink', style: { width: '80px' } }, h('label', { for: 'ob-emoji' }, '絵文字'), emoji), h('div', {}, h('label', { for: 'ob-since' }, '推しはじめた日（任意）'), since)),
      h('button', { class: 'oshi-btn big', type: 'submit', style: { marginTop: '14px' } }, 'はじめる'))));
}

// ── 記録シート ──
function sheet(type = 'spend', preset = {}) {
  const o = curOshi();
  const oshiSel = h('select', { id: 'sh-oshi' }, S.oshis.map((x) => h('option', { value: x.id, selected: x.id === (preset.oshi || o.id) }, `${x.emoji} ${x.name}`)));
  const kind = h('select', { id: 'sh-kind' }, SPEND_KINDS.map((k) => h('option', { selected: k === preset.kind }, k)));
  const amount = h('input', { id: 'sh-amount', type: 'number', inputmode: 'numeric', min: 0, placeholder: '円', value: preset.amount ?? '' });
  const title = h('input', { id: 'sh-title', maxlength: 60, placeholder: type === 'event' ? '例: 全国ツアー 東京公演' : '例: アクスタ', value: preset.title || '' });
  const venue = h('input', { id: 'sh-venue', maxlength: 40, placeholder: '例: 東京ドーム', value: preset.venue || '' });
  const date = h('input', { id: 'sh-date', type: 'date', value: preset.date || todayStr(), required: true });
  const dlg = h('div', { class: 'sheet-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': type === 'event' ? '予定を追加' : '支出を記録' });
  const close = () => { dlg.remove(); };
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  add(dlg, h('form', { class: 'sheet', onsubmit: (e) => {
    e.preventDefault();
    if (type === 'spend' && !(+amount.value > 0)) return toast('金額を入れてください');
    if (type === 'event' && !title.value.trim()) return toast('予定の名前を入れてください');
    S.entries.push({ id: uid(), oshi: oshiSel.value, type, kind: type === 'spend' ? kind.value : '', amount: type === 'spend' ? +amount.value : 0, title: title.value.trim(), venue: type === 'event' ? venue.value.trim() : '', date: date.value, memo: '' });
    save(); close(); toast(type === 'event' ? '予定を追加しました' : `${yen(+amount.value)} を記録しました`); draw();
  } },
  h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }), h('h2', {}, type === 'event' ? '📅 予定を追加' : '💸 支出を記録'),
  S.oshis.length > 1 ? h('div', { class: 'field' }, h('label', { for: 'sh-oshi' }, '推し'), oshiSel) : null,
  type === 'spend' ? h('div', { class: 'row' }, h('div', {}, h('label', { for: 'sh-amount' }, '金額'), amount), h('div', {}, h('label', { for: 'sh-kind' }, '種類'), kind)) : null,
  h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'sh-title' }, type === 'event' ? '予定' : 'メモ'), title),
  type === 'event' ? h('div', { class: 'field' }, h('label', { for: 'sh-venue' }, '会場'), venue) : null,
  h('div', { class: 'field' }, h('label', { for: 'sh-date' }, '日付'), date),
  type === 'spend' ? h('div', { class: 'quick-amt' }, [500, 1000, 3000, 5000, 10000].map((v) => h('button', { type: 'button', class: 'small', onclick: () => { amount.value = String((+amount.value || 0) + v); } }, `+${v.toLocaleString()}`))) : null,
  h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('button', { type: 'button', onclick: close }, 'やめる'), h('button', { class: 'oshi-btn', type: 'submit' }, '保存'))));
  document.body.append(dlg);
  (type === 'spend' ? amount : title).focus();
}

// ── ホーム ──
function home() {
  const o = curOshi(); const t = todayStr();
  const ev = nextEvent(S.entries.filter((e) => e.oshi === o.id), t) || nextEvent(S.entries, t);
  const month = spendTotal(S.entries, t.slice(0, 7));
  const year = spendTotal(S.entries, t.slice(0, 4), o.id);
  const pct = Math.min(100, (month / Math.max(1, S.budget)) * 100);
  const sinceDays = o.since ? daysBetween(o.since, t) : null;
  const recent = [...S.entries].filter((e) => e.date <= t).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const alerts = ticketAlerts(S.tickets, t);
  render(view,
    alerts.length ? h('section', { class: 'alerts', 'aria-label': 'やること' }, alerts.map((a) => h('a', { class: `alert ${a.kind}`, href: '#tickets' }, h('b', {}, a.kind === 'result' ? '📣' : '⚠'), h('span', {}, `${a.t.title}: ${a.text}`)))) : null,
    S.oshis.length > 1 ? h('div', { class: 'oshi-switch', role: 'tablist', 'aria-label': '推しを切り替え' }, S.oshis.map((x) => h('button', { role: 'tab', 'aria-selected': String(x.id === o.id), style: { '--c': x.color }, onclick: () => { S.cur = x.id; save(); theme(); draw(); } }, `${x.emoji} ${x.name}`))) : null,
    h('section', { class: 'hero' },
      h('p', { class: 'hero-name' }, `${o.emoji} ${o.name}`),
      sinceDays != null && sinceDays >= 0 ? h('p', { class: 'hero-since' }, `推して ${sinceDays.toLocaleString()} 日目`) : null,
      ev ? h('div', { class: 'hero-ev' }, h('span', { class: 'hero-days' }, daysUntil(ev.date) === 0 ? '今日！' : `あと${daysUntil(ev.date)}日`), h('span', {}, `${ev.title}${ev.venue ? ` @${ev.venue}` : ''}`), h('small', {}, `${fmtDate(ev.date)}${ev.oshi !== o.id ? `・${oshiById(ev.oshi).name}` : ''}`))
        : h('button', { class: 'hero-add', onclick: () => sheet('event') }, '＋ 次の予定を入れる')),
    h('div', { class: 'quick' }, h('button', { class: 'oshi-btn', onclick: () => sheet('spend') }, '💸 支出を記録'), h('button', { onclick: () => sheet('event') }, '📅 予定を追加')),
    h('section', { class: 'card' }, h('div', { class: 'row', style: { alignItems: 'baseline' } }, h('h2', {}, '今月の推し活費'), h('b', { class: 'shrink month-total' }, yen(month))),
      h('div', { class: 'meter' }, h('div', { style: { width: `${pct}%`, background: pct >= 100 ? 'var(--danger)' : 'var(--oshi)' } })),
      h('p', { class: 'small muted' }, month > S.budget ? `予算 ${yen(S.budget)} を ${yen(month - S.budget)} オーバー` : `予算 ${yen(S.budget)} まで あと ${yen(S.budget - month)}`),
      h('p', { class: 'small' }, `${o.name}への今年の合計: `, h('b', {}, yen(year)))),
    h('section', { class: 'card' }, h('h2', {}, '最近の記録'), recent.length ? h('ul', { class: 'list' }, recent.map(entryRow)) : h('p', { class: 'empty' }, 'まだ記録がありません'),
      recent.length ? h('button', { class: 'small ghost', onclick: () => go('log') }, 'すべて見る →') : null));
  // 前日・当日の予定を1日1回通知
  const soon = S.entries.filter((e) => e.type === 'event' && [0, 1].includes(daysUntil(e.date)));
  for (const e of soon) { const k = `n:${e.id}:${t}`; if (!db.get(k)) { db.set(k, 1); notify(daysUntil(e.date) ? `明日は ${e.title}！` : `今日は ${e.title}！`, daysUntil(e.date) ? '持ち物とチケットを確認しよう' : '楽しんでね'); } }
  for (const a of alerts) { const k = `t:${a.t.id}:${a.kind}:${t}`; if (!db.get(k)) { db.set(k, 1); notify(`🎫 ${a.t.title}`, a.text); } }
}

// ── 当落管理 ──
function tickets() {
  const t = todayStr(); const st = ticketStats(S.tickets);
  const groups = [['won', '💳 当選（入金してね）'], ['applied', '⏳ 結果待ち'], ['paid', '✅ 入金済み'], ['lost', '😢 落選']];
  const row = (x) => {
    const o = oshiById(x.oshi);
    const sub = [x.eventDate ? `公演 ${fmtDate(x.eventDate)}` : '', x.status === 'applied' && x.resultOn ? `発表 ${fmtDate(x.resultOn)}` : '', x.status === 'won' && x.payBy ? `入金期限 ${fmtDate(x.payBy)}` : '', x.price ? yen(x.price) : '', x.site].filter(Boolean).join(' ・ ');
    const set = (status) => {
      x.status = status;
      if (status === 'paid') {
        // 入金したら、支出と予定に自動で追加
        if (x.price) S.entries.push({ id: uid(), oshi: x.oshi, type: 'spend', kind: '🎫 チケット', amount: x.price, title: x.title, venue: '', date: t, memo: '' });
        if (x.eventDate && !S.entries.some((e) => e.ticket === x.id)) S.entries.push({ id: uid(), oshi: x.oshi, type: 'event', kind: '', amount: 0, title: x.title, venue: x.venue || '', date: x.eventDate, memo: '', ticket: x.id });
        toast('入金済みにしました。支出と予定にも追加しました');
      }
      save(); draw();
    };
    const pay = x.status === 'won' && x.payBy ? daysBetween(t, x.payBy) : null;
    return h('li', { style: { flexWrap: 'wrap' } }, h('span', { class: 'dot', style: { background: o.color } }),
      h('div', { class: 'grow' }, h('b', {}, x.title), h('div', { class: 'sub' }, sub)),
      pay != null ? h('span', { class: `pill ${pay <= 1 ? 'danger' : 'warn'}` }, pay < 0 ? '期限切れ' : `あと${pay}日`) : null,
      h('div', { class: 'btn-row', style: { width: '100%', marginTop: '6px' } },
        x.status === 'applied' ? [h('label', { class: 'small pay-label' }, '入金期限 ', h('input', { type: 'date', value: x.payBy || '', 'aria-label': `${x.title}の入金期限`, onchange: (e) => { x.payBy = e.target.value; save(); } })),
          h('button', { class: 'small oshi-btn', onclick: () => set('won') }, '🎉 当選'), h('button', { class: 'small', onclick: () => set('lost') }, '落選')] : null,
        x.status === 'won' ? h('button', { class: 'small oshi-btn', onclick: () => set('paid') }, '💳 入金した') : null,
        h('button', { class: 'small ghost', 'aria-label': `${x.title}を削除`, onclick: () => { if (confirmDelete(x.title)) { S.tickets = S.tickets.filter((y) => y.id !== x.id); save(); draw(); } } }, '削除')));
  };
  render(view,
    h('section', { class: 'card' }, h('div', { class: 'grid-3' },
      h('div', { class: 'stat' }, h('b', {}, String(st.applied)), h('span', {}, '申込')),
      h('div', { class: 'stat' }, h('b', {}, String(st.won)), h('span', {}, '当選')),
      h('div', { class: 'stat' }, h('b', {}, st.rate == null ? '—' : `${Math.round(st.rate * 100)}%`), h('span', {}, '当選率')))),
    h('button', { class: 'oshi-btn big', style: { marginBottom: '14px' }, onclick: ticketSheet }, '＋ 申し込んだチケットを記録'),
    groups.map(([k, label]) => { const list = S.tickets.filter((x) => x.status === k).sort((a, b) => (a.payBy || a.resultOn || a.eventDate || '').localeCompare(b.payBy || b.resultOn || b.eventDate || '')); return list.length ? h('section', { class: 'card' }, h('h2', {}, label), h('ul', { class: 'list' }, list.map(row))) : null; }),
    S.tickets.length ? null : h('p', { class: 'empty card' }, '先行抽選に申し込んだら、ここに記録しておきましょう。当落発表と入金期限をお知らせします。'));
}
function ticketSheet() {
  const f = {
    oshi: h('select', { id: 'tk-oshi' }, S.oshis.map((x) => h('option', { value: x.id, selected: x.id === curOshi().id }, `${x.emoji} ${x.name}`))),
    title: h('input', { id: 'tk-title', required: true, maxlength: 60, placeholder: '例: ツアー大阪 2日目 FC先行' }),
    site: h('input', { id: 'tk-site', maxlength: 30, placeholder: '例: FC先行・ぴあ' }),
    venue: h('input', { id: 'tk-venue', maxlength: 40, placeholder: '例: 京セラドーム' }),
    eventDate: h('input', { id: 'tk-event', type: 'date' }),
    resultOn: h('input', { id: 'tk-result', type: 'date' }),
    payBy: h('input', { id: 'tk-pay', type: 'date' }),
    price: h('input', { id: 'tk-price', type: 'number', min: 0, inputmode: 'numeric', placeholder: '円' }),
  };
  const dlg = h('div', { class: 'sheet-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'チケットを記録' });
  const close = () => dlg.remove();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const fld = (k, l) => h('div', { class: 'field' }, h('label', { for: f[k].id }, l), f[k]);
  add(dlg, h('form', { class: 'sheet', onsubmit: (e) => {
    e.preventDefault();
    S.tickets.push({ id: uid(), oshi: f.oshi.value, title: f.title.value.trim(), site: f.site.value.trim(), venue: f.venue.value.trim(), eventDate: f.eventDate.value, resultOn: f.resultOn.value, payBy: f.payBy.value, price: +f.price.value || 0, status: 'applied' });
    save(); close(); toast('記録しました。当落発表の前日にお知らせします'); draw();
  } }, h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }), h('h2', {}, '🎫 チケットを記録'),
  S.oshis.length > 1 ? fld('oshi', '推し') : null, fld('title', '公演・申込名'),
  h('div', { class: 'row' }, h('div', {}, fld('site', '申込先')), h('div', {}, fld('price', '金額（1枚・手数料込み）'))),
  fld('venue', '会場'),
  h('div', { class: 'row' }, h('div', {}, fld('eventDate', '公演日')), h('div', {}, fld('resultOn', '当落発表日')), h('div', {}, fld('payBy', '入金期限（わかれば）'))),
  h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('button', { type: 'button', onclick: close }, 'やめる'), h('button', { class: 'oshi-btn', type: 'submit' }, '保存'))));
  document.body.append(dlg); f.title.focus();
}

function entryRow(e) {
  const o = oshiById(e.oshi);
  return h('li', {}, h('span', { class: 'dot', style: { background: o.color }, title: o.name }),
    h('div', { class: 'grow' }, h('div', {}, e.type === 'event' ? `📅 ${e.title}` : `${e.kind} ${e.title}`), h('div', { class: 'sub' }, `${fmtDate(e.date)}${e.venue ? ` ・ ${e.venue}` : ''}${S.oshis.length > 1 ? ` ・ ${o.name}` : ''}`)),
    e.type === 'spend' ? h('b', {}, yen(e.amount)) : h('span', { class: 'pill' }, daysUntil(e.date) >= 0 ? `あと${daysUntil(e.date)}日` : '参戦済み'),
    h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { S.entries = S.entries.filter((x) => x.id !== e.id); save(); draw(); } } }, '×'));
}

// ── 記録一覧 ──
function log() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const filter = q.get('o') || 'all';
  const list = S.entries.filter((e) => filter === 'all' || e.oshi === filter).sort((a, b) => b.date.localeCompare(a.date));
  const months = [...new Set(list.map((e) => e.date.slice(0, 7)))];
  render(view, h('div', { class: 'quick' }, h('button', { class: 'oshi-btn', onclick: () => sheet('spend') }, '💸 支出'), h('button', { onclick: () => sheet('event') }, '📅 予定')),
    S.oshis.length > 1 ? h('div', { class: 'oshi-switch' }, [['all', 'すべて'], ...S.oshis.map((o) => [o.id, `${o.emoji} ${o.name}`])].map(([id, l]) => h('button', { 'aria-pressed': String(id === filter), onclick: () => go(id === 'all' ? 'log' : `log?o=${id}`) }, l))) : null,
    months.length === 0 ? h('p', { class: 'empty card' }, 'まだ記録がありません') : months.map((m) => {
      const items = list.filter((e) => e.date.startsWith(m));
      return h('section', { class: 'card' }, h('div', { class: 'row', style: { alignItems: 'baseline' } }, h('h2', {}, `${+m.slice(0, 4)}年${+m.slice(5)}月`), h('b', { class: 'shrink' }, yen(items.filter((e) => e.type === 'spend').reduce((s, e) => s + e.amount, 0)))), h('ul', { class: 'list' }, items.map(entryRow)));
    }));
}

// ── カメラ ──
let camStream = null;
function camera() {
  const o = curOshi();
  const video = h('video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'カメラ映像' });
  const overlay = h('canvas', { class: 'cam-overlay', 'aria-hidden': 'true' });
  const result = h('div');
  const textIn = h('input', { id: 'cam-text', maxlength: 24, value: db.get('camText', `${o.name}とおでかけ`), 'aria-label': 'フレームの文字' });
  const frame = (ctx, w, hh) => {
    const u = Math.min(w, hh) / 100;
    ctx.save(); ctx.strokeStyle = o.color; ctx.lineWidth = 3.2 * u; ctx.strokeRect(2.5 * u, 2.5 * u, w - 5 * u, hh - 5 * u);
    ctx.font = `${7 * u}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [[8, 8], [92, 8], [8, 92], [92, 92]].forEach(([x, y]) => ctx.fillText(o.emoji, (x / 100) * w, (y / 100) * hh));
    const label = `${textIn.value}  ${todayStr().replaceAll('-', '.')}`;
    ctx.font = `bold ${4.6 * u}px system-ui, sans-serif`; const tw = ctx.measureText(label).width + 6 * u;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect?.(w / 2 - tw / 2, hh - 15 * u, tw, 8 * u, 4 * u); ctx.fill();
    ctx.fillStyle = o.color; ctx.textBaseline = 'alphabetic'; ctx.fillText(label, w / 2, hh - 9.4 * u); ctx.restore();
  };
  const redraw = () => { const w = video.videoWidth || 720; const hh = video.videoHeight || 960; overlay.width = w; overlay.height = hh; const c = overlay.getContext('2d'); c.clearRect(0, 0, w, hh); frame(c, w, hh); };
  textIn.addEventListener('input', () => { db.set('camText', textIn.value); redraw(); });
  const ready = startCamera(video).then((s) => { camStream = s; video.addEventListener('loadedmetadata', redraw, { once: true }); redraw(); }).catch((e) => { render(result, h('p', { class: 'error' }, `${e.message}。写真ファイルからも作れます。`)); });
  const compose = async (src, w, hh) => {
    const c = h('canvas', { width: w, height: hh }); const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0, w, hh); frame(ctx, w, hh);
    const blob = await canvasToBlob(c, 'image/jpeg'); const name = `oshi-${Date.now()}.jpg`;
    const url = URL.createObjectURL(blob);
    render(result, h('img', { src: url, alt: '撮影した写真', class: 'shot' }), h('div', { class: 'btn-row', style: { marginTop: '8px' } },
      h('button', { class: 'oshi-btn', onclick: () => download(blob, name) }, '保存'), h('button', { onclick: () => share({ title: o.name, text: `${textIn.value} #推し活`, files: [new File([blob], name, { type: 'image/jpeg' })] }) }, '共有')));
    result.scrollIntoView({ behavior: 'smooth' });
  };
  const fileIn = h('input', { type: 'file', accept: 'image/*', class: 'hidden', 'aria-label': '写真ファイルを選ぶ', onchange: async (e) => { const f = e.target.files?.[0]; if (!f) return; const bmp = await createImageBitmap(f); const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)); await compose(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s)); } });
  render(view, h('section', { class: 'card' }, h('div', { class: 'cam-box' }, video, overlay), h('div', { class: 'field', style: { marginTop: '10px' } }, textIn),
    h('div', { class: 'btn-row' }, h('button', { class: 'oshi-btn big', onclick: async () => { await ready; if (!camStream) return; await compose(video, video.videoWidth, video.videoHeight); } }, '📸 撮る'), h('button', { onclick: () => fileIn.click() }, '🖼 写真から')), fileIn), result);
}

// ── 年間まとめ ──
function wrapped() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const year = +(q.get('y') || new Date().getFullYear());
  const s = yearSummary(S.entries, S.oshis, year);
  const canvas = h('canvas', { class: 'wrap-canvas', width: 1080, height: 1920, role: 'img', 'aria-label': `${year}年の推し活まとめ` });
  const o = s.byOshi[0] || curOshi();
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, o.color); g.addColorStop(1, '#1a1033');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = 'bold 56px system-ui, sans-serif'; ctx.fillText(`${year} 推し活まとめ`, 540, 200);
  ctx.font = '150px system-ui'; ctx.fillText(o.emoji, 540, 420);
  ctx.font = 'bold 64px system-ui, sans-serif'; drawWrapped(ctx, o.name, 540, 540, 900, 70, 1);
  const stat = (label, value, y) => { ctx.font = '40px system-ui, sans-serif'; ctx.globalAlpha = 0.8; ctx.fillText(label, 540, y); ctx.globalAlpha = 1; ctx.font = 'bold 110px system-ui, sans-serif'; ctx.fillText(value, 540, y + 120); };
  stat('推しに使ったお金', yen(s.total), 720);
  stat('参戦・イベント', `${s.events} 回`, 1000);
  ctx.font = '42px system-ui, sans-serif';
  if (s.topKind) ctx.fillText(`いちばん多かったのは ${s.topKind[0]}（${yen(s.topKind[1])}）`, 540, 1290);
  if (s.busiest) ctx.fillText(`いちばん熱かった月は ${s.busiest}月`, 540, 1370);
  if (s.venues.length) { ctx.font = '36px system-ui, sans-serif'; drawWrapped(ctx, `行った会場: ${s.venues.slice(0, 6).join('、')}`, 540, 1460, 900, 50, 3); }
  ctx.globalAlpha = 0.7; ctx.font = '34px system-ui, sans-serif'; ctx.fillText('#推し活手帳', 540, 1820); ctx.globalAlpha = 1;
  const years = [...new Set(S.entries.map((e) => +e.date.slice(0, 4)))].sort();
  render(view, years.length > 1 ? h('div', { class: 'oshi-switch' }, years.map((y) => h('button', { 'aria-pressed': String(y === year), onclick: () => go(`wrapped?y=${y}`) }, `${y}年`))) : null,
    h('section', { class: 'card' }, canvas, h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'oshi-btn', onclick: async () => {
      const blob = await canvasToBlob(canvas); const f = new File([blob], `oshi-wrapped-${year}.png`, { type: 'image/png' });
      const r = await share({ title: `${year} 推し活まとめ`, text: `${year}年の推し活まとめ #推し活手帳`, files: [f] }); if (r !== 'shared') download(blob, f.name);
    } }, '📤 シェア / 保存'))),
    h('section', { class: 'card' }, h('h2', {}, '推しごと'), s.byOshi.length ? h('ul', { class: 'list' }, s.byOshi.map((x) => h('li', {}, h('span', { class: 'dot', style: { background: x.color } }), h('span', { class: 'grow' }, `${x.emoji} ${x.name}`), h('span', { class: 'sub' }, `${x.events}回`), h('b', {}, yen(x.total))))) : null,
      h('div', { class: 'months', role: 'img', 'aria-label': '月ごとの支出' }, s.byMonth.map((v, i) => h('div', { class: 'mcol' }, h('div', { class: 'mbar', style: { height: `${(v / Math.max(1, ...s.byMonth)) * 100}%` } }), h('span', {}, String(i + 1)))))));
}

// ── 設定 ──
function settings() {
  const list = h('ul', { class: 'list' });
  const drawList = () => render(list, S.oshis.map((o) => h('li', {},
    h('input', { type: 'color', value: o.color, 'aria-label': `${o.name}の推し色`, class: 'mini-color', onchange: (e) => { o.color = e.target.value; save(); theme(); } }),
    h('input', { value: o.emoji, maxlength: 4, 'aria-label': `${o.name}の絵文字`, class: 'mini-emoji', onchange: (e) => { o.emoji = e.target.value || '⭐'; save(); } }),
    h('input', { value: o.name, maxlength: 30, 'aria-label': '推しの名前', class: 'grow', onchange: (e) => { o.name = e.target.value.trim() || o.name; save(); } }),
    h('button', { class: 'small ghost', 'aria-label': `${o.name}を削除`, disabled: S.oshis.length <= 1, onclick: () => { if (!confirmDelete(`${o.name}と、その記録すべて`)) return; S.oshis = S.oshis.filter((x) => x.id !== o.id); S.entries = S.entries.filter((e) => e.oshi !== o.id); S.cur = S.oshis[0]?.id; save(); theme(); drawList(); } }, '×'))));
  const newName = h('input', { maxlength: 30, placeholder: '推しの名前', 'aria-label': '追加する推しの名前' });
  const newColor = h('input', { type: 'color', value: '#7950f2', 'aria-label': '追加する推しの色' });
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', 'aria-label': 'バックアップを読み込む', onchange: async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (f.size > 10_000_000) return toast('ファイルが大きすぎます');
    try { const d = validateBackup(JSON.parse(await f.text())); if (!confirm(`推し${d.oshis.length}人・記録${d.entries.length}件を読み込みます。今のデータは置き換わります。よろしいですか？`)) return; S.oshis = d.oshis; S.entries = d.entries; S.tickets = d.tickets; S.budget = d.budget; S.cur = d.oshis[0]?.id; save(); theme(); toast('読み込みました'); go('home'); }
    catch (err) { toast(err.message || '読み込めませんでした', 4000); }
  } });
  render(view,
    h('section', { class: 'card' }, h('h2', {}, '推し'), list, h('form', { class: 'row', style: { marginTop: '10px' }, onsubmit: (e) => { e.preventDefault(); if (!newName.value.trim()) return; const o = { id: uid(), name: newName.value.trim(), color: newColor.value, emoji: '⭐', since: '' }; S.oshis.push(o); save(); newName.value = ''; drawList(); toast('推しを追加しました'); } },
      h('div', { class: 'shrink' }, newColor), h('div', {}, newName), h('button', { class: 'shrink', type: 'submit' }, '追加'))),
    h('section', { class: 'card' }, h('h2', {}, '予算と通知'), h('label', { for: 'bg' }, '1か月の推し活予算（円）'), h('input', { id: 'bg', type: 'number', min: 0, value: S.budget, onchange: (e) => { S.budget = Math.max(0, +e.target.value || 0); save(); } }), h('div', { style: { marginTop: '10px' } }, notifyButton()),
      h('p', { class: 'small muted' }, '予定の前日・当日に、アプリを開いたときにお知らせします。')),
    h('section', { class: 'card' }, h('h2', {}, 'バックアップ'), h('p', { class: 'small muted' }, 'データはこの端末の中だけにあります。機種変更の前に書き出してください。'),
      h('div', { class: 'btn-row' }, h('button', { onclick: () => download(new Blob([JSON.stringify({ app: 'oshi-techo', version: 1, exportedAt: new Date().toISOString(), oshis: S.oshis, entries: S.entries, tickets: S.tickets, budget: S.budget })], { type: 'application/json' }), `oshi-techo-${todayStr()}.json`) }, '📤 書き出す'), h('button', { onclick: () => fileIn.click() }, '📥 読み込む')), fileIn),
    h('p', { class: 'center small' }, h('a', { href: '../privacy.html' }, 'プライバシーポリシー'), ' ・ ', h('a', { href: '../../index.html' }, 'Happy Ideas のアイデア一覧へ')));
  drawList();
}

function draw() {
  if (route() !== 'camera') { stopStream(camStream); camStream = null; }
  theme();
  if (!S.oshis.length) { nav.classList.add('hidden'); onboarding(); return; }
  nav.classList.remove('hidden');
  const r = route();
  render(nav, TABS.map(([k, ic, l]) => h('a', { href: `#${k}`, 'aria-current': r === k ? 'page' : null }, h('span', { 'aria-hidden': 'true' }, ic), h('small', {}, l))));
  ({ home, tickets, log, camera, wrapped, settings }[r] || home)();
  window.scrollTo(0, 0);
}
add(app, view, nav);
installHint(app, { appName: '推し活手帳', ns: 'oshi-techo', reason: 'ライブ前日や入金期限のお知らせを受け取れるようになります（iPhoneはホーム画面に追加したときだけ通知が届きます）。' });
draw();
