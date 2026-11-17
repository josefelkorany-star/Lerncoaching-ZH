// Shared-device checks execute only local DOM and transport simulations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {harness, storage} from './working-ui-harness.mjs';
const endpoint='https://synthetic.invalid/coach';
const reply=value=>({text:async()=>JSON.stringify(value)});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const person=rolle=>({name:'SERVER_CONFIRMED_NAME',vorname:'SERVER_CONFIRMED',rolle,stufe:rolle==='Schüler'?'5. Primar':'Team'});
const usage=rolle=>({heute:4,tagesLimit:rolle==='Schüler'?40:100,monatBudget:rolle==='Schüler'?3:10,monatUsd:0.4,monatProzent:12});
const accepted=rolle=>({ok:true,nutzer:person(rolle),verbrauch:usage(rolle),status:'AKTIV'});

async function saved(kind='local',role='Lehrperson'){
  const local=storage(),session=storage();
  const seed=harness({local,session});
  await seed.login(role==='Lehrperson'?'DEMO-LP':'DEMO',{remember:kind==='local'});
  await seed.send('PRIVATE_CHAT_SENTINEL');
  const target=kind==='local'?local:session,chatKey=seed.coach.chatKey();
  const sitz=JSON.parse(target.getItem('lcCoach.v1.sitzung'));
  sitz.nutzer.name='CACHED_NAME_SENTINEL'; sitz.nutzer.vorname='CACHED_FIRSTNAME_SENTINEL';
  target.setItem('lcCoach.v1.sitzung',JSON.stringify(sitz));
  const chats=JSON.parse(target.getItem(chatKey));chats[0].titel='PRIVATE_TITLE_SENTINEL';
  target.setItem(chatKey,JSON.stringify(chats));
  const reads=[];
  for(const store of [local,session]){const get=store.getItem;store.getItem=key=>{reads.push(key);return get(key);};}
  return {local,session,target,chatKey,reads,code:sitz.code};
}

function locked(ui,fixture){
  assert.equal(ui.document.getElementById('v-chat').hidden,true);
  assert.equal(ui.document.getElementById('v-login').hidden,false);
  assert.equal(ui.coach.S.nutzer,null);
  assert.equal(ui.coach.S.chats.length,0);
  assert.equal(ui.coach.S.code,'');
  for(const id of ['who-name','who-rolle','chatliste','chat-title','fach-badge','verlauf-in','ansage','meter-text','meter-kurz']) assert.equal(ui.document.getElementById(id).textContent,'',id);
  assert.equal(ui.document.getElementById('meter-bar').title,'');
  assert.doesNotMatch(ui.document.body.textContent,/CACHED_NAME_SENTINEL|CACHED_FIRSTNAME_SENTINEL|PRIVATE_CHAT_SENTINEL|PRIVATE_TITLE_SENTINEL|SERVER_CONFIRMED_NAME/);
  if(fixture) assert.equal(fixture.reads.includes(fixture.chatKey),false,'Chat storage must not be read before access confirmation');
}

for(const kind of ['local','session'])test(`${kind} remembered access stays private until its delayed server confirmation`,async()=>{
  const fixture=await saved(kind),wait=deferred();
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>wait.promise});
  locked(ui,fixture);assert.equal(ui.calls.length,1);assert.equal(ui.calls[0].payload.aktion,'login');
  assert.equal(ui.calls[0].payload.code,fixture.code);
  assert.equal(ui.document.getElementById('btn-login').disabled,true);
  wait.resolve(reply(accepted('Schüler')));await ui.flush();
  assert.equal(ui.document.getElementById('v-chat').hidden,false);
  assert.equal(ui.coach.S.nutzer.name,'SERVER_CONFIRMED_NAME');
  assert.equal(ui.coach.S.chats.length,1);
  assert.equal(fixture.reads.includes(fixture.chatKey),true);
  assert.doesNotMatch(ui.document.body.textContent,/CACHED_NAME_SENTINEL|CACHED_FIRSTNAME_SENTINEL/);
});

for(const kind of ['local','session'])for(const outcome of ['rejected','network','timeout','malformed'])test(`${kind} remembered access stays locked after ${outcome}`,async()=>{
  const fixture=await saved(kind),wait=deferred();
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>wait.promise});
  locked(ui,fixture);
  if(outcome==='rejected')wait.resolve(reply({ok:false,fehler:'CODE',meldung:'Code nicht aktiv.'}));
  if(outcome==='network')wait.reject(new Error('Synthetic offline'));
  if(outcome==='malformed')wait.resolve(reply({ok:true,nutzer:{name:'UNCONFIRMED',rolle:'Administrator'}}));
  await ui.flush(outcome==='timeout'?100000:1200);
  locked(ui,fixture);
  assert.equal(ui.document.getElementById('btn-login').disabled,false);
  assert.ok(ui.document.getElementById('login-err').textContent);
  assert.equal(ui.calls.length,1,'No automatic request retry');
  if(outcome==='rejected'||outcome==='malformed')assert.equal(fixture.target.getItem('lcCoach.v1.sitzung'),null);
});

