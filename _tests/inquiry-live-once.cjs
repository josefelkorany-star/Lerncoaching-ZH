'use strict';
// Prepared for one explicitly approved live acceptance. Never launch locally.
const COMMIT_GATE='CODEX GMAIL-ABNAHME 20261117 TEST2 9C4D EINMALIG';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted'||
   process.env.RUNNER_OS!=='Linux'||process.env.GITHUB_REPOSITORY!=='josefelkorany-star/Lerncoaching-ZH'||
   process.env.GITHUB_EVENT_NAME!=='push'||process.env.GITHUB_REF!=='refs/heads/codex/anfrage-gmail-abnahme-20261117'||
   process.env.GITHUB_RUN_ATTEMPT!=='1'||process.env.INQUIRY_QA_PUBLIC_REPOSITORY!=='true'||
   process.env.INQUIRY_LIVE_COMMIT_GATE!==COMMIT_GATE||!process.env.RUNNER_TEMP||
   !/^[a-f0-9]{40}$/.test(process.env.INQUIRY_APPROVED_MERGE_SHA||'')||
   !/^[1-9][0-9]{0,8}$/.test(process.env.INQUIRY_RELEASE_PR||'')){
  throw new Error('CLOUD_ONCE_GUARD');
}
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),temp=path.resolve(process.env.RUNNER_TEMP);
const dependencies=path.resolve(process.env.INQUIRY_QA_DEPENDENCIES||'');
if(!dependencies.startsWith(temp+path.sep))throw new Error('TEMP_TOOLS_GUARD');
const SITE='https://lerncoaching-zh.ch/';
const TEST_NAME='CODEX-TEST2-GMAIL-20261117-9C4D';
const TEST_CONTACT='test-gmail-9c4d@example.invalid';
const TEST_MESSAGE='KLAR MARKIERTE TESTANFRAGE CODEX-TEST2-GMAIL-20261117-9C4D. Erfunden, keine Familie und kein Terminwunsch. Zweiter ausdrücklich freigegebener Funktionstest nach Empfängerwechsel. Bitte beide markierten Testeinträge erst nach bestätigtem Gmail-Eingang entfernen.';
const SUCCESS='Danke! Wir melden uns in der Regel innert 2–3 Werktagen. Für den Ersttermin schicken wir dir dann die Ersttermin-Vereinbarung zum Unterschreiben.';
const widths=[320,375,768,1024,1279,1280,1440];
const results=[];
let phase='preflight',sendStarted=false,postAllowed=0,nonReadBlocked=0,receiptConfirmed=false;
function checkpoint(data){console.log(JSON.stringify(data));}
function check(value,code){if(!value)throw new Error(code);}
function sha(value){return crypto.createHash('sha256').update(value).digest('hex');}
function googleOrigin(origin){try{const u=new URL(origin);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||u.hostname.endsWith('-script.googleusercontent.com'));}catch(_){return false;}}
function githubReadHeaders(token){
  if(typeof token!=='string'||token.trim()==='')throw new Error('GITHUB_READ_TOKEN_MISSING');
  return{Accept:'application/vnd.github+json','User-Agent':'Lerncoaching-ZH-once-acceptance',Authorization:'Bearer '+token};
}
function takeGithubReadHeaders(environment){
  const token=environment.INQUIRY_GITHUB_READ_TOKEN;
  delete environment.INQUIRY_GITHUB_READ_TOKEN;
  return githubReadHeaders(token);
}
function verifyGithubReadResponse(response){
  if(!response.ok){
    const status=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:0;
    checkpoint({phase:'merge-lookup',httpStatus:status});
    throw new Error('MERGE_LOOKUP_FAILED');
  }
}

