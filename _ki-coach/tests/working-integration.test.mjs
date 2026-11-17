// Cross-layer tests: unchanged UI markup, corrected UI/controller and corrected
// Apps Script source; all transport, Sheets, mail and provider responses synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './working-ui-harness.mjs';
import {createBackend} from './working-backend-harness.mjs';

function uiFor(server, transport) {
  const ui = harness({fetch:async (_url, options) => {
    const request = JSON.parse(options.body);
    if (transport) return transport(request, options);
    return {text:async()=>JSON.stringify(server.post(request))};
  }});
  ui.coach.KONFIG.API_URL = 'https://synthetic.invalid/coach';
  return ui;
}
const response = body => ({text:async()=>JSON.stringify(body)});
const reportButton = ui => ui.document.querySelector('[data-melden]');

test('Working UI retry after lost HTTP reply reuses the one completed backend operation', async()=>{
  const backend=createBackend(); let lost=false;
  const ui=uiFor(backend, async request=>{
    const result=backend.post(request);
    if(request.aktion==='chat'&&!lost){lost=true;throw new Error('Synthetic lost delivery after commit');}
    return response(result);
  });
  await ui.login(backend.student); await ui.send('Erfundene Bruchaufgabe: Wie beginne ich?');
  assert.equal(backend.requests.length,1);
  assert.equal(ui.coach.aktuellerChat().nachrichten.filter(m=>m.rolle==='assistant').length,0);
  const id=ui.coach.S.letzteAnfrage.anfrage.anfrageId;
  backend.advance(61000);
  ui.coach.nochmals(); await ui.flush();
  assert.equal(backend.requests.length,1);
  const sent=ui.calls.filter(c=>c.payload.aktion==='chat');
  assert.deepEqual(sent.map(c=>c.payload.anfrageId),[id,id]);
  assert.equal(ui.coach.aktuellerChat().nachrichten.filter(m=>m.rolle==='assistant').length,1);
  assert.equal(backend.post({aktion:'login',code:backend.student}).verbrauch.heute,1);
});

test('Working UI retry after response-cache loss never causes a second charge', async()=>{
  const backend=createBackend(); let lost=false;
  const ui=uiFor(backend, async request=>{
    const result=backend.post(request);
    if(request.aktion==='chat'&&!lost){lost=true;throw new Error('Synthetic lost delivery');}
    return response(result);
  });
  await ui.login(backend.student); await ui.send('Erfundene Anfrage mit verlorener Antwort');
  backend.cache.clear(); backend.advance(61000);
  ui.coach.nochmals(); await ui.flush();
  assert.equal(backend.requests.length,1);
  assert.equal(backend.post({aktion:'login',code:backend.student}).verbrauch.heute,1);
  assert.equal(ui.coach.aktuellerChat().nachrichten.filter(m=>m.rolle==='assistant').length,0);
  assert.match(ui.document.getElementById('hinweis').textContent,/nicht mehr|bereits verarbeitet/i);
});

test('Working UI plus backend isolate a completed but delayed A reply from B session', async()=>{
  const backend=createBackend(); let release;
  const ui=uiFor(backend, request=>{
    const result=backend.post(request);
    if(request.aktion==='chat') return new Promise(resolve=>{release=()=>resolve(response(result));});
    return response(result);
  });
  await ui.login(backend.student); await ui.send('Erfundene Frage aus Sitzung A');
  assert.equal(backend.requests.length,1);
  ui.coach.abmelden(false); await ui.login(backend.teacher);
  const before=JSON.stringify(ui.coach.S.verbrauch);
  release(); await ui.flush();
  assert.equal(JSON.stringify(ui.coach.S.verbrauch),before);
  assert.equal(ui.coach.S.nutzer.rolle,'Lehrperson');
  assert.equal(ui.document.getElementById('ansage').textContent,'');
  assert.equal(ui.document.getElementById('eingabe').value,'');
  assert.equal(ui.coach.S.chats.length,0);
});

