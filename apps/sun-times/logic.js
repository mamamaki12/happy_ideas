// 日の出・日の入り・薄明の計算（NOAA の簡易アルゴリズム）。オフラインで動く。
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** 太陽の高度が altitude（度）になる時刻 [昇る, 沈む]（Date）。白夜・極夜は null */
export function sunTimes(date, lat, lon, altitude = -0.833) {
  const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const n = Math.round(start / 86400000) + 2440588 - 2451545 + 0.0008; // ユリウス日（J2000起点）
  const Js = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * L));
  const dec = Math.asin(Math.sin(rad(L)) * Math.sin(rad(23.4397)));
  const cosH = (Math.sin(rad(altitude)) - Math.sin(rad(lat)) * Math.sin(dec)) / (Math.cos(rad(lat)) * Math.cos(dec));
  if (cosH < -1 || cosH > 1) return null;
  const H = deg(Math.acos(cosH));
  const toDate = (J) => new Date((J - 2440587.5) * 86400000);
  return [toDate(Jt - H / 360), toDate(Jt + H / 360)];
}

export function dayInfo(date, lat, lon) {
  const sun = sunTimes(date, lat, lon, -0.833);
  const golden = sunTimes(date, lat, lon, 6);
  const blue = sunTimes(date, lat, lon, -4);
  const civil = sunTimes(date, lat, lon, -6);
  return { sunrise: sun?.[0], sunset: sun?.[1], goldenMorningEnd: golden?.[0], goldenEveningStart: golden?.[1], blueMorningStart: civil?.[0], blueMorningEnd: blue?.[0], blueEveningStart: blue?.[1], blueEveningEnd: civil?.[1] };
}
