import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createBackend} from './working-backend-harness.mjs';
const require=createRequire(import.meta.url);
const {PDFDocument}=require('../../assets/vendor/pdf-lib-1.17.1.min.js');
const plain=x=>JSON.parse(JSON.stringify(x));
const image={typ:'image/png',daten:'YWJjZA=='};
async function pdf(pages=1,options={}) {
  const d=await PDFDocument.create();
  for(let i=0;i<pages;i++) d.addPage([200,200]).drawText('Synthetic task '+(i+1)+': 3/4 + 1/8 = ?');
  return {typ:'application/pdf',daten:Buffer.from(await d.save({useObjectStreams:false,...options})).toString('base64')};
}
const pdf1=await pdf(),pdf20=await pdf(20),pdf21=await pdf(21);

test('A real one-page PDF becomes a document block; count and paid call use identical content',()=>{
  const e=createBackend();
  assert.equal(e.chat({anhaenge:[pdf1],anhangNachricht:0}).ok,true);
  assert.equal(e.countRequests.length,1);assert.equal(e.requests.length,1);
  const counted=e.countRequests[0].body,paid=e.requests[0].body;
  assert.deepEqual(counted,{model:paid.model,system:paid.system,messages:paid.messages});
  assert.deepEqual(paid.messages[0].content[0],{type:'document',source:{type:'base64',media_type:'application/pdf',data:pdf1.daten},cache_control:{type:'ephemeral'}});
  assert.equal(e.journal()[0].reserve,e.context.maxKosten_(paid.model,100,paid.max_tokens,true));
});

test('Page boundary is checked from real PDF pages, not supplied client metadata',()=>{
  const e=createBackend();assert.equal(e.chat({anhaenge:[{...pdf20,seiten:999}]}).ok,true);
  e.advance();const r=e.chat({anhaenge:[{...pdf21,seiten:1}]});
  assert.equal(r.fehler,'PDF_LANG');assert.match(r.meldung,/Bitte nur die Seiten mit der Aufgabe schicken/);
  assert.equal(e.countRequests.length,1);assert.equal(e.requests.length,1);
});

test('Compressed object streams must be normalized by the client before independent server validation',async()=>{
  const compressed=await pdf(2,{useObjectStreams:true}),e=createBackend();
  assert.equal(e.chat({anhaenge:[compressed]}).fehler,'PDF_FORMAT');
  assert.equal(e.countRequests.length,0);
  const loaded=await PDFDocument.load(Buffer.from(compressed.daten,'base64'));
  const normalized={typ:'application/pdf',daten:Buffer.from(await loaded.save({useObjectStreams:false,addDefaultPage:false})).toString('base64')};
  assert.equal(e.chat({anhaenge:[normalized]}).ok,true);
});

test('Exact 3.5 MiB decoded bound is enforced separately from Base64 length',()=>{
  const e=createBackend(),max=e.context.KONFIG.MAX_ANHANG_BYTES;
  const at={typ:'image/png',daten:Buffer.alloc(max).toString('base64')};
  assert.equal(e.chat({anhaenge:[at]}).ok,true);e.advance();
  const above={typ:'image/png',daten:Buffer.alloc(max+1).toString('base64')};
  assert.equal(e.chat({anhaenge:[above]}).fehler,'ANHANG_GROSS');
  assert.equal(e.requests.length,1);assert.equal(e.countRequests.length,1);
});

test('Five images work; a sixth, mixed PDF/images, invalid type or corrupt Base64 never reaches counting',()=>{
  const e=createBackend();assert.equal(e.chat({anhaenge:Array(5).fill(image)}).ok,true);
  assert.equal(e.requests[0].body.messages[0].content.filter(x=>x.type==='image').length,5);
  assert.equal(e.requests[0].body.messages[0].content.filter(x=>x.cache_control).length,1);
  for(const anhaenge of [Array(6).fill(image),[pdf1,image],[{typ:'text/plain',daten:'YWJjZA=='}],[{...image,daten:'A'.repeat(1000)+'$$$$'}],[{...image,daten:'YWJj=Z==' }]]) {
    e.advance();assert.equal(e.chat({anhaenge}).ok,false);
  }
  assert.equal(e.countRequests.length,1);assert.equal(e.requests.length,1);
});

