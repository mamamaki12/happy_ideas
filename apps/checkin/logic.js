/** 連続日数（今日または昨日まで続いていれば数える） */
export function streak(dates, today) {
  const set = new Set(dates);
  const d = new Date(today + 'T00:00:00');
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(fmt(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
