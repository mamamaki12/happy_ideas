import { test, expect } from '@playwright/test';
import { today,addDays } from '../../products/daily-kit/logic.js';
const samples={
 'home-finder':{name:'予備ケーブル',room:'寝室',spot:'棚の青い箱',tags:'USB タイプC',note:'充電用'},
 'gap-time':{name:'机を整理',minutes:'5',place:'家',energy:'1',note:'まずは紙を片付ける'},
 'cooldown-cart':{name:'新しいバッグ',price:'3000',added:addDays(today(),-5),wait:'3',url:'https://example.com/',note:'通学に使う'},
 'life-manual':{name:'白シャツの洗い方',category:'服・洗濯',trigger:'洗濯前',note:'ネットに入れる'},
 'chore-meter':{name:'シーツ交換',room:'寝室',interval:'7',last:addDays(today(),-8),note:'替えを用意'},
 'refill-forecast':{name:'シャンプー',opened:addDays(today(),-20),estimate:'30',stock:'1',note:'500mL'}
};
for(const [slug,values]of Object.entries(samples))test(`${slug}: create, core action, edit, reload, export/import and delete`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(`/products/${slug}/`);await page.locator('#add').click();
 for(const [key,value]of Object.entries(values)){const control=page.locator(`#field-${key}`);if(['place','category'].includes(key))await control.selectOption(value);else await control.fill(value);}
 if(slug==='home-finder'){const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;return c.toDataURL('image/png').split(',')[1];});await page.locator('#photo').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});}
 await expect(page.locator('#save')).toBeEnabled();await page.locator('#save').click();await expect(page.locator('#editor')).not.toBeVisible();const card=page.locator('article');await expect(card).toHaveCount(1);
 switch(slug){
  case 'home-finder':await expect(card.locator('img')).toBeVisible();await page.locator('#search').fill('ｕｓｂ 青い');await expect(card).toHaveCount(1);await page.locator('#search').fill('違う物');await expect(card).toHaveCount(0);await page.locator('#search').fill('');break;
  case 'gap-time':await page.getByRole('button',{name:'ひとつ選んで！'}).click();await expect(card).toHaveAttribute('data-picked','');await card.getByRole('button',{name:'できた！',exact:true}).click();await expect(card).toContainText('1回できた');await card.getByRole('button',{name:'1回戻す'}).click();await expect(card).toContainText('0回できた');await page.locator('#place').selectOption('外出先');await expect(card).toHaveCount(0);await page.locator('#place').selectOption('家');break;
  case 'cooldown-cart':await card.getByRole('button',{name:'今回は見送る'}).click();await expect(card).toHaveCount(0);await page.locator('#filter').selectOption('skipped');await expect(card).toContainText('見送った');await expect(page.locator('#stats')).toContainText('¥3,000');break;
  case 'life-manual':await card.getByRole('button',{name:'☆ お気に入り',exact:true}).click();await card.getByRole('button',{name:'役立った ＋1'}).click();await expect(card).toContainText('1回役立った');await page.locator('#filter').selectOption('pinned');await expect(card).toHaveCount(1);break;
  case 'chore-meter':await expect(card).toContainText('1日、目安を過ぎています');await card.getByRole('button',{name:'今日やった！'}).click();await expect(card).toContainText('あと7日');await card.getByRole('button',{name:'最後の完了を戻す'}).click();await expect(card).toContainText('1日、目安を過ぎています');break;
  case 'refill-forecast':await expect(card).toContainText('あと約10日');await card.getByRole('button',{name:'今日使い切った'}).click();await expect(card).toContainText('平均: 20日');await card.getByRole('button',{name:'使い切りを取り消す'}).click();await expect(card).toContainText('あと約10日');await card.getByRole('button',{name:'今日使い切った'}).click();await card.getByRole('button',{name:'ストックを今日開封'}).click();await expect(card).toContainText('ストック 0個');await expect(card).toContainText('あと約20日');await expect(card.getByRole('button',{name:'今日使い切った'})).toBeDisabled();break;
 }
 await card.getByRole('button',{name:'編集',exact:true}).click();await page.locator('#field-name').fill(`${values.name} 更新`);await page.locator('#save').click();await page.reload();if(slug==='cooldown-cart')await page.locator('#filter').selectOption('all');await expect(card).toContainText(`${values.name} 更新`);
 await page.getByText('バックアップ・復元',{exact:true}).click();const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;
 await card.getByRole('button',{name:'削除',exact:true}).click();await expect(card).toHaveCount(0);await page.locator('#import').setInputFiles(await file.path());await expect(card).toHaveCount(1);
 await page.locator('#import').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,app:'other',items:[]}))});await expect(page.getByRole('status')).toContainText('復元できませんでした');await expect(card).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('cooldown locks early purchase; markup is displayed as text',async({page})=>{
 await page.goto('/products/cooldown-cart/');await page.locator('#add').click();await page.locator('#field-name').fill('<img src=x onerror=alert(1)>');await page.locator('#save').click();await expect(page.locator('article h2')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('article img')).toHaveCount(0);await expect(page.getByRole('button',{name:'やっぱり買う'})).toBeDisabled();
});
test('storage failure keeps existing records',async({page})=>{
 await page.goto('/products/life-manual/');await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};});await page.locator('#add').click();await page.locator('#field-name').fill('保存できない記録');await page.locator('#save').click();await expect(page.getByRole('status')).toContainText('保存容量が不足');await expect(page.locator('#editor')).toBeVisible();await page.locator('#close').click();await expect(page.locator('article')).toHaveCount(0);
});
