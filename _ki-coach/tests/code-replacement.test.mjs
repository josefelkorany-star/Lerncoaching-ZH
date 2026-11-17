import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackend} from './working-backend-harness.mjs';

const login=(e,code=e.student)=>e.post({aktion:'login',code});
const row=(e,code)=>e.sheets.get('Zugänge').rows.find(r=>r[3]===code);
const replace=(e,code=e.student)=>e.context.ersetzeCode_(code).code;
const request=(e,code=e.student)=>({aktion:'chat',anfrageId:'replacement-chat-000000001',code,fach:'Mathematik',nachrichten:[{rolle:'user',text:'Erfundene Textaufgabe: 3 + 4. Wie beginne ich?'}]});
function legacy(e,{usd=.40,count=7,day=2,globalUsd=.60,globalCount=9}={}) {
 const id=e.context.hash_(e.context.normalisiereCode_(e.student));
 e.props.set('Z_M_'+id,JSON.stringify({m:'2026-11',usd,n:count}));
 e.props.set('Z_T_'+id,JSON.stringify({d:'2026-11-17',n:day}));
 e.props.set('Z_G',JSON.stringify({m:'2026-11',usd:globalUsd,n:globalCount}));
 return id;
}
function stand(e,code) {
 const ctx=e.context.kontext_(),n=e.context.findeNutzer_(ctx,code);
 return JSON.parse(JSON.stringify(e.context.zaehlerLesen_(n)));
}
function answers(e,...values) {
 e.ui.prompt=()=>({getSelectedButton:()=>values.length?e.ui.Button.OK:e.ui.Button.CANCEL,getResponseText:()=>values.shift()||''});
}

test('Partly consumed original Properties and pre-existing 2bc journal keep their exact keys and totals after replacement',()=>{
 const e=createBackend(),id=legacy(e);e.settings({tagS:3});
 assert.equal(e.post(request(e)).ok,true);
 const before=stand(e,e.student),properties=Object.fromEntries(e.props),journal=JSON.stringify(e.journal());
 // 2bc had exactly these journal keys but no technical identity columns.
 row(e,e.student).splice(11);e.sheets.get('Zugänge').rows[0].splice(11);
 const next=replace(e);
 assert.equal(row(e,next)[11],id);
 assert.deepEqual(stand(e,next),before);
 assert.deepEqual(Object.fromEntries(e.props),properties);
 assert.equal(JSON.stringify(e.journal()),journal);
 assert.equal(login(e).fehler,'CODE');
 assert.equal(login(e,next).verbrauch.heute,3);
 e.advance();assert.equal(e.chat({code:next}).fehler,'TAG');
 assert.equal(e.requests.length,1);
 assert.equal(before.g.n,10);assert.equal(before.m.n,8);
 assert.ok(Math.abs(before.g.usd-.6004)<1e-10);assert.ok(Math.abs(before.m.usd-.4004)<1e-10);
});

test('A nearly exhausted legacy monthly budget is not renewed by a replacement code',()=>{
 const e=createBackend();legacy(e,{usd:2.999,day:3});
 const next=replace(e);assert.equal(e.chat({code:next}).fehler,'BUDGET');
 assert.equal(e.requests.length,0);assert.equal(login(e,next).verbrauch.heute,3);
 assert.equal(stand(e,next).m.usd,2.999);
});

test('Completed response and payload-conflict receipts survive code replacement without a second call',()=>{
 const e=createBackend(),first=e.post(request(e)),next=replace(e);
 e.reboot();e.advance();
 const again=e.post(request(e,next));
 assert.equal(again.ok,true);assert.equal(again.antwort,first.antwort);
 assert.equal(e.post({...request(e,next),nachrichten:[{rolle:'user',text:'Andere Aufgabe'}]}).fehler,'VORGANG_KONFLIKT');
 assert.equal(e.requests.length,1);assert.equal(e.journal().filter(x=>x.art==='chat').length,1);
 assert.equal(login(e,next).verbrauch.heute,1);
});

test('An evicted receipt after replacement remains a tombstone, not permission to pay again',()=>{
 const e=createBackend();e.post(request(e));const next=replace(e);e.cache.clear();e.advance();
 assert.equal(e.post(request(e,next)).fehler,'VORGANG_ABGELAUFEN');assert.equal(e.requests.length,1);
});

