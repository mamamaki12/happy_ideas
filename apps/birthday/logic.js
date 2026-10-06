/** 次の誕生日までの日数と、迎える年齢（年が不明なら null）。2/29生まれは平年は2/28扱い */
export function nextBirthday(md, year, today) {
  const [m, d] = md.split('-').map(Number);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const make = (y) => { const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; return new Date(y, m - 1, m === 2 && d === 29 && !leap ? 28 : d); };
  let next = make(t.getFullYear());
  if (next < t) next = make(t.getFullYear() + 1);
  return { days: Math.round((next - t) / 86400000), age: year ? next.getFullYear() - year : null, date: next };
}