test('60000 counted input tokens are accepted; 60001 are rejected before reservation and paid call',()=>{
  for(const [tokens,ok] of [[60000,true],[60001,false]]) {
    const e=createBackend({countFetch:()=>({status:200,body:{input_tokens:tokens}})});
    const r=e.chat({anhaenge:[pdf1]});assert.equal(r.ok,ok);
    assert.equal(e.requests.length,ok?1:0);assert.equal(e.journal().length,ok?1:0);
    if(!ok)assert.equal(r.fehler,'PDF_LANG');
  }
});

test('No paid request or quota reservation when count fails, times out, redirects or is malformed',()=>{
  for(const reply of [new Error('synthetic'),{status:429,body:{}},{status:302,body:{}},{status:200,body:{input_tokens:-1}},{status:200,body:{input_tokens:1.5}},{status:200,body:{input_tokens:'100'}},{status:200,body:'not json'}]) {
    const e=createBackend({countFetch:()=>reply});assert.equal(e.chat().ok,false);
    assert.equal(e.requests.length,0);assert.equal(e.countRequests.length,1);assert.equal(e.journal().length,0);
  }
});

test('Both count and paid-call provider errors cannot copy attachment bytes into logs or durable state',()=>{
  for(const stage of ['count','paid']) {
    const e=createBackend(),reply=()=>({status:400,body:{error:{message:'invalid document '+pdf1.daten}}});
    if(stage==='count')e.setCountFetch(reply);else e.setFetch(reply);
    assert.equal(e.chat({anhaenge:[pdf1]}).ok,false);
    const stored=JSON.stringify({errors:e.errors,props:[...e.props],cache:[...e.cache],sheets:[...e.sheets].map(([name,b])=>[name,b.rows]),writes:e.writes});
    assert.ok(!stored.includes(pdf1.daten));assert.ok(!stored.includes('invalid document'));
  }
});

test('Attachment bytes never enter Sheets, Properties, cache or journal on a successful request',()=>{
  const e=createBackend();assert.equal(e.chat({anhaenge:[pdf1]}).ok,true);
  const stored=JSON.stringify({errors:e.errors,props:[...e.props],cache:[...e.cache],sheets:[...e.sheets].map(([name,b])=>[name,b.rows]),writes:e.writes});
  assert.ok(!stored.includes(pdf1.daten));assert.match(e.sheets.get('Protokoll').rows[1][10],/^\[Foto oder PDF\]/);
});

test('Follow-up retains the identical attachment/cache prefix at its original question',()=>{
  const e=createBackend(),messages=[{rolle:'user',text:'Was ist der erste Schritt?'}];
  assert.equal(e.chat({anhaenge:[pdf1],anhangNachricht:0,nachrichten:messages}).ok,true);
  e.advance();messages.push({rolle:'assistant',text:'Welchen gemeinsamen Nenner findest du?'},{rolle:'user',text:'Ist 8 richtig?'});
  assert.equal(e.chat({anhaenge:[pdf1],anhangNachricht:0,nachrichten:messages}).ok,true);
  assert.deepEqual(e.requests[1].body.messages[0],e.requests[0].body.messages[0]);
  assert.equal(e.requests[1].body.messages[2].content,'Ist 8 richtig?');
  assert.equal(e.countRequests.length,2);assert.equal(e.requests.length,2);
});

test('Empty original attachment question and role normalization retain the actual anchor',()=>{
  const e=createBackend();
  assert.equal(e.chat({anhaenge:[image],anhangNachricht:1,nachrichten:[{rolle:'assistant',text:'Old'},{rolle:'user',text:''},{rolle:'assistant',text:'Hint'},{rolle:'user',text:'Next'}]}).ok,true);
  assert.equal(e.requests[0].body.messages[0].content[0].type,'image');
  assert.equal(e.requests[0].body.messages[0].content[1].text,'Hier ist ein Foto oder PDF meiner Aufgabe.');
  assert.equal(e.requests[0].body.messages[2].content,'Next');
});

