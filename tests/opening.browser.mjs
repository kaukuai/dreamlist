import assert from 'node:assert/strict';import{mkdirSync}from'node:fs';import{pathToFileURL}from'node:url';
import{createBrowserPreviewStore,PREVIEW_STORAGE_KEY}from'../lib/browser-preview-store.ts';
const modulePath=process.env.PLAYWRIGHT_MODULE;
if(!modulePath)throw new Error('Set PLAYWRIGHT_MODULE to an installed Playwright index.mjs');
const pw=await import(pathToFileURL(modulePath).href),engine=process.env.BROWSER_ENGINE??'chromium',base=process.env.DREAMLIST_FIELD_URL??'http://127.0.0.1:3198';
let options={};
if(engine==='webkit'){
 const root=process.env.WEBKIT_RUNTIME_DIR,deps=process.env.WEBKIT_DEPS_DIR;if(!root||!deps)throw new Error('Set WebKit runtime and verified library directories');
 options={executablePath:root+'/bin/MiniBrowser',env:{...process.env,WEBKIT_EXEC_PATH:root+'/bin',WEBKIT_INJECTED_BUNDLE_PATH:root+'/lib',WEBKIT_INSPECTOR_RESOURCES_PATH:root+'/share',LD_LIBRARY_PATH:root+'/lib:'+root+'/sys/lib:'+deps}};
}else{
 if(!process.env.CHROMIUM_MODULE)throw new Error('Set CHROMIUM_MODULE');const {default:chromium}=await import(pathToFileURL(process.env.CHROMIUM_MODULE).href);options={executablePath:await chromium.executablePath(),args:chromium.args.filter(x=>!['--single-process','--disable-web-security','--allow-running-insecure-content'].includes(x))};
}
let transport;
if(base.startsWith('https:')&&process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY),proxy={server:u.protocol+'//'+u.host};if(u.username)proxy.username=decodeURIComponent(u.username);if(u.password)proxy.password=decodeURIComponent(u.password);transport=await pw.request.newContext({proxy,ignoreHTTPSErrors:false});}
const browser=await pw[engine].launch(options),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();

