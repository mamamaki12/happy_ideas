import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIGS } from '../../products/daily-kit/config.js';
import { today,addDays,days,due,cooling,forecast,eligible,matches,validate,safeLink } from '../../products/daily-kit/logic.js';
test('calendar arithmetic crosses month and leap-day boundaries',()=>{
 assert.equal(addDays('2024-02-28',2),'2024-03-01');assert.equal(days('2026-12-31','2027-01-01'),1);
});
test('cooldown boundary and chores reflect the last completion and undo',()=>{
 assert.equal(cooling({added:'2026-01-01',wait:3},'2026-01-03').left,1);
 assert.equal(cooling({added:'2026-01-01',wait:3},'2026-01-04').left,0);
 const i={last:'2026-01-01',interval:7,history:[]};assert.equal(due(i,'2026-01-09').left,-1);i.history.push('2026-01-09');assert.equal(due(i,'2026-01-09').left,7);i.history.pop();assert.equal(due(i,'2026-01-09').left,-1);
});
test('forecast uses initial estimate, then only the last five complete cycles',()=>{
 const i={opened:'2026-01-01',estimate:30,cycles:[]};assert.equal(forecast(i,'2026-01-26').left,5);
 i.cycles=[{start:'2025-01-01',end:'2025-04-11'},...Array(5).fill({start:'2025-06-01',end:'2025-06-21'})];assert.equal(forecast(i,'2026-01-01').duration,20);i.opened='';assert.equal(forecast(i).date,null);
});
test('time suggestions respect all three constraints',()=>{
 const i={minutes:10,energy:2,place:'家'};assert.equal(eligible(i,10,'家',2),true);assert.equal(eligible(i,5,'家',2),false);assert.equal(eligible(i,10,'外出先',2),false);assert.equal(eligible(i,10,'家',1),false);assert.equal(eligible({...i,place:'どこでも'},10,'外出先',3),true);
});
test('search normalizes kana and width; URLs exclude active schemes',()=>{
 assert.equal(matches({name:'ＵＳＢケーブル',room:'寝室'},'usb けーぶる'),true);assert.equal(matches({name:'保証書',note:'青い箱'},'保証 青い'),true);assert.equal(safeLink('javascript:alert(1)'), '');assert.equal(safeLink('data:text/html,hello'),'');assert.equal(safeLink('https://example.com/'),'https://example.com/');
});
for(const c of Object.values(CONFIGS))test(`${c.slug}: sample backup round trip and isolation`,()=>{
 const items=c.samples().map((i,n)=>({id:String(n),...i}));const d={version:1,app:c.slug,items};assert.deepEqual(validate(d,c),d);assert.throws(()=>validate({...d,app:'wrong'},c));assert.throws(()=>validate({...d,items:[items[0],items[0]]},c));assert.throws(()=>validate({...d,items:[{...items[0],name:''}]},c));
});
test('invalid future dates, cycle overlaps, duplicate completion dates and images are rejected',()=>{
 const check=(slug,patch)=>{const c=CONFIGS[slug];return ()=>validate({version:1,app:slug,items:[{id:'a',...c.samples()[0],...patch}]},c);};
 assert.throws(check('chore-meter',{last:addDays(today(),1)}));assert.throws(check('chore-meter',{history:[today(),today()]}));assert.throws(check('refill-forecast',{cycles:[{start:'2025-01-01',end:'2025-01-01'}]}));assert.throws(check('refill-forecast',{opened:'2025-01-05',cycles:[{start:'2025-01-01',end:'2025-01-10'}]}));assert.throws(check('home-finder',{photo:'https://example.com/photo.jpg'}));assert.throws(check('cooldown-cart',{url:'javascript:alert(1)'}));
});
