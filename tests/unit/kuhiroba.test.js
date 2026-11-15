import test from 'node:test';
import assert from 'node:assert/strict';
import { countMora, moraOf, topicFor, findKigo, kigoChoices, checkPost, checkPhoto, validate, backupDue } from '../../products/kuhiroba/logic.js';

test('音の数: 小さい「ゃゅょ」は前と合わせて1つ、「っ」「ー」「ん」は1つ', () => {
  assert.deepEqual(countMora('ふるいけや かわずとびこむ みずのおと'), { parts: [5, 7, 5], total: 17 });
  assert.equal(moraOf('きゃべつ'), 3);
  assert.equal(moraOf('がっこう'), 4);
  assert.equal(moraOf('コーヒー'), 4);
  assert.equal(moraOf('しんぶん'), 4);
  assert.equal(moraOf('ヴァイオリン'), 5);
  assert.deepEqual(countMora('かきくえば　かねがなるなり　ほうりゅうじ'), { parts: [5, 7, 5], total: 17 });
  assert.equal(countMora('古池や 蛙飛びこむ 水の音'), null); // 漢字は数えられない
  assert.equal(countMora(''), null);
});

test('お題: 月の週ごとに変わり、季節も付く', () => {
  assert.deepEqual(topicFor('2026-11-15'), { word: '時雨', season: '冬', hint: '降ったりやんだりする冷たい雨' });
  assert.equal(topicFor('2026-11-01').word, '小春');
  assert.equal(topicFor('2026-11-30').word, '七五三');
  assert.equal(topicFor('2026-08-03').season, '秋');
  for (let m = 1; m <= 12; m++) for (const d of [1, 8, 15, 22, 29]) assert.ok(topicFor(`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`).word);
  assert.equal(findKigo('木枯や 竹に隠れて しづまりぬ'), '木枯');
  assert.equal(findKigo('なにもない'), '');
  assert.ok(kigoChoices('2026-11-15').includes('冬至'));
});

test('広場に出すときの決まり', () => {
  assert.deepEqual(checkPost({ text: '  古池や\n蛙飛びこむ　水の音 ', kigo: '蛙' }), { text: '古池や 蛙飛びこむ 水の音', name: 'よみ人しらず', kigo: '蛙' });
  for (const b of [{ text: 'line.me/ti/p/xxx へ' }, { text: 'http://x' }, { text: 'あ'.repeat(41) }, { text: 'ok な句です', name: 'あ'.repeat(13) }, { text: 'ok な句です', kigo: 1 }, { text: 'ok\u0007な句です' }, null]) assert.throws(() => checkPost(b));
  assert.equal(checkPhoto(''), null);
  assert.equal(checkPhoto(Buffer.from([0xff, 0xd8, 0xff, 0xdb]).toString('base64')).length, 4);
  assert.throws(() => checkPhoto(Buffer.from('GIF89a').toString('base64')));
});

test('句帳の保存データ', () => {
  const e = { id: 'a', text: '古池や 蛙飛びこむ 水の音', yomi: '', kigo: '蛙', date: '2026-11-15', memo: '', photo: '' };
  const ok = validate({ version: 1, entries: [e, { ...e, id: 'b', date: '2026-11-16', posted: { id: 'c'.repeat(32), token: 'd'.repeat(64) } }] });
  assert.deepEqual(ok.entries.map((x) => x.id), ['b', 'a']); // 新しい日付が先
  for (const bad of [{ ...e, photo: 'data:image/svg+xml;base64,PHN2Zz4=' }, { ...e, date: '2999-01-01' }, { ...e, text: '' }, { ...e, posted: { id: 'x', token: 'y' } }, { ...e, memo: 1 }]) assert.throws(() => validate({ version: 1, entries: [bad] }));
  assert.throws(() => validate({ version: 1, entries: [e, e] }));
  assert.equal(backupDue({}, 4, '2026-11-15'), false);
  assert.equal(backupDue({}, 5, '2026-11-15'), true);
});