test('Working UI confirms exactly one stored report after its first acknowledgement is lost', async()=>{
  const backend=createBackend(); let lost=false;
  const ui=uiFor(backend, async request=>{
    const result=backend.post(request);
    if(request.aktion==='melden'&&!lost){lost=true;assert.equal(result.ok,true);assert.equal(result.gespeichert,true);throw new Error('Synthetic lost report acknowledgement');}
    return response(result);
  });
  await ui.login(backend.student); await ui.send('Erfundene Rechenfrage');
  ui.event(reportButton(ui),'click');
  ui.document.getElementById('melden-text').value='Erfundene Rückmeldung';
  ui.document.getElementById('btn-melden').click(); await ui.flush();
  assert.equal(ui.coach.aktuellerChat().nachrichten[1].gemeldet,undefined);
  const rows=backend.sheets.get('Meldungen').rows.length;
  assert.equal(rows,2);
  const mails=backend.mail.length;
  backend.cache.clear(); backend.advance(61000);
  ui.document.getElementById('btn-melden').click(); await ui.flush();
  assert.equal(ui.coach.aktuellerChat().nachrichten[1].gemeldet,true);
  const reports=ui.calls.filter(c=>c.payload.aktion==='melden');
  assert.equal(reports.length,2);
  assert.equal(reports[0].payload.meldungId,reports[1].payload.meldungId);
  assert.equal(backend.sheets.get('Meldungen').rows.length,rows);
  assert.equal(backend.mail.length,mails);
});

test('Working UI does not confirm a failed report write; retry stores and confirms it once', async()=>{
  const backend=createBackend(); const ui=uiFor(backend);
  await ui.login(backend.student); await ui.send('Erfundene Rechenfrage');
  backend.fail.append.add('Meldungen');
  ui.event(reportButton(ui),'click'); ui.document.getElementById('btn-melden').click(); await ui.flush();
  assert.notEqual(ui.coach.aktuellerChat().nachrichten[1].gemeldet,true);
  assert.equal(backend.sheets.get('Meldungen').rows.length,1);
  backend.fail.append.delete('Meldungen'); backend.advance(11000);
  ui.document.getElementById('btn-melden').click(); await ui.flush();
  assert.equal(ui.coach.aktuellerChat().nachrichten[1].gemeldet,true);
  assert.equal(backend.sheets.get('Meldungen').rows.length,2);
});

test('Working UI displays exhausted day allowance without another provider call', async()=>{
  const backend=createBackend(); backend.settings({tagS:1}); const ui=uiFor(backend);
  await ui.login(backend.student); await ui.send('Erfundene erste Frage');
  assert.equal(backend.requests.length,1); backend.advance(5000);
  await ui.send('Erfundene zweite Frage');
  assert.equal(backend.requests.length,1);
  assert.equal(ui.coach.aktuellerChat().nachrichten.filter(m=>m.rolle==='assistant').length,1);
  assert.equal(ui.coach.S.verbrauch.heute,1);
  assert.match(ui.document.getElementById('hinweis').textContent,/heute|Nachrichten/i);
});

test('Known provider rejection is terminal for that ID; a deliberate new message can use the released allowance', async()=>{
  const backend=createBackend({fetch:()=>({status:429,body:{error:{message:'Synthetic rate limit'}}})});
  backend.settings({tagS:1}); const ui=uiFor(backend);
  await ui.login(backend.student); await ui.send('Erfundene abgewiesene Frage');
  assert.equal(backend.requests.length,1);
  assert.equal(ui.coach.S.letzteAnfrage,null);
  assert.equal(ui.document.getElementById('btn-nochmals'),null);
  assert.equal(backend.post({aktion:'login',code:backend.student}).verbrauch.heute,0);
  backend.setFetch(backend.normalResponse); backend.advance(5000);
  await ui.send('Bewusst neu gesendete erfundene Frage');
  assert.equal(backend.requests.length,2);
  assert.equal(backend.post({aktion:'login',code:backend.student}).verbrauch.heute,1);
  assert.equal(ui.coach.aktuellerChat().nachrichten.filter(m=>m.rolle==='assistant').length,1);
});
