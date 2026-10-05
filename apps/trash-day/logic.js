// ゴミ収集ルールの判定。rule = { type: 'weekly', days: [0-6] } | { type: 'nth', weeks: [1-5], days: [0-6] }
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** その日が月の第何週の曜日か（1日〜7日が第1） */
export const nthOfMonth = (date) => Math.floor((date.getDate() - 1) / 7) + 1;

export function isCollectionDay(rule, date) {
  if (!rule.days.includes(date.getDay())) return false;
  if (rule.type === 'weekly') return true;
  return rule.weeks.includes(nthOfMonth(date));
}

/** from 以降（当日含む）で次の収集日 */
export function nextCollection(rule, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 400; i++) {
    if (isCollectionDay(rule, d)) return d;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

export function describe(rule) {
  const days = rule.days.map((d) => WEEKDAYS[d]).join('・');
  return rule.type === 'weekly' ? `毎週 ${days}曜` : `第${rule.weeks.join('・')} ${days}曜`;
}
