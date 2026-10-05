const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 週の始まり（月曜）の日付文字列 */
export function weekStart(date) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
/** 週目標（週n回）での連続達成週数。今週は未達でも途中なので数えない */
export function weekStreak(dates, perWeek, today) {
  const count = {}; for (const s of dates) { const w = weekStart(new Date(`${s}T00:00:00`)); count[w] = (count[w] || 0) + 1; }
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let n = (count[weekStart(d)] || 0) >= perWeek ? 1 : 0;
  d.setDate(d.getDate() - 7);
  while ((count[weekStart(d)] || 0) >= perWeek) { n++; d.setDate(d.getDate() - 7); }
  return n;
}
export function thisWeekCount(dates, today) { const w = weekStart(today); return dates.filter((s) => weekStart(new Date(`${s}T00:00:00`)) === w).length; }
