// 地点データを GeoJSON に書き出す／読み込む（他の人のファイルを取り込むので厳しくチェックする）
export function toGeoJSON(points, props = (p) => p) {
  return { type: 'FeatureCollection', features: points.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: props(p) })) };
}
/** 不正な形・範囲外の座標・巨大なデータは捨てる。props は文字列だけ残し、長さを切る */
export function fromGeoJSON(obj, { maxFeatures = 1000, keys = [], maxLen = 120 } = {}) {
  if (!obj || obj.type !== 'FeatureCollection' || !Array.isArray(obj.features)) throw new Error('GeoJSON（FeatureCollection）ではありません');
  const out = [];
  for (const f of obj.features.slice(0, maxFeatures)) {
    const c = f?.geometry?.type === 'Point' ? f.geometry.coordinates : null;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[1]) > 90 || Math.abs(c[0]) > 180) continue;
    const p = { lat: c[1], lon: c[0] };
    for (const k of keys) { const v = f.properties?.[k]; if (typeof v === 'string') p[k] = v.slice(0, maxLen); else if (Number.isFinite(v)) p[k] = v; }
    out.push(p);
  }
  return out;
}
