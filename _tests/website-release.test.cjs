'use strict';
// Focused source/integration guards; these are not browser/layout tests.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const base='7388ca1a263d85e3794b27d2fc3a40b1556069f1';
const before=execFileSync('git',['show',base+':index.html'],{cwd:root,encoding:'utf8'});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const section=(s,id)=>s.match(new RegExp('<section\\b[^>]*\\bid="'+id+'"[\\s\\S]*?<\\/section>'))?.[0];
const scripts=s=>[...s.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map(m=>m[0]);
test('inquiry copy changes while the exact iframe/direct link and processing entrypoints stay preserved',()=>{
 assert.match(section(html,'kontakt'),/Die Anfrage erzeugt keinen Vertrag und keine Buchung des Ersttermins/);
 assert.match(section(html,'kontakt'),/unterschriebenen Ersttermin-Vereinbarung beziehungsweise dem Anmeldevertrag/);
 assert.deepEqual([...html.matchAll(/https:\/\/script\.google\.com\/macros\/s\/[^"\s<>]+\/exec/g)].map(m=>m[0]),[...before.matchAll(/https:\/\/script\.google\.com\/macros\/s\/[^"\s<>]+\/exec/g)].map(m=>m[0]));
 assert.ok(!/<form\b|formular-vorschau|formular-gesperrt|_apps-script|portal\.html/i.test(html));
});
test('calendar, standard PDFs, flyer, domain and site configuration stay byte-identical',()=>{
 for(const file of ['course-data.js','calendar.js','calendar.css','site-config.js','CNAME','konzept.pdf','vertrag.pdf','vertrag_ersttermin.pdf','poster.jpg']){
  const expected=execFileSync('git',['show',base+':'+file],{cwd:root,maxBuffer:8*1024*1024});
  assert.equal(sha(fs.readFileSync(path.join(root,file))),sha(expected),file);
 }
});
test('navigation destinations, dialog keyboard handlers and existing scripts remain unchanged',()=>{
 const destinations=s=>[...s.match(/<nav\b[\s\S]*?<\/nav>/)[0].matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(destinations(html),destinations(before));assert.deepEqual(scripts(html),scripts(before));
 for(const script of scripts(html)){const body=script.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,'');if(body.trim())new vm.Script(body);}
 assert.equal(html.match(/<dialog id="impModal"[\s\S]*?<\/dialog>/)[0],before.match(/<dialog id="impModal"[\s\S]*?<\/dialog>/)[0]);
 for(const id of ['dsModal','impModal'])assert.ok(html.includes('<dialog id="'+id+'" class="modal" aria-labelledby="'+id+'-title">'));
});
test('hero is the existing approved image; source order and mobile rules preserve the full image',()=>{
 assert.equal(sha(fs.readFileSync(path.join(root,'lerncoaching-hero.webp'))),'e4437c255deefaaf675087af7985a4904924e8742d460b04ed96aaaa45ce6d06');
 assert.ok(html.indexOf('class="hero-copy"')<html.indexOf('class="hero-visual"'));
 assert.match(html,/\.hero-visual img\{[^}]*height:auto;[^}]*object-fit:contain/);
 assert.match(html,/\.hero-content\{grid-template-columns:minmax\(0,1fr\);\}/);
 assert.match(html,/<img src="lerncoaching-hero\.webp" width="1000" height="1000"/);
});
test('FMS and fourth primary class are present; all inquiry CTAs use the full approved wording',()=>{
 assert.ok(html.includes('BMS, HMS und FMS'));assert.ok(html.includes('Lernende an BMS, HMS und FMS'));assert.ok(html.includes('ab der 4. Primarklasse'));
 const links=[...html.matchAll(/<a\b[^>]*href="#kontakt"[^>]*>([\s\S]*?)<\/a>/g)];assert.equal(links.length,11);
 for(const link of links)assert.equal(link[1],'Ersttermin vereinbaren');
 for(const text of ['Platz anfragen','Termin anfragen','Probestunde anfragen','keine Plätze frei','voller Belegung'])assert.equal(html.includes(text),false,text);
 assert.ok(html.includes('Unverbindlich – wir melden uns persönlich bei dir.'));
 assert.ok(html.includes('Anfragen, aus denen kein Vertrag entsteht, werden nach 12 Monaten gelöscht, auf Wunsch der Familie früher.'));
});