test('Uncertain paid work retains its reserved amount and daily slot after replacement',()=>{
 const e=createBackend({fetch:()=>new Error('Synthetic timeout')});e.settings({tagS:1});
 assert.equal(e.post(request(e)).fehler,'VORGANG_OFFEN');const before=stand(e,e.student),next=replace(e);
 e.cache.clear();e.advance();
 assert.equal(e.post(request(e,next)).fehler,'VORGANG_OFFEN');
 assert.equal(e.chat({code:next}).fehler,'TAG');
 assert.deepEqual(stand(e,next),before);assert.equal(e.requests.length,1);
 assert.equal(e.journal()[0].status,'UNKLAR');
});

test('Replacing a code while its original request is in flight cannot create another reservation',()=>{
 const e=createBackend();e.settings({tagS:1});let next,overlap;
 e.setFetch(()=>{next=replace(e);overlap=e.chat({code:next});return e.normalResponse();});
 assert.equal(e.post(request(e)).ok,true);
 assert.equal(overlap.fehler,'TAG');assert.equal(e.requests.length,1);
 assert.equal(login(e).fehler,'CODE');assert.equal(login(e,next).verbrauch.heute,1);
 assert.equal(row(e,next)[8],1);
 assert.equal(e.journal().filter(x=>x.art==='chat').length,1);
});

test('Report acknowledgement and report-content conflict retain the same identity across replacement',()=>{
 const e=createBackend(),id='replacement-report-000001';
 const first=e.report({meldungId:id}),next=replace(e);e.cache.clear();
 assert.deepEqual(e.report({meldungId:id,code:next}),first);
 assert.equal(e.report({meldungId:id,code:next,frage:'Anderer Text'}).fehler,'VORGANG_KONFLIKT');
 assert.equal(e.sheets.get('Meldungen').rows.length,2);assert.equal(e.mail.length,1);
});

test('An unfinished report can retry under the new code without creating another journal identity',()=>{
 const e=createBackend(),id='replacement-report-000002';e.fail.append.add('Meldungen');
 assert.equal(e.report({meldungId:id}).fehler,'SPEICHERN');const next=replace(e);e.fail.append.clear();
 assert.equal(e.report({meldungId:id,code:next}).gespeichert,true);
 assert.equal(e.sheets.get('Meldungen').rows.length,2);assert.equal(e.journal().filter(x=>x.art==='meldung').length,1);
});

test('Uncertain menu-test pointer is preserved across replacement and cannot incur another provider call',()=>{
 const e=createBackend({fetch:()=>new Error('Synthetic timeout')});answers(e,e.teacher);e.context.verbindungTesten();
 const before=JSON.stringify(e.journal()),next=replace(e,e.teacher);e.advance(60000);e.cache.clear();answers(e,next);
 e.context.verbindungTesten();assert.equal(e.requests.length,1);assert.equal(JSON.stringify(e.journal()),before);
 assert.equal(e.requests[0].body.max_tokens,2000);
});

test('Names can be identical; quotas remain separate and role, limits, activity and notes survive replacement',()=>{
 const e=createBackend();row(e,e.teacher)[0]=row(e,e.student)[0];row(e,e.student)[5]=1.75;row(e,e.student)[6]=12;row(e,e.student)[10]='Private synthetic note';
 e.chat();const before=row(e,e.student).slice(0,11),next=replace(e);
 assert.equal(login(e,next).verbrauch.heute,1);assert.equal(login(e,e.teacher).verbrauch.heute,0);
 const after=row(e,next).slice(0,11);after[3]=before[3];assert.deepEqual(after,before);
 assert.equal(login(e,next).verbrauch.monatBudget,1.75);assert.equal(login(e,next).verbrauch.tagesLimit,12);
});

test('Sorting full access rows preserves replacement ownership and the post-request usage mirror',()=>{
 const e=createBackend();login(e);login(e,e.teacher);let next;
 e.setFetch(()=>{const rows=e.sheets.get('Zugänge').rows;[rows[1],rows[2]]=[rows[2],rows[1]];next=replace(e);return e.normalResponse();});
 assert.equal(e.chat().ok,true);assert.equal(row(e,next)[8],1);assert.equal(row(e,e.teacher)[8],'');
 assert.equal(login(e,next).verbrauch.heute,1);assert.equal(login(e,e.teacher).verbrauch.heute,0);
});

