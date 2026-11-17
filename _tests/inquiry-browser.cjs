'use strict';

// This script must never launch a browser on the user's computer.
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    process.env.RUNNER_OS !== 'Linux' || process.env.GITHUB_REPOSITORY !== 'josefelkorany-star/Lerncoaching-ZH' ||
    process.env.INQUIRY_QA_PUBLIC_REPOSITORY !== 'true' || !process.env.RUNNER_TEMP) {
  throw new Error('Cloud-only check: requires the public repository standard GitHub-hosted Linux runner.');
}

const assert = require('node:assert/strict');
const path = require('node:path');
const {spawn,execFileSync} = require('node:child_process');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname,'..');
const temp = path.resolve(process.env.RUNNER_TEMP);
const dependencies = path.resolve(process.env.INQUIRY_QA_DEPENDENCIES || '');
if (!dependencies.startsWith(temp+path.sep)) throw new Error('Browser tools must stay in RUNNER_TEMP.');
const {chromium} = createRequire(path.join(dependencies,'package.json'))('playwright');
const preview = path.join(temp,'inquiry-paired-preview');
const widths = [320,375,768,1024,1279,1280,1440];
const expectedMessage = 'Danke! Wir melden uns in der Regel innert 2–3 Werktagen. Für den Ersttermin schicken wir dir dann die Ersttermin-Vereinbarung zum Unterschreiben.';
const processes = [];
const results = [];

