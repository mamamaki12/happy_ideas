import test from 'node:test';
import assert from 'node:assert/strict';
import { metrics,validate,today } from '../../products/use-value/logic.js';
const item=()=>({id:'a',name:'靴',price:8000,target:100,purchased:today(),rating:5,note:'',uses:[],photo:''});
test('unused has no cost; target boundary and undo recalculate',()=>{const i=item();assert.equal(metrics(i).cost,null);i.uses=Array(79).fill(today());assert.equal(metrics(i).remaining,1);assert.equal(metrics(i).achieved,false);i.uses.push(today());assert.equal(metrics(i).cost,100);assert.equal(metrics(i).achieved,true);i.uses.pop();assert.equal(metrics(i).achieved,false);});
test('free items and fractional division',()=>{const i=item();i.price=0;assert.equal(metrics(i).achieved,false);i.uses=[today()];assert.equal(metrics(i).achieved,true);i.price=100;i.uses=Array(3).fill(today());assert.equal(metrics(i).cost,100/3);});
test('backup round trip and unsafe photo rejection',()=>{const d={version:1,items:[item()]};assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);d.items[0].photo='javascript:alert(1)';assert.throws(()=>validate(d));});
test('invalid counts, dates, duplicate IDs and amounts are rejected',()=>{for(const patch of [{price:-1},{target:0},{rating:6},{purchased:'2026-02-30'},{uses:['2999-01-01']},{price:1.5}])assert.throws(()=>validate({version:1,items:[{...item(),...patch}]}));assert.throws(()=>validate({version:1,items:[item(),item()]}));});