test('Repeated replacements do not copy or aggregate consumption more than once',()=>{
 const e=createBackend();legacy(e);e.chat();const before=stand(e,e.student);
 let code=e.student;for(let i=0;i<5;i++)code=replace(e,code);
 assert.deepEqual(stand(e,code),before);assert.equal(e.requests.length,1);assert.equal(row(e,code)[12]&&JSON.parse(row(e,code)[12]).length,6);
});

test('Duplicate access codes, stable IDs, and historical code aliases all fail closed',()=>{
 for(const kind of ['code','identity','alias']) {
  const e=createBackend();login(e);login(e,e.teacher);const next=replace(e);
  if(kind==='code')row(e,e.teacher)[3]=next;
  if(kind==='identity'){row(e,e.teacher)[11]=row(e,next)[11];row(e,e.teacher)[12]=JSON.stringify([...JSON.parse(row(e,next)[12]),e.context.hash_(e.context.normalisiereCode_(e.teacher))]);}
  if(kind==='alias'){const t=row(e,e.teacher);t[3]=e.student;t.splice(11);}
  assert.equal(login(e,next).fehler,'IDENTITAET',kind);assert.equal(e.chat({code:next}).fehler,'IDENTITAET',kind);assert.equal(e.requests.length,0);
 }
});

test('A manually overwritten unregistered code cannot bypass its stored identity',()=>{
 const e=createBackend();login(e);row(e,e.student)[3]='LC-MANU-ELLE';
 assert.equal(login(e,'LC-MANU-ELLE').fehler,'IDENTITAET');assert.equal(e.chat({code:'LC-MANU-ELLE'}).fehler,'IDENTITAET');assert.equal(e.requests.length,0);
});

test('Incomplete or damaged identity cells and unrelated occupied technical columns fail closed',()=>{
 for(const kind of ['missing-id','missing-history','invalid-history','foreign-header']) {
  const e=createBackend();login(e);const r=row(e,e.student);
  if(kind==='missing-id')r[11]='';if(kind==='missing-history')r[12]='';if(kind==='invalid-history')r[12]='not json';
  if(kind==='foreign-header')e.sheets.get('Zugänge').rows[0][11]='Existing unrelated data';
  assert.equal(e.chat().fehler,'IDENTITAET',kind);assert.equal(e.requests.length,0);
 }
});

test('Initial identity-write failure performs no provider call and releases the script lock',()=>{
 const e=createBackend();e.fail.beforeSet=w=>{if(w.name==='Zugänge'&&w.row===2&&w.col===12)throw Error('Synthetic metadata failure');};
 assert.equal(e.chat().ok,false);assert.equal(e.requests.length,0);
 e.fail.beforeSet=null;assert.equal(login(e).ok,true);assert.equal(e.requests.length,0);
});

test('Code replacement partial writes preserve accounting with either old or new code',()=>{
 for(const phase of ['before-identity','after-identity','before-code','after-code']) {
  const e=createBackend();legacy(e);login(e);const before=stand(e,e.student);
  const hook=w=>{if(w.name==='Zugänge'&&w.row===2&&w.col===(phase.includes('identity')?12:4))throw Error('Synthetic '+phase);};
  e.fail[phase.startsWith('before')?'beforeSet':'afterSet']=hook;
  assert.throws(()=>replace(e),/Synthetic/);e.fail.beforeSet=null;e.fail.afterSet=null;
  const actual=e.sheets.get('Zugänge').rows[1][3];
  assert.equal(login(e,actual).ok,true,phase);assert.deepEqual(stand(e,actual),before,phase);
  if(phase==='after-code')assert.equal(login(e).fehler,'CODE');else assert.equal(actual,e.student);
  assert.equal(e.requests.length,0);assert.equal(e.locks.at(-1)[0],'release');
 }
});

test('Identity readback disagreement prevents code mutation and provider work',()=>{
 const e=createBackend();login(e);
 e.fail.afterSet=w=>{if(w.name==='Zugänge'&&w.row===2&&w.col===12)e.sheets.get('Zugänge').rows[1][12]='corrupted';};
 assert.throws(()=>replace(e),/nicht sicher gespeichert/);e.fail.afterSet=null;
 assert.equal(e.sheets.get('Zugänge').rows[1][3],e.student);assert.equal(e.chat().fehler,'IDENTITAET');assert.equal(e.requests.length,0);
});

