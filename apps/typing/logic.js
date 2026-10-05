// ひらがな → ローマ字の複数表記を受け付けるタイピング判定
const T = {
  'あ': ['a'], 'い': ['i'], 'う': ['u', 'wu'], 'え': ['e'], 'お': ['o'], 'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu'], 'け': ['ke'], 'こ': ['ko', 'co'],
  'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'], 'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'], 'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'], 'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'], 'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
  'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'xn'], 'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'], 'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'], 'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'], 'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
  'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'], 'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'], 'っ': ['xtu', 'ltu', 'xtsu'],
  'ー': ['-'], '、': [','], '。': ['.'], '！': ['!'], '？': ['?'], ' ': [' '],
  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'], 'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'], 'ちゃ': ['cha', 'tya', 'cya'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちょ': ['cho', 'tyo', 'cyo'],
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'], 'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'], 'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'], 'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'], 'じゃ': ['ja', 'zya', 'jya'], 'じゅ': ['ju', 'zyu', 'jyu'], 'じょ': ['jo', 'zyo', 'jyo'], 'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'], 'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
  'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'], 'てぃ': ['thi'], 'でぃ': ['dhi'], 'うぃ': ['wi'], 'うぇ': ['we'], 'しぇ': ['she', 'sye'], 'ちぇ': ['che', 'tye'], 'じぇ': ['je', 'zye'],
};
const VOWELS = 'aiueon';

/** かな文字列を「次に打つ単位」の候補ローマ字リストの配列にする */
export function chunks(kana) {
  const out = []; let i = 0;
  while (i < kana.length) {
    const two = kana.slice(i, i + 2); const one = kana[i];
    if (one === 'っ' && i + 1 < kana.length) {
      // 促音: 次の子音を重ねる（または xtu）
      const nextKey = T[kana.slice(i + 1, i + 3)] ? kana.slice(i + 1, i + 3) : kana[i + 1];
      const next = T[nextKey] || [kana[i + 1]];
      const doubled = next.filter((r) => !VOWELS.includes(r[0])).map((r) => r[0] + r);
      out.push({ kana: `っ${nextKey}`, romaji: [...doubled, ...T['っ'].flatMap((x) => next.map((r) => x + r))] });
      i += 1 + nextKey.length; continue;
    }
    if (T[two] && two.length === 2) { out.push({ kana: two, romaji: [...T[two], ...T[two[0]].flatMap((a) => (T[two[1]] || []).map((b) => a + b))] }); i += 2; continue; }
    if (one === 'ん') {
      const nxt = kana[i + 1];
      const ok1 = nxt && !('あいうえおなにぬねのやゆよん'.includes(nxt));
      out.push({ kana: 'ん', romaji: ok1 ? ['nn', 'xn', 'n'] : ['nn', 'xn'] }); i += 1; continue;
    }
    out.push({ kana: one, romaji: T[one] || [one] }); i += 1;
  }
  return out;
}

/** 状態 {ci, buf} に1キー入力。正しければ新しい状態、間違いなら null */
export function typeKey(cs, state, key) {
  const { ci, buf } = state;
  if (ci >= cs.length) return null;
  const nb = buf + key.toLowerCase();
  const cands = cs[ci].romaji.filter((r) => r.startsWith(nb));
  if (!cands.length) return null;
  if (cands.includes(nb) && cands.length === 1) return { ci: ci + 1, buf: '' };
  // 「n」のように確定と継続の両方がありうる場合は、確定扱いにして次へ（次の入力が n なら nn として吸収）
  if (cands.includes(nb)) return { ci: ci + 1, buf: '', pending: nb };
  return { ci, buf: nb };
}
