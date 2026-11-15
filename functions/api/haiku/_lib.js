// 句ひろばAPIの共通処理（Cloudflare Pages Functions）
export { json, readJson, sameOrigin, sha256hex, safeEqual } from '../rally/_lib.js';
export const POST_ID = /^[a-f0-9]{32}$/;
export const DEVICE = /^[a-f0-9]{32}$/;
export const HEX64 = /^[0-9a-f]{64}$/;
export const HIDE_AFTER = 3; // 別々の回線から3件報告されたら非表示
export const PAGE = 30;
export const randomHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
/** 表示してよい句か（ない・非表示なら null） */
export const visible = (env, id) => env.DB.prepare('SELECT id, has_photo FROM haiku WHERE id = ? AND hidden = 0').bind(id).first();
