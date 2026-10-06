import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunks, typeKey } from '../../apps/typing/logic.js';
import { schedule, parseCsv } from '../../apps/flashcards/logic.js';
import { weekStreak, thisWeekCount, weekStart } from '../../apps/habit/logic.js';
import { packingList } from '../../apps/packing/logic.js';
import { requiredStock } from '../../apps/bousai-stock/logic.js';
import { nextBirthday } from '../../apps/birthday/logic.js';
import { streak } from '../../apps/checkin/logic.js';
import { scoreSetlist } from '../../apps/setlist/logic.js';
import { analyzeTaps } from '../../apps/rhythm-tap/logic.js';
import { doseStatus } from '../../apps/med-reminder/logic.js';
import { budgetStatus } from '../../apps/trip-budget/logic.js';
import { SOS } from '../../apps/sos-light/logic.js';
import { wrapLines } from '../../shared/canvas-text.js';

/** ローマ字列を打ち込んで、全部受理されるか */
function typeAll(kana, romaji) {
  const cs = chunks(kana); let st = { ci: 0, buf: '' }; let pending = '';
  for (const k of romaji) {
    if (pending === 'n' && k === 'n') { pending = ''; continue; }
    pending = '';
    const ns = typeKey(cs, st, k);
    if (!ns) return false;
    st = { ci: ns.ci, buf: ns.buf }; pending = ns.pending || '';
  }
  return st.ci === cs.length;
}
test('typing: 複数のローマ字表記を受け付ける', () => {
  assert.ok(typeAll('しんぶん', 'shinbunn'));
  assert.ok(typeAll('しんぶん', 'sinnbunn'));
  assert.ok(typeAll('ちょっと', 'chotto'));
  assert.ok(typeAll('ちょっと', 'tyotto'));
  assert.ok(typeAll('ちょっと', 'choxtuto'));
  assert.ok(typeAll('きょう', 'kyou'));
  assert.ok(typeAll('きょう', 'kixyou'));
  assert.ok(typeAll('かんい', 'kanni')); // ん+母音は nn 必須
  assert.ok(!typeAll('かんい', 'kani'));
  assert.ok(typeAll('ふぁん', 'fann'));
  assert.ok(typeAll('じゅんび', 'junbi'));
  assert.ok(typeAll('えねるぎー', 'enerugi-'));
  assert.ok(!typeAll('すし', 'susu'));
});

test('flashcards: 間隔反復', () => {
  const now = 0;
  let c = schedule({}, 2, now); assert.equal(c.interval, 1);
  c = schedule(c, 2, now); assert.equal(c.interval, 3);
  c = schedule(c, 2, now); assert.ok(c.interval >= 7);
  const forgot = schedule(c, 0, now); assert.equal(forgot.reps, 0); assert.equal(forgot.due, 60000);
  assert.ok(schedule({}, 1).ease < 2.5);
});
test('flashcards: CSV（クォート・タブ・改行）', () => {
  assert.deepEqual(parseCsv('a,b\n"c,1","d ""q"""\r\nx\tY\n\nonly-one'), [{ front: 'a', back: 'b' }, { front: 'c,1', back: 'd "q"' }, { front: 'x', back: 'Y' }]);
});

test('habit: 週n回の連続週数', () => {
  const today = new Date(2026, 9, 7); // 水曜
  assert.equal(weekStart(today), '2026-10-05');
  const dates = ['2026-10-05', '2026-10-06', '2026-09-29', '2026-09-30', '2026-09-22', '2026-09-23'];
  assert.equal(thisWeekCount(dates, today), 2);
  assert.equal(weekStreak(dates, 2, today), 3);
  assert.equal(weekStreak(dates, 3, today), 0);
  assert.equal(weekStreak(['2026-09-29', '2026-09-30'], 2, today), 1); // 今週未達でも先週まで数える
});

