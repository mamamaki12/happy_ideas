// 法要ごよみ: 命日から法要の日を計算する（画面に依存しない部分）
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
/** 保存済みの記録で受け付ける最後の日付（時差のある国へ移動したときのために2日の余裕） */
export const latestDay = () => { const d = new Date(); d.setDate(d.getDate() + 2); return ymd(d); };
export function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
}
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const addDays = (s, n) => new Date(utc(s) + n * 86400000).toISOString().slice(0, 10);
/** b − a（日数） */
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
/** n 年後の同じ月日。2月29日は、うるう年でない年は2月28日にする */
export function addYears(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const last = new Date(Date.UTC(y + n, m, 0)).getUTCDate();
  return `${y + n}-${pad(m)}-${pad(Math.min(d, last))}`;
}
export const weekday = (s) => '日月火水木金土'[new Date(utc(s)).getUTCDay()];
/** 和暦（例: 令和8年11月15日）。1989年より前も Intl に任せる */
export function wareki(s) {
  try { return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(utc(s))); } catch { return s; }
}

// 七日ごとの法要と百か日（命日を1日目として数える）
export const CHUIN = [['d7', '初七日', 7], ['d14', '二七日', 14], ['d21', '三七日', 21], ['d28', '四七日', 28], ['d35', '五七日（三十五日）', 35], ['d42', '六七日', 42], ['d49', '四十九日', 49], ['d100', '百か日', 100]];
// 年忌法要（一周忌は満1年、三回忌からは「数え」なので満2年）
export const NENKI = [['y1', '一周忌', 1], ['y3', '三回忌', 2], ['y7', '七回忌', 6], ['y13', '十三回忌', 12], ['y17', '十七回忌', 16], ['y23', '二十三回忌', 22], ['y27', '二十七回忌', 26], ['y33', '三十三回忌', 32], ['y50', '五十回忌', 49]];
const NENKI_YEARS = new Set(NENKI.map(([, , n]) => n));

/** 1人分の法要の一覧（祥月命日は含めない）。kansai = 七日ごとの法要を命日の前日から数える */
export function memorials(p) {
  const shift = p.kansai ? 2 : 1;
  const chuin = CHUIN.map(([kind, label, n]) => ({ kind, label, date: addDays(p.death, kind === 'd100' ? n - 1 : n - shift), group: 'chuin' }));
  const nenki = NENKI.map(([kind, label, n]) => ({ kind, label, date: addYears(p.death, n), group: 'nenki' }));
  return [...chuin, ...nenki];
}

/** from から days 日のあいだの法要と祥月命日（年忌の年は年忌として出す）。日付順 */
export function upcoming(people, from, days = 400) {
  const until = addDays(from, days);
  const out = [];
  for (const p of people) {
    for (const m of memorials(p)) if (m.date >= from && m.date <= until) out.push({ ...m, person: p.id, key: `${p.id}:${m.kind}` });
    for (let n = 1; n <= 100; n++) {
      if (NENKI_YEARS.has(n)) continue;
      const date = addYears(p.death, n);
      if (date > until) break;
      if (date >= from) out.push({ kind: `s${n}`, label: `祥月命日（${n}年）`, date, group: 'shotsuki', person: p.id, key: `${p.id}:s${n}` });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.person.localeCompare(b.person));
}

/** 準備の目安（一般的な例。何日前までに） */
export const PREP = [
  ['temple', 'お寺（僧侶）に日にちを相談する', 60],
  ['place', '会場（自宅・お寺・斎場）と会食を決めて予約する', 45],
  ['invite', '親戚に案内を出す（はがき・電話・LINE）', 30],
  ['grave', 'お墓参り・卒塔婆の申し込み（必要なら）', 21],
  ['gift', '出欠をまとめ、引き出物（返礼品）を注文する', 14],
  ['ofuse', 'お布施・お供え・供花を用意する', 3],
];
/** その法要で出す準備（家族だけで行うことが多い七日ごとの法要には出さない） */
export function prepFor(kind) {
  if (kind === 'd49' || /^y\d+$/.test(kind)) return PREP;
  if (kind === 'd100') return PREP.filter(([id]) => ['temple', 'ofuse'].includes(id));
  return [];
}

/** 予定日の前の土曜日（土曜なら前の週ではなくその日）。法要は命日より前の土日に行うことが多い */
export function weekendBefore(s) {
  const dow = new Date(utc(s)).getUTCDay();
  return addDays(s, dow === 6 ? 0 : -((dow + 1) % 7));
}

// ---- 保存データの検証 ----
const TEXT = { name: 40, kaimyo: 60, relation: 20, memo: 500 };
const EV_KEY = /^[A-Za-z0-9_-]{1,64}:(d(7|14|21|28|35|42|49|100)|y(1|3|7|13|17|23|27|33|50)|s\d{1,3})$/;
const TASK_IDS = new Set(PREP.map(([id]) => id));
export function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.people) || data.people.length > 50 || typeof data.events !== 'object' || data.events === null || Array.isArray(data.events)) throw new Error('対応していないデータの形です。');
  const latest = latestDay();
  const ids = new Set();
  const people = data.people.map((p) => {
    if (!p || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || !validDate(p.death) || p.death > latest || p.death < '1900-01-01'
      || typeof p.kansai !== 'boolean' || ['name', 'kaimyo', 'relation', 'memo'].some((k) => typeof p[k] !== 'string' || p[k].length > TEXT[k])) throw new Error('故人の記録の内容が正しくありません。');
    ids.add(p.id);
    return { id: p.id, name: p.name.trim(), kaimyo: p.kaimyo, relation: p.relation, death: p.death, kansai: p.kansai, memo: p.memo };
  });
  const events = {};
  const keys = Object.keys(data.events);
  if (keys.length > 5000) throw new Error('予定の数が多すぎます。');
  for (const k of keys) {
    const e = data.events[k];
    if (!EV_KEY.test(k) || !ids.has(k.split(':')[0]) || !e || typeof e !== 'object') throw new Error('予定の記録の内容が正しくありません。');
    const out = {};
    if (e.date !== undefined) { if (!validDate(e.date)) throw new Error('予定日が正しくありません。'); out.date = e.date; }
    if (e.time !== undefined) { if (typeof e.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) throw new Error('時刻が正しくありません。'); out.time = e.time; }
    for (const [f, max] of [['place', 60], ['memo', 500]]) if (e[f] !== undefined) { if (typeof e[f] !== 'string' || e[f].length > max) throw new Error('予定の記録の内容が正しくありません。'); out[f] = e[f]; }
    if (e.ofuse !== undefined) { if (!Number.isInteger(e.ofuse) || e.ofuse < 0 || e.ofuse > 10000000) throw new Error('お布施の金額が正しくありません。'); out.ofuse = e.ofuse; }
    if (e.done !== undefined) { if (typeof e.done !== 'boolean') throw new Error('予定の記録の内容が正しくありません。'); out.done = e.done; }
    if (e.tasks !== undefined) {
      if (!e.tasks || typeof e.tasks !== 'object' || Array.isArray(e.tasks) || Object.entries(e.tasks).some(([t, v]) => !TASK_IDS.has(t) || v !== true)) throw new Error('準備の記録の内容が正しくありません。');
      out.tasks = { ...e.tasks };
    }
    events[k] = out;
  }
  return { version: 1, people, events };
}

