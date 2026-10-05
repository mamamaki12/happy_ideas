import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextEvent, spendTotal, yearSummary, validateBackup, daysBetween } from '../../products/oshi-techo/logic.js';

const oshis = [{ id: 'a', name: 'A', color: '#ff0000', emoji: '⭐' }, { id: 'b', name: 'B', color: '#0000ff', emoji: '🌙' }];
const entries = [
  { id: '1', oshi: 'a', type: 'spend', kind: '🎫 チケット', amount: 12000, date: '2026-03-10' },
  { id: '2', oshi: 'a', type: 'spend', kind: '🛍 グッズ', amount: 8000, date: '2026-03-12' },
  { id: '3', oshi: 'b', type: 'spend', kind: '🛍 グッズ', amount: 5000, date: '2026-07-01' },
  { id: '4', oshi: 'a', type: 'event', title: '東京公演', venue: '東京ドーム', date: '2026-03-15' },
  { id: '5', oshi: 'b', type: 'event', title: '大阪公演', venue: '京セラドーム', date: '2026-11-01' },
  { id: '6', oshi: 'a', type: 'spend', kind: '🎫 チケット', amount: 9000, date: '2025-12-24' },
];

test('oshi-techo: 次の予定・期間の合計', () => {
  assert.equal(nextEvent(entries, '2026-10-05').id, '5');
  assert.equal(nextEvent(entries, '2026-03-15').id, '4'); // 当日を含む
  assert.equal(nextEvent(entries, '2027-01-01'), null);
  assert.equal(spendTotal(entries, '2026-03'), 20000);
  assert.equal(spendTotal(entries, '2026', 'b'), 5000);
  assert.equal(daysBetween('2026-01-01', '2026-03-01'), 59);
});

test('oshi-techo: 年間まとめ', () => {
  const s = yearSummary(entries, oshis, 2026);
  assert.equal(s.total, 25000); assert.equal(s.events, 2);
  assert.deepEqual(s.topKind, ['🛍 グッズ', 13000]);
  assert.equal(s.busiest, 3);
  assert.equal(s.byOshi[0].id, 'a'); assert.equal(s.byOshi[0].total, 20000);
  assert.deepEqual(s.venues, ['東京ドーム', '京セラドーム']);
  assert.equal(yearSummary([], oshis, 2026).busiest, null);
});

test('oshi-techo: バックアップの検証（不正値の除去）', () => {
  assert.throws(() => validateBackup({ app: 'other' }));
  const d = validateBackup({ app: 'oshi-techo', budget: -5, oshis: [{ id: 'a', name: 'x'.repeat(99), color: 'red;background:url(x)', emoji: '⭐' }, { name: 'idなし' }],
    entries: [{ id: 'e1', oshi: 'a', type: 'spend', kind: '???', amount: -100, date: '2026-01-01' }, { id: 'e2', oshi: 'zzz', type: 'spend', amount: 1, date: '2026-01-01' }, { id: 'e3', oshi: 'a', type: 'event', date: 'not-a-date' }, { id: 'e4', oshi: 'a', type: 'spend', amount: 1e12, date: '2026-01-02' }] });
  assert.equal(d.oshis.length, 1); assert.equal(d.oshis[0].name.length, 30); assert.equal(d.oshis[0].color, '#ff5fa2');
  assert.deepEqual(d.entries.map((e) => e.id), ['e1', 'e4']);
  assert.equal(d.entries[0].kind, '📝 その他'); assert.equal(d.entries[0].amount, 0); assert.equal(d.entries[1].amount, 1e8);
  assert.equal(d.budget, 30000);
});

import { ticketAlerts, ticketStats } from '../../products/oshi-techo/logic.js';
test('oshi-techo: 当落・入金期限のアラート', () => {
  const ts = [
    { id: 'a', title: 'A', status: 'won', payBy: '2026-10-06' },
    { id: 'b', title: 'B', status: 'won', payBy: '2026-10-01' },
    { id: 'c', title: 'C', status: 'applied', resultOn: '2026-10-05' },
    { id: 'd', title: 'D', status: 'applied', resultOn: '2026-10-20' },
    { id: 'e', title: 'E', status: 'paid', payBy: '2026-10-05' },
    { id: 'f', title: 'F', status: 'lost' },
  ];
  const al = ticketAlerts(ts, '2026-10-05');
  assert.deepEqual(al.map((x) => [x.t.id, x.kind]), [['b', 'overdue'], ['a', 'pay'], ['c', 'result']]);
  assert.equal(al[1].text, '入金期限まであと1日');
  const st = ticketStats(ts);
  assert.deepEqual([st.applied, st.decided, st.won], [6, 4, 3]); assert.equal(st.rate, 0.75);
  assert.equal(ticketStats([]).rate, null);
});
