export const DAY = 86400000;
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export const days = (a,b) => Math.round((Date.parse(b)-Date.parse(a))/DAY);
export const addDays = (d,n) => new Date(Date.parse(d)+n*DAY).toISOString().slice(0,10);
export const yen = n => `¥${new Intl.NumberFormat('ja-JP').format(n)}`;
export function safeLink(s) { if(!s)return '';try {const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function due(item, now=today()) { const last=item.history.at(-1)||item.last;const elapsed=days(last,now);return {last,elapsed,left:item.interval-elapsed,progress:Math.min(100,Math.max(0,elapsed/item.interval*100))}; }
export function cooling(item,now=today()) { const date=addDays(item.added,item.wait);return {date,left:Math.max(0,days(now,date))}; }
export function forecast(item,now=today()) { const samples=item.cycles.slice(-5).map(c=>days(c.start,c.end));const duration=samples.length?Math.round(samples.reduce((a,b)=>a+b,0)/samples.length):item.estimate;const date=item.opened?addDays(item.opened,duration):null;return {duration,date,left:date?days(now,date):null,samples:samples.length}; }
export function eligible(item,minutes,place,energy) { return item.minutes<=minutes && (item.place==='どこでも'||item.place===place) && item.energy<=energy; }
export function normalize(s) { return String(s).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)); }
export function matches(item,query) { const text=normalize(Object.values(item).filter(v=>typeof v==='string'&&!v.startsWith('data:')).join(' '));return normalize(query).trim().split(/\s+/).every(w=>text.includes(w)); }
export function validate(raw,config) {
 if(!raw||raw.version!==1||raw.app!==config.slug||!Array.isArray(raw.items)||raw.items.length>300)throw Error('このアプリのバックアップではないか、件数が上限を超えています。');
 const ids=new Set();
 const fail=()=>{throw Error('記録の内容が不正です。日付・数値・写真を確認してください。');};
 const dateList=x=>Array.isArray(x)&&x.length<=10000&&x.every(d=>isDate(d)&&d<=today());
 const items=raw.items.map(i=>{
  if(!i||typeof i.id!=='string'||!i.id||i.id.length>100||ids.has(i.id))fail();ids.add(i.id);const out={id:i.id};
  for(const f of config.fields){const v=i[f.key];
   if(f.type==='number'){if(!Number.isInteger(v)||v<f.min||v>f.max)fail();}
   else if(f.type==='select'){if(!f.options.some(o=>String(o[0])===v))fail();}
   else if(f.type==='date'){if(!(f.optional&&v==='')&&(!isDate(v)||v>today()))fail();}
   else {if(typeof v!=='string'||v.length>(f.maxLength||500)||(f.required&&!v.trim()))fail();if(f.type==='url'&&v&&!safeLink(v))fail();}
   out[f.key]=v;
  }
  if(config.photo){if(typeof i.photo!=='string'||i.photo.length>350000||(i.photo&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(i.photo)))fail();out.photo=i.photo;}
  switch(config.slug){
   case 'gap-time': if(!dateList(i.done))fail();out.done=[...i.done].sort();break;
   case 'cooldown-cart': if(!['waiting','bought','skipped'].includes(i.status))fail();out.status=i.status;break;
   case 'life-manual': if(typeof i.pinned!=='boolean'||!Number.isInteger(i.used)||i.used<0||i.used>100000)fail();out.pinned=i.pinned;out.used=i.used;break;
   case 'chore-meter': if(!dateList(i.history)||i.history.some(d=>d<i.last)||new Set(i.history).size!==i.history.length)fail();out.history=[...i.history].sort();break;
   case 'refill-forecast': {
    if(!Array.isArray(i.cycles)||i.cycles.length>1000)fail();let prev='';
    out.cycles=i.cycles.map(c=>{if(!c||!isDate(c.start)||!isDate(c.end)||c.start>=c.end||c.end>today()||c.start<prev)fail();prev=c.end;return {start:c.start,end:c.end};});
    if(i.opened&&prev&&i.opened<prev)fail();break;
   }
  }
  return out;
 });
 return {version:1,app:config.slug,items};
}
