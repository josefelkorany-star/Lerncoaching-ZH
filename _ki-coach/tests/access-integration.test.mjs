// Actual working UI + server source, fictional people and in-memory services only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {harness, storage} from './working-ui-harness.mjs';
import {createBackend} from './working-backend-harness.mjs';
const endpoint='https://synthetic.invalid/coach';
const response=value=>({text:async()=>JSON.stringify(value)});
const connect=(backend,stores={},transport)=>harness({...stores,apiUrl:endpoint,fetch:async(_url,options)=>{
  const request=JSON.parse(options.body);
  return transport?transport(request):response(backend.post(request));
}});

test('Code replacement locks a remembered old session and preserves its used allowance under the new code',async()=>{
  const backend=createBackend();backend.settings({tagS:2});
  const personKey=backend.context.hash_(backend.context.normalisiereCode_(backend.student));
  backend.props.set('Z_M_'+personKey,JSON.stringify({m:'2026-11',usd:0.42,n:5}));
  const local=storage(),session=storage(),first=connect(backend,{local,session});
  await first.login(backend.student);await first.send('Erfundene Aufgabe: Wie beginne ich?');
  const before=backend.post({aktion:'login',code:backend.student}).verbrauch;
  assert.equal(before.heute,1);assert.ok(before.monatUsd>0);
  const oldKey=first.coach.chatKey(),savedChat=local.getItem(oldKey);
  const newCode=backend.context.ersetzeCode_(backend.student).code;
  const reopened=connect(backend,{local,session});
  assert.equal(reopened.document.getElementById('v-chat').hidden,true);
  assert.equal(reopened.coach.S.nutzer,null);await reopened.flush();
  assert.equal(reopened.document.getElementById('v-chat').hidden,true);
  assert.doesNotMatch(reopened.document.body.textContent,/Testkind Birke|Erfundene Aufgabe/);
  await reopened.login(newCode);
  assert.equal(reopened.coach.S.verbrauch.heute,before.heute);
  assert.equal(reopened.coach.S.verbrauch.monatUsd,before.monatUsd);
  assert.equal(local.getItem(oldKey),savedChat,'Code replacement does not delete old local chat data');
  backend.advance(5000);await reopened.send('Erfundene zweite Aufgabe');
  assert.equal(reopened.coach.S.verbrauch.heute,2);
  backend.advance(5000);await reopened.send('Erfundene dritte Aufgabe');
  assert.equal(backend.requests.length,2,'New code must not reset the day allowance');
});

test('Server role changed while closed rebuilds the restored interface only after current server confirmation',async()=>{
  const backend=createBackend(),local=storage(),session=storage();
  const first=connect(backend,{local,session});await first.login(backend.teacher);
  await first.send('Erfundene Unterrichtsvorbereitung');
  backend.sheets.get('Zugänge').rows[2][1]='Schüler';
  backend.sheets.get('Zugänge').rows[2][2]='5. Primar';
  let confirm;
  const reopened=connect(backend,{local,session},request=>new Promise(resolve=>{confirm=()=>resolve(response(backend.post(request)));}));
  assert.equal(reopened.document.getElementById('v-chat').hidden,true);
  assert.doesNotMatch(reopened.document.body.textContent,/Testlehrperson Linde|Erfundene Unterrichtsvorbereitung/);
  confirm();await reopened.flush();
  assert.equal(reopened.coach.S.nutzer.rolle,'Schüler');
  assert.match(reopened.document.getElementById('who-rolle').textContent,/Schüler.*5\. Primar/);
  assert.equal(reopened.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'),null);
  assert.equal(reopened.coach.S.verbrauch.tagesLimit,40);
});

test('Replacement during a delayed paid response cannot reopen the revoked session or spend twice on replay',async()=>{
  const backend=createBackend(),local=storage(),session=storage();let deliver;
  const first=connect(backend,{local,session},request=>{
    const result=backend.post(request);
    return request.aktion==='chat'?new Promise(resolve=>{deliver=()=>resolve(response(result));}):response(result);
  });
  await first.login(backend.student);await first.send('Erfundene verzögerte Textaufgabe');
  const sent=first.calls.find(x=>x.payload.aktion==='chat').payload;
  const newCode=backend.context.ersetzeCode_(backend.student).code;
  first.windowEvent('pagehide');first.windowEvent('pageshow',{persisted:true});await first.flush();
  deliver();await first.flush();
  assert.equal(first.document.getElementById('v-chat').hidden,true);
  assert.equal(first.coach.S.nutzer,null);assert.equal(first.coach.S.chats.length,0);
  backend.advance(61000);
  const replay=backend.post({...sent,code:newCode});
  assert.equal(replay.ok,true);assert.equal(backend.requests.length,1);
  assert.equal(backend.post({aktion:'login',code:newCode}).verbrauch.heute,1);
});