test('packing: 条件で持ち物が変わる', () => {
  const flat = (o) => packingList(o).flatMap(([, i]) => i);
  assert.ok(flat({ nights: 2 }).includes('下着 ×3'));
  assert.ok(flat({ abroad: true }).includes('パスポート'));
  assert.ok(flat({ season: 'winter' }).includes('コート'));
  assert.ok(flat({ purposes: ['live'] }).includes('ペンライト・電池'));
  assert.ok(!flat({}).includes('パスポート'));
});

test('bousai: 備蓄量', () => {
  const r = Object.fromEntries(requiredStock({ adults: 2, kids: 1, days: 3 }).map((x) => [x.key, x.need]));
  assert.equal(r.water, 27);
  assert.equal(r.food, 27);
  assert.ok('kids' in r);
  assert.ok(!('pet' in r));
});

test('birthday: 次の誕生日と年齢', () => {
  const t = new Date(2026, 9, 5);
  assert.deepEqual([nextBirthday('10-05', 1990, t).days, nextBirthday('10-05', 1990, t).age], [0, 36]);
  assert.equal(nextBirthday('10-04', null, t).days, 364);
  assert.equal(nextBirthday('02-29', 2000, t).date.getDate(), 28); // 2027年は平年
});

test('checkin: 連続日数', () => {
  assert.equal(streak(['2026-10-05', '2026-10-04', '2026-10-03', '2026-10-01'], '2026-10-05'), 3);
  assert.equal(streak(['2026-10-04', '2026-10-03'], '2026-10-05'), 2); // 今日まだでも昨日まで続いていれば数える
  assert.equal(streak(['2026-10-02'], '2026-10-05'), 0);
});

test('setlist: 採点', () => {
  const r = scoreSetlist(['A', 'B', 'C', 'D'], ['A', 'C', 'B', 'E', 'D']);
  assert.equal(r.hits, 4); assert.equal(r.exact, 1); assert.equal(r.opener, true); assert.equal(r.closer, true);
  assert.equal(r.score, 4 * 10 + 5 + 20 + 20);
  assert.equal(scoreSetlist(['ａ'], ['A']).hits, 1); // 全角半角・大小文字の違いは無視
});

test('rhythm-tap: ずれの分析', () => {
  const r = analyzeTaps([1010, 1510, 2010], 1000, 500);
  assert.deepEqual(r.offsets, [10, 10, 10]); assert.equal(r.grade, 'S'); assert.equal(Math.round(r.sd), 0);
  assert.equal(analyzeTaps([], 0, 500).grade, '-');
  assert.ok(analyzeTaps([1100, 1600], 1000, 500).mean > 0); // 遅れ
});

test('med-reminder: 服薬状態', () => {
  const now = new Date(2026, 9, 5, 9, 30);
  assert.deepEqual(doseStatus(['08:00', '09:00', '12:00', '07:00'], ['07:00'], now).map((d) => d.state), ['missed', 'due', 'upcoming', 'taken']);
});

test('trip-budget: 予算のペース', () => {
  const st = budgetStatus({ total: 30000, start: '2026-10-05', end: '2026-10-07', spent: [12000], today: '2026-10-05' });
  assert.equal(st.days, 3); assert.equal(st.elapsed, 1); assert.equal(st.left, 18000);
  assert.ok(st.pace > 1); assert.equal(Math.round(st.perDay), 6000);
});

test('sos-light: モールスの並び', () => {
  const on = SOS.filter(([o]) => o).map(([, l]) => l);
  assert.deepEqual(on, [1, 1, 1, 3, 3, 3, 1, 1, 1]);
});

test('canvas-text: 句読点を行頭に置かない', () => {
  const ctx = { measureText: (s) => ({ width: [...s].length * 10 }) };
  const lines = wrapLines(ctx, 'あいうえお、かきく', 50);
  assert.ok(lines.every((l) => !l.startsWith('、')));
  assert.deepEqual(wrapLines(ctx, '1行目\n2行目', 100), ['1行目', '2行目']);
});
