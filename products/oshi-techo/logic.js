// 推し活手帳のロジック（DOM非依存）。tests/unit から検証する。
export const SPEND_KINDS = ['🎫 チケット', '🛍 グッズ', '💿 CD・配信', '🚄 遠征', '🏨 宿泊', '🎁 プレゼント', '📱 課金', '📝 その他'];

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNum = (s) => Math.round(new Date(`${s}T00:00:00`).getTime() / 86400000);
export const daysBetween = (a, b) => dayNum(b) - dayNum(a);

/** 次の予定（今日以降で一番近いもの） */
export function nextEvent(entries, today) {
  return entries.filter((e) => e.type === 'event' && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

/** 期間の支出合計（oshi を指定すればその推しだけ） */
export function spendTotal(entries, prefix, oshi) {
  return entries.filter((e) => e.type === 'spend' && e.date.startsWith(prefix) && (!oshi || e.oshi === oshi)).reduce((s, e) => s + (e.amount || 0), 0);
}

/** 年間まとめ（Wrapped） */
export function yearSummary(entries, oshis, year) {
  const y = String(year);
  const es = entries.filter((e) => e.date.startsWith(y));
  const spend = es.filter((e) => e.type === 'spend');
  const total = spend.reduce((s, e) => s + e.amount, 0);
  const events = es.filter((e) => e.type === 'event').length;
  const byKind = {}; spend.forEach((e) => { byKind[e.kind] = (byKind[e.kind] || 0) + e.amount; });
  const topKind = Object.entries(byKind).sort((a, b) => b[1] - a[1])[0] || null;
  const byMonth = Array(12).fill(0); es.forEach((e) => { byMonth[+e.date.slice(5, 7) - 1] += e.type === 'spend' ? e.amount : 0; });
  const busiest = byMonth.some((v) => v > 0) ? byMonth.indexOf(Math.max(...byMonth)) + 1 : null;
  const byOshi = oshis.map((o) => ({ ...o, total: spend.filter((e) => e.oshi === o.id).reduce((s, e) => s + e.amount, 0), events: es.filter((e) => e.type === 'event' && e.oshi === o.id).length })).sort((a, b) => b.total - a.total);
  const venues = [...new Set(es.filter((e) => e.type === 'event' && e.venue).map((e) => e.venue))];
  return { year, total, events, topKind, byMonth, busiest, byOshi, venues, count: es.length };
}

/** 書き出したJSONを検証して取り込める形にする（不正なら例外） */
export function validateBackup(obj) {
  if (!obj || obj.app !== 'oshi-techo' || !Array.isArray(obj.oshis) || !Array.isArray(obj.entries)) throw new Error('推し活手帳のバックアップファイルではありません');
  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const color = (v) => (/^#[0-9a-f]{6}$/i.test(v) ? v : '#ff5fa2');
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const oshis = obj.oshis.slice(0, 50).map((o) => ({ id: s(o.id, 64), name: s(o.name, 30) || '推し', color: color(o.color), emoji: s(o.emoji, 4) || '⭐', since: date(o.since) || '' })).filter((o) => o.id);
  const ids = new Set(oshis.map((o) => o.id));
  const entries = obj.entries.slice(0, 20000).map((e) => ({
    id: s(e.id, 64), oshi: s(e.oshi, 64), type: e.type === 'event' ? 'event' : 'spend', kind: SPEND_KINDS.includes(e.kind) ? e.kind : '📝 その他',
    amount: Number.isFinite(e.amount) && e.amount >= 0 ? Math.min(e.amount, 1e8) : 0, title: s(e.title, 60), venue: s(e.venue, 40), memo: s(e.memo, 200), date: date(e.date),
  })).filter((e) => e.id && e.date && ids.has(e.oshi));
  const st = ['applied', 'won', 'paid', 'lost'];
  const tickets = (Array.isArray(obj.tickets) ? obj.tickets : []).slice(0, 5000).map((t) => ({
    id: s(t.id, 64), oshi: s(t.oshi, 64), title: s(t.title, 60) || 'チケット', site: s(t.site, 30), venue: s(t.venue, 40),
    eventDate: date(t.eventDate) || '', resultOn: date(t.resultOn) || '', payBy: date(t.payBy) || '',
    price: Number.isFinite(t.price) && t.price >= 0 ? Math.min(t.price, 1e7) : 0, status: st.includes(t.status) ? t.status : 'applied',
  })).filter((t) => t.id && ids.has(t.oshi));
  return { oshis, entries, tickets, budget: Number.isFinite(obj.budget) && obj.budget >= 0 ? obj.budget : 30000 };
}

// ── サーバー通知の予定（時刻と種類だけ。名前などは含めない） ──
/** @returns {{at: number, kind: 'pay'|'result'|'event'}[]} 近い順に最大50件 */
export function computeReminders(tickets, entries, now = Date.now()) {
  const at = (date, hour, dayOffset = 0) => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d + dayOffset, hour, 0, 0).getTime(); };
  const out = [];
  for (const t of tickets) {
    if (t.status === 'won' && t.payBy) out.push({ at: at(t.payBy, 12, -1), kind: 'pay' }, { at: at(t.payBy, 9), kind: 'pay' });
    if (t.status === 'applied' && t.resultOn) out.push({ at: at(t.resultOn, 9), kind: 'result' });
  }
  for (const e of entries) if (e.type === 'event' && e.date) out.push({ at: at(e.date, 19, -1), kind: 'event' });
  return out.filter((r) => r.at > now).sort((a, b) => a.at - b.at).slice(0, 50);
}

// ── チケットの当落管理 ──
// status: applied（申込済み・結果待ち） / won（当選・未入金） / paid（入金済み） / lost（落選）
export const TICKET_STATUS = { applied: '結果待ち', won: '当選・未入金', paid: '入金済み', lost: '落選' };

/** 今日やるべきこと（期限が近い順）。days は今日=0 */
export function ticketAlerts(tickets, today) {
  const out = [];
  for (const t of tickets) {
    if (t.status === 'won' && t.payBy) { const d = daysBetween(today, t.payBy); if (d <= 3) out.push({ t, kind: d < 0 ? 'overdue' : 'pay', days: d, text: d < 0 ? `入金期限を${-d}日過ぎています` : d === 0 ? '今日が入金期限です' : `入金期限まであと${d}日` }); }
    if (t.status === 'applied' && t.resultOn) { const d = daysBetween(today, t.resultOn); if (d >= 0 && d <= 1) out.push({ t, kind: 'result', days: d, text: d === 0 ? '今日は当落発表です' : '明日は当落発表です' }); }
  }
  const rank = { overdue: 0, pay: 1, result: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.days - b.days);
}

/** 当選率など */
export function ticketStats(tickets) {
  const decided = tickets.filter((t) => ['won', 'paid', 'lost'].includes(t.status));
  const won = decided.filter((t) => t.status !== 'lost').length;
  return { applied: tickets.length, decided: decided.length, won, rate: decided.length ? won / decided.length : null };
}
