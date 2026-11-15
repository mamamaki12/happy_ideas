// ぽんぽん日記: 子どものうんち・おくすりの記録（画面に依存しない部分）
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
/** いまの日時（datetime-local の形） */
export const nowLocal = () => { const d = new Date(); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** 保存済みの記録で受け付ける最後の日付（時差のある国へ移動したときのために2日の余裕） */
export const latestDay = () => { const d = new Date(); d.setDate(d.getDate() + 2); return ymd(d); };
export function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
}
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const addDays = (s, n) => new Date(utc(s) + n * 86400000).toISOString().slice(0, 10);
/** b − a（日数） */
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const weekday = (s) => '日月火水木金土'[new Date(utc(s)).getUTCDay()];
export const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

/** うんちのかたさ（ブリストルスケールの7段階を、子どもにもわかる言葉で） */
export const BRISTOL = [
  { n: 1, label: 'コロコロ', desc: 'うさぎのフンのような、かたい粒', group: 'hard' },
  { n: 2, label: 'ゴツゴツ', desc: '粒がかたまった、かたいうんち', group: 'hard' },
  { n: 3, label: 'ひびわれ', desc: '表面にひびのある、ややかため', group: 'good' },
  { n: 4, label: 'バナナ', desc: 'なめらかで、ちょうどいい', group: 'good' },
  { n: 5, label: 'やわらか', desc: 'やわらかい、ちぎれたかたまり', group: 'good' },
  { n: 6, label: 'どろどろ', desc: '形のない、どろっとしたうんち', group: 'soft' },
  { n: 7, label: 'みずっぽい', desc: '水のようなうんち', group: 'soft' },
];
export const AMOUNT = ['', 'すこし', 'ふつう', 'たくさん'];
export const STICKERS = ['⭐', '🌈', '🦖', '🚀', '🍓', '🐳', '🌻', '🦁', '🍩', '🎈', '🐸', '🐧', '🍙', '🚂', '🦄', '🌟'];
export const KID_EMOJI = ['🐣', '🐻', '🐰', '🐶', '🐱', '🐼', '🦊', '🐨', '🐯', '🐥'];
export const TYPES = ['poo', 'med', 'sit'];

// ---- 保存データの検証 ----
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const AT = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/;
export function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.kids) || data.kids.length > 10 || !Array.isArray(data.logs) || data.logs.length > 20000) throw new Error('対応していないデータの形です。');
  const latest = latestDay();
  const kidIds = new Set();
  const kids = data.kids.map((k) => {
    if (!k || typeof k.id !== 'string' || !ID.test(k.id) || kidIds.has(k.id) || typeof k.name !== 'string' || !k.name.trim() || k.name.length > 20 || !KID_EMOJI.includes(k.emoji)) throw new Error('子どもの記録の内容が正しくありません。');
    kidIds.add(k.id);
    return { id: k.id, name: k.name.trim(), emoji: k.emoji };
  });
  const logIds = new Set();
  const logs = data.logs.map((l) => {
    const bad = () => { throw new Error('うんち・おくすりの記録の内容が正しくありません。'); };
    if (!l || typeof l.id !== 'string' || !ID.test(l.id) || logIds.has(l.id) || !kidIds.has(l.kid) || !TYPES.includes(l.type)) bad();
    const m = typeof l.at === 'string' && l.at.match(AT);
    if (!m || !validDate(m[1]) || m[1] > latest) bad();
    logIds.add(l.id);
    const out = { id: l.id, kid: l.kid, type: l.type, at: l.at };
    if (l.type === 'poo') {
      if (!Number.isInteger(l.bristol) || l.bristol < 1 || l.bristol > 7) bad();
      out.bristol = l.bristol;
      if (l.amount !== undefined) { if (![1, 2, 3].includes(l.amount)) bad(); out.amount = l.amount; }
      for (const f of ['pain', 'blood']) if (l[f] !== undefined) { if (typeof l[f] !== 'boolean') bad(); if (l[f]) out[f] = true; }
    }
    if (l.type === 'med') {
      if (typeof l.med !== 'string' || !l.med.trim() || l.med.length > 30) bad();
      out.med = l.med.trim();
      if (l.dose !== undefined) { if (typeof l.dose !== 'string' || l.dose.length > 20) bad(); if (l.dose.trim()) out.dose = l.dose.trim(); }
    }
    if (l.type !== 'med' && l.sticker !== undefined) { if (!Number.isInteger(l.sticker) || l.sticker < 0 || l.sticker >= STICKERS.length) bad(); out.sticker = l.sticker; }
    if (l.memo !== undefined) { if (typeof l.memo !== 'string' || l.memo.length > 200) bad(); if (l.memo) out.memo = l.memo; }
    return out;
  });
  logs.sort((a, b) => a.at.localeCompare(b.at));
  return { version: 1, kids, logs };
}

