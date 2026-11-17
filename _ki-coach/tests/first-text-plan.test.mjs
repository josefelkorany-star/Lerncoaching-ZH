import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../working/Code.gs',import.meta.url),'utf8');
const plan=JSON.parse(await fs.readFile(new URL('../review/ERSTER-TEXTTEST.json',import.meta.url),'utf8'));

test('Historical text-test plan demonstrates provider-count reservation with a synthetic fixture only',()=>{
  // No Google services exist here: only pure formatting and cost functions run.
  const context=vm.createContext({});new vm.Script(source).runInContext(context);
  const settings=Object.fromEntries(context.EINSTELLUNGEN.map(row=>[row[0],row[2]]));
  assert.equal(settings.modellS,plan.modell);assert.equal(settings.maxTokS,plan.maximaleAusgabeTokens);
  assert.equal(settings.zusatz,plan.zusatzanweisung);
  const input=plan.zaehlFixtureEingabeTokens;
  assert.equal(input+Math.max(context.KONFIG.TOKEN_PUFFER_MINIMUM,Math.ceil(input*context.KONFIG.TOKEN_PUFFER_ANTEIL)),plan.kalkulierteEingabeReserveTokens);
  assert.equal(context.maxKosten_(plan.modell,input,plan.maximaleAusgabeTokens,false),plan.kalkulierteReserveMikroUSD);
  assert.throws(()=>context.maxKosten_(plan.modell,undefined,plan.maximaleAusgabeTokens,false));
  assert.ok(plan.kalkulierteReserveMikroUSD/1000000<=plan.geplanteKostenobergrenzeUSD);
  assert.equal(plan.maximaleBezahlteAufrufe,1);assert.equal(plan.bilder,0);
});
