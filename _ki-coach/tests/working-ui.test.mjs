import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {harness,storage,copy,workingHtml,inlineScript} from './working-ui-harness.mjs';
const reply=value=>({text:async()=>JSON.stringify(value)});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const user=(role='Schüler')=>({name:'Erfundene Person',vorname:'Erfunden',rolle:role,stufe:role==='Schüler'?'5. Primar':''});
const usage=(budget=3)=>({heute:0,tagesLimit:budget===3?40:100,monatProzent:0,monatUsd:0,monatBudget:budget});
async function demoWithAnswer(h,code='DEMO'){await h.login(code);await h.send('Nur erfundene Testaufgabe');}
function openReport(h,index=1){h.event(h.document.querySelector(`[data-melden="${index}"]`),'click');}
const markPhoto=(h)=>{Object.defineProperty(h.document.getElementById('datei'),'files',{configurable:true,value:[{type:'image/png'}]});h.event(h.document.getElementById('datei'),'change');};

test('Working copy preserves original markup, styles, roles and demo learning examples',async()=>{
 new vm.Script(inlineScript);
 const original=await fs.readFile(new URL('../original/coach.html',import.meta.url),'utf8');
 assert.equal(workingHtml.split('<script>')[0],original.split('<script>')[0]);
 for(const code of ['DEMO','DEMO-LP']){const h=harness();await demoWithAnswer(h,code);assert.equal(h.calls.length,0);assert.equal(h.coach.S.nutzer.rolle,code==='DEMO'?'Schüler':'Lehrperson');assert.equal(h.coach.aktuellerChat().nachrichten.length,2);assert.match(h.coach.aktuellerChat().nachrichten[1].text,/Vorschau-Modus/);}
});
test('Logout and direct code change clear inputs, live announcement, report, photo, pending request and hidden personal views',async()=>{
 const h=harness();await demoWithAnswer(h);
 h.document.getElementById('eingabe').value='Privater Entwurf A';h.document.getElementById('melden-text').value='Privater Bericht A';h.document.getElementById('melden-status').textContent='Alter Status';h.document.getElementById('ansage').textContent='Alte Antwort';
 h.coach.S.letzteAnfrage={anfrage:{code:'DEMO'}};h.coach.S.bild={daten:'synthetic'};
 h.coach.abmelden(false);
 for(const id of ['eingabe','melden-text'])assert.equal(h.document.getElementById(id).value,'',id);
 for(const id of ['ansage','melden-status','verlauf-in','chatliste','who-name','who-rolle','meter-text','meter-kurz'])assert.equal(h.document.getElementById(id).textContent,'',id);
 assert.equal(h.coach.S.letzteAnfrage,null);assert.equal(h.coach.S.bild,null);assert.equal(h.document.getElementById('bild-vorschau').hidden,true);
 await h.login('DEMO-LP');assert.equal(h.document.getElementById('eingabe').value,'');assert.equal(h.coach.S.chats.length,0);
 h.document.getElementById('eingabe').value='Entwurf B';h.coach.anmelden('DEMO',user(),usage());assert.equal(h.document.getElementById('eingabe').value,'');
});
for(const kind of ['success','CODE','network'])test(`Late old chat ${kind} cannot change a new session`,async()=>{
 const old=deferred();const h=harness({fetch:()=>old.promise});await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.send('Frage A');
 const signal=h.calls[0].options.signal;assert.equal(h.coach.S.laeuft,true);h.coach.abmelden(false);assert.equal(signal.aborted,true);
 h.coach.KONFIG.API_URL='';await h.login('DEMO-LP');const before=copy(h.coach.S);
 if(kind==='network')old.reject(Error('synthetic outage'));else old.resolve(reply(kind==='CODE'?{ok:false,fehler:'CODE'}:{ok:true,anfrageId:h.calls[0].payload.anfrageId,antwort:'Alte private Antwort A',verbrauch:usage(3)}));
 await h.flush(20000);assert.equal(h.coach.S.code,'DEMOLP');assert.deepEqual(copy(h.coach.S),before);assert.equal(h.document.getElementById('ansage').textContent,'');assert.equal(h.document.getElementById('hinweis').hidden,true);assert.equal(JSON.parse(h.local.getItem('lcCoach.v1.sitzung')).verbrauch.monatBudget,10);
});
test('Late old login and edited login code cannot sign in the earlier code',async()=>{
 const old=deferred();const h=harness({fetch:()=>old.promise});h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.login('USERAAAA');assert.equal(h.document.getElementById('btn-login').disabled,true);
 h.document.getElementById('code').value='USERBBBB';h.event(h.document.getElementById('code'),'input');assert.equal(h.calls[0].options.signal.aborted,true);assert.equal(h.document.getElementById('btn-login').disabled,false);
 h.coach.KONFIG.API_URL='';await h.login('DEMO-LP');old.resolve(reply({ok:true,nutzer:user(),verbrauch:usage()}));await h.flush();assert.equal(h.coach.S.code,'DEMOLP');assert.equal(h.coach.S.nutzer.rolle,'Lehrperson');
});
test('Delayed stored-session verification cannot modify a subsequent login',async()=>{
 const local=storage({'lcCoach.v1.sitzung':JSON.stringify({code:'DEMO',nutzer:user(),verbrauch:usage(),dauerhaft:true})});const h=harness({local});
 h.coach.abmelden(false);await h.login('DEMO-LP');await h.flush(100000);assert.equal(h.coach.S.code,'DEMOLP');assert.equal(h.coach.S.nutzer.rolle,'Lehrperson');assert.equal(h.coach.S.verbrauch.monatBudget,10);
});
test('An old image conversion cannot restore photo/input after logout or a newer selection',async()=>{
 const h=harness();await h.login();markPhoto(h);h.coach.abmelden(false);await h.login('DEMO-LP');await h.flush();assert.equal(h.coach.S.bild,null);assert.equal(h.document.getElementById('bild-vorschau').hidden,true);
 markPhoto(h);h.document.getElementById('bild-weg').click();await h.flush();assert.equal(h.coach.S.bild,null);
 markPhoto(h);await h.flush();assert.equal(h.coach.S.bild.typ,'image/jpeg');
});
test('Late image decode failure cannot remove a newer selected image or add an error',async()=>{
 const h=harness();await h.login();markPhoto(h);markPhoto(h);h.images[0].onerror();await h.flush();assert.equal(h.coach.S.bild.typ,'image/jpeg');assert.equal(h.document.getElementById('bild-vorschau').hidden,false);assert.equal(h.document.getElementById('hinweis').hidden,true);
});
test('Late clipboard completion after logout does not restore old UI status',async()=>{
 const wait=deferred();const h=harness();await demoWithAnswer(h,'DEMO-LP');h.sandbox.navigator.clipboard={writeText:()=>wait.promise};const copyButton=h.document.querySelector('[data-kopieren]');h.event(copyButton,'click');h.coach.abmelden(false);await h.login();wait.resolve();await h.flush(2000);assert.equal(copyButton.textContent,'Kopieren');assert.equal(h.document.getElementById('ansage').textContent,'');
});
test('Report identity uses deterministic SHA-256 when Web Crypto is available',async()=>{
 const h=harness();h.sandbox.crypto=webcrypto;h.sandbox.TextEncoder=TextEncoder;const c={id:'synthetic-chat'},m={zeit:123456};const d={grund:'Test',kommentar:'Erfunden',frage:'Frage',antwort:'Antwort'};const expected='m-'+createHash('sha256').update(JSON.stringify([c.id,m.zeit,d.grund,d.kommentar,d.frage,d.antwort])).digest('hex');assert.equal(await h.coach.meldungsId(c,m,d),expected);assert.notEqual(await h.coach.meldungsId(c,m,{...d,kommentar:'Neu'}),expected);
});
test('Retry retains exactly the same request ID and payload and prevents duplicate local sends',async()=>{
 const h=harness({fetch:async(_url,options)=>{const d=JSON.parse(options.body);return reply(h.calls.length===1?{ok:false,fehler:'VORGANG_OFFEN',meldung:'Diese Anfrage wird noch geprüft.'}:{ok:true,anfrageId:d.anfrageId,antwort:'Einmalige erfundene Antwort',verbrauch:usage()});}});
 await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.send('Erfundene Idempotenzfrage');const first=copy(h.calls[0].payload);assert.match(first.anfrageId,/^[A-Za-z0-9_-]{16,100}$/);
 assert.ok(h.document.getElementById('btn-nochmals'));h.coach.nochmals();h.coach.nochmals();await h.flush();assert.equal(h.calls.length,2);assert.deepEqual(copy(h.calls[1].payload),first);assert.equal(h.coach.aktuellerChat().nachrichten.length,2);
 const stored=JSON.parse(h.local.getItem(h.coach.chatKey()));assert.equal(stored[0].nachrichten[0].anfrageId,first.anfrageId);
 await h.send('Eine tatsächlich neue Frage');assert.notEqual(h.calls[2].payload.anfrageId,first.anfrageId);
});
for(const fehler of ['ANDRANG','NETZ'])test(`Terminal ${fehler} receipt does not offer or retain a repeated operation`,async()=>{
 const h=harness({fetch:async()=>reply({ok:false,fehler,abgeschlossen:true,meldung:'Diese Anfrage wurde nicht ausgeführt. Bitte später bewusst eine neue Nachricht senden.'})});await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.send('Erfundene abgewiesene Anfrage');assert.equal(h.document.getElementById('btn-nochmals'),null);assert.equal(h.coach.S.letzteAnfrage,null);h.coach.nochmals();await h.flush();assert.equal(h.calls.length,1);assert.match(h.document.getElementById('hinweis').textContent,/bewusst eine neue Nachricht/);
});
test('Mismatched successful chat receipt is not applied and keeps the same retry ID',async()=>{
 const h=harness({fetch:async()=>reply({ok:true,anfrageId:'wrong-id',antwort:'Fremde Antwort'})});await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.send('Test');assert.equal(h.coach.aktuellerChat().nachrichten.length,1);assert.equal(h.document.getElementById('ansage').textContent,'');assert.ok(h.coach.S.letzteAnfrage);assert.match(h.document.getElementById('hinweis').textContent,/zugeordnet/);
});
for(const type of ['SCHNELL','missing-receipt','wrong-id'])test(`Report ${type} is never confirmed as saved`,async()=>{
 const h=harness({fetch:async(_url,opt)=>{const d=JSON.parse(opt.body);return reply(type==='SCHNELL'?{ok:false,fehler:'SCHNELL',meldung:'Danke, deine Meldung ist schon angekommen.'}:type==='missing-receipt'?{ok:true,meldungId:d.meldungId}:{ok:true,gespeichert:true,meldungId:'wrong-id'});}});await demoWithAnswer(h);h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';openReport(h);h.document.getElementById('btn-melden').click();await h.flush();assert.notEqual(h.coach.aktuellerChat().nachrichten[1].gemeldet,true);assert.doesNotMatch(h.document.getElementById('melden-status').textContent,/angekommen/);assert.equal(h.document.getElementById('btn-melden').disabled,false);
});
test('Only exact saved report receipt confirms; retry and reload use the same concrete report ID',async()=>{
 let fail=true;const local=storage();const fetch=async(_url,opt)=>{const d=JSON.parse(opt.body);return reply(fail?{ok:false,fehler:'SPEICHERN',meldung:'Speichern nicht gelungen.'}:{ok:true,gespeichert:true,meldungId:d.meldungId});};
 const h=harness({local,fetch});await demoWithAnswer(h);h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';openReport(h);h.document.getElementById('melden-text').value='Erfundener Hinweis';h.document.getElementById('btn-melden').click();await h.flush();const first=h.calls[0].payload.meldungId;assert.match(first,/^[A-Za-z0-9_-]{16,100}$/);
 h.document.getElementById('btn-melden').click();await h.flush();assert.equal(h.calls[1].payload.meldungId,first);
 const again=harness({local,fetch});await again.flush();again.coach.oeffneChat(again.coach.S.chats[0].id);again.coach.KONFIG.API_URL='https://synthetic.invalid/exec';openReport(again);again.document.getElementById('melden-text').value='Erfundener Hinweis';fail=false;again.document.getElementById('btn-melden').click();await again.flush();assert.equal(again.calls[0].payload.meldungId,first);assert.equal(again.coach.aktuellerChat().nachrichten[1].gemeldet,true);assert.match(again.document.getElementById('melden-status').textContent,/angekommen/);
});
test('Changed report draft during save is not confirmed as the new draft',async()=>{
 const wait=deferred();const h=harness({fetch:()=>wait.promise});await demoWithAnswer(h);h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';openReport(h);h.document.getElementById('melden-text').value='Erster Inhalt';h.document.getElementById('btn-melden').click();await h.flush();const first=h.calls[0].payload.meldungId;h.document.getElementById('melden-text').value='Anderer Inhalt';wait.resolve(reply({ok:true,gespeichert:true,meldungId:first}));await h.flush();assert.notEqual(h.coach.aktuellerChat().nachrichten[1].gemeldet,true);assert.match(h.document.getElementById('melden-status').textContent,/geändert/);
 h.document.getElementById('btn-melden').click();await h.flush();assert.notEqual(h.calls[1].payload.meldungId,first);
});
test('Late report result and close timer cannot affect another session or another report dialog',async()=>{
 const wait=deferred();const h=harness({fetch:()=>wait.promise});await demoWithAnswer(h);h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';openReport(h);h.document.getElementById('btn-melden').click();await h.flush();const id=h.calls[0].payload.meldungId;h.coach.abmelden(false);h.coach.KONFIG.API_URL='';await demoWithAnswer(h,'DEMO-LP');openReport(h);h.document.getElementById('melden-text').value='Neuer Bericht B';wait.resolve(reply({ok:true,gespeichert:true,meldungId:id}));await h.flush(2000);assert.equal(h.document.getElementById('m-melden').hidden,false);assert.equal(h.document.getElementById('melden-text').value,'Neuer Bericht B');assert.equal(h.document.getElementById('melden-status').textContent,'');
 h.document.getElementById('btn-melden').click();await h.flush();assert.match(h.document.getElementById('melden-status').textContent,/angekommen/);h.coach.schliesse(h.document.getElementById('m-melden'));await h.send('Zweite B-Frage');openReport(h,3);await h.flush(2000);assert.equal(h.document.getElementById('m-melden').hidden,false);assert.equal(h.document.getElementById('melden-status').textContent,'');
});
test('Photo selection and subject chats remain available without persisting image bytes',async()=>{
 const h=harness();await h.login();h.event(h.document.querySelector('[data-fach="Mathematik"]'),'click');markPhoto(h);await h.flush();await h.send('Erfundene Fotoaufgabe');assert.equal(h.coach.aktuellerChat().fach,'Mathematik');const stored=h.local.getItem(h.coach.chatKey());assert.equal(stored.includes('data:image'),false);assert.equal(stored.includes('_vorschau'),false);assert.equal(JSON.parse(stored)[0].nachrichten[0].bild,true);
 h.document.getElementById('btn-neu').click();h.event(h.document.querySelector('[data-fach="Deutsch"]'),'click');await h.send('Andere erfundene Frage');assert.equal(h.coach.S.chats.length,2);
});
