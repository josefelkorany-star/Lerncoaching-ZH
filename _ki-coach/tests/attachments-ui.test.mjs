// Synthetic files and DOM only. No browser, real account, or provider call.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {harness,storage,copy,workingHtml} from './working-ui-harness.mjs';
const require=createRequire(import.meta.url);
const PDFLib=require('../../assets/vendor/pdf-lib-1.17.1.min.js');
const pdf=(overrides={})=>({name:'erfundene-Aufgabe.pdf',type:'application/pdf',size:64,content:'%PDF-1.7\nSYNTHETIC_PDF_BYTES_ONLY',...overrides});
const photo=()=>({name:'erfundene-Aufgabe.png',type:'image/png',size:64});
const reply=value=>({text:async()=>JSON.stringify(value)});
async function connected(options={}) {
  const h=harness({...options,fetch:async(_url,opt)=>{
    const d=JSON.parse(opt.body);return reply({ok:true,anfrageId:d.anfrageId,antwort:'Erfundene Antwort'});
  }});
  await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/attachments';return h;
}
function choose(h,files,via='picker') {
  if(via==='picker') {
    const input=h.document.getElementById('datei');Object.defineProperty(input,'files',{configurable:true,value:files});return h.event(input,'change');
  }
  if(via==='paste')return h.event(h.document.getElementById('eingabe'),'paste',{clipboardData:{files,items:[]}});
  return h.event(h.document.getElementById('v-chat'),'drop',{dataTransfer:{files}});
}

