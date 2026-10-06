// GET /api/push/key — VAPID の公開鍵（未設定なら 404 = サーバー通知は使えない）
import { json } from '../rally/_lib.js';
export async function onRequestGet({ env }) {
  return env.VAPID_PUBLIC_KEY ? json({ publicKey: env.VAPID_PUBLIC_KEY }) : json({ error: 'not configured' }, 404);
}