// ---- 集計 ----
const kidLogs = (logs, kid) => logs.filter((l) => l.kid === kid);
/** 最後のうんち（なければ null） */
export function lastPoo(logs, kid, until = '9999-12-31T23:59') {
  let last = null;
  for (const l of logs) if (l.kid === kid && l.type === 'poo' && l.at <= until && (!last || l.at > last.at)) last = l;
  return last;
}
/** 最後のうんちから何日たったか（今日出ていれば 0。記録がなければ null） */
export function daysSince(logs, kid, now = today()) {
  const l = lastPoo(logs, kid, `${now}T23:59`);
  return l ? diffDays(l.at.slice(0, 10), now) : null;
}
/** 日付ごとの記録 */
export function byDay(logs, kid, from, to) {
  const map = new Map();
  for (let d = from; d <= to; d = addDays(d, 1)) map.set(d, { poo: [], med: [], sit: [] });
  for (const l of kidLogs(logs, kid)) {
    const d = l.at.slice(0, 10);
    if (map.has(d)) map.get(d)[l.type].push(l);
  }
  return map;
}
/** from〜to（両端を含む）のまとめ。受診のときに見せる */
export function summary(logs, kid, from, to) {
  const days = byDay(logs, kid, from, to);
  const n = days.size;
  const bristol = [0, 0, 0, 0, 0, 0, 0];
  let pooCount = 0; let pooDays = 0; let pain = 0; let blood = 0; let sits = 0; let gap = 0; let longestGap = 0;
  const meds = new Map();
  for (const [, v] of days) {
    if (v.poo.length) { pooDays++; gap = 0; } else { gap++; longestGap = Math.max(longestGap, gap); }
    pooCount += v.poo.length; sits += v.sit.length;
    for (const p of v.poo) { bristol[p.bristol - 1]++; if (p.pain) pain++; if (p.blood) blood++; }
    for (const name of new Set(v.med.map((m) => m.med))) meds.set(name, (meds.get(name) || 0) + 1);
  }
  return { from, to, n, days, pooCount, pooDays, perWeek: n ? Math.round((pooCount / n) * 70) / 10 : 0, longestGap, bristol, hard: bristol[0] + bristol[1], pain, blood, sits, meds: [...meds].map(([name, days]) => ({ name, days })) };
}
/** まとめを文章にする（LINE やメモに貼る・医師に見せる） */
export function reportText(kidName, s) {
  const lines = [`${kidName}のうんちの記録 ${md(s.from)}〜${md(s.to)}（${s.n}日間）`, ''];
  lines.push(`うんち: ${s.pooCount}回（出た日 ${s.pooDays}日／${s.n}日、1週間あたり ${s.perWeek}回）`);
  lines.push(`出なかった日が続いた最長: ${s.longestGap}日`);
  const kinds = BRISTOL.map((b, i) => (s.bristol[i] ? `${b.label}(${b.n}) ${s.bristol[i]}回` : '')).filter(Boolean);
  lines.push(`かたさ: ${kinds.length ? kinds.join('・') : '記録なし'}`);
  lines.push(`痛がった・出にくかった: ${s.pain}回　血がついていた: ${s.blood}回`);
  if (s.sits) lines.push(`トイレにすわった（出なかった）: ${s.sits}回`);
  lines.push(`おくすり: ${s.meds.length ? s.meds.map((m) => `${m.name} ${m.days}日`).join('・') : '記録なし'}`);
  lines.push('', '日ごとの記録');
  for (const [d, v] of s.days) {
    const poo = v.poo.map((p) => `${p.at.slice(11)} ${BRISTOL[p.bristol - 1].label}${p.pain ? '・痛がった' : ''}${p.blood ? '・血' : ''}`).join('、');
    const med = [...new Set(v.med.map((m) => m.med))].join('・');
    lines.push(`${md(d)}(${weekday(d)}) ${poo || 'なし'}${med ? ` ／ くすり: ${med}` : ''}`);
  }
  lines.push('', '（ぽんぽん日記で記録）');
  return lines.join('\n');
}
/** 月のカレンダーのマス（日曜はじまり。前後の空きは null） */
export function monthCells(y, m) {
  const first = `${y}-${pad(m)}-01`;
  const len = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(utc(first)).getUTCDay();
  const cells = Array(lead).fill(null);
  for (let d = 1; d <= len; d++) cells.push(`${y}-${pad(m)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
/** その月にもらったシール（うんち・トイレにすわった） */
export function stickersIn(logs, kid, ym) {
  return logs.filter((l) => l.kid === kid && l.sticker !== undefined && l.at.startsWith(ym));
}
/** これまでに使ったくすりの名前と量（新しい順・重複なし） */
export function recentMeds(logs, kid) {
  const seen = new Map();
  for (let i = logs.length - 1; i >= 0; i--) { const l = logs[i]; if (l.kid === kid && l.type === 'med' && !seen.has(l.med)) seen.set(l.med, l.dose || ''); }
  return [...seen].map(([med, dose]) => ({ med, dose }));
}

/** バックアップをすすめるか（記録が10件以上あり、30日以上バックアップしていない。「あとで」を押したらその日まで出さない） */
export function backupDue(meta, count, now = today()) {
  if (count < 10 || (meta?.snooze && meta.snooze > now)) return false;
  return !meta?.last || (Date.parse(now) - Date.parse(meta.last)) / 86400000 >= 30;
}
