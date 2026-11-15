import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, daysSince, summary, reportText, monthCells, stickersIn, recentMeds, backupDue, addDays, today } from '../../products/ponpon/logic.js';

const kid = { id: 'k1', name: 'はる', emoji: '🐻' };
const poo = (id, at, bristol, extra = {}) => ({ id, kid: 'k1', type: 'poo', at, bristol, ...extra });
const med = (id, at, name = '酸化マグネシウム', dose = '1包') => ({ id, kid: 'k1', type: 'med', at, med: name, dose });

test('保存データ: 正しいものは日時順にそろえて通し、おかしなものは止める', () => {
  const d = validate({ version: 1, kids: [kid], logs: [poo('b', '2026-11-02T08:00', 4, { sticker: 1 }), poo('a', '2026-11-01T19:00', 1, { pain: true, amount: 2 })] });
  assert.deepEqual(d.logs.map((l) => l.id), ['a', 'b']);
  assert.equal(d.logs[0].pain, true);
  const ok = { version: 1, kids: [kid], logs: [] };
  for (const bad of [
    { ...ok, kids: [{ ...kid, emoji: '<b>' }] },
    { ...ok, kids: [kid, kid] },
    { ...ok, kids: [{ ...kid, name: 'あ'.repeat(21) }] },
    { ...ok, logs: [poo('a', '2026-11-01T19:00', 8)] },
    { ...ok, logs: [poo('a', '2026-11-01T24:00', 4)] },
    { ...ok, logs: [poo('a', '2999-01-01T10:00', 4)] },
    { ...ok, logs: [poo('a', '2026-11-01T10:00', 4, { kid: 'zz' })] },
    { ...ok, logs: [poo('a', '2026-11-01T10:00', 4, { sticker: 99 })] },
    { ...ok, logs: [{ id: 'a', kid: 'k1', type: 'med', at: '2026-11-01T10:00', med: '' }] },
    { ...ok, logs: [{ id: 'a', kid: 'k1', type: 'hack', at: '2026-11-01T10:00' }] },
    { ...ok, logs: [poo('a', '2026-11-01T10:00', 4), poo('a', '2026-11-02T10:00', 4)] },
  ]) assert.throws(() => validate(bad));
});

test('何日出ていないか: 今日出ていれば0、記録がなければ null', () => {
  const logs = [poo('a', '2026-11-10T08:00', 4), med('m', '2026-11-14T08:00')];
  assert.equal(daysSince(logs, 'k1', '2026-11-15'), 5);
  assert.equal(daysSince(logs, 'k1', '2026-11-10'), 0);
  assert.equal(daysSince([], 'k1', '2026-11-15'), null);
  assert.equal(daysSince(logs, 'other', '2026-11-15'), null);
});

test('受診用まとめ: 回数・出た日・最長で出なかった日数・かたさ・おくすりの日数', () => {
  const logs = [
    poo('a', '2026-11-01T08:00', 1, { pain: true }), poo('b', '2026-11-01T19:00', 2),
    poo('c', '2026-11-05T08:00', 4, { blood: true }), poo('d', '2026-11-07T08:00', 5),
    med('m1', '2026-11-03T08:00'), med('m2', '2026-11-03T20:00'), med('m3', '2026-11-04T08:00'),
    { id: 's', kid: 'k1', type: 'sit', at: '2026-11-02T07:00', sticker: 0 },
  ];
  const s = summary(logs, 'k1', '2026-11-01', '2026-11-07');
  assert.equal(s.n, 7);
  assert.equal(s.pooCount, 4);
  assert.equal(s.pooDays, 3);
  assert.equal(s.perWeek, 4);
  assert.equal(s.longestGap, 3); // 2日〜4日
  assert.deepEqual(s.bristol, [1, 1, 0, 1, 1, 0, 0]);
  assert.equal(s.hard, 2); assert.equal(s.pain, 1); assert.equal(s.blood, 1); assert.equal(s.sits, 1);
  assert.deepEqual(s.meds, [{ name: '酸化マグネシウム', days: 2 }]); // 1日に2回でも1日
  const text = reportText('はる', s);
  assert.match(text, /^はるのうんちの記録 11\/1〜11\/7（7日間）/);
  assert.match(text, /出なかった日が続いた最長: 3日/);
  assert.match(text, /11\/3\(火\) なし ／ くすり: 酸化マグネシウム/);
});

test('カレンダー: 日曜はじまりで、前後を空ける', () => {
  const cells = monthCells(2026, 11); // 2026-11-01 は日曜
  assert.equal(cells[0], '2026-11-01');
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.filter(Boolean).length, 30);
  const feb = monthCells(2026, 2); // 2026-02-01 も日曜、28日
  assert.equal(feb.length, 28);
  const oct = monthCells(2026, 10); // 2026-10-01 は木曜
  assert.deepEqual(oct.slice(0, 5), [null, null, null, null, '2026-10-01']);
});

test('シールとおくすりの候補', () => {
  const logs = [poo('a', '2026-11-01T08:00', 4, { sticker: 3 }), poo('b', '2026-10-31T08:00', 4, { sticker: 2 }), med('m1', '2026-11-01T08:00', 'A', '1包'), med('m2', '2026-11-02T08:00', 'B', ''), med('m3', '2026-11-03T08:00', 'A', '2包')];
  assert.equal(stickersIn(logs, 'k1', '2026-11').length, 1);
  assert.deepEqual(recentMeds(logs, 'k1'), [{ med: 'A', dose: '2包' }, { med: 'B', dose: '' }]);
});

test('時差のある国へ移動して、記録の日付が「明日」になっていても読み込める', () => {
  const tomorrow = addDays(today(), 1);
  assert.doesNotThrow(() => validate({ version: 1, kids: [kid], logs: [poo('a', `${tomorrow}T08:00`, 4)] }));
});

test('バックアップのすすめ: 10件以上・30日以上していないとき', () => {
  assert.equal(backupDue({}, 9, '2026-11-15'), false);
  assert.equal(backupDue({}, 10, '2026-11-15'), true);
  assert.equal(backupDue({ last: '2026-10-17' }, 10, '2026-11-15'), false);
  assert.equal(backupDue({ snooze: '2026-11-16' }, 10, '2026-11-15'), false);
});
