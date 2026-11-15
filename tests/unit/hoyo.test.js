import test from 'node:test';
import assert from 'node:assert/strict';
import { memorials, upcoming, addYears, weekendBefore, wareki, prepFor, validate, sharePayload, readShare, toIcs, backupDue } from '../../products/hoyo/logic.js';

const person = (patch = {}) => ({ id: 'a1', name: '山田 一郎', kaimyo: '', relation: '父', death: '2026-03-10', kansai: false, memo: '', ...patch });
const dateOf = (list, kind) => list.find((m) => m.kind === kind).date;

test('法要の日: 命日を1日目として数える（関西の一部は前日から）', () => {
  const m = memorials(person());
  assert.equal(dateOf(m, 'd7'), '2026-03-16');
  assert.equal(dateOf(m, 'd49'), '2026-04-27');
  assert.equal(dateOf(m, 'd100'), '2026-06-17');
  assert.equal(dateOf(m, 'y1'), '2027-03-10');
  assert.equal(dateOf(m, 'y3'), '2028-03-10'); // 三回忌は2年後
  assert.equal(dateOf(m, 'y33'), '2058-03-10');
  const k = memorials(person({ kansai: true }));
  assert.equal(dateOf(k, 'd7'), '2026-03-15');
  assert.equal(dateOf(k, 'd49'), '2026-04-26');
  assert.equal(dateOf(k, 'd100'), '2026-06-17'); // 百か日は変わらない
});

test('うるう日の命日は、うるう年でない年は2月28日', () => {
  assert.equal(addYears('2024-02-29', 1), '2025-02-28');
  assert.equal(addYears('2024-02-29', 4), '2028-02-29');
});

test('これからの予定: 年忌の年は年忌として出し、ほかの年は祥月命日', () => {
  const list = upcoming([person({ death: '2020-05-01' })], '2026-01-01', 800);
  assert.deepEqual(list.map((e) => e.kind), ['y7', 's7']);
  assert.equal(list[0].key, 'a1:y7');
  assert.ok(list.every((e, i) => i === 0 || list[i - 1].date <= e.date));
});

test('直前の土曜日・和暦・準備の出し分け', () => {
  assert.equal(weekendBefore('2026-11-15'), '2026-11-14'); // 日曜 → 前日の土曜
  assert.equal(weekendBefore('2026-11-14'), '2026-11-14'); // 土曜はその日
  assert.equal(weekendBefore('2026-11-20'), '2026-11-14'); // 金曜 → 前の土曜
  assert.equal(wareki('2026-11-15'), '令和8年11月15日');
  assert.equal(prepFor('d49').length, 6);
  assert.equal(prepFor('y3').length, 6);
  assert.deepEqual(prepFor('d100').map(([id]) => id), ['temple', 'ofuse']);
  assert.equal(prepFor('d14').length, 0);
});

test('バックアップの形: 正しいものは通り、おかしなものは止める', () => {
  const ok = { version: 1, people: [person()], events: { 'a1:d49': { date: '2026-04-25', time: '10:30', place: '自宅', ofuse: 30000, done: false, tasks: { temple: true } } } };
  assert.deepEqual(validate(JSON.parse(JSON.stringify(ok))), ok);
  for (const bad of [
    { ...ok, people: [person({ death: '2999-01-01' })] },
    { ...ok, people: [person({ death: '2026-02-30' })] },
    { ...ok, people: [person(), person()] },
    { ...ok, people: [person({ id: '<script>' })] },
    { ...ok, events: { 'zz:d49': {} } },
    { ...ok, events: { 'a1:d8': {} } },
    { ...ok, events: { 'a1:d49': { ofuse: 1.5 } } },
    { ...ok, events: { 'a1:d49': { tasks: { hack: true } } } },
    { ...ok, events: { 'a1:d49': { time: '25:00' } } },
    { ...ok, events: [] },
  ]) assert.throws(() => validate(bad));
});

test('家族に送るリンク: 名前と命日だけ。読めないものは null', () => {
  const p = person({ memo: '内緒のメモ', kansai: true });
  const s = sharePayload([p]);
  assert.equal(JSON.stringify(s).includes('内緒'), false);
  assert.deepEqual(readShare(s), [{ name: '山田 一郎', kaimyo: '', relation: '父', death: '2026-03-10', kansai: true, memo: '' }]);
  assert.equal(readShare({ v: 1, p: [{ n: 'x', d: '2999-01-01' }] }), null);
  assert.equal(readShare({ v: 2, p: [] }), null);
  assert.equal(readShare(null), null);
});

test('カレンダー用ファイル: 動かした日で入り、記号をエスケープし、75バイトで折り返す', () => {
  const p = person({ name: '山田;一郎,テスト\\名前がとても長いときにも正しく折り返されるかを確かめるための名前' });
  const ics = toIcs([p], { 'a1:d49': { date: '2026-04-25', place: '自宅' } }, '2026-03-11', 1, new Date('2026-03-11T00:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260425'));
  assert.ok(ics.includes('UID:a1-d49-20260427@hoyo.happy-ideas'));
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('山田\\;一郎\\,テスト\\\\名前'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});

test('バックアップのすすめ: 記録があり30日以上していないとき。「あとで」の間は出さない', () => {
  assert.equal(backupDue({}, 0, '2026-11-15'), false);
  assert.equal(backupDue({}, 1, '2026-11-15'), true);
  assert.equal(backupDue({ last: '2026-10-17' }, 1, '2026-11-15'), false);
  assert.equal(backupDue({ last: '2026-10-16' }, 1, '2026-11-15'), true);
  assert.equal(backupDue({ snooze: '2026-11-16' }, 1, '2026-11-15'), false);
});
