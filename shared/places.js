// 座標の入力・地点リスト部品（避難場所・聖地・スタンプラリーで共用）
import { h, render, getPosition, toast, uid, distance, fmtDistance, mapUrl, confirmDelete } from './lib.js';

/**
 * テキストから緯度経度を取り出す。対応: "35.68, 139.76" / Googleマップの @lat,lon や q=lat,lon / OSM の mlat=&mlon= / geo:lat,lon
 * @returns {{lat:number, lon:number} | null}
 */
export function parseCoords(text) {
  if (!text) return null;
  const t = String(text).trim();
  const tryPair = (a, b) => {
    const lat = Number(a); const lon = Number(b);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
  };
  let m = t.match(/mlat=(-?\d+(?:\.\d+)?).*?mlon=(-?\d+(?:\.\d+)?)/);
  if (m) return tryPair(m[1], m[2]);
  m = t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) || t.match(/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i) || t.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (m) return tryPair(m[1], m[2]);
  m = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，、\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) return tryPair(m[1], m[2]);
  return null;
}

/** 地点追加フォーム（現在地 or 座標・地図URLの貼り付け） */
export function placeForm({ onAdd, namePlaceholder = '名前', idPrefix = 'pl' }) {
  const nameIn = h('input', { id: `${idPrefix}-name`, placeholder: namePlaceholder, required: true, maxlength: 40 });
  const coordIn = h('input', { id: `${idPrefix}-coord`, placeholder: '35.6812, 139.7671 または地図のURL', inputmode: 'url' });
  const add = (c) => { onAdd({ id: uid(), name: nameIn.value.trim() || '名前なし', lat: c.lat, lon: c.lon }); nameIn.value = ''; coordIn.value = ''; };
  return h('form', { class: 'card', onsubmit: (e) => {
    e.preventDefault();
    const c = parseCoords(coordIn.value);
    if (!c) return toast('座標を読み取れませんでした。「緯度, 経度」か地図のURLを貼ってください', 4000);
    add(c);
  } },
    h('h2', {}, '地点を追加'),
    h('div', { class: 'field' }, h('label', { for: `${idPrefix}-name` }, '名前'), nameIn),
    h('div', { class: 'field' }, h('label', { for: `${idPrefix}-coord` }, '座標または地図URL'), coordIn),
    h('div', { class: 'btn-row' },
      h('button', { type: 'submit' }, '座標で追加'),
      h('button', { type: 'button', class: 'primary', onclick: async (e) => {
        const b = e.currentTarget; b.disabled = true;
        try { const p = await getPosition(); add({ lat: p.coords.latitude, lon: p.coords.longitude }); } catch (err) { toast(err.message, 4000); }
        b.disabled = false;
      } }, '📍 いまいる場所を追加')));
}

/** 地点リストの描画（here があれば距離順） */
export function placeList(container, places, { here, onSelect, onDelete, extra } = {}) {
  const sorted = here ? [...places].sort((a, b) => distance(here, a) - distance(here, b)) : places;
  render(container, sorted.length === 0 ? h('p', { class: 'empty' }, 'まだ地点がありません') :
    h('ul', { class: 'list' }, sorted.map((p) => h('li', {},
      h('div', { class: 'grow' }, h('b', {}, p.name), h('div', { class: 'sub' }, here ? fmtDistance(distance(here, p)) : `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`)),
      extra?.(p),
      onSelect ? h('button', { class: 'small', onclick: () => onSelect(p) }, '案内') : null,
      h('a', { class: 'btn small', href: mapUrl(p.lat, p.lon), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${p.name}を地図で見る` }, '🗺'),
      onDelete ? h('button', { class: 'small ghost', 'aria-label': `${p.name}を削除`, onclick: () => { if (confirmDelete(p.name)) onDelete(p); } }, '×') : null))));
}
