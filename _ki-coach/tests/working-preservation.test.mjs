import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackend as originalBackend} from './backend-harness.mjs';
import {createBackend as workingBackend} from './working-backend-harness.mjs';
const plain = value => JSON.parse(JSON.stringify(value));

test('Working backend retains every chosen original setting, model price and configured limit',()=>{
  const original=originalBackend(), working=workingBackend();
  assert.deepEqual(plain(working.context.EINSTELLUNGEN),plain(original.context.EINSTELLUNGEN));
  for(const key of ['API_URL','API_VERSION','ZEITZONE','PREISE','PREIS_UNBEKANNT','HAIKU_LANG_SCHWELLE','MAX_VERLAUF','MAX_ZEICHEN_NACHRICHT','MAX_ZEICHEN_VERLAUF','MAX_BILD_ZEICHEN','ABSTAND_SEKUNDEN','MELDUNGEN_TAGE']) {
    assert.deepEqual(plain(working.context.KONFIG[key]),plain(original.context.KONFIG[key]),key);
  }
});

test('Working student and teacher learning instructions are exactly the original instructions',()=>{
  const original=originalBackend(), working=workingBackend();
  for(const rolle of ['Schüler','Lehrperson']) for(const fach of ['Mathematik','Französisch','Unterrichtsvorbereitung']) {
    const person={rolle,stufe:rolle==='Schüler'?'5. Primar':'Team'};
    const settings={zusatz:'Erfundener zusätzlicher Hinweis'};
    assert.equal(working.context.systemAnweisung_(person,fach,settings),original.context.systemAnweisung_(person,fach,settings));
  }
});
