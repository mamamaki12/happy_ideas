// GET  /api/haiku?before=<created>&kigo=<季語> — 広場の句（新しい順に30件）
// POST /api/haiku { text, kigo, name, photo?, tokenHash } — 句を広場に出す
import { json, readJson, sameOrigin, randomHex, HEX64, PAGE } from './_lib.js';
import { checkPost, checkPhoto, LIMIT } from '../../../products/kuhiroba/logic.js';
import { overRateLimit, LIMITS } from '../../../server/limits.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const before = Number(q.get('before')) || Number.MAX_SAFE_INTEGER;
  const kigo = (q.get('kigo') || '').slice(0, LIMIT.kigo);
  const sql = `SELECT id, text, kigo, name, has_photo, likes, created FROM haiku WHERE hidden = 0 AND created < ?${kigo ? ' AND kigo = ?' : ''} ORDER BY created DESC LIMIT ${PAGE}`;
  const stmt = env.DB.prepare(sql);
  const { results } = await (kigo ? stmt.bind(before, kigo) : stmt.bind(before)).all();
  const posts = results.map((r) => ({ id: r.id, text: r.text, kigo: r.kigo, name: r.name, photo: r.has_photo === 1, likes: r.likes, created: r.created }));
  return json({ posts, next: posts.length === PAGE ? posts.at(-1).created : null });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(request, LIMIT.photoB64 + 2048); } catch { return json({ error: 'bad request' }, 400); }
  let post; let photo;
  try { post = checkPost(b); photo = checkPhoto(b.photo); } catch (e) { return json({ error: 'invalid', message: e.message }, 400); }
  if (!HEX64.test(b.tokenHash)) return json({ error: 'invalid' }, 400);
  if (await overRateLimit(env, request, 'haiku-post', LIMITS.haikuPost)) return json({ error: 'limit', message: '今日はこれ以上投稿できません。また明日どうぞ。' }, 429);
  const id = randomHex(16);
  await env.DB.prepare('INSERT INTO haiku (id, text, kigo, name, has_photo, token_hash, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, post.text, post.kigo, post.name, photo ? 1 : 0, b.tokenHash, Date.now()).run();
  if (photo) await env.DB.prepare('INSERT INTO haiku_photos (id, data) VALUES (?, ?)').bind(id, b.photo).run();
  return json({ ok: true, id, ...post }, 201);
}
