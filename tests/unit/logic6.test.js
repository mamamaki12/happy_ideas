import { test } from 'node:test';
import assert from 'node:assert/strict';
import { predict } from '../../apps/cycle-memo/logic.js';
import { toIcs } from '../../apps/family-schedule/logic.js';
import { rainLevel, summarize as rainSummary } from '../../apps/rain-timeline/logic.js';
import { summarize, splitSentences } from '../../apps/local-summary/logic.js';
import { encodeData, decodeData, str } from '../../shared/urldata.js';

test('cycle-memo: 平均周期と次回予測', () => {
  const p = predict(['2026-07-01', '2026-07-30', '2026-08-28', '2026-09-26']);
  assert.equal(p.avg, 29); assert.equal(p.next, '2026-10-25'); assert.equal(p.samples, 3);
  assert.equal(predict(['2026-09-01']).avg, 28); // 1回だけなら初期値
  assert.equal(predict([]), null);
  assert.equal(predict(['2026-01-01', '2026-01-05', '2026-02-02']).samples, 1); // 15日未満の間隔は除外
});

test('family-schedule: iCalendar の生成とエスケープ', () => {
  const ics = toIcs([{ date: '2026-10-10', time: '09:30', title: '参観日; 2年1組, 体育館', who: 'パパ' }, { date: '2026-10-31', time: '', title: 'ハロウィン' }], new Date('2026-10-05T00:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20261010T093000'));
  assert.ok(ics.includes('SUMMARY:参観日\; 2年1組\\, 体育館'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261031') && ics.includes('DTEND;VALUE=DATE:20261101'));
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  assert.ok(!toIcs([{ date: '2026-10-10', title: 'a\nEND:VCALENDAR' }]).includes('\nEND:VCALENDAR\r\nEND:VEVENT')); // 改行インジェクション対策
});

test('rain-timeline: 雨の強さとまとめ', () => {
  assert.equal(rainLevel(0).label, 'なし'); assert.equal(rainLevel(12).label, '強い雨'); assert.equal(rainLevel(55).cls, 'danger');
  const hrs = (arr) => arr.map(([mm, prob], i) => ({ time: `2026-10-05T${String(i).padStart(2, '0')}:00`, mm, prob }));
  const s = rainSummary(hrs([[0, 10], [0, 20], [2, 80], [8, 90], [0.2, 30], [0, 10]]));
  assert.equal(s.start, '2026-10-05T02:00'); assert.equal(s.end, '2026-10-05T04:00'); assert.equal(s.peak.mm, 8); assert.equal(s.laundry, false);
  assert.equal(rainSummary(hrs([[0, 0], [0, 10]])).start, null);
  assert.equal(rainSummary(hrs([[0, 0], [0, 10]])).laundry, true);
});

test('local-summary: 文の分割と抽出要約', () => {
  assert.deepEqual(splitSentences('今日は晴れ。明日は雨！あさっては？'), ['今日は晴れ。', '明日は雨！', 'あさっては？']);
  const text = '熱中症の対策には水分補給が大切です。特に高齢者は水分補給を意識しましょう。今日の昼ごはんはカレーでした。暑さ指数が高い日は外出を控えましょう。水分補給と休憩で熱中症を防げます。';
  const r = summarize(text, 2);
  assert.equal(r.length, 2);
  assert.ok(!r.includes('今日の昼ごはんはカレーでした。'), `関係ない文が選ばれた: ${r}`);
  assert.deepEqual(summarize('短い。', 3), ['短い。']);
  const en = summarize('Solar power is growing fast. Solar panels are cheaper than ever. My cat likes fish. Experts expect solar power to lead growth.', 2);
  assert.ok(!en.includes('My cat likes fish.'));
});

test('urldata: 往復・改ざん・上限', () => {
  const o = { a: '日本語🎉', n: [1, 2] };
  assert.deepEqual(decodeData(encodeData(o)), o);
  assert.equal(decodeData('***'), null);
  assert.equal(decodeData('a'.repeat(30000)), null);
  assert.equal(decodeData(encodeData('x').slice(0, -1) + '%'), null);
  assert.equal(str(123, 5, 'fb'), 'fb'); assert.equal(str('abcdef', 3), 'abc');
});
