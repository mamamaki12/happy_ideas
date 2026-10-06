import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toGeoJSON, fromGeoJSON } from '../../shared/geojson.js';

test('geojson: 往復と不正データの除外', () => {
  const g = toGeoJSON([{ lat: 35, lon: 139, kind: 'a' }], (p) => ({ kind: p.kind }));
  assert.deepEqual(fromGeoJSON(g, { keys: ['kind'] }), [{ lat: 35, lon: 139, kind: 'a' }]);
  assert.throws(() => fromGeoJSON({ type: 'Feature' }));
  assert.throws(() => fromGeoJSON(null));
  const bad = { type: 'FeatureCollection', features: [
    { geometry: { type: 'Point', coordinates: [200, 35] } },
    { geometry: { type: 'LineString', coordinates: [[1, 2]] } },
    { geometry: { type: 'Point', coordinates: ['1', 2] } },
    { geometry: { type: 'Point', coordinates: [139, 35] }, properties: { kind: { evil: 1 }, note: 'x'.repeat(500) } },
  ] };
  const r = fromGeoJSON(bad, { keys: ['kind', 'note'] });
  assert.equal(r.length, 1); assert.equal(r[0].kind, undefined); assert.equal(r[0].note.length, 120);
  assert.equal(fromGeoJSON({ type: 'FeatureCollection', features: Array(2000).fill({ geometry: { type: 'Point', coordinates: [0, 0] } }) }).length, 1000);
});