test('approved main cancellation clauses stay verbatim despite inquiry changes',()=>{
 const faq=before.match(/<p[^>]*>Kostenlos ist die Kündigung per Quartalsende:[\s\S]*?<\/p>/)[0];assert.ok(html.includes(faq));
 for(const marker of ['Kündigung kostenlos per Quartalsende','Austritt während des Quartals','Quartalsweise, verlängert sich automatisch.']){
  const snippet=before.slice(before.indexOf(marker));const text=snippet.slice(0,snippet.indexOf('</p>')>=0&&marker!=='Quartalsweise, verlängert sich automatisch.'?snippet.indexOf('</p>'):snippet.indexOf('</div>'));
  assert.ok(html.includes(text),marker);
 }
});
test('Saturday sequence, optional strategy and parent note match the approved existing work',()=>{
 const cycle=section(html,'zyklus');assert.ok(cycle);for(const text of ['ausführliche Standortbestimmung','am ersten besuchten Samstag des Quartals','Stärken und Lücken erkennen','Aktuelle Schulaufgaben oder Prüfungsthemen','Verstehen vor Erledigen','Wenn es hilft:','Vereinbarte Ziele und Fortschritte vergleichen','keine starre Altersgrenze','Zeugniskopie ist nicht nötig','WhatsApp ist keine Voraussetzung'])assert.ok(cycle.includes(text),text);
 assert.ok(cycle.indexOf('Verstehen vor Erledigen')<cycle.indexOf('Wenn es hilft:'));
 assert.ok(html.includes('Wir besprechen Aufgaben und Prüfungsergebnisse und passen den Lernplan daran an.'));assert.ok(!html.includes('Lernfortschritte objektiv'));
});
test('four dates and periods preserved; no private new contract rule or PDF draft linked',()=>{
 for(const date of ['31. Oktober','31. Januar','30. April','31. Juli'])assert.ok(html.includes('Kostenlose Kündigung per Quartalsende: Eingang bis '+date));
 for(const name of ['August – Oktober','November – Januar','Februar – April','Mai – Juli'])assert.ok(html.includes(name));
 assert.ok(html.includes('Treuerabatt CHF 145.–'));assert.ok(html.includes('Aktuelle Fassung für neue Anmeldungen: Version 2026/2.5.'));
 for(const marker of ['ENTWURF','Gesondert zu prüfen','Offene Rechtsfrage','Die Parteien vereinbaren','private/','preview-actor'])assert.ok(!html.includes(marker),marker);
});
test('download and anchor destinations resolve; wrap rules address narrow cards without clipping',()=>{
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));assert.equal(ids.size,[...html.matchAll(/\bid="([^"]+)"/g)].length);
 for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){const link=m[1];if(link==='#')continue;if(link.startsWith('#')){assert.ok(ids.has(link.slice(1)),link);continue;}if(/^[a-z]+:/i.test(link)||link.startsWith('//'))continue;assert.ok(fs.existsSync(path.join(root,link.split(/[?#]/)[0])),link);}
 assert.match(html,/\.download-link\{[^}]*min-width:0;[^}]*overflow-wrap:anywhere;white-space:normal;/);
 assert.ok(html.includes('.first-term-card{flex-direction:column;}'));
 for(const file of ['konzept.pdf','vertrag.pdf','vertrag_ersttermin.pdf'])assert.match(html,new RegExp('<a class="download-link" href="'+file.replace('.','\\.')+'" download'));
});
