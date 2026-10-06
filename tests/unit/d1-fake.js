// Cloudflare D1 と同じ形（prepare().bind().first()/run()/all()）で node:sqlite を使うテスト用の偽物
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function fakeD1(schemaPath) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(schemaPath, 'utf8'));
  return {
    prepare(sql) {
      let args = [];
      const stmt = db.prepare(sql);
      const api = {
        bind(...a) { args = a; return api; },
        async first() { const r = stmt.get(...args); return r ? { ...r } : null; },
        async run() { stmt.run(...args); return { success: true }; },
        async all() { return { results: stmt.all(...args).map((r) => ({ ...r })) }; },
      };
      return api;
    },
  };
}
