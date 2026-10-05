import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoords } from '../../shared/places.js';
import { distance, bearing } from '../../shared/geo.js';
import { encodeRally, decodeRally } from '../../apps/stamp-rally/logic.js';
import { centroid } from '../../apps/midpoint/logic.js';
import { trackDistance } from '../../apps/walk-tracker/logic.js';
import { sunTimes, dayInfo } from '../../apps/sun-times/logic.js';
import { estimateWbgt, wbgtLevel, safeWindows } from '../../apps/heat-guard/logic.js';
import { dryIndex } from '../../apps/laundry-timer/logic.js';
import { roughIntensity, intensityLabel } from '../../apps/quake-meter/logic.js';

const TOKYO = { lat: 35.681236, lon: 139.767125 };
const OSAKA = { lat: 34.702485, lon: 135.495951 };

test('geo: 東京駅→大阪駅 は約400km・西南西', () => {
  const d = distance(TOKYO, OSAKA);
  assert.ok(d > 395000 && d < 410000, `${d}`);
  const b = bearing(TOKYO, OSAKA);
  assert.ok(b > 240 && b < 260, `${b}`);
  assert.equal(distance(TOKYO, TOKYO), 0);
});

test('places: 座標とURLの解析', () => {
  assert.deepEqual(parseCoords('35.6812, 139.7671'), { lat: 35.6812, lon: 139.7671 });
  assert.deepEqual(parseCoords('35.6812 139.7671'), { lat: 35.6812, lon: 139.7671 });
  assert.deepEqual(parseCoords('https://www.google.com/maps/@35.6812,139.7671,15z'), { lat: 35.6812, lon: 139.7671 });
  assert.deepEqual(parseCoords('https://maps.google.com/?q=35.1,139.2'), { lat: 35.1, lon: 139.2 });
  assert.deepEqual(parseCoords('https://www.openstreetmap.org/?mlat=35.5&mlon=139.5#map=17/35.5/139.5'), { lat: 35.5, lon: 139.5 });
  assert.deepEqual(parseCoords('geo:35.1,139.2'), { lat: 35.1, lon: 139.2 });
  assert.equal(parseCoords('100, 200'), null); // 範囲外
  assert.equal(parseCoords('東京駅'), null);
  assert.equal(parseCoords(''), null);
});

test('stamp-rally: URL埋め込みの往復と不正値の拒否', () => {
  const r = { title: '商店街ラリー🎉', points: [{ name: '時計台', lat: 35.1, lon: 139.2 }] };
  const s = encodeRally(r);
  assert.match(s, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeRally(s), r);
  assert.equal(decodeRally('!!!'), null);
  assert.equal(decodeRally(encodeRally({ title: 1, points: [] })), null);
  const tooMany = { title: 'x', points: Array.from({ length: 51 }, () => ({ name: 'a', lat: 0, lon: 0 })) };
  assert.equal(decodeRally(encodeRally(tooMany)), null);
  const dirty = decodeRally(encodeRally({ title: 'x'.repeat(100), points: [{ name: 'ok', lat: 1, lon: 2 }, { name: 'bad', lat: 'x', lon: 2 }, { name: { evil: 1 }, lat: 1, lon: 1 }] }));
  assert.equal(dirty.title.length, 40);
  assert.equal(dirty.points.length, 1);
});

test('midpoint: 重心', () => {
  const c = centroid([TOKYO, OSAKA]);
  assert.ok(Math.abs(distance(c, TOKYO) - distance(c, OSAKA)) < 1000);
  const dl = centroid([{ lat: 0, lon: 179 }, { lat: 0, lon: -179 }]); // 日付変更線
  assert.ok(Math.abs(Math.abs(dl.lon) - 180) < 1e-6);
  assert.equal(centroid([]), null);
});

test('walk-tracker: GPSの飛びと低精度点を除外', () => {
  const base = { lat: 35.68, lon: 139.76 };
  const step = (i, extra = {}) => ({ lat: base.lat + i * 0.0001, lon: base.lon, acc: 5, t: i * 10000, ...extra });
  const pts = [step(0), step(1), step(2), { lat: 36.5, lon: 139.76, acc: 5, t: 25000 }, step(3), step(4, { acc: 200 }), step(5)];
  const d = trackDistance(pts);
  assert.ok(d > 50 && d < 60, `${d}`); // 0.0001度 ≈ 11.1m × 5区間
});

test('sun-times: 東京の夏至・冬至の日の出入り（±5分）', () => {
  const [rise, set] = sunTimes(new Date(2026, 5, 21, 12), TOKYO.lat, TOKYO.lon);
  const jst = (d) => (d.getUTCHours() + 9) % 24 * 60 + d.getUTCMinutes();
  assert.ok(Math.abs(jst(rise) - (4 * 60 + 25)) <= 5, `rise ${jst(rise)}`);
  assert.ok(Math.abs(jst(set) - (19 * 60 + 0)) <= 5, `set ${jst(set)}`);
  const [r2] = sunTimes(new Date(2026, 11, 22, 12), TOKYO.lat, TOKYO.lon);
  assert.ok(Math.abs(jst(r2) - (6 * 60 + 47)) <= 5, `winter rise ${jst(r2)}`);
  assert.equal(sunTimes(new Date(2026, 5, 21, 12), 78.2, 15.6), null); // 白夜（スバールバル）
  const i = dayInfo(new Date(2026, 9, 5, 12), TOKYO.lat, TOKYO.lon);
  assert.ok(i.blueMorningStart < i.sunrise && i.sunrise < i.goldenMorningEnd && i.goldenEveningStart < i.sunset && i.sunset < i.blueEveningEnd);
});

test('heat-guard: WBGT推定と区分', () => {
  const w = estimateWbgt(35, 60, 0.8, 1);
  assert.ok(w > 31 && w < 36, `${w}`);
  assert.equal(wbgtLevel(31).label, '危険');
  assert.equal(wbgtLevel(28.5).label, '厳重警戒');
  assert.equal(wbgtLevel(20).label, 'ほぼ安全');
  assert.deepEqual(safeWindows([{ time: '06:00', wbgt: 24 }, { time: '07:00', wbgt: 26 }, { time: '12:00', wbgt: 31 }, { time: '18:00', wbgt: 27 }]), [{ start: '06:00', end: '07:00' }, { start: '18:00', end: '18:00' }]);
});

test('laundry-timer: 乾きやすさ', () => {
  assert.ok(dryIndex(30, 30) > dryIndex(20, 80));
  assert.equal(dryIndex(20, 100), 0);
  assert.ok(dryIndex(35, 10) <= 100);
});

test('quake-meter: 震度の目安', () => {
  assert.equal(roughIntensity(0.1), 0);
  assert.equal(intensityLabel(roughIntensity(25)), '4');
  assert.equal(intensityLabel(4.7), '5弱');
  assert.equal(intensityLabel(5.2), '5強');
  assert.equal(intensityLabel(6.8), '7');
});
