// 内閣府などの目安: 1人1日 水3L、食料3食。最低3日分、できれば1週間分。
export function requiredStock({ adults = 1, kids = 0, days = 3, pets = 0 }) {
  const people = adults + kids;
  return [
    { key: 'water', name: '飲料水', unit: 'L', need: Math.ceil(people * 3 * days + pets * 0.5 * days) },
    { key: 'food', name: '主食（ごはん・パン等）', unit: '食', need: people * 3 * days },
    { key: 'toilet', name: '簡易トイレ', unit: '回分', need: people * 5 * days },
    { key: 'battery', name: '乾電池', unit: '本', need: 8 },
    { key: 'gas', name: 'カセットボンベ', unit: '本', need: Math.ceil(days * 1.2) + (people > 2 ? 2 : 0) },
    { key: 'tissue', name: 'トイレットペーパー', unit: 'ロール', need: Math.max(1, Math.round(people * 0.4 * days)) },
    ...(kids ? [{ key: 'kids', name: 'ミルク・おむつ等', unit: '日分', need: days }] : []),
    ...(pets ? [{ key: 'pet', name: 'ペットフード', unit: '日分', need: days }] : []),
  ];
}
