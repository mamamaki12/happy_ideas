import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, inkFor, darkenFor } from '../../shared/color.js';

test('color: WCAG コントラスト比', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
  assert.ok(Math.abs(contrast('#e8590c', '#ffffff') - 3.58) < 0.02);
  assert.ok(contrast('#c2410c', '#ffffff') >= 4.5); // 新しいアクセント色
  assert.equal(inkFor('#ffd43b'), '#111111'); // 明るい黄色には黒文字
  assert.equal(inkFor('#1c3d5a'), '#ffffff');
  for (const c of ['#ff5fa2', '#ffd43b', '#00c7be', '#ffffff', '#7950f2']) assert.ok(contrast(darkenFor(c), '#f7f6f2') >= 4.5, c);
  assert.equal(darkenFor('#222222'), '#222222'); // もともと濃い色はそのまま
});