test('Published API URL and PR16 editable textarea survive; PDF and multiple controls are accessible',()=>{
  const h=harness();
  assert.match(workingHtml,/API_URL: 'https:\/\/script\.google\.com\/macros\/s\/AKfycbzRvUzoLAwWCO9ZO2shz78o599LLZqpXctwPD95GIiuv6sg6yFcYFjui27mOJvxSg20\/exec'/);
  assert.match(h.document.getElementById('datei').getAttribute('accept'),/application\/pdf/);
  assert.equal(h.document.getElementById('datei').hasAttribute('multiple'),true);
  assert.match(h.document.getElementById('btn-foto').getAttribute('aria-label'),/Foto oder PDF/);
  assert.doesNotMatch(workingHtml,/PDFs kann der Coach noch nicht lesen/);
  assert.match(workingHtml,/#eingabe\{[^}]*min-height:44px;max-height:160px/);
});

for(const via of ['picker','paste','drop'])test(`PDF ${via} shows a safe filename and sends one document payload, including attachment-only question`,async()=>{
  const h=await connected();const ev=choose(h,[pdf({name:'<script>alert(1)</script>.pdf'})],via);await h.flush();
  if(via!=='picker')assert.equal(ev.defaultPrevented,true);
  assert.equal(h.document.getElementById('bild-img').hidden,true);
  assert.equal(h.document.getElementById('anhang-info').querySelector('script'),null);
  assert.match(h.document.getElementById('anhang-info').textContent,/\.pdf/);
  await h.send('');const d=h.calls[0].payload;
  assert.deepEqual(d.anhaenge,[{typ:'application/pdf',daten:btoa(pdf().content)}]);
  assert.equal(d.anhangNachricht,0);assert.equal(d.nachrichten[0].text,'');
  assert.match(h.document.getElementById('anhang-kontext').textContent,/PDF.*Folgefragen/);
  for(const store of [h.local,h.session])for(const value of store.values.values())assert.doesNotMatch(value,/SYNTHETIC_PDF_BYTES|JVBER|data:application|<script>|_vorschau|"daten"/);
});

test('Text paste stays native; image clipboard items, multiple pasted images and file drops retain PR16 entry points',async()=>{
  const h=await connected();
  assert.equal(h.event(h.document.getElementById('eingabe'),'paste',{clipboardData:{files:[],items:[{kind:'string',type:'text/plain'}]}}).defaultPrevented,false);
  const ev=h.event(h.document.getElementById('eingabe'),'paste',{clipboardData:{files:[],items:[{kind:'file',getAsFile:photo},{kind:'file',getAsFile:photo}]}});
  assert.equal(ev.defaultPrevented,true);await h.flush();assert.equal(h.coach.S.anhaenge.length,2);
  choose(h,[photo()],'drop');await h.flush();await h.send('Drei erfundene Bilder');assert.equal(h.calls[0].payload.anhaenge.length,3);
});

test('Five images are accepted; six, mixed PDF/image and multiple PDFs are rejected without replacing a valid selection',async()=>{
  const h=await connected();choose(h,Array.from({length:5},photo));await h.flush();assert.equal(h.coach.S.anhaenge.length,5);
  choose(h,[photo()]);await h.flush();assert.equal(h.coach.S.anhaenge.length,5);assert.match(h.document.getElementById('hinweis').textContent,/höchstens fünf/);
  choose(h,[pdf()]);await h.flush();assert.equal(h.coach.S.anhaenge.length,5);
  h.document.getElementById('bild-weg').click();
  for(const files of [[pdf(),photo()],[pdf(),pdf()],Array.from({length:6},photo)]){choose(h,files);await h.flush();assert.equal(h.coach.S.anhaenge.length,0);}
  choose(h,[pdf()]);await h.flush();choose(h,[photo()]);await h.flush();assert.equal(h.coach.S.anhaenge.length,1);assert.equal(h.coach.S.anhaenge[0].typ,'application/pdf');
});

for(const specimen of [pdf({size:3670017}),pdf({size:0}),pdf({content:'not a PDF'}),{name:'unknown.exe',type:'application/octet-stream',size:3}])test(`Invalid file is rejected before transport (${specimen.size}/${specimen.type}/${specimen.content})`,async()=>{
  const h=await connected();choose(h,[specimen]);await h.flush();await h.send('');assert.equal(h.calls.length,0);assert.equal(h.coach.S.anhaenge.length,0);assert.equal(h.document.getElementById('hinweis').hidden,false);
});

test('Exactly 3.5 MiB is accepted; filename extension supports a PDF with absent OS MIME type',async()=>{
  const h=await connected();choose(h,[pdf({type:'',size:3670016})]);await h.flush();await h.send('Test');assert.equal(h.calls[0].payload.anhaenge[0].typ,'application/pdf');
});

test('Follow-ups keep the exact attachment and original question stable; new attachment replaces only this chat context',async()=>{
  const h=await connected();choose(h,[pdf()]);await h.flush();await h.send('Ursprüngliche erfundene Aufgabe');const first=copy(h.calls[0].payload);
  await h.send('Was ist der erste Schritt?');const next=h.calls[1].payload;
  assert.deepEqual(next.anhaenge,first.anhaenge);assert.equal(next.anhangNachricht,first.anhangNachricht);assert.deepEqual(next.nachrichten[0],first.nachrichten[0]);
  choose(h,[photo()]);await h.flush();await h.send('Neue Aufgabe als Foto');const changed=h.calls[2].payload;
  assert.equal(changed.anhangNachricht,4);assert.equal(changed.anhaenge[0].typ,'image/jpeg');assert.notEqual(changed.anhaenge[0].daten,first.anhaenge[0].daten);
  await h.send('Folgefrage zum Foto');assert.equal(h.calls[3].payload.anhangNachricht,4);assert.deepEqual(h.calls[3].payload.anhaenge,changed.anhaenge);
});

test('History rollover preserves the original attachment-only message and max 24 turns instead of attaching to a different question',async()=>{
  const h=await connected();choose(h,[pdf()]);await h.flush();await h.send('');const original=copy(h.calls[0].payload.nachrichten[0]);
  for(let i=0;i<15;i++)await h.send('Erfundene Folgefrage '+i);
  const d=h.calls.at(-1).payload;assert.ok(d.nachrichten.length<=24);assert.equal(d.anhangNachricht,0);assert.deepEqual(d.nachrichten[0],original);assert.equal(d.nachrichten.at(-1).text,'Erfundene Folgefrage 14');assert.equal(d.anhaenge[0].typ,'application/pdf');
});

test('Chat switching isolates attachments, restores only that chat RAM context and removes unsent selection',async()=>{
  const h=await connected();choose(h,[pdf()]);await h.flush();await h.send('PDF Chat');const first=h.coach.S.aktivId;
  h.coach.neuerChat();choose(h,[photo()]);await h.flush();await h.send('Bilder Chat');const second=h.coach.S.aktivId;
  choose(h,[photo()]);await h.flush();h.coach.oeffneChat(first);assert.equal(h.coach.S.anhaenge.length,0);await h.send('PDF Folgefrage');assert.equal(h.calls.at(-1).payload.anhaenge[0].typ,'application/pdf');
  h.coach.oeffneChat(second);await h.send('Foto Folgefrage');assert.equal(h.calls.at(-1).payload.anhaenge[0].typ,'image/jpeg');
  h.coach.neuerChat();await h.send('Neuer Chat ohne Anhang');assert.equal(h.calls.at(-1).payload.anhaenge,undefined);
});

test('Reload preserves text chats but never attachment bytes or follow-up attachment context',async()=>{
  const local=storage(),h=await connected({local});choose(h,[pdf()]);await h.flush();await h.send('Erfundene PDF-Frage');const id=h.coach.S.aktivId;
  const again=await connected({local});again.coach.oeffneChat(id);assert.equal(again.document.getElementById('anhang-kontext').hidden,true);await again.send('Nach dem Neuladen');assert.equal(again.calls[0].payload.anhaenge,undefined);assert.match(again.calls[0].payload.nachrichten[0].text,/PDF nicht mehr verfügbar/);
});

for(const action of ['logout','new-chat','switch-chat','remove','code-change'])test(`Pending PDF read cannot leak after ${action}; send stays blocked until reads finish`,async()=>{
  const h=await connected();await h.send('Leerer bestehender Chat');const first=h.coach.S.aktivId;h.coach.neuerChat();
  choose(h,[pdf({readDelay:5000})]);await h.flush();await h.send('Nicht ohne noch lesendes PDF senden');assert.equal(h.calls.length,1);assert.equal(h.coach.S.anhaengeLaden,true);
  if(action==='logout')h.coach.abmelden(false);
  if(action==='new-chat')h.coach.neuerChat();
  if(action==='switch-chat')h.coach.oeffneChat(first);
  if(action==='remove')h.document.getElementById('bild-weg').click();
  if(action==='code-change')h.coach.anmelden('NEUER-CODE',{name:'Andere erfundene Person',rolle:'Lehrperson'},null);
  await h.flush(6000);assert.equal(h.readers[0].aborted,true);assert.equal(h.coach.S.anhaenge.length,0);assert.equal(h.coach.S.anhaengeLaden,false);assert.equal(h.document.getElementById('bild-vorschau').hidden,true);
});

test('Logout and subsequent same-code login cannot recover RAM attachments from the earlier session',async()=>{
  const h=await connected();choose(h,[pdf()]);await h.flush();await h.send('Erfundene Aufgabe');const id=h.coach.S.aktivId;
  h.coach.abmelden(false);assert.equal(h.document.getElementById('anhang-kontext').textContent,'');assert.equal(h.coach.S.letzteAnfrage,null);
  h.coach.KONFIG.API_URL='';await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/attachments';h.coach.oeffneChat(id);await h.send('Neu angemeldet');assert.equal(h.calls.at(-1).payload.anhaenge,undefined);
});

for(const pages of [1,20,21])test(`Real vendored PDF parser normalizes compressed object streams and enforces ${pages} page boundary`,async()=>{
  const document=await PDFLib.PDFDocument.create();for(let n=0;n<pages;n++)document.addPage([100,100]);
  const bytes=await document.save({useObjectStreams:true});
  assert.match(Buffer.from(bytes).toString('latin1'),/\/ObjStm/);
  const h=await connected({pdfLib:PDFLib});choose(h,[pdf({bytes,size:bytes.length})]);
  // The real library yields asynchronously; synthetic DOM flushes do not run a browser.
  for(let n=0;n<8;n++){await new Promise(resolve=>setTimeout(resolve,20));await h.flush();if(!h.coach.S.anhaengeLaden)break;}
  if(pages>20){assert.equal(h.coach.S.anhaenge.length,0);assert.match(h.document.getElementById('hinweis').textContent,/1 bis 20 Seiten/);assert.equal(h.calls.length,0);return;}
  await h.send('Erfundene PDF-Aufgabe');const normalized=Buffer.from(h.calls[0].payload.anhaenge[0].daten,'base64');
  assert.doesNotMatch(normalized.toString('latin1'),/\/ObjStm/);
  assert.equal((await PDFLib.PDFDocument.load(normalized)).getPageCount(),pages);
});

test('Parser receives secure load/save settings and rejects oversized normalized output without sending',async()=>{
  let loadOptions,saveOptions;
  const pdfLib={PDFDocument:{async load(_bytes,options){loadOptions=options;return {getPageCount:()=>1,async save(options){saveOptions=options;return new Uint8Array(3670017);}};}}};
  const h=await connected({pdfLib});choose(h,[pdf()]);await h.flush();await h.send('');
  assert.deepEqual(copy(loadOptions),{ignoreEncryption:false,updateMetadata:false});assert.deepEqual(copy(saveOptions),{useObjectStreams:false,addDefaultPage:false});
  assert.equal(h.coach.S.anhaenge.length,0);assert.equal(h.calls.length,0);assert.match(h.document.getElementById('hinweis').textContent,/3.5 MB/);
});

test('Encrypted PDFs and zero-page PDFs receive a specific friendly refusal',async()=>{
  for(const encrypted of [true,false]){
    const h=await connected({pdfLib:{PDFDocument:{async load(){if(encrypted)throw new PDFLib.EncryptedPDFError();return {getPageCount:()=>0};}}}});
    choose(h,[pdf()]);await h.flush();assert.equal(h.coach.S.anhaenge.length,0);assert.equal(h.calls.length,0);
    assert.match(h.document.getElementById('hinweis').textContent,encrypted?/passwortgeschützt/:/1 bis 20 Seiten/);assert.doesNotMatch(h.document.getElementById('hinweis').textContent,/ignoreEncryption/);
  }
});

test('Late asynchronous PDF normalization cannot restore an attachment after logout or chat change',async()=>{
  for(const logout of [true,false]){
    let finish;const pending=new Promise(resolve=>finish=resolve);
    const h=await connected({pdfLib:{PDFDocument:{async load(){return {getPageCount:()=>1,save:()=>pending};}}}});
    choose(h,[pdf()]);await h.flush();assert.equal(h.coach.S.anhaengeLaden,true);
    if(logout)h.coach.abmelden(false);else h.coach.neuerChat();
    finish(new TextEncoder().encode('%PDF-1.7\nNORMALIZED_OLD_BYTES'));await h.flush();
    assert.equal(h.coach.S.anhaenge.length,0);assert.equal(h.document.getElementById('bild-vorschau').hidden,true);assert.equal(h.calls.length,0);
  }
});