for(const [oldRole,newRole] of [['Lehrperson','Schüler'],['Schüler','Lehrperson']])test(`Confirmed ${oldRole} to ${newRole} change rebuilds every role-dependent control`,async()=>{
  const fixture=await saved('local',oldRole),wait=deferred();
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>wait.promise});
  locked(ui,fixture);wait.resolve(reply(accepted(newRole)));await ui.flush();
  assert.equal(ui.coach.S.nutzer.rolle,newRole);
  assert.match(ui.document.getElementById('who-rolle').textContent,new RegExp(newRole));
  assert.equal(ui.document.getElementById('eingabe').placeholder,newRole==='Lehrperson'?'Was brauchst du?':'Schreib deine Frage …');
  assert.equal(!!ui.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'),newRole==='Lehrperson');
  assert.equal(!!ui.document.querySelector('[data-fach="Elternkommunikation"]'),newRole==='Lehrperson');
  if(newRole==='Schüler')assert.equal(ui.coach.S.entwurf.fach,'Allgemein');
  ui.coach.oeffneChat(ui.coach.S.chats[0].id);
  assert.equal(!!ui.document.querySelector('[data-kopieren]'),newRole==='Lehrperson');
  const current=JSON.parse(fixture.local.getItem('lcCoach.v1.sitzung'));
  assert.equal(current.nutzer.rolle,newRole);assert.equal(current.nutzer.name,'SERVER_CONFIRMED_NAME');
  assert.equal(current.verbrauch.monatBudget,newRole==='Schüler'?3:10);
});

test('A failed restore permits a fresh manual login without exposing old cached identity',async()=>{
  const fixture=await saved('local'),wait=deferred();let call=0;
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>++call===1?wait.promise:reply(accepted('Schüler'))});
  wait.reject(new Error('Synthetic offline'));await ui.flush();locked(ui,fixture);
  await ui.login(fixture.code);
  assert.equal(ui.document.getElementById('v-chat').hidden,false);
  assert.equal(ui.coach.S.nutzer.rolle,'Schüler');assert.equal(ui.coach.S.chats.length,1);
  assert.doesNotMatch(ui.document.body.textContent,/CACHED_NAME_SENTINEL/);
});

test('Editing a code cancels remembered access verification; its late answer cannot open the old account',async()=>{
  const fixture=await saved('local'),wait=deferred();let call=0;
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>++call===1?wait.promise:reply(accepted('Schüler'))});
  ui.document.getElementById('code').value='USER_NEW_123';ui.event(ui.document.getElementById('code'),'input');
  assert.equal(ui.calls[0].options.signal.aborted,true);
  locked(ui,fixture);await ui.login('USER_NEW_123');
  wait.resolve(reply(accepted('Lehrperson')));await ui.flush();
  assert.equal(ui.coach.S.code,'USERNEW123');assert.equal(ui.coach.S.nutzer.rolle,'Schüler');
  assert.equal(ui.coach.S.chats.length,0);assert.equal(fixture.reads.includes(fixture.chatKey),false);
});

test('Page-cache hide clears private DOM and restored pages revalidate without duplicate listeners',async()=>{
  const fixture=await saved('local'),second=deferred();let call=0;
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>++call===1?reply(accepted('Lehrperson')):second.promise});
  await ui.flush();ui.coach.oeffneChat(ui.coach.S.chats[0].id);
  assert.match(ui.document.getElementById('verlauf-in').textContent,/PRIVATE_CHAT_SENTINEL/);
  fixture.reads.length=0;ui.windowEvent('pagehide');locked(ui,fixture);
  assert.ok(fixture.local.getItem('lcCoach.v1.sitzung'));
  assert.ok(fixture.local.values.get(fixture.chatKey),'Existing chats retained, not deleted');
  ui.windowEvent('pageshow',{persisted:true});locked(ui,fixture);
  assert.equal(ui.calls.length,2);
  second.resolve(reply(accepted('Schüler')));await ui.flush();
  assert.equal(ui.coach.S.nutzer.rolle,'Schüler');assert.equal(ui.coach.S.chats.length,1);
  assert.equal(ui.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'),null);
  ui.windowEvent('pageshow',{persisted:false});await ui.flush();assert.equal(ui.calls.length,2);
});

test('A rejected page-cache restore stays locked and does not render the former signed-in content',async()=>{
  const fixture=await saved('session');let call=0;
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>reply(++call===1?accepted('Lehrperson'):{ok:false,fehler:'CODE'})});
  await ui.flush();fixture.reads.length=0;
  ui.windowEvent('pagehide');ui.windowEvent('pageshow',{persisted:true});await ui.flush();
  locked(ui,fixture);assert.equal(fixture.session.getItem('lcCoach.v1.sitzung'),null);
});

test('Page-cache hide invalidates a pending verification before the restored page starts a fresh one',async()=>{
  const fixture=await saved('local'),first=deferred(),second=deferred();let call=0;
  const ui=harness({...fixture,apiUrl:endpoint,fetch:()=>++call===1?first.promise:second.promise});
  locked(ui,fixture);ui.windowEvent('pagehide');locked(ui,fixture);
  assert.equal(ui.calls[0].options.signal.aborted,true);
  ui.windowEvent('pageshow',{persisted:true});locked(ui,fixture);
  first.resolve(reply(accepted('Lehrperson')));await ui.flush();locked(ui,fixture);
  assert.equal(ui.document.getElementById('btn-login').disabled,true);
  second.resolve(reply(accepted('Schüler')));await ui.flush();
  assert.equal(ui.calls.length,2);assert.equal(ui.coach.S.nutzer.rolle,'Schüler');
  assert.equal(ui.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'),null);
});