// ---- 家族に送るリンク（故人の名前・命日などだけ。予定のメモやお布施は入れない） ----
export function sharePayload(people) {
  return { v: 1, p: people.map((p) => ({ n: p.name, k: p.kaimyo, r: p.relation, d: p.death, w: p.kansai ? 1 : 0 })) };
}
/** 受け取ったリンクの中身を確かめる。読めなければ null */
export function readShare(obj) {
  if (!obj || obj.v !== 1 || !Array.isArray(obj.p) || !obj.p.length || obj.p.length > 20) return null;
  const out = [];
  for (const x of obj.p) {
    if (!x || typeof x.n !== 'string' || !x.n.trim() || x.n.length > TEXT.name || !validDate(x.d) || x.d < '1900-01-01' || x.d > latestDay()) return null;
    const k = typeof x.k === 'string' ? x.k.slice(0, TEXT.kaimyo) : '';
    const r = typeof x.r === 'string' ? x.r.slice(0, TEXT.relation) : '';
    out.push({ name: x.n.trim(), kaimyo: k, relation: r, death: x.d, kansai: x.w === 1, memo: '' });
  }
  return out;
}

// ---- カレンダー用ファイル（iCalendar, RFC 5545） ----
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** 1行75バイトを超えたら折り返す（UTF-8 の文字の途中では切らない） */
function fold(line) {
  const enc = new TextEncoder();
  const parts = []; let cur = ''; let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}
/**
 * これからの法要と祥月命日を、カレンダーに入れるファイルにする。
 * years 年先まで。予定日を動かした法要は、動かした日で入れる
 */
export function toIcs(people, events, from, years = 10, stamp = new Date()) {
  const list = upcoming(people, from, Math.round(365.25 * years));
  const byId = new Map(people.map((p) => [p.id, p]));
  const dt = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//happy_ideas//hoyo//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:法要ごよみ'];
  for (const ev of list) {
    const p = byId.get(ev.person);
    const st = events[ev.key] || {};
    const date = st.date || ev.date;
    const d = date.replace(/-/g, '');
    const next = addDays(date, 1).replace(/-/g, '');
    const desc = [`${p.name}さん（命日 ${p.death}）`, st.date && st.date !== ev.date ? `本来の日: ${ev.date}` : '', st.time ? `時刻: ${st.time}` : '', st.place ? `場所: ${st.place}` : '', '法要ごよみ で作成'].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:${ev.key.replace(':', '-')}-${ev.date.replace(/-/g, '')}@hoyo.happy-ideas`, `DTSTAMP:${dt}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${icsText(`${p.name}さん ${ev.label}`)}`, `DESCRIPTION:${icsText(desc)}`, 'TRANSP:TRANSPARENT');
    // 法要は30日前、祥月命日は前日にお知らせ（対応しているカレンダーだけ）
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`${p.name}さん ${ev.label}`)}`, `TRIGGER:${ev.group === 'shotsuki' ? '-P1D' : '-P30D'}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** バックアップをすすめるか（1人以上の記録があり、30日以上バックアップしていない。「あとで」を押したらその日まで出さない） */
export function backupDue(meta, count, now = today()) {
  if (count < 1 || (meta?.snooze && meta.snooze > now)) return false;
  return !meta?.last || (Date.parse(now) - Date.parse(meta.last)) / 86400000 >= 30;
}
