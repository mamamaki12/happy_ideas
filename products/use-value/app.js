import { today, metrics, validate } from './logic.js';
const $ = s => document.querySelector(s);
const KEY = 'happy-ideas-motolog-v1';
let data = {version:1,items:[]}, editing = null, photo = '', photoJob = 0, timer;
const money = n => new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1}).format(n);
function el(tag, attrs={}, ...children) { const n=document.createElement(tag); for(const [k,v] of Object.entries(attrs)) { if(k.startsWith('on')) n.addEventListener(k.slice(2),v); else n.setAttribute(k,String(v)); } for(const c of children.flat()) if(c!==null) n.append(c instanceof Node?c:document.createTextNode(String(c))); return n; }
function say(s) { $('#status').textContent=s;clearTimeout(timer);timer=setTimeout(()=>{$('#status').textContent='';},6000); }
try { const raw=localStorage.getItem(KEY); if(raw) data=validate(JSON.parse(raw)); } catch { say('保存済みデータを読み込めません。バックアップから復元できます。'); }
function commit(next) { try { const checked=validate(next);localStorage.setItem(KEY,JSON.stringify(checked)); data=checked;draw();return true; } catch(e) { say(e.name==='QuotaExceededError'?'保存容量がいっぱいです。写真を減らすか、バックアップしてください。':`保存できませんでした: ${e.message}`);return false; } }
function change(id, fn) { const next=structuredClone(data);const i=next.items.find(x=>x.id===id);if(!i)return false;fn(i,next);return commit(next); }
function draw() {
 const total=data.items.reduce((s,i)=>s+i.uses.length,0),done=data.items.filter(i=>metrics(i).achieved).length;
 $('#stats').replaceChildren(...[[data.items.length,'お気に入りの持ち物'],[total,'使った回数'],[done,'目標を達成した持ち物']].map(([n,s])=>el('div',{class:'stat'},el('strong',{},n),el('span',{},s))));
 let items=data.items.filter(i=>i.name.toLowerCase().includes($('#search').value.trim().toLowerCase())).slice().reverse();
 const mode=$('#sort').value;
 if(mode==='unused')items.sort((a,b)=>(a.uses.at(-1)||a.purchased).localeCompare(b.uses.at(-1)||b.purchased));
 if(mode==='value')items.sort((a,b)=>(metrics(a).cost??Infinity)-(metrics(b).cost??Infinity));
 if(mode==='rating')items.sort((a,b)=>b.rating-a.rating);
 $('#cards').replaceChildren(...(items.length?items.map(card):[el('div',{class:'empty'},el('h3',{},data.items.length?'見つかりませんでした':'お気に入りをひとつ、登録しよう。'),el('p',{},data.items.length?'検索する言葉を変えてみてください。':'靴、バッグ、カメラ。使うたびに、買ってよかったが見えてきます。'))]));
 $('#demo').hidden=data.items.some(i=>i.id.startsWith('demo-'));
}
function card(i) {
 const m=metrics(i);
 return el('article',{class:'card'},i.photo?el('img',{class:'cover',src:i.photo,alt:i.name,loading:'lazy'}):el('div',{class:'cover placeholder','aria-hidden':'true'},'◈'),el('div',{class:'card-body'},
 el('h3',{},i.name),el('span',{class:'muted'},`購入額 ¥${money(i.price)} · ${m.count}回使用`),
 el('p',{class:'cost'},m.cost===null?'まだ未使用':`¥${money(m.cost)}`,el('small',{},m.cost===null?'':' / 回')),
 el('span',{class:'badge'},m.achieved?'✓ 目標達成！':`目標 ¥${money(i.target)} / 回`),el('p',{class:'muted'},m.achieved?'これからも、お気に入りと。':`あと${Math.max(1,m.remaining)}回使うと目標達成`),
 el('progress',{max:100,value:m.progress,'aria-label':'目標までの進み具合'}),el('p',{class:'muted'},i.uses.length?`最後に使った日 ${i.uses.at(-1)}`:'まだ使用の記録がありません'),
 el('p',{class:'note'},i.rating?'★'.repeat(i.rating)+' · '+i.note:i.note),
 el('button',{class:'primary',onclick:()=>{if(change(i.id,x=>x.uses.push(today())))say(!m.achieved&&metrics(data.items.find(x=>x.id===i.id)).achieved?'目標達成！たくさん使いましたね。':'1回分を記録しました。間違えたら「1回戻す」で取り消せます。');}},'今日使った ＋1'),
 el('div',{class:'actions'},el('button',{onclick:()=>{if(!i.uses.length){say('取り消す記録がありません。');return;}if(change(i.id,x=>x.uses.pop()))say('最後の1回を取り消しました。');}},'1回戻す'),el('button',{onclick:()=>openEditor(i)},'編集'),el('button',{onclick:()=>{if(confirm(`「${i.name}」と使用履歴を削除しますか？`))change(i.id,(_,n)=>{n.items=n.items.filter(x=>x.id!==i.id);});}},'削除'))));
}
function openEditor(i) {
 editing=i?.id||null;photo=i?.photo||'';photoJob++;$('#form').reset();$('#photo-status').textContent=photo?'登録済みの写真があります。':'';$('#form-error').textContent='';$('#save').disabled=false;
 $('#editor-title').textContent=i?'持ち物を編集':'持ち物を登録';
 for(const k of ['name','price','target','purchased','rating','note'])$('#form').elements.namedItem(k).value=i?i[k]:({target:100,purchased:today(),rating:0}[k]??'');
 $('#form').elements.purchased.max=today();$('#editor').showModal();
}
$('#add').onclick=()=>openEditor();$('#close').onclick=()=>$('#editor').close();
$('#editor').addEventListener('close',()=>{photoJob++;});
$('#remove-photo').onclick=()=>{photoJob++;photo='';$('#photo').value='';$('#photo-status').textContent='写真なしで保存します。';$('#save').disabled=false;};
$('#photo').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;const job=++photoJob;$('#save').disabled=true;
 try {
  if(file.size>10*1024*1024)throw Error('写真は10MB以下にしてください。');
  const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('写真を読み込めません。'));reader.readAsDataURL(file);});
  const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,640/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const result=canvas.toDataURL('image/jpeg',.72);
  if(result.length>400000)throw Error('写真のサイズを小さくして再度選んでください。');
  if(job===photoJob){photo=result;$('#photo-status').textContent='写真を準備しました。保存すると反映されます。';$('#form-error').textContent='';}
 }catch(e){if(job===photoJob)$('#form-error').textContent=e.message||'この写真は読み込めません。JPEGやPNGを選んでください。';}finally{if(job===photoJob)$('#save').disabled=false;}
};
$('#form').onsubmit=e=>{
 e.preventDefault();const f=new FormData(e.target);const old=data.items.find(i=>i.id===editing);const item={id:editing||crypto.randomUUID(),name:String(f.get('name')).trim(),price:Number(f.get('price')),target:Number(f.get('target')),purchased:String(f.get('purchased')),rating:Number(f.get('rating')),note:String(f.get('note')),photo,uses:old?.uses||[]};
 const next={version:1,items:editing?data.items.map(i=>i.id===editing?item:i):[...data.items,item]};
 try{validate(next);}catch{$('#form-error').textContent='入力内容を確認してください。購入日は未来や使用記録より後にできません。持ち物は200件までです。';return;}
 if(commit(next)){$('#editor').close();say('保存しました。');}
};
$('#search').oninput=draw;$('#sort').onchange=draw;
$('#demo').onclick=()=>{if(data.items.some(i=>i.id.startsWith('demo-')))return;const day=today();const samples=[['スニーカー',8000,100,20,5,'歩きやすくて、つい選んでしまう。'],['お気に入りのマグ',1800,50,40,5,'朝のコーヒーのおとも。'],['週末のカメラ',60000,1000,6,4,'次の休みに持って出かけよう。']].map(([name,price,target,count,rating,note],n)=>({id:`demo-${n}`,name:`${name}（サンプル）`,price,target,purchased:day,rating,note,uses:Array(count).fill(day),photo:''}));if(commit({version:1,items:[...data.items,...samples]}))say('サンプルを追加しました。編集・削除もできます。');};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=el('a',{href:url,download:`motolog-${today()}.json`});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);say('バックアップの保存を開始しました。');};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>80*1024*1024)throw Error('ファイルが大きすぎます。');const next=validate(JSON.parse(await file.text()));if(confirm(`${next.items.length}件の記録で現在のデータを置き換えます。よろしいですか？`)&&commit(next))say('バックアップを復元しました。');}catch(err){say(`復元できませんでした: ${err.message}`);}finally{e.target.value='';}};
window.addEventListener('storage',e=>{if(e.key===KEY){try{data=e.newValue?validate(JSON.parse(e.newValue)):{version:1,items:[]};draw();if($('#editor').open){$('#editor').close();say('別のタブで更新されたため、編集を閉じました。');}}catch{say('別のタブのデータを読み込めませんでした。');}}});
draw();
