// #104 やわらか言い換え: 言いにくいことの下書きを、相手と目的に合わせて角が立たない文に書き直す
import { h, add, $, store, toast } from '../../shared/lib.js';
import { aiNotice, bindAI, copyButton } from '../../shared/ai.js';

const db = store('ai-soft-rewrite');
const st = db.get('state', { text: '', to: '上司', purpose: '断る' });
const app = $('#app');
const TO = ['上司', '同僚', '取引先', '友人', 'ママ友・パパ友', '家族', '先生'];
const PURPOSE = ['断る', 'お願いする', '催促する', '謝る', '伝える'];
const EXAMPLES = [['断る', '友人', '土曜の飲み会、行けない。お金もないし正直だるい'], ['催促する', '取引先', '先月の請求書の支払いがまだ。今週中に払ってほしい'], ['お願いする', 'ママ友・パパ友', '来週の送り迎え、代わってもらえないか']];

const text = h('textarea', { id: 'draft', rows: 5, maxlength: 1500, value: st.text, placeholder: '思ったままでOK。例: 土曜の飲み会、行けない。正直だるい' });
const count = h('span', { class: 'muted small' });
const chips = (name, values, cur) => h('div', { class: 'tabs', role: 'radiogroup', 'aria-label': name }, values.map((v) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === cur), onclick: (e) => pick(name, v, e.target) }, v)));
const toBox = chips('相手', TO, st.to);
const purposeBox = chips('目的', PURPOSE, st.purpose);
const btn = h('button', { type: 'button', class: 'primary big' }, 'やわらかく書き直す');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });

function pick(name, v, el) {
  if (name === '相手') st.to = v; else st.purpose = v;
  for (const b of el.parentElement.children) { const on = b === el; b.setAttribute('aria-checked', String(on)); }
  db.set('state', st);
}
const updateCount = () => { count.textContent = `${text.value.length} / 1500`; };
text.addEventListener('input', () => { st.text = text.value; db.set('state', st); updateCount(); });

bindAI(btn, out, 'soft-rewrite', () => {
  if (!text.value.trim()) { toast('下書きを入力してください'); return null; }
  return { fields: { text: text.value, to: st.to, purpose: st.purpose } };
}, (r) => [
  ...r.versions.map((v) => h('article', { class: 'ai-block' }, h('div', { class: 'ai-meta' }, h('b', { class: 'grow' }, v.label), copyButton(() => v.text)), h('p', { class: 'ai-text' }, v.text))),
  r.points.length ? h('details', {}, h('summary', {}, '書き直しのポイント'), h('ul', {}, r.points.map((p) => h('li', {}, p)))) : null,
  h('p', { class: 'ai-disclaimer' }, '送る前に、日時や金額が下書きと同じか確認してください。'),
]);

add(app, aiNotice({ sends: '入力した下書き' }),
  h('section', { class: 'card' },
    h('div', { class: 'field' }, h('div', { class: 'ai-meta' }, h('label', { for: 'draft', class: 'grow' }, '下書き'), count), text),
    h('div', { class: 'field' }, h('div', { class: 'small muted' }, '相手'), toBox),
    h('div', { class: 'field' }, h('div', { class: 'small muted' }, '目的'), purposeBox),
    btn, out),
  h('section', { class: 'card' }, h('h2', {}, '例から試す'), h('div', { class: 'btn-row' }, EXAMPLES.map(([p, to, t]) => h('button', { type: 'button', class: 'small', onclick: () => {
    text.value = t; st.text = t; db.set('state', st); updateCount();
    pick('相手', to, [...toBox.children].find((b) => b.textContent === to)); pick('目的', p, [...purposeBox.children].find((b) => b.textContent === p));
  } }, `${p}（${to}）`)))));
updateCount();
