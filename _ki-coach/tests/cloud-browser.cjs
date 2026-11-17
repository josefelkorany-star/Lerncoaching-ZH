'use strict';
// Browser execution is allowed only on a fresh public GitHub-hosted Ubuntu VM.
// Every backend request is intercepted with invented data; no paid API calls.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {createRequire}=require('node:module');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted'||process.platform!=='linux'||process.env.COACH_CLOUD_QA!=='true')throw Error('Isolated GitHub-hosted cloud runner required');
const {chromium}=createRequire(path.join(process.env.COACH_DEPENDENCY_ROOT,'package.json'))('playwright');
const PDF=require('../../assets/vendor/pdf-lib-1.17.1.min.js');
const root=path.resolve(__dirname,'../..');
const allowed=new Map([['/coach.html',['coach.html','text/html']],['/logo.png',['logo.png','image/png']],['/assets/vendor/pdf-lib-1.17.1.min.js',['assets/vendor/pdf-lib-1.17.1.min.js','text/javascript']]]);
const api='https://script.google.com/macros/s/AKfycbzRvUzoLAwWCO9ZO2shz78o599LLZqpXctwPD95GIiuv6sg6yFcYFjui27mOJvxSg20/exec';
const server=http.createServer(async(req,res)=>{const entry=allowed.get(req.url);if(!entry){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':entry[1]});res.end(await fs.readFile(path.join(root,entry[0])));});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const pdf=await fs.readFile(path.join(__dirname,'fixtures/erfundene-aufgabe.pdf'));
 const long=await PDF.PDFDocument.create();for(let i=0;i<21;i++)long.addPage([100,100]);const longPdf=Buffer.from(await long.save());
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=','base64');
 const widths=[320,375,390,768,1024,1366,1440];
 let checks=0;
 try{
 for(const width of widths){
  const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage(),calls=[],errors=[];
  let role='Schüler',deny=false;
  page.on('pageerror',e=>errors.push(e.message));
  await ctx.route('**/*',async route=>{
   const url=route.request().url();
   if(url===api){const d=JSON.parse(route.request().postData());calls.push(d);const value=d.aktion==='login'?(deny?{ok:false,fehler:'CODE',meldung:'Ungültiger Testzugang'}:{ok:true,nutzer:{name:'Erfundene Testperson',rolle:role,stufe:'Sekundarschule'},verbrauch:{heute:0,tagesLimit:20,monatUsd:0,monatBudget:5,monatProzent:0}}):{ok:true,anfrageId:d.anfrageId,antwort:'Erfundene Testantwort: Welcher Rechenschritt passt?',verbrauch:{heute:1,tagesLimit:20,monatUsd:0,monatBudget:5,monatProzent:0}};await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(value)});return;}
   if(url.startsWith(origin+'/'))return route.continue();
   // No external fonts, telemetry, Google, or model connections.
   return route.abort();
  });
  await page.goto(origin+'/coach.html');await page.locator('#code').fill('SYNTHETIC-CLOUD');await page.locator('#bleiben').check();await page.locator('#login-form').evaluate(e=>e.requestSubmit());await page.locator('#v-chat').waitFor({state:'visible'});
  assert.equal(await page.locator('#who-rolle').textContent(),'Schüler · Sekundarschule');
  const box=await page.locator('#eingabe').boundingBox();assert.ok(box.height>=44&&box.width>80);assert.doesNotMatch(await page.locator('#meter').textContent(),/NaN|undefined/);checks++;
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;
  await page.locator('#eingabe').fill('Erfundene PDF-Aufgabe');
  await page.locator('#datei').setInputFiles({name:'Testaufgabe.pdf',mimeType:'application/pdf',buffer:pdf});await page.locator('#bild-vorschau').waitFor({state:'visible'});
  await page.locator('#btn-senden').click();await page.locator('.msg-ai').last().waitFor();await page.waitForFunction(()=>!document.querySelector('#btn-senden').disabled);
  const first=calls.filter(d=>d.aktion==='chat').at(-1);assert.equal(first.anhaenge[0].typ,'application/pdf');assert.equal(first.anhangNachricht,0);checks++;
  await page.locator('#eingabe').fill('Und danach?');await page.locator('#btn-senden').click();await page.waitForFunction(()=>!document.querySelector('#btn-senden').disabled);
  const follow=calls.filter(d=>d.aktion==='chat').at(-1);assert.deepEqual(follow.anhaenge,first.anhaenge);assert.equal(follow.anhangNachricht,0);checks++;
  const stores=await page.evaluate(()=>JSON.stringify([Object.assign({},localStorage),Object.assign({},sessionStorage)]));assert.ok(!stores.includes(first.anhaenge[0].daten));assert.ok(!/data:application|data:image/.test(stores));checks++;
  for(const via of ['paste','drop']){
   await page.evaluate(({data,via})=>{const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'Eingefuegt.pdf',{type:'application/pdf'}));const target=document.querySelector(via==='paste'?'#eingabe':'#v-chat');const event=new Event(via,{bubbles:true,cancelable:true});Object.defineProperty(event,via==='paste'?'clipboardData':'dataTransfer',{value:dt});target.dispatchEvent(event);},{data:pdf.toString('base64'),via});
   await page.locator('#bild-vorschau').waitFor({state:'visible'});assert.match(await page.locator('#anhang-info').textContent(),/PDF|pdf/);await page.locator('#bild-weg').click();checks++;
  }
  await page.locator('#datei').setInputFiles({name:'21-Seiten.pdf',mimeType:'application/pdf',buffer:longPdf});await page.locator('#hinweis').filter({hasText:'20 Seiten'}).waitFor();assert.equal(await page.locator('#bild-vorschau').isVisible(),false);checks++;
  await page.locator('#datei').setInputFiles({name:'zu-gross.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3670017)});await page.locator('#hinweis').filter({hasText:'3.5 MB'}).waitFor();checks++;
  await page.locator('#datei').setInputFiles(Array.from({length:5},(_,i)=>({name:'Bild'+i+'.png',mimeType:'image/png',buffer:png})));await page.locator('#anhang-info').filter({hasText:'5 Fotos'}).waitFor();await page.locator('#eingabe').fill('Fünf erfundene Bilder');await page.locator('#btn-senden').click();await page.waitForFunction(()=>!document.querySelector('#btn-senden').disabled);assert.equal(calls.filter(d=>d.aktion==='chat').at(-1).anhaenge.length,5);checks++;
  role='Lehrperson';await page.reload();await page.locator('#v-chat').waitFor({state:'visible'});assert.equal(await page.locator('#who-rolle').textContent(),'Lehrperson · Sekundarschule');assert.equal(await page.locator('#anhang-kontext').isVisible(),false);checks++;
  deny=true;await page.reload();await page.locator('#login-err').filter({hasText:'Ungültiger Testzugang'}).waitFor();assert.equal(await page.locator('#v-chat').isVisible(),false);assert.equal(await page.locator('#who-name').textContent(),'');checks++;
  assert.deepEqual(errors,[]);await ctx.close();console.log(JSON.stringify({width,syntheticBrowserChecks:'passed'}));
 }
 if(process.env.COACH_LIVE_QA==='true'){
  const expected=await fs.readFile(path.join(root,'coach.html'),'utf8');let delivered=false;
  for(let attempt=0;attempt<30;attempt++){const r=await fetch('https://lerncoaching-zh.ch/coach.html?qa='+Date.now());if(r.ok&&(await r.text())===expected){delivered=true;break;}await pause(10000);}assert.ok(delivered,'New Pages source must be delivered before live browser proof');
  const page=await browser.newPage();await page.route('**/*',route=>{const u=route.request().url();return u.startsWith('https://lerncoaching-zh.ch/')?route.continue():route.abort();});
  const r=await page.goto('https://lerncoaching-zh.ch/coach.html?qa='+Date.now());assert.equal(r.status(),200);
  assert.equal(await r.text(),await fs.readFile(path.join(root,'coach.html'),'utf8'));
  assert.ok(await page.evaluate(()=>typeof PDFLib.PDFDocument.load==='function'));assert.match(await page.locator('#datei').getAttribute('accept'),/application\/pdf/);
  console.log(JSON.stringify({liveSourceExact:true,livePdfLibraryLoaded:true,realLogins:0,paidCalls:0}));await page.close();
 }
 console.log(JSON.stringify({checks,widths,environment:'isolated GitHub-hosted Ubuntu Chromium',realLogins:0,paidCalls:0}));
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});
