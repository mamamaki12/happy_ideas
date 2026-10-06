// 各アプリの純粋ロジックの単体テスト: node --test tests/unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRenewal } from '../../apps/sub-audit/logic.js';
import { isCollectionDay, nextCollection, nthOfMonth, describe as describeRule } from '../../apps/trash-day/logic.js';
import { splitBill } from '../../apps/split-bill/logic.js';
import { unitPrice, compare } from '../../apps/unit-price/logic.js';
import { probAtLeastOne, pullsFor, expectedPulls } from '../../apps/gacha-calc/logic.js';

const D = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

test('sub-audit: 月額の次回更新日', () => {
  assert.equal(nextRenewal('2026-01-15', 'month', D('2026-10-05')), '2026-10-15');
  assert.equal(nextRenewal('2026-01-15', 'month', D('2026-10-15')), '2026-10-15'); // 当日を含む
  assert.equal(nextRenewal('2026-01-15', 'month', D('2026-10-16')), '2026-11-15');
});
test('sub-audit: 月末契約は各月の末日に丸める', () => {
  assert.equal(nextRenewal('2026-01-31', 'month', D('2026-02-01')), '2026-02-28');
  assert.equal(nextRenewal('2026-01-31', 'month', D('2026-04-02')), '2026-04-30');
});
test('sub-audit: 年額・週額・うるう年', () => {
  assert.equal(nextRenewal('2024-02-29', 'year', D('2026-01-01')), '2026-02-28');
  assert.equal(nextRenewal('2026-10-01', 'week', D('2026-10-05')), '2026-10-08');
  assert.equal(nextRenewal('2027-01-01', 'month', D('2026-10-05')), '2027-01-01'); // 未来の開始日
});

test('trash-day: 第n週の判定', () => {
  assert.equal(nthOfMonth(D('2026-10-01')), 1);
  assert.equal(nthOfMonth(D('2026-10-08')), 2);
  assert.equal(nthOfMonth(D('2026-10-29')), 5);
  const can = { type: 'nth', weeks: [2, 4], days: [5] }; // 第2・第4金曜
  assert.equal(isCollectionDay(can, D('2026-10-09')), true); // 第2金曜
  assert.equal(isCollectionDay(can, D('2026-10-02')), false); // 第1金曜
  assert.equal(isCollectionDay(can, D('2026-10-23')), true); // 第4金曜
  assert.equal(nextCollection(can, D('2026-10-10')).getDate(), 23);
  assert.equal(describeRule(can), '第2・4 金曜');
});
test('trash-day: 毎週', () => {
  const burn = { type: 'weekly', days: [1, 4] }; // 月・木
  assert.equal(isCollectionDay(burn, D('2026-10-05')), true); // 月曜
  assert.equal(nextCollection(burn, D('2026-10-06')).getDate(), 8);
});

test('split-bill: 均等割り・端数は切り上げ', () => {
  const r = splitBill(10000, [{ name: 'a', weight: 1 }, { name: 'b', weight: 1 }, { name: 'c', weight: 1 }], 100);
  assert.deepEqual(r.shares.map((s) => s.amount), [3400, 3400, 3400]);
  assert.equal(r.surplus, 200);
  assert.ok(r.collected >= 10000);
});
test('split-bill: 傾斜と不正入力', () => {
  const r = splitBill(9000, [{ name: 'a', weight: 2 }, { name: 'b', weight: 1 }], 1);
  assert.deepEqual(r.shares.map((s) => s.amount), [6000, 3000]);
  assert.equal(splitBill(0, [{ name: 'a', weight: 1 }]).collected, 0);
  assert.equal(splitBill(1000, [{ name: 'a', weight: 0 }]).collected, 0);
  assert.equal(splitBill(NaN, [{ name: 'a', weight: 1 }]).collected, 0);
});

test('unit-price: 単価比較', () => {
  assert.equal(unitPrice({ price: 300, count: 3, amount: 1 }), 100);
  assert.equal(unitPrice({ price: 0, count: 3 }), null);
  const r = compare([{ price: 398, count: 3, amount: 1 }, { price: 598, count: 5, amount: 1 }]);
  assert.equal(r.best, 1);
  assert.ok(r.diffs[0] > 10 && r.diffs[0] < 11);
  assert.equal(compare([{ price: 0 }, { price: 0 }]).best, -1);
});

test('gacha-calc: 確率', () => {
  assert.ok(Math.abs(probAtLeastOne(0.01, 100) - 0.634) < 0.001);
  assert.equal(pullsFor(0.01, 0.5), 69);
  assert.equal(pullsFor(0, 0.5), Infinity);
  assert.equal(pullsFor(1, 0.9), 1);
  assert.ok(Math.abs(expectedPulls(0.01) - 100) < 1e-9);
  // 天井があると期待値は天井以下
  assert.ok(expectedPulls(0.001, 200) <= 200);
  assert.ok(expectedPulls(0.5, 200) < 2.0001);
});
