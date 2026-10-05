// 純粋なロジック（DOMに依存しない）。tests/unit から node:test で検証する。
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();

/** 次回更新日（開始日から周期を足していき、今日以降になる最初の日）。月末契約は各月の末日に丸める。 */
export function nextRenewal(start, cycle, today = new Date()) {
  const [y, m, d] = start.split('-').map(Number);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let n = 0; n < 5000; n++) {
    let dt;
    if (cycle === 'year') dt = new Date(y + n, m - 1, Math.min(d, daysInMonth(y + n, m - 1)));
    else if (cycle === 'month') { const mm = m - 1 + n; const yy = y + Math.floor(mm / 12); const m0 = ((mm % 12) + 12) % 12; dt = new Date(yy, m0, Math.min(d, daysInMonth(yy, m0))); }
    else dt = new Date(y, m - 1, d + 7 * n);
    if (dt >= base) return ymd(dt);
  }
  return ymd(base);
}
