// 間隔反復（SM-2 の簡易版）。grade: 0=忘れた 1=あいまい 2=覚えた
export function schedule(card, grade, now = Date.now()) {
  const c = { ease: 2.5, interval: 0, reps: 0, ...card };
  if (grade === 0) { c.reps = 0; c.interval = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = now + 60_000; }
  else {
    c.reps += 1;
    c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(c.interval * c.ease * (grade === 1 ? 0.6 : 1));
    if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.15); else c.ease = Math.min(3, c.ease + 0.05);
    c.due = now + c.interval * 86_400_000;
  }
  return c;
}
/** CSV（表,裏）を読み込む。ダブルクォート対応 */
export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length >= 2 && r[0].trim() && r[1].trim()).map((r) => ({ front: r[0].trim(), back: r[1].trim() }));
}