// Decode only in memory. Never print, save or return request bodies/boot tokens.
// If Google's transport does not expose these exact identifiers, fail closed.
function permittedRpcBody(raw,expected){
  if(typeof raw!=='string'||raw.length>250000||!expected||typeof expected!=='object')return false;
  if(typeof expected.requestId!=='string'||!expected.requestId||typeof expected.token!=='string'||!expected.token||
    expected.infoVersion!=='ersttermin-anfrage-2026-11-17-v1'||expected.privacyVersion!=='anfrage-datenschutz-2026-11-17-v1')return false;
  try{
    // Observed in the fully blocked read-only probe, run 44132541252.
    // Exactly one form field; no alternative envelopes, batches or recursion.
    const entries=[...new URLSearchParams(raw).entries()];
    if(entries.length!==1||entries[0][0]!=='request')return false;
    const rpc=JSON.parse(entries[0][1]);
    if(!Array.isArray(rpc)||rpc.length!==8||rpc[0]!=='submitInterest'||typeof rpc[1]!=='string'||
      rpc[2]!==null||!Array.isArray(rpc[3])||rpc[3].length!==1||!Number.isFinite(rpc[3][0])||
      rpc[4]!==null||rpc[5]!==null||!Number.isFinite(rpc[6])||!Number.isFinite(rpc[7]))return false;
    const args=JSON.parse(rpc[1]);
    if(!Array.isArray(args)||args.length!==1)return false;
    const data=args[0],fields=['name','contact','level','levelOther','offer','message','desiredDate','website','requestId','token','infoVersion','privacyVersion'];
    if(!data||typeof data!=='object'||Array.isArray(data)||!Object.keys(data).every(key=>fields.includes(key))||
      !Object.values(data).every(value=>typeof value==='string'))return false;
    // This allowed payload is a flat string object. Reject repeated JSON keys,
    // including escaped spellings that JSON.parse would otherwise overwrite.
    const keys=[...rpc[1].matchAll(/"(?:\\.|[^"\\])*"\s*:/g)].map(match=>JSON.parse(match[0].slice(0,-1).trim()));
    if(keys.length!==Object.keys(data).length||new Set(keys).size!==keys.length)return false;
    return data.name===TEST_NAME&&data.contact===TEST_CONTACT&&data.level==='Primarschule (3.–6. Kl.)'&&
      data.offer==='probetag'&&data.message===TEST_MESSAGE&&data.desiredDate===''&&data.website===''&&
      (!Object.hasOwn(data,'levelOther')||data.levelOther==='')&&
      ['requestId','token','infoVersion','privacyVersion'].every(key=>data[key]===expected[key]);
  }catch(_){return false;}
}

