// 体調サイクル: 開始日の履歴から平均周期を出し、次回を予測する（医療目的ではない）
export function predict(starts) {
  const s = [...starts].sort();
  const day = (x) => new Date(`${x}T00:00:00`).getTime() / 86400000;
  const gaps = s.slice(1).map((x, i) => day(x) - day(s[i])).filter((g) => g >= 15 && g <= 60).slice(-6);
  if (!s.length) return null;
  const avg = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
  const next = new Date((day(s.at(-1)) + avg) * 86400000);
  const ymd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  return { avg, next: ymd, samples: gaps.length };
}