test('A cleared but registered access row gets a replacement without resetting its usage',()=>{
 const e=createBackend();legacy(e);login(e);const before=stand(e,e.student);row(e,e.student)[3]='';
 e.context.codesErzeugen();const next=e.sheets.get('Zugänge').rows[1][3];
 assert.ok(next);assert.notEqual(next,e.student);assert.deepEqual(stand(e,next),before);assert.equal(login(e).fehler,'CODE');
});

test('An unregistered cleared legacy row receives no automatic new identity or code',()=>{
 const e=createBackend();legacy(e);row(e,e.student)[3]='';e.context.codesErzeugen();
 assert.equal(e.sheets.get('Zugänge').rows[1][3],'');assert.equal(e.sheets.get('Zugänge').rows[1][11],undefined);assert.equal(e.requests.length,0);
});

test('Explicit recovery of a deleted legacy code keeps original partially consumed Properties',()=>{
 const e=createBackend();const id=legacy(e);row(e,e.student)[3]='';answers(e,e.student,'ZUORDNEN');e.context.codesErzeugen();
 const next=e.sheets.get('Zugänge').rows[1][3];assert.ok(next);assert.equal(row(e,next)[11],id);
 assert.equal(login(e,next).verbrauch.heute,2);assert.equal(stand(e,next).m.usd,.4);assert.equal(stand(e,next).g.usd,.6);
});

test('Recovery cancellation, visible prior usage, or another person old code cannot silently reset usage',()=>{
 for(const kind of ['unconfirmed','prior-usage','other-person']) {
  const e=createBackend();row(e,e.student)[3]='';
  if(kind==='unconfirmed')answers(e,e.student,'NO');
  if(kind==='prior-usage'){e.sheets.get('Zugänge').rows[1][7]=.2;answers(e,'NEU');}
  if(kind==='other-person')answers(e,e.teacher,'ZUORDNEN');
  e.context.codesErzeugen();assert.equal(e.sheets.get('Zugänge').rows[1][3],'',kind);assert.equal(e.requests.length,0);
 }
});

test('A genuinely new person needs an explicit NEU confirmation and receives an independent identity',()=>{
 const e=createBackend();e.addUser('',{name:'Erfundene neue Person',active:false,role:''});answers(e,'NEU');e.context.codesErzeugen();
 const r=e.sheets.get('Zugänge').rows.at(-1);assert.ok(r[3]);assert.match(r[11],/^[a-f0-9]{16}$/);
 assert.equal(login(e,r[3]).verbrauch.heute,0);assert.equal(r[4],true);assert.equal(r[1],'Schüler');
});

test('Generating replacement codes never reuses a retired code, including randomized collisions',()=>{
 const e=createBackend(),next=replace(e);let attempts=0;
 e.context.neuerCode_=()=>++attempts===1?e.student:'LC-NEWA-SDFG';
 const newest=replace(e,next);assert.equal(newest,'LC-NEWA-SDFG');assert.equal(attempts,2);
 assert.equal(login(e).fehler,'CODE');assert.equal(login(e,next).fehler,'CODE');assert.equal(login(e,newest).ok,true);
});

test('A replacement does not reactivate a deliberately disabled person',()=>{
 const e=createBackend();login(e);row(e,e.student)[4]=false;const next=replace(e);
 assert.equal(row(e,next)[4],false);assert.equal(login(e,next).fehler,'CODE');
 row(e,next)[3]='';e.context.codesErzeugen();assert.equal(e.sheets.get('Zugänge').rows[1][4],false);
});

test('The menu replacement route is explicit and never calls the provider',()=>{
 const e=createBackend();legacy(e);answers(e,e.student);e.context.codeErsetzen();const next=e.sheets.get('Zugänge').rows[1][3];
 assert.notEqual(next,e.student);assert.match(e.alerts.flat().join(' '),/bisherige Code ist ungültig/);
 assert.equal(login(e,next).verbrauch.heute,2);assert.equal(e.requests.length,0);
});

test('Ordinary Zurich day/month rollover stays unchanged after code replacement',()=>{
 const e=createBackend();legacy(e);const next=replace(e);e.advance(Date.parse('2026-12-01T00:10:00+01:00')-e.clock.now);
 assert.equal(login(e,next).verbrauch.heute,0);assert.equal(stand(e,next).m.usd,0);assert.equal(row(e,next)[11],e.context.hash_(e.context.normalisiereCode_(e.student)));
});
