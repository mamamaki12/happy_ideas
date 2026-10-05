import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, levenshtein, similarity, countFillers, speechRate } from '../../shared/text.js';
import { detectPitch, noteOf } from '../../apps/pitch-meter/logic.js';
import { splitTasks } from '../../apps/voice-todo/logic.js';
import { makeStory, HEROES, PLACES, ITEMS } from '../../apps/bedtime-story/logic.js';

test('text: 正規化と編集距離', () => {
  assert.equal(normalize('Hello, World!'), 'hello world');
  assert.equal(normalize('ＡＢＣ　１２３'), 'abc 123');
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein([], ['a']), 1);
});
test('text: 発音の一致率', () => {
  assert.equal(similarity('The weather is nice.', 'the weather is nice').score, 1);
  const r = similarity('Rice and lice', 'rice and rice');
  assert.ok(r.score > 0.6 && r.score < 0.7);
  assert.deepEqual(r.words.map((w) => w.ok), [true, true, false]);
  assert.equal(similarity('こんにちは', 'こんにちわ').score, 0.8); // 日本語は文字単位
  assert.equal(similarity('', '').score, 1);
});
test('text: フィラーと話速', () => {
  assert.deepEqual(countFillers('えーと、あのー、今日はですね、えーと'), { 'えーと': 2, 'あのー': 1 });
  assert.deepEqual(countFillers('um I think uh yes'), { um: 1, uh: 1 });
  assert.equal(speechRate('あいうえお', 60000).perMin, 5);
  assert.equal(speechRate('one two three', 30000).perMin, 6);
  assert.equal(speechRate('one two three', 30000).unit, 'wpm');
});

test('pitch: サイン波の音程を当てる', () => {
  const sr = 48000;
  for (const f of [110, 220, 440, 659.25]) {
    const buf = new Float32Array(4096).map((_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / sr) + 0.15 * Math.sin((4 * Math.PI * f * i) / sr));
    const got = detectPitch(buf, sr);
    assert.ok(Math.abs(got - f) / f < 0.01, `${f} → ${got}`);
  }
  assert.equal(detectPitch(new Float32Array(4096), sr), null); // 無音
});
test('pitch: 音名', () => {
  assert.deepEqual(noteOf(440), { name: 'ラ4', en: 'A4', cents: 0, midi: 69 });
  assert.equal(noteOf(261.63).en, 'C4');
  assert.ok(noteOf(445).cents > 15);
});

test('voice-todo: 話した文を分割', () => {
  assert.deepEqual(splitTasks('牛乳を買う、それから銀行に行く'), ['牛乳を買う', '銀行に行く']);
  assert.deepEqual(splitTasks('掃除。洗濯'), ['掃除', '洗濯']);
  assert.deepEqual(splitTasks(''), []);
});

test('bedtime-story: 同じ入力なら同じお話・名前が入る', () => {
  const a = makeStory(HEROES[0], PLACES[1], ITEMS[2], 5);
  assert.deepEqual(a, makeStory(HEROES[0], PLACES[1], ITEMS[2], 5));
  assert.ok(a[0].includes(HEROES[0]) && a[0].includes(PLACES[1]) && a[1].includes(ITEMS[2]));
  assert.equal(a.at(-1), 'おやすみなさい。いい ゆめを。');
});