test('Invalid, absent-after-trimming or non-user attachment anchors fail before either endpoint',()=>{
  for(const index of [-1,1,0.5,'0']) {const e=createBackend();assert.equal(e.chat({anhaenge:[image],anhangNachricht:index}).fehler,'ANHANG_KONTEXT');assert.equal(e.countRequests.length,0);}
  const e=createBackend();assert.equal(e.chat({anhaenge:[image],anhangNachricht:0,nachrichten:Array.from({length:25},(_,i)=>({rolle:i%2?'assistant':'user',text:'Example'}))}).fehler,'ANHANG_KONTEXT');assert.equal(e.requests.length,0);
});

test('A role, prompt or model change while counting invalidates the measured request; reduced budgets are checked again',()=>{
  for(const what of ['role','prompt','model','budget','disabled']) {
    const e=createBackend();e.setCountFetch(()=>{if(what==='role')e.sheets.get('Zugänge').rows[1][1]='Lehrperson';if(what==='prompt')e.settings({zusatz:'Changed'});if(what==='model')e.settings({modellS:'claude-opus-5-5'});if(what==='budget')e.settings({budgetS:0});if(what==='disabled')e.sheets.get('Zugänge').rows[1][4]=false;return {status:200,body:{input_tokens:100}};});
    const r=e.chat();assert.equal(r.ok,false,what);assert.equal(e.requests.length,0,what);assert.equal(e.journal().length,0,what);
    assert.equal(r.fehler,what==='budget'?'BUDGET':what==='disabled'?'CODE':'KONFIG_GEAENDERT',what);
  }
});

test('An overlapping request during counting consumes the allowance only once; duplicate ID resolves without a second paid call',()=>{
  for(const sameId of [true,false]) {
    const e=createBackend(),id='overlap-count-request-0001';e.settings({tagS:1});let second;
    e.setCountFetch(()=>{e.setCountFetch(()=>({status:200,body:{input_tokens:100}}));second=e.chat({anfrageId:sameId?id:'overlap-count-request-0002'});return {status:200,body:{input_tokens:100}};});
    const first=e.chat({anfrageId:id});assert.equal(second.ok,true);assert.equal(first.ok,sameId);
    if(!sameId)assert.equal(first.fehler,'TAG');
    assert.equal(e.requests.length,1);assert.equal(e.journal().length,1);
  }
});

test('Same-ID replays and conflicting attachment bytes are resolved before another free count',()=>{
  const e=createBackend(),id='replay-attachment-request-0001';
  assert.equal(e.chat({anfrageId:id,anhaenge:[pdf1]}).ok,true);e.advance();
  assert.equal(e.chat({anfrageId:id,anhaenge:[pdf1]}).ok,true);
  assert.equal(e.chat({anfrageId:id,anhaenge:[image]}).fehler,'VORGANG_KONFLIKT');
  assert.equal(e.countRequests.length,1);assert.equal(e.requests.length,1);
});

test('Reservation covers cold cache writes plus estimate margin and max output; cache hits settle by actual model price',()=>{
  const e=createBackend(),usage={input_tokens:100,output_tokens:20,cache_creation_input_tokens:0,cache_read_input_tokens:1000};
  assert.equal(e.context.maxKosten_('claude-sonnet-5-5',1000,900,true),Math.ceil(1032*2*1.25+900*10));
  assert.equal(e.context.berechneKosten_('claude-sonnet-5-5',usage),0.0005);
  assert.equal(e.context.berechneKosten_('claude-opus-5-5',usage),0.001);
  assert.equal(e.context.berechneKosten_('claude-haiku-5-5',usage),0.00003);
  assert.equal(e.context.maxKosten_('claude-haiku-5-5',99000,900,true),Math.ceil((100980*.1*1.25+900*.5)*5));
  assert.deepEqual(plain(e.context.KONFIG.PREISE),{'claude-haiku-5-5':[.1,.5],'claude-sonnet-5-5':[2,10],'claude-opus-5-5':[4,20]});
});
