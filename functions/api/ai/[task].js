// POST /api/ai/:task — Claude API の中継（仕事の定義は server/ai/tasks.js、本体は server/ai/proxy.js）
import { handleAI } from '../../../server/ai/proxy.js';

export const onRequestPost = (ctx) => handleAI(ctx);
