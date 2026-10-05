/** 加速度（gal = cm/s²）から気象庁震度のおおよその目安（簡易式。正式な計測震度ではない） */
export function roughIntensity(gal) {
  if (gal < 0.8) return 0;
  const i = 2 * Math.log10(gal) + 0.94;
  return Math.max(0, Math.min(7, i));
}
export function intensityLabel(i) {
  if (i < 0.5) return '0';
  if (i < 4.5) return String(Math.round(i));
  if (i < 5.0) return '5弱'; if (i < 5.5) return '5強'; if (i < 6.0) return '6弱'; if (i < 6.5) return '6強'; return '7';
}
