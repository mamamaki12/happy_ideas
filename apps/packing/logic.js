// 日数・季節・目的から持ち物リストを作る
export function packingList({ nights = 1, season = 'summer', purposes = [], abroad = false }) {
  const days = nights + 1;
  const L = [
    ['必需品', ['財布', 'スマホ', '充電器・ケーブル', '身分証', '常備薬', '保険証（コピー）']],
    ['服', [`下着 ×${days}`, `靴下 ×${days}`, `トップス ×${Math.min(days, 4)}`, `ボトムス ×${Math.max(1, Math.ceil(days / 3))}`, 'パジャマ', ...(season === 'winter' ? ['コート', '手袋', 'マフラー', 'カイロ'] : season === 'summer' ? ['帽子', '日焼け止め', '汗ふきシート'] : ['羽織るもの'])]],
    ['洗面', ['歯ブラシ', 'スキンケア', 'コンタクト・メガネ', 'ヘアゴム・ブラシ']],
  ];
  if (nights >= 3) L.push(['長めの旅', ['洗濯ネット', '折りたたみバッグ', 'モバイルバッテリー']]);
  if (purposes.includes('beach')) L.push(['海・プール', ['水着', 'ラッシュガード', 'ビーチサンダル', '防水スマホケース']]);
  if (purposes.includes('hike')) L.push(['アウトドア', ['歩きやすい靴', 'レインウェア', '水筒', '虫よけ', '絆創膏']]);
  if (purposes.includes('live')) L.push(['ライブ・推し活', ['チケット（電子なら充電確認）', 'ペンライト・電池', 'うちわ', 'タオル', '双眼鏡']]);
  if (purposes.includes('business')) L.push(['仕事', ['名刺', 'PC・電源', 'スーツ・シャツ', '資料']]);
  if (purposes.includes('kids')) L.push(['子ども連れ', ['おむつ・おしりふき', '着替え多め', 'おやつ', 'おもちゃ・絵本', '母子手帳']]);
  if (abroad) L.push(['海外', ['パスポート', '変換プラグ', '現地通貨・クレジットカード', '海外旅行保険の証書', 'eSIM・Wi-Fi']]);
  return L;
}
