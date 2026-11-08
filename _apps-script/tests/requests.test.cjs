const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {runtime} = require('./runtime.cjs');
const source = fs.readFileSync(path.join(__dirname,'../src/Code.gs'),'utf8');
const html = fs.readFileSync(path.join(__dirname,'../src/Index.html'),'utf8');

test('invalid and empty payloads do not store anything',()=>{
  for(const item of [null,{},[],{name:'only'}]){const r=runtime();assert.equal(r.context.submitInterest(item).ok,false);assert.equal(r.state.rows.length,1);assert.equal(r.state.mails.length,0);}
});
test('one valid request is an inquiry only; no consent, address, contract, invoice or reservation',()=>{
  const r=runtime();const result=r.context.submitInterest(r.payload());assert.equal(result.ok,true);assert.equal(result.saved,true);assert.match(result.inquiryId,/^INQ-/);
  const row=r.record(1);assert.equal(row.Datensatztyp,'INTERESSENANFRAGE');assert.equal(row.Anfragestatus,'Anfrage');
  for(const key of ['Einwilligung Probetag','Einwilligung Quartal','Einwilligung Online','Strasse & Hausnr.','PLZ & Wohnort'])assert.equal(row[key],'');
  assert.equal(row['Anfrageinfo-Version'],r.context.LC_INFO_VERSION);assert.equal(row['Datenschutzhinweis-Version'],r.context.LC_PRIVACY_VERSION);
  assert.equal(row['Schulstufe'],'Primarschule (3.–6. Kl.)');assert.equal(row['Schulstufe Anzeige'],'Primarschule (4.–6. Kl.)');
  assert.match(r.state.mails[0].body,/Kein Vertrag, keine Platzreservierung, keine Zahlungspflicht/);assert.equal(r.state.mails[0].to,'captured@example.invalid');assert.equal(r.state.readIds[0],r.props.LC_SPREADSHEET_ID);
});
test('old rows and every original column remain unchanged; only a new row is added',()=>{
  const old=['01.01.2026','HISTORICAL FIXTURE','Primarschule (3.–6. Kl.)','','quartal_1','old@example.invalid','fixture address','fixture town','old note','JA old','',''];
  const r=runtime({legacy:old});const baseline=JSON.stringify(r.state.rows);r.context.submitInterest(r.payload());assert.equal(JSON.stringify(r.state.rows.slice(0,2)),baseline);assert.equal(r.state.rows.length,3);assert.ok(r.state.writes.every(write=>write.row>=3));
});
test('missing or shuffled headers fail closed without any schema migration',()=>{
  const r=runtime();r.state.rows[0]=r.state.rows[0].slice(0,12);assert.equal(r.context.submitInterest(r.payload()).ok,false);assert.equal(r.state.writes.length,0);
  const s=runtime();[s.state.rows[0][0],s.state.rows[0][1]]=[s.state.rows[0][1],s.state.rows[0][0]];assert.equal(s.context.submitInterest(s.payload()).ok,false);assert.equal(s.state.writes.length,0);
});
test('storage failure returns no success and no private error detail',()=>{
  const r=runtime();r.state.failSave=true;const answer=r.context.submitInterest(r.payload());assert.equal(answer.ok,false);assert.equal(answer.saved,false);assert.doesNotMatch(answer.message,/PRIVATE|SPREADSHEET/);assert.equal(r.state.rows.length,1);assert.equal(r.state.mails.length,0);
});
test('write committed but flush failed: retry finds stored row and does not duplicate',()=>{
  const r=runtime();const p=r.payload();r.state.failFlush=true;assert.equal(r.context.submitInterest(p).ok,false);assert.equal(r.state.rows.length,2);const answer=r.context.submitInterest(p);assert.equal(answer.ok,true);assert.equal(answer.duplicate,true);assert.equal(r.state.rows.length,2);assert.equal(r.state.mails.length,0);assert.equal(r.record(1).Benachrichtigung,'ausstehend');
});
test('lost server response and reload retry retain one persistent inquiry even in a new execution',()=>{
  const r=runtime();const p=r.payload();const first=r.context.submitInterest(p);const restart=runtime();restart.state.rows=structuredClone(r.state.rows);restart.state.now=r.state.now;const second=restart.context.submitInterest(p);assert.equal(second.inquiryId,first.inquiryId);assert.equal(second.duplicate,true);assert.equal(restart.state.rows.length,2);assert.equal(restart.state.mails.length,0);
});
test('mail failure after storage succeeds once and never resends on retry',()=>{
  const r=runtime();r.state.failMail=true;const p=r.payload();const first=r.context.submitInterest(p);assert.equal(first.ok,true);assert.equal(r.record(1).Benachrichtigung,'fehlgeschlagen – manuell prüfen');r.state.failMail=false;const second=r.context.submitInterest(p);assert.equal(second.inquiryId,first.inquiryId);assert.equal(r.state.rows.length,2);assert.equal(r.state.mails.length,0);
});
test('mail status failure cannot turn a saved request into apparent failure',()=>{
  const r=runtime();r.state.failMailStatus=true;const result=r.context.submitInterest(r.payload());assert.equal(result.ok,true);assert.equal(r.state.rows.length,2);assert.equal(r.state.mails.length,1);
});
test('same key with changed content fails instead of editing an existing inquiry',()=>{
  const r=runtime();const p=r.payload();r.context.submitInterest(p);const result=r.context.submitInterest({...p,message:'changed'});assert.equal(result.ok,false);assert.equal(result.code,'ID_CONFLICT');assert.equal(r.state.rows.length,2);assert.equal(r.record(1)['Fächer / Nachricht'],'TEST Mathematik');
});
test('fresh technical ID with identical content within 30 minutes is not another interested person',()=>{
  const r=runtime();const first=r.context.submitInterest(r.payload());const second=r.context.submitInterest(r.payload());assert.equal(second.inquiryId,first.inquiryId);assert.equal(r.state.rows.length,2);assert.equal(r.state.mails.length,1);
});
test('parallel submissions are serialized and a busy request can retry safely',()=>{
  const r=runtime();const p=r.payload();let concurrent;r.state.hook=()=>{concurrent=r.context.submitInterest(p);};const first=r.context.submitInterest(p);assert.equal(concurrent.code,'BUSY');assert.equal(first.ok,true);assert.equal(r.context.submitInterest(p).duplicate,true);assert.equal(r.state.rows.length,2);assert.equal(r.state.locked,false);
});
test('formula prefixes including whitespace, tabs and BOM are stored as text',()=>{
  for(const text of ['=IMPORTXML("x")','+SUM(1,1)','-1+2','@SUM(A1)',' \t=1+1','\uFEFF=1+1']){const r=runtime();const answer=r.context.submitInterest(r.payload({message:text}));assert.equal(answer.ok,true);assert.match(r.record(1)['Fächer / Nachricht'],/^'/);assert.ok(r.state.writes.some(write=>write.kind==='format'&&write.format==='@'));}
});
test('unknown consent, status, amount and test flags from a client are rejected',()=>{
  for(const key of ['einwilligung_quartal','status','price','isTest']){const r=runtime();assert.equal(r.context.submitInterest(r.payload({[key]:'YES'})).ok,false);assert.equal(r.state.rows.length,1);}
});
test('school and offer whitelists, other-level requirements and text limits are enforced',()=>{
  for(const changes of [{level:'3. Primar'},{offer:'discount120'},{name:'a'.repeat(121)},{message:'a'.repeat(1501)},{level:'sonstiges',levelOther:''},{contact:'no contact'},{message:'bad\u0000control'}]){const r=runtime();assert.equal(r.context.submitInterest(r.payload(changes)).ok,false);}
  const r=runtime();assert.equal(r.context.submitInterest(r.payload({level:'sonstiges',levelOther:'TEST Ausbildung'})).ok,true);
});
test('higher target groups and all existing offer values remain available without acceptance',()=>{
  const r=runtime();for(const level of Object.keys(r.context.LC_LEVELS)){const row=runtime();assert.equal(row.context.submitInterest(row.payload({level,levelOther:level==='sonstiges'?'TEST':''})).ok,true);}
  for(const offer of Object.keys(r.context.LC_OFFERS)){const row=runtime();assert.equal(row.context.submitInterest(row.payload({offer})).ok,true);}
});
test('invalid, past and too distant dates rejected; online weekdays allowed, on-site weekdays rejected',()=>{
  for(const desiredDate of ['2026-02-30','2026-11-07','2026-11-09','2030-01-01']){const r=runtime();assert.equal(r.context.submitInterest(r.payload({desiredDate})).ok,false);}
  const r=runtime();assert.equal(r.context.submitInterest(r.payload({offer:'online_einzel',desiredDate:'2026-11-09'})).ok,true);
});
test('dates use Zurich day at midnight and in summer, independently of machine timezone',()=>{
  const winter=runtime({now:'2026-12-31T23:30:00Z'});assert.equal(winter.context.bootstrap_().today,'2027-01-01');
  const summer=runtime({now:'2027-07-01T22:30:00Z'});assert.equal(summer.context.bootstrap_().today,'2027-07-02');
});
test('honeypot, signed token, minimum dwell time, expiry and old information version are checked',()=>{
  for(const changes of [{website:'spam'},{token:'tampered'},{infoVersion:'old'}]){const r=runtime();assert.equal(r.context.submitInterest(r.payload(changes)).ok,false);}
  const r=runtime();const p=r.payload();r.state.now='2026-11-08T12:00:00Z';assert.equal(r.context.submitInterest(p).ok,false);r.state.now='2026-11-08T15:00:00Z';assert.equal(r.context.submitInterest(p).ok,false);
});
test('contact rate limit preserves form availability and duplicate retries',()=>{
  const r=runtime();let first;for(let i=0;i<3;i++){const p=r.payload({message:'different '+i});first??=p;assert.equal(r.context.submitInterest(p).ok,true);}assert.equal(r.context.submitInterest(r.payload({message:'fourth'})).code,'RATE_LIMIT');assert.equal(r.context.submitInterest(first).duplicate,true);assert.equal(r.context.bootstrap_().levels['Primarschule (3.–6. Kl.)'],'Primarschule (4.–6. Kl.)');
});
test('test mode requires a separate spreadsheet and intercepts all notification mail',()=>{
  const r=runtime({props:{LC_MODE:'test'}});assert.equal(r.context.submitInterest(r.payload()).ok,true);assert.equal(r.record(1).Datensatztyp,'TEST');assert.equal(r.record(1).Benachrichtigung,'Test: abgefangen');assert.equal(r.state.readIds[0],r.props.LC_TEST_SPREADSHEET_ID);assert.equal(r.state.mails.length,0);
  const bad=runtime({props:{LC_MODE:'test',LC_TEST_SPREADSHEET_ID:'TEST_FIXTURE_PRODUCTION_ID'}});assert.throws(()=>bad.payload());
});
test('there are no public admin/delete functions or automatic schema manipulation',()=>{
  const publicFunctions=[...source.matchAll(/^function (\w+)\(/gm)].map(m=>m[1]).filter(name=>!name.endsWith('_'));
  assert.deepEqual(publicFunctions,['doGet','doPost','submitInterest']);assert.doesNotMatch(source,/\.clear\(|deleteRow|deleteSheet|setupSheet|getActiveSheet|appendRow|insertColumn/);
  const r=runtime();assert.equal(JSON.parse(r.context.doPost().text).ok,false);assert.equal(r.state.rows.length,1);
});
test('client uses server-confirmed RPC success, no no-cors, contractual checkbox or sensitive browser storage',()=>{
  assert.match(html,/google\.script\.run\.withSuccessHandler\(response\)\.withFailureHandler/);
  assert.match(html,/result\.ok!==true\|\|result\.saved!==true/);assert.doesNotMatch(html,/no-cors|type="checkbox"|einwilligung_probetag|fetch\(/);
  assert.match(html,/sessionStorage\.setItem\(storageKey,JSON\.stringify\(attempt\)\)/);assert.match(html,/attempt=\{requestId:boot\.requestId,token:boot\.token,issued:boot\.issued\}/);
});
test('local preview renders the production form with an isolated mock bridge and valid JavaScript',()=>{
  const vm=require('node:vm');const {createPreviewServer}=require('../preview/server.cjs');const preview=createPreviewServer();const rendered=preview.render();
  assert.match(rendered,/Private Formularvorschau/);assert.match(rendered,/Alle Speicher- und Mailaufrufe werden hier lokal abgefangen/);assert.doesNotMatch(rendered,/<\?!=/);
  const scripts=[...rendered.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0]));assert.equal(preview.state().rows.length,2);
});
test('migration plan only appends missing metadata and never alters existing columns or rows',()=>{
  const {plan}=require('../maintenance/plan-headers.cjs');const r=runtime();const legacy=[...r.context.LC_LEGACY_HEADERS];const result=plan(legacy);assert.deepEqual(result.finalHeaders.slice(0,12),legacy);assert.equal(result.appendStartingAtColumn,13);assert.equal(result.readOnly,true);assert.equal(result.appendHeaders.length,12);
  assert.equal(plan(result.finalHeaders).appendHeaders.length,0);assert.throws(()=>plan([...legacy].reverse()));
});

test('saved retries survive expired tokens, Zurich midnight, past desired dates and changed information versions',()=>{
  const r=runtime({now:'2026-11-14T21:50:00Z'});const p=r.payload({desiredDate:'2026-11-14'});const first=r.context.submitInterest(p);assert.equal(first.ok,true);
  r.state.now='2026-11-15T01:00:00Z';r.context.LC_INFO_VERSION='new-review-version';r.context.LC_PRIVACY_VERSION='new-privacy-version';
  const second=r.context.submitInterest(p);assert.equal(second.inquiryId,first.inquiryId);assert.equal(second.duplicate,true);assert.equal(r.state.rows.length,2);assert.equal(r.state.mails.length,1);
});

test('expired unsaved requests renew only the same technical ID without storage or mail',()=>{
  const r=runtime();const p=r.payload();r.state.now='2026-11-08T15:00:00Z';const expired=r.context.submitInterest(p);assert.equal(expired.code,'EXPIRED');assert.equal(expired.saved,false);assert.equal(expired.retry.requestId,p.requestId);assert.notEqual(expired.retry.token,p.token);assert.equal(r.state.rows.length,1);assert.equal(r.state.mails.length,0);
  r.state.now='2026-11-08T15:00:02Z';const retried=r.context.submitInterest({...p,token:expired.retry.token});assert.equal(retried.ok,true);assert.equal(r.record(1)['Anfrage-ID'],p.requestId);assert.equal(r.state.rows.length,2);
});

function clientHarness(boot, storage) {
  const vm=require('node:vm');const elements=new Map();let reloads=0;
  const document={getElementById(id){if(!elements.has(id))elements.set(id,{hidden:true,value:'',handlers:{},add(){},focus(){this.focused=true;},addEventListener(type,fn){this.handlers[type]=fn;},reportValidity(){return true;}});return elements.get(id);}};
  const context=vm.createContext({document,Option:function(text,value){this.text=text;this.value=value;},sessionStorage:{getItem(key){return storage.get(key)||null;},setItem(key,value){storage.set(key,value);},removeItem(key){storage.delete(key);}},window:{location:{reload(){reloads++;}}},Date,JSON,Number,Object});
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('<?!= bootJson ?>',JSON.stringify(boot));vm.runInContext(script,context);
  return {context,elements,reloads:()=>reloads};
}

test('client keeps unresolved IDs beyond two hours, renews them, and clears only confirmed attempts',()=>{
  const r=runtime();const boot=r.context.bootstrap_();const old={requestId:boot.requestId,token:boot.token,issued:boot.issued-3*3600000};const key='lc-interest-attempt-v1';const storage=new Map([[key,JSON.stringify(old)]]);const c=clientHarness(boot,storage);
  assert.equal(JSON.parse(storage.get(key)).issued,old.issued);c.context.response({ok:false,saved:false,message:'uncertain'});assert.equal(JSON.parse(storage.get(key)).token,old.token);
  c.context.response({ok:false,saved:false,code:'EXPIRED',message:'retry',retry:{requestId:old.requestId,token:'renewed',issued:boot.issued}});assert.equal(JSON.parse(storage.get(key)).token,'renewed');
  c.context.response({ok:true,saved:true,inquiryId:'INQ-test',message:'saved'});assert.equal(storage.has(key),false);assert.equal(c.elements.get('success').hidden,false);c.elements.get('another-request').handlers.click();assert.equal(c.reloads(),1);
  const fresh=r.context.bootstrap_();clientHarness(fresh,storage);assert.equal(JSON.parse(storage.get(key)).requestId,fresh.requestId);assert.notEqual(fresh.requestId,old.requestId);
});

test('a changed request after an acknowledged conflict can start a new attempt on reload',()=>{
  const r=runtime();const storage=new Map();const c=clientHarness(r.context.bootstrap_(),storage);c.context.response({ok:false,saved:false,code:'ID_CONFLICT',message:'already stored; reload'});assert.equal(storage.size,0);
});
