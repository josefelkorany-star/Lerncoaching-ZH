const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {runtime} = require('../tests/runtime.cjs');
const template = fs.readFileSync(path.join(__dirname,'../src/Index.html'),'utf8');
const legacy = ['01.01.2026','HISTORISCHER TEST','Primarschule (3.–6. Kl.)','','quartal_1','old@example.invalid','','','TEST','JA historisch','',''];

function createPreviewServer() {
  let environment = runtime({now:new Date().toISOString(),legacy});
  const lostOnce = new Set();
  const controls = `<aside class="local-preview"><strong>Private Formularvorschau – nur Testdaten</strong><p>Dies ist derselbe Formularcode wie im Apps-Script-Entwurf. Alle Speicher- und Mailaufrufe werden hier lokal abgefangen. Es wird nichts an Google übermittelt, kein Platz gebucht und kein Vertrag erstellt.</p><label for="preview-fault">Testfall</label><select id="preview-fault"><option value="none">Normale Testanfrage</option><option value="save">Speicherfehler</option><option value="flush">Antwort nach Schreibvorgang unsicher</option><option value="mail">Mailfehler nach Speicherung</option><option value="lost">Erste Serverantwort geht nach Speicherung verloren</option><option value="locked">Parallelzugriff / Sperre</option></select><p id="preview-count">Testeingänge werden nur in diesem lokalen Prozess gehalten.</p><button type="button" id="preview-reset">Lokale Testdaten zurücksetzen</button></aside>`;
  const bridge = `
  function previewRunner(success,failure){return {
    withSuccessHandler(fn){return previewRunner(fn,failure);},withFailureHandler(fn){return previewRunner(success,fn);},
    submitInterest(payload){fetch('/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,fault:document.getElementById('preview-fault').value})}).then(async r=>{const answer=await r.json();if(!r.ok)throw new Error('Simulierter Verbindungsfehler');return answer;}).then(answer=>{success(answer);refreshPreviewCount();}).catch(()=>{failure();refreshPreviewCount();});}
  };}
  window.google={script:{run:previewRunner(()=>{},()=>{})}};
  function refreshPreviewCount(){fetch('/state').then(r=>r.json()).then(s=>{document.getElementById('preview-count').textContent='Lokale Testanfragen: '+s.inquiries+' · abgefangene Benachrichtigungen: '+s.notifications+' · historische Testzeile unverändert: '+s.legacyPreserved;});}
  document.getElementById('preview-reset').addEventListener('click',()=>{fetch('/reset',{method:'POST'}).then(()=>{sessionStorage.removeItem('lc-interest-attempt-v1');location.reload();});});
  refreshPreviewCount();
  `;
  function render() {
    environment.state.now = new Date().toISOString();
    const boot = environment.context.bootstrap_();
    return template.replace('<?!= bootJson ?>',JSON.stringify(boot).replace(/</g,'\\u003c')).replace('<main>',controls+'\n<main>').replace('<script>','<script>'+bridge);
  }
  const server = http.createServer(async(req,res)=>{
    const reply=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(typeof data==='string'?data:JSON.stringify(data));};
    if(req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.origin))return reply(403,{error:'Local preview only'});
    if(req.method==='GET'&&req.url==='/')return reply(200,render(),'text/html');
    if(req.method==='GET'&&req.url==='/state')return reply(200,{inquiries:Math.max(0,environment.state.rows.length-2),notifications:environment.state.mails.length,legacyPreserved:JSON.stringify(environment.state.rows[1].slice(0,12))===JSON.stringify(legacy)});
    if(req.method==='POST'&&req.url==='/reset'){environment=runtime({now:new Date().toISOString(),legacy});lostOnce.clear();return reply(200,{ok:true});}
    if(req.method!=='POST'||req.url!=='/submit')return reply(404,{error:'Not found'});
    try{
      let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)return reply(413,{error:'Too large'});}
      const input=JSON.parse(body);environment.state.now=new Date().toISOString();
      environment.state.failSave=input.fault==='save';environment.state.failFlush=input.fault==='flush';environment.state.failMail=input.fault==='mail';environment.state.locked=input.fault==='locked';
      const result=environment.context.submitInterest(input.payload);
      environment.state.locked=false;
      if(input.fault==='lost'&&result.ok&&!lostOnce.has(input.payload.requestId)){lostOnce.add(input.payload.requestId);return reply(503,{error:'Simulated lost response after storage'});}
      return reply(200,result);
    }catch(_){return reply(400,{error:'Invalid local test request'});}
  });
  return {server,render,state:()=>environment.state};
}
if(require.main===module){const {server}=createPreviewServer();server.listen(Number(process.env.PORT||4175),'127.0.0.1',()=>console.log('Private form preview: http://127.0.0.1:'+(process.env.PORT||4175)+'/ (memory only, no Google writes or real mail)'));}
module.exports={createPreviewServer};
