// おやすみ前のお話をテンプレートから組み立てる（同じ組み合わせなら同じお話になる）
export const HEROES = ['くまのポポ', 'うさぎのミミ', 'ねこのタマ', 'ちいさなロボット', 'こぐまのくう', 'ほしのこ'];
export const PLACES = ['もりのおく', 'うみのそこ', 'くものうえ', 'おかしのまち', 'つきのひろば', 'ゆきのやま'];
export const ITEMS = ['ひかるどんぐり', 'ふしぎなかさ', 'ねむいランプ', 'うたうかい', 'あたたかいマフラー', 'ちいさなかぎ'];

function rng(seed) { let x = seed % 2147483647 || 1; return () => (x = (x * 48271) % 2147483647) / 2147483647; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export function makeStory(hero, place, item, seed = 1) {
  const r = rng(seed + hero.length * 31 + place.length * 17 + item.length * 7);
  const friend = pick(r, ['ふくろうのホー', 'りすのクル', 'かめのノンノ', 'ことりのピピ']);
  const feeling = pick(r, ['どきどき', 'わくわく', 'ちょっぴりふあん']);
  return [
    `むかしむかし、${place}に、${hero}が すんでいました。`,
    `あるよる、${hero}は、${item}を みつけました。`,
    `「これは なんだろう」${hero}は ${feeling}しながら、そっと さわってみました。`,
    `すると、${item}が やさしく ひかって、${friend}が あらわれました。`,
    `「いっしょに おさんぽしよう」と、${friend}は いいました。`,
    `ふたりは ${place}を ゆっくり あるきました。かぜが さらさら、ほしが きらきら。`,
    `たくさん あるいて、${hero}は だんだん ねむくなってきました。`,
    `「きょうは たのしかったね。また あしたね」`,
    `${hero}は ${item}を まくらもとに おいて、ふかふかの おふとんに もぐりました。`,
    'おやすみなさい。いい ゆめを。',
  ];
}
