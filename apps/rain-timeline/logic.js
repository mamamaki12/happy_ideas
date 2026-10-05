// 時間ごとの雨量（mm/h）と降水確率（%）から、行動のタイムラインを作る
export function rainLevel(mm) {
  if (mm >= 50) return { label: '非常に激しい雨', cls: 'danger', act: '安全な場所へ移動。避難指示に従う' };
  if (mm >= 30) return { label: '激しい雨', cls: 'danger', act: '外出を控え、避難の準備を' };
  if (mm >= 10) return { label: '強い雨', cls: 'warn', act: '傘では濡れる。不要な外出は控える' };
  if (mm >= 1) return { label: '雨', cls: 'warn', act: '傘を持って出かける' };
  if (mm > 0) return { label: '小雨', cls: '', act: '折りたたみ傘があると安心' };
  return { label: 'なし', cls: 'ok', act: '' };
}
/** 雨が始まる時刻・ピーク・やむ時刻、洗濯物の判断 */
export function summarize(hours) {
  const wet = hours.filter((x) => x.mm >= 0.5 || x.prob >= 60);
  const start = wet[0]?.time || null;
  const peak = hours.reduce((m, x) => (x.mm > (m?.mm ?? -1) ? x : m), null);
  let end = null;
  if (start) { const i = hours.findIndex((x) => x.time === start); const after = hours.slice(i).find((x) => x.mm < 0.5 && x.prob < 40); end = after?.time || null; }
  const laundry = !hours.slice(0, 12).some((x) => x.mm >= 0.5 || x.prob >= 50);
  return { start, end, peak: peak && peak.mm > 0 ? peak : null, laundry, maxLevel: rainLevel(peak?.mm || 0) };
}
