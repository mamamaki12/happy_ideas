// Claude API を使うアプリの共通部品。
// - ブラウザは同じサイトの /api/ai/:task にだけ送る（APIキーはサーバー側。ブラウザには置かない）
// - サーバーが未設定（GitHub Pages など）のときは「デモ表示」に切り替え、決まった例の結果を見せる
import { h, add, store, resizeImage, toast } from './lib.js';
import { DEMO } from './ai-demo.js';

const API = new URL('../api/ai', import.meta.url).href;
const prefs = store('ai');
let statusPromise = null;

/** AIサーバーの状態: { mode: 'live'|'demo', needsCode } */
export function aiStatus() {
  if (!statusPromise) {
    statusPromise = (async () => {
      try {
        const r = await fetch(API, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
        const j = r.ok ? await r.json() : null;
        return j?.ready ? { mode: 'live', needsCode: !!j.needsCode } : { mode: 'demo', needsCode: false };
      } catch { return { mode: 'demo', needsCode: false }; }
    })();
  }
  return statusPromise;
}

const ERRORS = {
  400: '入力を確認してください（長すぎる・空欄など）',
  401: 'アクセスコードが違います',
  413: '画像が大きすぎます。もう少し小さく撮ってください',
  422: 'この内容にはお答えできませんでした',
  429: '今日の利用回数の上限に達しました。明日また使えます',
  503: '混み合っています。少し待ってからもう一度お試しください',
};
export class AIError extends Error {}

/** 仕事を頼む。戻り値: { result, demo } */
export async function askAI(task, { fields = {}, image = null, history } = {}) {
  const st = await aiStatus();
  if (st.mode === 'demo') {
    await new Promise((r) => setTimeout(r, 500));
    return { result: structuredClone(DEMO[task](fields)), demo: true };
  }
  let r;
  try {
    r = await fetch(`${API}/${task}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(st.needsCode ? { 'x-access-code': prefs.get('code', '') } : {}) },
      body: JSON.stringify({ fields, image, history }),
      signal: AbortSignal.timeout(90000),
    });
  } catch { throw new AIError('AIにつながりませんでした。通信状態を確認してください'); }
  if (!r.ok) throw new AIError(ERRORS[r.status] || 'AIからうまく答えが返ってきませんでした。もう一度お試しください');
  const j = await r.json();
  return { result: j.result, demo: false };
}

/** 写真を Claude に送れる大きさ（長辺1568px以下のJPEG）にして base64 にする */
export async function imagePayload(blob) {
  const small = await resizeImage(blob, 1568, 0.8);
  const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(small); });
  return { type: 'image/jpeg', data };
}

/** 画面上部の案内（デモかどうか・送信先の説明・アクセスコード） */
export function aiNotice({ sends = '入力した文章' } = {}) {
  const el = h('section', { class: 'ai-notice', 'aria-live': 'polite' }, h('p', { class: 'muted small' }, 'AIの状態を確認しています…'));
  aiStatus().then((st) => {
    el.replaceChildren();
    if (st.mode === 'demo') {
      el.classList.add('demo');
      el.append(h('p', {}, h('b', {}, 'デモ表示中'), ' — このサイトにはAIサーバーが設定されていないため、決まった例の結果を表示します。入力した内容はどこにも送られません。'));
      return;
    }
    el.append(h('p', { class: 'small' }, `${sends}は、答えを作るために Anthropic 社の Claude API へ送られます。このサイトでは保存しません。マイナンバー・カード番号・パスワードなどは入れないでください。`));
    if (st.needsCode) {
      const inp = h('input', { id: 'ai-code', type: 'password', autocomplete: 'off', value: prefs.get('code', ''), placeholder: '配布されたコード' });
      inp.addEventListener('change', () => { prefs.set('code', inp.value.trim()); toast('アクセスコードを保存しました'); });
      el.append(h('div', { class: 'field' }, h('label', { for: 'ai-code' }, 'アクセスコード（試用中）'), inp));
    }
  });
  return el;
}

/**
 * ボタンを押したらAIに頼み、結果を描く。読み込み中の表示・二重送信の防止・エラー表示をまとめて行う。
 * @param {HTMLButtonElement} btn
 * @param {HTMLElement} out 結果を入れる場所
 * @param {() => Promise<object|null>} makeRequest 送る内容（null なら中止）
 * @param {(result: object, meta: {demo: boolean}) => Node|Node[]} draw
 */
export function bindAI(btn, out, task, makeRequest, draw) {
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    let req;
    try { req = await makeRequest(); } catch (e) { toast(e.message); return; }
    if (!req) return;
    btn.disabled = true; btn.textContent = '考えています…'; out.setAttribute('aria-busy', 'true');
    out.replaceChildren(h('div', { class: 'ai-loading' }, h('span', { class: 'ai-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', {}, 'AIが考えています')));
    try {
      const { result, demo } = await askAI(task, req);
      const nodes = draw(result, { demo });
      out.replaceChildren();
      add(out, demo ? h('p', { class: 'pill warn ai-demo-badge' }, 'デモの例です（実際の入力は使っていません）') : null, nodes);
    } catch (e) {
      out.replaceChildren(h('p', { class: 'error', role: 'alert' }, e instanceof AIError ? e.message : 'うまくいきませんでした。もう一度お試しください'));
    } finally {
      btn.disabled = false; btn.textContent = label; out.removeAttribute('aria-busy');
    }
  });
}

/** コピー用ボタン */
export function copyButton(getText, label = 'コピー') {
  return h('button', {
    type: 'button', class: 'small',
    onclick: async () => {
      try { await navigator.clipboard.writeText(getText()); toast('コピーしました'); } catch { toast('コピーできませんでした。長押しで選択してください'); }
    },
  }, label);
}

/** 写真を選ぶ／撮る小さな部品（AIアプリ用。撮った写真のプレビューつき） */
export function photoPicker({ label = '写真を撮る・選ぶ', onChange } = {}) {
  let blob = null;
  const preview = h('div', { class: 'ai-photo-preview' });
  const input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'visually-hidden', id: `photo-${Math.random().toString(36).slice(2, 8)}` });
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('画像を選んでください'); return; }
    blob = f;
    const url = URL.createObjectURL(f);
    preview.replaceChildren(h('img', { src: url, alt: '選んだ写真', onload: () => URL.revokeObjectURL(url) }));
    onChange?.(f);
  });
  const el = h('div', { class: 'ai-photo' }, h('label', { for: input.id, class: 'ai-photo-btn' }, h('span', { 'aria-hidden': 'true' }, '📷'), ` ${label}`), input, preview);
  return { el, get blob() { return blob; }, set(b) { blob = b; } };
}