async function noOverflow(page,label){
  const failures=await page.evaluate(()=>{
    const width=document.documentElement.clientWidth,failures=[];
    if(document.documentElement.scrollWidth>width+1)failures.push('document');
    for(const el of document.body.querySelectorAll('*')){
      if(!el.getClientRects().length||el.closest('dialog:not([open]),[hidden],.honey'))continue;
      const style=getComputedStyle(el),box=el.getBoundingClientRect();
      if(style.position==='absolute'&&style.clip!=='auto')continue;
      if(box.width<2||box.height<2)continue;
      let ancestor=el.parentElement,scroller=false;
      while(ancestor&&ancestor!==document.body){const overflow=getComputedStyle(ancestor).overflowX;if((overflow==='auto'||overflow==='scroll')&&ancestor.scrollWidth>ancestor.clientWidth+1){scroller=true;break;}ancestor=ancestor.parentElement;}
      if(!scroller&&(box.left < -1||box.right>width+1))failures.push((el.id?'#'+el.id:el.tagName.toLowerCase()).slice(0,60));
    }
    return [...new Set(failures)].slice(0,8);
  });
  if(failures.length){checkpoint({readOnlyFailure:label,elements:failures});throw new Error('LAYOUT_OVERFLOW');}
}
async function navigation(page,width){
  const cta=page.locator('.nav-cta');check(await cta.isVisible(),'CTA_HIDDEN');
  check((await cta.textContent()).trim()==='Ersttermin vereinbaren','CTA_WRONG_COPY');
  const full=await cta.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;});check(full,'CTA_CLIPPED');
  const links=await page.locator('#nav-links a').count();check(links>=9,'NAV_TARGETS_MISSING');
  for(let i=0;i<links;i++){
    if(width<=1279){await page.locator('.nav-toggle').focus();await page.keyboard.press('Enter');}
    const link=page.locator('#nav-links a').nth(i),href=await link.getAttribute('href');
    check(await link.isVisible(),'NAV_TARGET_HIDDEN');await link.focus();await page.keyboard.press('Enter');
    check(await page.evaluate(()=>location.hash)===href,'NAV_KEYBOARD_FAILED');
    if(width<=1279)check(await page.locator('.nav-toggle').getAttribute('aria-expanded')==='false','NAV_NOT_CLOSED');
  }
  if(width<=1279){await page.locator('.nav-toggle').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');check(await page.locator('.nav-toggle').getAttribute('aria-expanded')==='false','NAV_ESCAPE_FAILED');}
  return links;
}
async function dialogs(page){
  for(const id of ['impModal','dsModal']){
    const opener=page.locator('[data-modal-open="'+id+'"]'),dialog=page.locator('#'+id);
    await opener.focus();await page.keyboard.press('Enter');check(await dialog.evaluate(el=>el.open&&el.contains(document.activeElement)),'DIALOG_FOCUS_FAILED');
    for(const key of ['Tab','Shift+Tab'])for(let i=0;i<8;i++){await page.keyboard.press(key);check(await dialog.evaluate(el=>el.contains(document.activeElement)),'DIALOG_FOCUS_ESCAPED');}
    await page.keyboard.press('Escape');check(await dialog.evaluate(el=>!el.open),'DIALOG_ESCAPE_FAILED');check(await opener.evaluate(el=>el===document.activeElement),'DIALOG_RETURN_FAILED');
    await opener.click();await dialog.locator('[data-modal-close]').click();check(await dialog.evaluate(el=>!el.open),'DIALOG_CLICK_FAILED');
  }
}
async function calendarAndDownloads(page,context){
  let calendars=0,downloads=0;
  for(const year of ['2026','2027']){
    await page.locator('[data-year="'+year+'"]').click();
    const link=page.locator('#lc-calendar-export'),url=await link.getAttribute('href');
    check(url&&url.startsWith('blob:'+SITE),'CALENDAR_URL_WRONG');
    const ics=await page.evaluate(async url=>{const r=await fetch(url);return r.ok?await r.text():'';},url);
    check(/^BEGIN:VCALENDAR\r?$/m.test(ics)&&/^END:VCALENDAR\r?$/m.test(ics)&&/^BEGIN:VEVENT\r?$/m.test(ics)&&/^END:VEVENT\r?$/m.test(ics),'CALENDAR_INVALID');
    if(year==='2027')check((ics.match(/^BEGIN:VEVENT\r?$/gm)||[]).length===36&&!/DTSTART:2027(?:0102|0327|0515)/.test(ics),'CALENDAR_2027_WRONG');
    calendars++;
  }
  const urls=await page.locator('a[download]').evaluateAll(links=>[...new Set(links.map(a=>a.href))].filter(h=>!h.startsWith('blob:')));
  check(['konzept.pdf','vertrag.pdf','vertrag_ersttermin.pdf'].every(file=>urls.some(url=>new URL(url).pathname==='/'+file)),'DOWNLOAD_LINK_MISSING');
  for(const url of urls){
    const target=new URL(url);check(target.origin===new URL(SITE).origin,'FOREIGN_DOWNLOAD');
    const response=await context.request.get(url);check(response.status()===200,'DOWNLOAD_HTTP_ERROR');
    const file=path.basename(target.pathname);check(['konzept.pdf','vertrag.pdf','vertrag_ersttermin.pdf','poster.jpg'].includes(file),'UNEXPECTED_DOWNLOAD');
    check(sha(await response.body())===sha(await fs.readFile(path.join(root,file))),'DOWNLOAD_VERSION_MISMATCH');downloads++;
  }
  return{calendars,downloads};
}
async function formFrame(page){
  for(let i=0;i<100;i++){
    for(const frame of page.frames()){
      let origin;try{origin=new URL(frame.url()).origin;}catch(_){continue;}
      if(!googleOrigin(origin))continue;
      if(await frame.locator('#interest-form').count()===1&&await frame.locator('#interest-form').isVisible())return frame;
    }
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error('GOOGLE_FORM_NOT_READY');
}
async function checkForm(frame){
  check(await frame.locator('h1').textContent()==='Ersttermin vereinbaren','FORM_WRONG_VERSION');
  check((await frame.locator('header p').textContent()).trim()==='Unverbindlich – wir melden uns persönlich bei dir.','FORM_WRONG_SUBTITLE');
  check((await frame.locator('#versions').textContent()).includes('ersttermin-anfrage-2026-11-17-v1'),'FORM_INFO_VERSION_WRONG');
  check((await frame.locator('#versions').textContent()).includes('anfrage-datenschutz-2026-11-17-v1'),'FORM_PRIVACY_VERSION_WRONG');
  check((await frame.locator('#privacy').textContent()).includes('12 Monate nach Eingang'),'FORM_RETENTION_MISSING');
  check(await frame.locator('#level option[value="Primarschule (3.–6. Kl.)"]').textContent()==='Primarschule (4.–6. Kl.)','FORM_LEVEL_WRONG');
  check(await frame.locator('input[type="checkbox"]').count()===0,'FORM_CONSENT_PRESENT');
  await noOverflow(frame,'live Google form');
}
async function main(){
  const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  check(event.repository?.private===false&&event.head_commit?.message===COMMIT_GATE,'EVENT_GATE');
  const readHeaders=takeGithubReadHeaders(process.env);
  const prResponse=await fetch('https://api.github.com/repos/josefelkorany-star/Lerncoaching-ZH/pulls/'+process.env.INQUIRY_RELEASE_PR,{headers:readHeaders,redirect:'manual'});
  verifyGithubReadResponse(prResponse);const pr=await prResponse.json();
  check(pr.number===Number(process.env.INQUIRY_RELEASE_PR)&&pr.merged===true&&pr.merge_commit_sha===process.env.INQUIRY_APPROVED_MERGE_SHA,'RELEASE_MERGE_NOT_CONFIRMED');
  const approved=await fs.readFile(path.join(root,'index.html')),approvedHash=sha(approved);
  const match=approved.toString('utf8').match(/<iframe[\s\S]*?src="([^"]+)"/);
  check(match&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(match[1]),'FORM_TARGET_MISSING');
  const publicForm=match[1];
  const {chromium}=createRequire(path.join(dependencies,'package.json'))('playwright');
  const browser=await chromium.launch({headless:true});
  try{
    phase='read-only-website';
    for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
      await context.route('**/*',route=>{if(!['GET','HEAD'].includes(route.request().method())){nonReadBlocked++;return route.abort();}return route.continue();});
      const page=await context.newPage();const response=await page.goto(SITE+'?abnahme='+approvedHash,{waitUntil:'domcontentloaded'});
      check(response&&response.ok()&&sha(await response.body())===approvedHash,'LIVE_SOURCE_MISMATCH');
      await page.evaluate(()=>document.fonts.ready);await noOverflow(page,'live '+width);
      const targets=await navigation(page,width);await dialogs(page);const assets=await calendarAndDownloads(page,context);
      const hero=page.locator('img[src="lerncoaching-hero.webp"]');check(await hero.count()===1&&await hero.evaluate(img=>img.complete&&img.naturalWidth>0),'HERO_NOT_LOADED');
      check((await page.locator('body').textContent()).includes('FMS'),'FMS_MISSING');
      const result={scope:'live-website',width,navigationTargets:targets,dialogs:2,...assets,approvedSourceMatches:true,heroLoaded:true,fmsPresent:true};results.push(result);checkpoint({completed:result});
      await context.close();
    }

    phase='read-only-google-form';
    const context=await browser.newContext({viewport:{width:375,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
    let armed=false,expectedRpcMeta=null;const allowedOrigins=new Set();
    await context.route('**/*',route=>{
      const request=route.request();if(['GET','HEAD'].includes(request.method()))return route.continue();
      const origin=new URL(request.url()).origin;
      if(armed&&sendStarted&&postAllowed===0&&request.method()==='POST'&&allowedOrigins.has(origin)&&googleOrigin(origin)&&permittedRpcBody(request.postData(),expectedRpcMeta)){
        postAllowed++;checkpoint({phase:'single-rpc-allowed',method:'submitInterest',testMarker:TEST_NAME,postAllowed});return route.continue();
      }
      nonReadBlocked++;checkpoint({blockedNonRead:true,phase,afterSendStarted:sendStarted});return route.abort();
    });
    const embedded=await context.newPage();await embedded.goto(SITE+'?abnahme='+approvedHash,{waitUntil:'domcontentloaded'});
    const iframe=embedded.locator('iframe');check(await iframe.getAttribute('src')===publicForm,'FORM_TARGET_CHANGED');await iframe.scrollIntoViewIfNeeded();
    await checkForm(await formFrame(embedded));checkpoint({completed:{scope:'live-embedded-form',readOnly:true,versionConfirmed:true}});
    const direct=await context.newPage();await direct.goto(publicForm,{waitUntil:'domcontentloaded'});
    const form=await formFrame(direct);await checkForm(form);
    checkpoint({completed:{scope:'live-direct-form',readOnly:true,versionConfirmed:true}});
    for(const frame of direct.frames()){try{const origin=new URL(frame.url()).origin;if(googleOrigin(origin))allowedOrigins.add(origin);}catch(_){}}
    allowedOrigins.add(new URL(publicForm).origin);
    await form.locator('#name').fill(TEST_NAME);await form.locator('#level').selectOption('Primarschule (3.–6. Kl.)');
    await form.locator('#offer').selectOption('probetag');await form.locator('#contact').fill(TEST_CONTACT);await form.locator('#message').fill(TEST_MESSAGE);
    check(await form.locator('#desiredDate').inputValue()==='','UNEXPECTED_DESIRED_DATE');
    check(await form.locator('#website').inputValue()==='','HONEYPOT_NOT_EMPTY');
    // Compare transient bootstrap values in memory only; never log or persist.
    expectedRpcMeta=await form.evaluate(()=>({requestId:attempt.requestId,token:attempt.token,infoVersion:boot.infoVersion,privacyVersion:boot.privacyVersion}));
    check(typeof expectedRpcMeta.requestId==='string'&&expectedRpcMeta.requestId.length>0&&typeof expectedRpcMeta.token==='string'&&expectedRpcMeta.token.length>0&&
      expectedRpcMeta.infoVersion==='ersttermin-anfrage-2026-11-17-v1'&&expectedRpcMeta.privacyVersion==='anfrage-datenschutz-2026-11-17-v1','FORM_BOOTSTRAP_MISMATCH');
    await new Promise(resolve=>setTimeout(resolve,1600));
    phase='single-submit';armed=true;sendStarted=true;
    checkpoint({phase,sendStarted:true,testMarker:TEST_NAME,maximumAllowedRpcPosts:1,automaticRetries:false});
    // Exactly one UI action. No reload, second click or alternate submission path.
    await form.locator('#submit').click({timeout:10000});
    await form.waitForFunction(()=>!document.getElementById('success').hidden||!document.getElementById('error').hidden,null,{timeout:60000});
    check(await form.locator('#success').isVisible(),'FORM_SUBMISSION_NOT_CONFIRMED');
    check(await form.locator('#success-message').textContent()===SUCCESS,'RECEIPT_TEXT_MISMATCH');
    const receipt=await form.locator('#receipt').textContent();
    const id=receipt.match(/^Vorgangs-ID: (INQ-[a-f0-9-]+)$/i);check(id,'RECEIPT_ID_MISSING');check(postAllowed===1,'RPC_COUNT_MISMATCH');
    receiptConfirmed=true;armed=false;phase='receipt-confirmed';
    checkpoint({phase,sendStarted,postAllowed,receiptConfirmed,inquiryId:id[1],testMarker:TEST_NAME,automaticRetries:false,tableAndEmailVerification:'pending private verification by operator'});
    await context.close();
  }finally{await browser.close();}
  checkpoint({result:'UI_ACCEPTANCE_COMPLETED',readOnlyWidths:results.length,sendStarted,postAllowed,receiptConfirmed,nonReadBlocked,artifactsUploaded:0});
}
main().catch(error=>{
  const safeCode=/^[A-Z][A-Z0-9_]+$/.test(error.message||'')?error.message:'CHECK_FAILED';
  checkpoint({result:'STOP_NO_RETRY',phase,code:safeCode,sendStarted,postAllowed,receiptConfirmed,nonReadBlocked});process.exitCode=1;
});
