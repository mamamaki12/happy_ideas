// モールス信号 SOS（・・・ーーー・・・）のオン/オフ列（単位: 短点の長さ）
export const SOS = (() => {
  const seq = []; const dot = 1; const dash = 3;
  const letter = (marks) => marks.forEach((m, i) => { seq.push([true, m]); if (i < marks.length - 1) seq.push([false, 1]); });
  letter([dot, dot, dot]); seq.push([false, 3]); letter([dash, dash, dash]); seq.push([false, 3]); letter([dot, dot, dot]); seq.push([false, 7]);
  return seq;
})();
