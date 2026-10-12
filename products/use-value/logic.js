export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export function metrics(item) {
  const count = item.uses.length;
  const needed = Math.ceil(item.price / item.target);
  return { count, cost: count ? item.price/count : null, remaining: Math.max(0,needed-count), achieved: count > 0 && item.price/count <= item.target, progress: count ? Math.min(100, needed ? count/needed*100 : 100) : 0 };
}
export function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.items) || data.items.length > 200) throw new Error('対応していないバックアップ形式です。');
  const ids = new Set();
  const items = data.items.map(i => {
    if (!i || typeof i.id !== 'string' || i.id.length > 100 || !i.id || ids.has(i.id) || typeof i.name !== 'string' || !i.name.trim() || i.name.length > 60 || !Number.isInteger(i.price) || i.price < 0 || i.price > 1e8 || !Number.isInteger(i.target) || i.target < 1 || i.target > 1e8 || !validDate(i.purchased) || i.purchased > today() || !Number.isInteger(i.rating) || i.rating < 0 || i.rating > 5 || typeof i.note !== 'string' || i.note.length > 240 || !Array.isArray(i.uses) || i.uses.length > 100000 || !i.uses.every(d => validDate(d) && d >= i.purchased && d <= today()) || typeof i.photo !== 'string' || i.photo.length > 400000 || (i.photo && !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(i.photo))) throw new Error('記録の内容が不正です。復元を中止しました。');
    ids.add(i.id); return { id:i.id, name:i.name.trim(), price:i.price, target:i.target, purchased:i.purchased, rating:i.rating, note:i.note, uses:[...i.uses].sort(), photo:i.photo };
  });
  return { version:1, items };
}