async function ready(url) {
  for(let attempt=0;attempt<100;attempt++){
    try { if((await fetch(url)).ok)return; } catch (_) {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Preview server did not become ready.');
}
function start(script,args=[]) {
  const child=spawn(process.execPath,[path.join(root,script),...args],{cwd:root,stdio:['ignore','ignore','inherit']});
  processes.push(child);return child;
}
async function noOverflow(page,label) {
  const failures=await page.evaluate(()=>{
    const width=document.documentElement.clientWidth;
    const failures=[];
    if(document.documentElement.scrollWidth>width+1)failures.push('document');
    for(const el of document.body.querySelectorAll('*')){
      if(!el.getClientRects().length || el.closest('dialog:not([open]),[hidden],.honey'))continue;
      const style=getComputedStyle(el),box=el.getBoundingClientRect();
      if(style.position==='absolute' && style.clip!=='auto')continue; // announced screen-reader text
      if(box.width<2||box.height<2)continue;
      let ancestor=el.parentElement,insideScroller=false;
      while(ancestor && ancestor!==document.body){
        const overflow=getComputedStyle(ancestor).overflowX;
        if((overflow==='auto'||overflow==='scroll')&&ancestor.scrollWidth>ancestor.clientWidth+1){insideScroller=true;break;}
        ancestor=ancestor.parentElement;
      }
      // Intentional team/review scrollers may contain offscreen cards, but their
      // containers and all other elements must fit even if body hides overflow.
      if(!insideScroller&&(box.left < -1 || box.right > width+1)){
        failures.push((el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+String(el.className).replace(/\s+/g,'.')).slice(0,90));
      }
    }
    return [...new Set(failures)].slice(0,12);
  });
  assert.deepEqual(failures,[],label+' overflow');
}
async function navigation(page,width,requireNewText) {
  const cta=page.locator('.nav-cta');
  assert.ok(await cta.isVisible());
  if(requireNewText)assert.equal((await cta.textContent()).trim(),'Ersttermin vereinbaren');
  const bounds=await cta.evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:el.scrollWidth,client:el.clientWidth};
  });
  assert.ok(bounds.left>=0&&bounds.right<=bounds.width+1&&bounds.scroll<=bounds.client+1,'Full navigation CTA is unclipped');
  const links=await page.locator('#nav-links a').count();
  assert.ok(links>=9);
  for(let i=0;i<links;i++){
    if(width<=1279){
      const toggle=page.locator('.nav-toggle');await toggle.focus();await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    }
    const link=page.locator('#nav-links a').nth(i),href=await link.getAttribute('href');
    assert.ok(await link.isVisible());await link.focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>location.hash),href);
    if(width<=1279)assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'false');
  }
  if(width<=1279){
    await page.locator('.nav-toggle').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
    assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('.nav-toggle').evaluate(el=>el===document.activeElement),true);
  }
  return links;
}
async function dialogs(page) {
  for(const id of ['impModal','dsModal']){
    const opener=page.locator('[data-modal-open="'+id+'"]'),dialog=page.locator('#'+id);
    await opener.focus();await page.keyboard.press('Enter');assert.equal(await dialog.evaluate(el=>el.open),true);
    assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);}
    for(let i=0;i<8;i++){await page.keyboard.press('Shift+Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);}
    await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(el=>el.open),false);
    assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
    await opener.click();await dialog.locator('[data-modal-close]').click();assert.equal(await dialog.evaluate(el=>el.open),false);
  }
}
async function main(){
  execFileSync(process.execPath,[path.join(root,'_preview/build-inquiry-preview.mjs'),preview],{cwd:root,stdio:'ignore'});
  start('_apps-script/preview/server.cjs');start('_preview/serve-preview.mjs',[preview]);
  await Promise.all([ready('http://127.0.0.1:4175/'),ready('http://127.0.0.1:4176/vorschau.html')]);
  const browser=await chromium.launch({headless:true});
  try {
    for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
      let remoteWriteAttempts=0;
      await context.route('**/*',route=>{
        const request=route.request(),url=new URL(request.url());
        const local=url.hostname==='127.0.0.1'&&['4175','4176'].includes(url.port);
        if(!local&&!['GET','HEAD'].includes(request.method())){remoteWriteAttempts++;return route.abort();}
        return route.continue();
      });
      const page=await context.newPage(),errors=[],consoleErrors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
      await page.goto('http://127.0.0.1:4176/vorschau.html',{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('iframe').scrollIntoViewIfNeeded();
      const form=page.frameLocator('iframe');await form.locator('#interest-form').waitFor();
      await noOverflow(page,'preview '+width);
      const targets=await navigation(page,width,true);await dialogs(page);
      for(const year of ['2026','2027']){
        await page.locator('[data-year="'+year+'"]').click();
        assert.equal(await page.locator('[data-year="'+year+'"]').getAttribute('aria-pressed'),'true');
        await noOverflow(page,'calendar '+year+' '+width);
      }
      await page.locator('iframe').scrollIntoViewIfNeeded();
      assert.equal(await form.locator('h1').textContent(),'Ersttermin vereinbaren');
      await form.locator('#name').fill('CLOUD TEST '+width);
      await form.locator('#level').selectOption('Primarschule (3.–6. Kl.)');
      assert.equal(await form.locator('#level option:checked').textContent(),'Primarschule (4.–6. Kl.)');
      await form.locator('#offer').selectOption('probetag');
      await form.locator('#contact').fill('test-'+width+'@example.invalid');
      await form.locator('#message').fill('Erfundene Cloud-Testanfrage; nur lokaler Simulator.');
      const formFrame=page.frames().find(frame=>frame.url()==='http://127.0.0.1:4175/');
      await noOverflow(formFrame,'synthetic form '+width);
      await page.waitForTimeout(1600);
      await form.locator('#submit').click();await form.locator('#success').waitFor({state:'visible'});
      assert.equal(await form.locator('#success-message').textContent(),expectedMessage);
      const state=await fetch('http://127.0.0.1:4175/state').then(r=>r.json());
      assert.equal(state.legacyPreserved,true);assert.equal(state.inquiries,state.notifications);
      assert.deepEqual(errors,[],'No JavaScript exceptions in paired preview');
      assert.deepEqual(consoleErrors,[],'No browser console errors in paired preview');
      assert.equal(remoteWriteAttempts,0,'No external write request attempted');
      results.push({scope:'paired-preview',width,navigationTargets:targets,dialogs:2,syntheticSaved:true,jsErrors:0});
      await context.close();
    }
    // Public website is a read-only baseline, not a claim that PR #5 is live.
    for(const width of [320,1440]){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
      let blockedWrites=0;
      await context.route('**/*',route=>{
        if(!['GET','HEAD'].includes(route.request().method())){blockedWrites++;return route.abort();}
        return route.continue();
      });
      const page=await context.newPage();await page.goto('https://lerncoaching-zh.ch/',{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);await noOverflow(page,'live baseline '+width);
      const targets=await navigation(page,width,false);await dialogs(page);
      const downloads=await page.locator('a[download]').evaluateAll(links=>[...new Set(links.map(a=>a.href))]);
      for(const url of downloads){assert.equal(new URL(url).origin,'https://lerncoaching-zh.ch');const response=await context.request.get(url);assert.equal(response.status(),200);}
      results.push({scope:'live-read-only-baseline',width,navigationTargets:targets,dialogs:2,downloads:downloads.length,formSubmitted:false,blockedNonReadRequests:blockedWrites});
      await context.close();
    }
    console.log(JSON.stringify({environment:'ephemeral GitHub-hosted Ubuntu standard runner',browser:'Chromium',results,artifactsUploaded:0,realSubmissions:0},null,2));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>{for(const process of processes)process.kill();});
