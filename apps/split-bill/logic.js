/**
 * 傾斜つき割り勘。people = [{name, weight}]。round 単位で切り上げ、余りを幹事が受け取る。
 * 返り値: { shares: [{name, amount}], collected, surplus }
 */
export function splitBill(total, people, round = 100) {
  const W = people.reduce((s, p) => s + Math.max(0, p.weight), 0);
  if (!(total > 0) || W === 0) return { shares: people.map((p) => ({ name: p.name, amount: 0 })), collected: 0, surplus: 0 };
  const shares = people.map((p) => ({ name: p.name, amount: Math.ceil(((total * Math.max(0, p.weight)) / W) / round) * round }));
  const collected = shares.reduce((s, x) => s + x.amount, 0);
  return { shares, collected, surplus: collected - total };
}
