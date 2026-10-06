/** 旅行予算: 1日あたりの使える額と、ここまでのペース */
export function budgetStatus({ total, start, end, spent, today }) {
  const day = (s) => new Date(`${s}T00:00:00`).getTime();
  const days = Math.max(1, Math.round((day(end) - day(start)) / 86400000) + 1);
  const elapsed = Math.min(days, Math.max(1, Math.round((day(today) - day(start)) / 86400000) + 1));
  const used = spent.reduce((s, x) => s + x, 0);
  const remainDays = Math.max(1, days - elapsed + 1);
  const ideal = (total / days) * elapsed;
  return { days, elapsed, used, left: total - used, perDay: (total - used) / remainDays, pace: used / Math.max(1, ideal), dailyBudget: total / days };
}