const errors=[];page.on('pageerror',e=>errors.push(e.message));
if(transport)await context.route(new URL(base).origin+'/**',async route=>{const response=await transport.fetch(route.request(),{maxRedirects:0});await route.fulfill({response});});
const out='outputs/opening-validation/'+engine;mkdirSync(out,{recursive:true});
const key=PREVIEW_STORAGE_KEY,state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const click=async name=>page.getByRole('button',{name,exact:true}).tap();
const menu=async name=>{await click('更多選單');await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name,exact:true}).click();};
try{
 await page.goto(base);await page.locator('.opening-screen[data-scene=morning]').waitFor({timeout:60000});
 assert.equal(await page.locator('.world-canvas').count(),0);assert.equal(await page.getByRole('button',{name:'開啟序章聲音',exact:true}).count(),1);
 await page.waitForTimeout(200);assert.equal((await state()).receipts.length,0);
 for(const width of[320,390,428,768,1440]){await page.setViewportSize({width,height:width===320?640:width<600?844:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/intro-'+width+'.png'});const next=page.getByRole('button',{name:'下一幕',exact:true});await next.scrollIntoViewIfNeeded();const b=await next.boundingBox();assert.ok(b.height>=44&&b.width>=44);}
 await page.setViewportSize({width:390,height:844});await click('下一幕');await page.locator('.opening-screen[data-scene=silence]').waitFor();await click('下一幕');await page.locator('.opening-screen[data-scene=invitation]').waitFor();
 await page.reload();await page.locator('.opening-screen[data-scene=invitation]').waitFor();assert.equal((await state()).opening.seen,false);await click('上一幕');await page.locator('.opening-screen[data-scene=silence]').waitFor();await click('減少分鏡動態');assert.equal(await page.locator('.opening-art img').evaluate(e=>getComputedStyle(e).animationName),'none');
 await click('下一幕');await click('下一幕');await page.locator('.opening-screen[data-scene=covenant]').waitFor();await page.screenshot({path:out+'/covenant.png'});await click('下一幕');await page.locator('.opening-screen[data-scene=arrival]').waitFor();await click('進入晨鐘鎮');await page.locator('.world-canvas[data-ready=true]').waitFor({timeout:60000});assert.equal((await state()).opening.seen,true);assert.equal((await state()).receipts.length,0);
 await click('開啟旅人指引');assert.equal(await page.locator('.traveler-guide-dialog li').count(),6);assert.equal(await page.locator('.traveler-guide-dialog li.done').count(),0);await page.screenshot({path:out+'/guide.png'});await page.keyboard.press('Escape');
 // Choose a place through the real UI, walk there and interact, then verify earned guidance.
 await click('地圖與地點');await page.locator('[data-place-id=lorne]').click();await page.waitForFunction(()=>document.querySelector('.scene-interaction')?.dataset.nearby==='lorne',null,{timeout:30000});await page.locator('.scene-interaction>button').click();await page.locator('.npc-conversation-body[data-npc=lorne]').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(k=>['walk','talk'].every(id=>JSON.parse(localStorage.getItem(k)).opening.completed.includes(id)),key,{timeout:10000});
 await menu('重看故事序章');await page.locator('.opening-screen[data-scene=morning]').waitFor();const before=await state();await click('下一幕');await click('返回冒險');await page.locator('.world-canvas[data-ready=true]').waitFor();assert.deepEqual(await state(),before,'replaying must not alter gameplay or first-run state');
 await click('收起旅人指引');await page.reload();await page.locator('.world-canvas[data-ready=true]').waitFor();assert.equal(await page.locator('.traveler-guide-chip').count(),0);await menu('旅人指引');assert.equal(await page.locator('.traveler-guide-dialog li.done').count(),2);await page.keyboard.press('Escape');
 // Missing CG must not block text, manual navigation or skip.
 const fresh=await context.newPage();fresh.on('pageerror',e=>errors.push(e.message));let fail=true;await fresh.route('**/art/prologue/town.webp*',async route=>{if(fail)await route.abort();else await route.fallback();});await fresh.goto(base); // same origin storage is deliberately retained, so use a fresh state fixture below.
 const values=new Map(),store=createBrowserPreviewStore({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});await store.request('/api/opening');await fresh.evaluate(({key,value})=>localStorage.setItem(key,value),{key,value:values.get(key)});await fresh.reload();await fresh.getByRole('button',{name:'重新載入CG',exact:true}).waitFor();await fresh.screenshot({path:out+'/art-failure.png'});fail=false;await fresh.getByRole('button',{name:'重新載入CG',exact:true}).click();await fresh.waitForFunction(()=>document.querySelector('.opening-art img')?.naturalWidth>0);await fresh.getByRole('button',{name:'跳過序章',exact:true}).click();await fresh.locator('.world-canvas[data-ready=true]').waitFor();await fresh.close();
 // A genuinely old progressed fixture gets additive migration, no intro gate, no reset.
 const progress=await store.request('/api/character','POST',{action:'purchase',itemId:'training-sword'});assert.equal(progress.status,200);const raw=JSON.parse(values.get(key));delete raw.opening;await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key,value:JSON.stringify(raw)});await page.reload();await page.locator('.world-canvas[data-ready=true]').waitFor();const migrated=await state();assert.equal(migrated.inventory[0].itemId,'training-sword');assert.equal(migrated.opening.seen,true);assert.equal(migrated.opening.guideDismissed,true);
 await page.emulateMedia({reducedMotion:'reduce'});await menu('重看故事序章');assert.equal(await page.locator('.opening-art img').evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Escape');await page.locator('.world-canvas[data-ready=true]').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS '+engine+': five scenes, five sizes, resume/back, skip/replay, real guidance, reduced motion, art failure/retry and old-save migration');
}catch(e){await page.screenshot({path:out+'/failure.png'});console.log('ERRORS',errors);throw e;}finally{await page.waitForLoadState('networkidle').catch(()=>{});await context.unrouteAll({behavior:'wait'});await context.close();await browser.close();await transport?.dispose();}
