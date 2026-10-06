// 暑さ指数（WBGT）の推定。小野・登内（2014）の屋外推定式。
// Ta: 気温℃, RH: 相対湿度%, SR: 全天日射量 kW/m², WS: 風速 m/s
export function estimateWbgt(Ta, RH, SR = 0, WS = 1) {
  return 0.735 * Ta + 0.0374 * RH + 0.00292 * Ta * RH + 7.619 * SR - 4.557 * SR * SR - 0.0572 * WS - 4.064;
}
/** 環境省の指針に沿った区分 */
export function wbgtLevel(w) {
  if (w >= 31) return { label: '危険', cls: 'danger', advice: '外出はなるべく避け、涼しい室内に移動してください。' };
  if (w >= 28) return { label: '厳重警戒', cls: 'danger', advice: '外出時は炎天下を避け、室内でも室温の上昇に注意してください。' };
  if (w >= 25) return { label: '警戒', cls: 'warn', advice: '運動や激しい作業をするときは、定期的に十分に休息を取ってください。' };
  if (w >= 21) return { label: '注意', cls: 'warn', advice: '一般に危険性は少ないですが、激しい運動や重労働のときは注意してください。' };
  return { label: 'ほぼ安全', cls: 'ok', advice: '適宜、水分・塩分を補給してください。' };
}
/** 時間ごとの予報から「外出するなら」の安全な時間帯（WBGT 28 未満が連続する区間）を出す */
export function safeWindows(hours, limit = 28) {
  const out = []; let cur = null;
  for (const hr of hours) {
    if (hr.wbgt < limit) { cur ? (cur.end = hr.time) : (cur = { start: hr.time, end: hr.time }); }
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}
