import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../working/Code.gs',import.meta.url),'utf8');
const plan=JSON.parse(await fs.readFile(new URL('../review/ERSTER-TEXTTEST.json',import.meta.url),'utf8'));

test('Prepared first text test computes its reserve locally without setup, Google or provider calls',()=>{
  // No Google services exist here: only pure formatting and cost functions run.
  const context=vm.createContext({});new vm.Script(source).runInContext(context);
  const settings=Object.fromEntries(context.EINSTELLUNGEN.map(row=>[row[0],row[2]]));
  assert.equal(settings.modellS,plan.modell);assert.equal(settings.maxTokS,plan.maximaleAusgabeTokens);
  assert.equal(settings.zusatz,plan.zusatzanweisung);
  const system=context.systemAnweisung_(plan.person,plan.fach,settings);
  const messages=context.pruefeVerlauf_([{rolle:'user',text:plan.text}],false);
  const bytes=Buffer.byteLength(JSON.stringify({model:plan.modell,system,messages,max_tokens:plan.maximaleAusgabeTokens}));
  assert.equal(bytes+4096+messages.length*256,plan.kalkulierteEingabeReserveTokens);
  assert.equal(context.maxKosten_(plan.modell,system,messages,plan.maximaleAusgabeTokens),plan.kalkulierteReserveMikroUSD);
  assert.ok(plan.kalkulierteReserveMikroUSD/1000000<=plan.geplanteKostenobergrenzeUSD);
  assert.equal(plan.maximaleBezahlteAufrufe,1);assert.equal(plan.bilder,0);
});
