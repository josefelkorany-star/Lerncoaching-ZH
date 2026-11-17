import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,storage,copy,originalHtml,inlineScript} from './ui-harness.mjs';
import vm from 'node:vm';

test('Original inline script parses and empty API_URL selects labelled offline demo',async()=>{
 new vm.Script(inlineScript);const h=harness();assert.equal(h.coach.KONFIG.API_URL,'');assert.equal(h.document.getElementById('v-login').hidden,false);assert.equal(h.document.getElementById('demo-hinweis').hidden,false);
 await h.login('wrong-code');assert.match(h.document.getElementById('login-err').textContent,/ungültig/);assert.equal(h.calls.length,0);
});
test('Both original personal-demo codes produce distinct student and teacher modes without API calls',async()=>{
 const s=harness();await s.login('DEMO');assert.equal(s.coach.S.nutzer.rolle,'Schüler');assert.equal(s.coach.S.nutzer.stufe,'1. Sek A');assert.equal(s.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'),null);assert.match(s.document.getElementById('verlauf-in').textContent,/Tipps und Leitfragen/);
 const t=harness();await t.login('DEMO-LP');assert.equal(t.coach.S.nutzer.rolle,'Lehrperson');assert.ok(t.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'));assert.ok(t.document.querySelector('[data-fach="Elternkommunikation"]'));assert.match(t.document.getElementById('verlauf-in').textContent,/Vollständige Lösungen/);assert.equal(t.calls.length,0);
});
test('Original code normalization supports printed separators and eight-character suffix',()=>{
 const h=harness();assert.equal(h.coach.normCode(' lc-ab12-cd34 '),'LCAB12CD34');assert.equal(h.coach.normCode('ab12cd34'),'LCAB12CD34');assert.equal(h.coach.zeigeCode('LCAB12CD34'),'LC-AB12-CD34');
});
test('Subject choice, separate chats, reopening and confirmed deletion work in original demo',async()=>{
 const h=harness();await h.login();h.event(h.document.querySelector('[data-fach="Mathematik"]'),'click');await h.send('Erfundene Bruchaufgabe');const first=h.coach.S.chats[0];assert.equal(first.fach,'Mathematik');assert.equal(first.nachrichten.length,2);assert.match(first.nachrichten[1].text,/Vorschau-Modus/);
 h.document.getElementById('btn-neu').click();h.event(h.document.querySelector('[data-fach="Deutsch"]'),'click');await h.send('Erfundene Deutschfrage');assert.equal(h.coach.S.chats.length,2);assert.equal(h.coach.aktuellerChat().fach,'Deutsch');
 h.event(h.document.querySelector(`[data-chat="${first.id}"]`),'click');assert.equal(h.coach.aktuellerChat().fach,'Mathematik');const del=h.document.querySelector(`[data-del="${first.id}"]`);h.event(del,'click');assert.equal(h.coach.S.chats.length,2);h.event(del,'click');assert.equal(h.coach.S.chats.length,1);
});
test('Session and chat persistence follows remember choice, excludes photo bytes, and can be erased on logout',async()=>{
 const h=harness();await h.login('DEMO',{remember:false});assert.equal(h.local.values.size,0);assert.ok(h.session.getItem('lcCoach.v1.sitzung'));
 h.coach.S.bild={typ:'image/jpeg',daten:'SYNTHETIC_FULL_IMAGE',vorschau:'data:image/jpeg;base64,U1lOVEg='};await h.send('Erfundene Aufgabe');const stored=h.session.getItem(h.coach.chatKey());assert.ok(!stored.includes('SYNTHETIC_FULL_IMAGE'));assert.ok(!stored.includes('_vorschau'));assert.equal(JSON.parse(stored)[0].nachrichten[0].bild,true);
 h.coach.abmelden(true);assert.equal(h.session.values.size,0);assert.equal(h.local.values.size,0);assert.equal(h.document.getElementById('v-login').hidden,false);
});
test('Chat storage keys separate the two demo codes and repeat login loads own chats',async()=>{
 const local=storage();const h=harness({local});await h.login('DEMO');await h.send('Nur Demo-Schüler');const studentKey=h.coach.chatKey();h.coach.abmelden(false);await h.login('DEMO-LP');assert.notEqual(h.coach.chatKey(),studentKey);assert.equal(h.coach.S.chats.length,0);await h.send('Nur Demo-Lehrperson');h.coach.abmelden(false);await h.login('DEMO');assert.equal(h.coach.S.chats.length,1);assert.equal(h.coach.S.chats[0].nachrichten[0].text,'Nur Demo-Schüler');
});
test('Rendered message, title and markdown text escape HTML rather than creating executable elements',async()=>{
 const h=harness();await h.login();await h.send('<img src=x onerror=alert(1)>');assert.equal(h.document.querySelector('#verlauf-in img[src=x]'),null);assert.match(h.document.getElementById('verlauf-in').textContent,/<img src=x/);assert.equal(h.coach.md('<script>alert(1)</script>').includes('<script>'),false);assert.match(h.coach.md('**fett**\n\n- Punkt'),/<strong>fett<\/strong>/);
});
test('Server adapter sends current code, chosen subject and text history; teacher copy remains role-specific',async()=>{
 const h=harness({fetch:async()=>({text:async()=>JSON.stringify({ok:true,antwort:'Erfundene Antwort',verbrauch:{heute:4,tagesLimit:100,monatProzent:13,monatUsd:1.3,monatBudget:10}})})});await h.login('DEMO-LP');h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.send('Erfundene Lehrfrage');assert.equal(h.calls.length,1);assert.equal(h.calls[0].payload.code,'DEMOLP');assert.equal(h.calls[0].payload.fach,'Unterrichtsvorbereitung');assert.equal(h.calls[0].payload.nachrichten.at(-1).text,'Erfundene Lehrfrage');assert.equal(h.calls[0].options.headers['Content-Type'],'text/plain;charset=utf-8');assert.ok(h.document.querySelector('[data-kopieren]'));
});
test('Image preparation validates type and computes JPEG resize and thumbnail dimensions with synthetic canvas',async()=>{
 const h=harness();await assert.rejects(h.coach.bildVorbereiten({type:'text/plain'}),/TYP/);const p=h.coach.bildVorbereiten({type:'image/png'});await h.flush();const image=await p;assert.equal(image.typ,'image/jpeg');assert.equal(h.canvases[0].width,1568);assert.equal(h.canvases[0].height,1045);assert.equal(h.canvases[1].width,360);assert.ok(image.daten);assert.match(image.vorschau,/^data:image\/jpeg;base64,/);
});
test('Known defect: photo follow-up contains only a text marker, not the earlier task image',async()=>{
 const h=harness({fetch:async()=>({text:async()=>JSON.stringify({ok:true,antwort:'Erfundene Rückfrage zum Foto'})})});await h.login();h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';h.coach.S.bild={typ:'image/jpeg',daten:'SYNTHETIC_PHOTO',vorschau:'data:image/jpeg;base64,U1lOVEg='};await h.send('Was ist der erste Schritt?');await h.send('Ich meine Aufgabe zwei auf dem Foto.');assert.equal(h.calls[0].payload.bild.daten,'SYNTHETIC_PHOTO');assert.equal(h.calls[1].payload.bild,null);assert.ok(h.calls[1].payload.nachrichten.some(m=>m.text.includes('[Foto gesendet]')));assert.equal(JSON.stringify(h.calls[1].payload).includes('SYNTHETIC_PHOTO'),false);
});
test('Original modal sets and restores focus and Escape closes it; mobile menu open/close state exists',async()=>{
 const h=harness();const trigger=h.document.querySelector('[data-open="m-info"]');trigger.focus();h.event(trigger,'click');const modal=h.document.getElementById('m-info');assert.equal(modal.hidden,false);assert.equal(h.document.activeElement,modal.querySelector('[data-close]'));h.event(h.document,'keydown',{key:'Escape'});assert.equal(modal.hidden,true);assert.equal(h.document.activeElement,trigger);
 await h.login();h.document.getElementById('btn-menu').click();assert.equal(h.document.getElementById('btn-menu').getAttribute('aria-expanded'),'true');h.document.getElementById('scrim').click();assert.equal(h.document.getElementById('btn-menu').getAttribute('aria-expanded'),'false');
});
test('Known defect: aria-modal dialogs do not trap Tab and the background is not inert',()=>{
 const h=harness();h.coach.oeffne('m-info');const modal=h.document.getElementById('m-info');const ev=h.event(modal.querySelector('[data-close]'),'keydown',{key:'Tab',shiftKey:false});assert.equal(ev.defaultPrevented,false);assert.equal(h.document.getElementById('v-login').hasAttribute('inert'),false);assert.equal(h.document.getElementById('v-login').getAttribute('aria-hidden'),null);h.document.getElementById('code').focus();assert.equal(h.document.activeElement.id,'code');assert.equal(modal.hidden,false);
});
test('Known defect: unsent composer text survives logout and appears after another code logs in',async()=>{
 const h=harness();await h.login('DEMO');h.document.getElementById('eingabe').value='Erfundener privater Entwurf von A';h.coach.abmelden(false);await h.login('DEMO-LP');assert.equal(h.document.getElementById('eingabe').value,'Erfundener privater Entwurf von A');
});
test('Known defect: a rejected rapid report is nevertheless displayed and persisted as received',async()=>{
 const h=harness({fetch:async()=>({text:async()=>JSON.stringify({ok:false,fehler:'SCHNELL',meldung:'Danke, deine Meldung ist schon angekommen.'})})});await h.login();await h.send('Erfundene Aufgabe');h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';h.event(h.document.querySelector('[data-melden]'),'click');h.document.getElementById('btn-melden').click();await h.flush();assert.equal(h.calls[0].payload.aktion,'melden');assert.equal(h.coach.aktuellerChat().nachrichten[1].gemeldet,true);assert.match(h.document.getElementById('melden-status').textContent,/angekommen/);
});
test('Known defect: cached session opens chat before its code has been verified on reload',()=>{
 const local=storage({'lcCoach.v1.sitzung':JSON.stringify({code:'SYNTHETIC_INVALID',nutzer:{name:'Erfundene Person',vorname:'Erfunden',rolle:'Schüler',stufe:'6. Primar'},verbrauch:null,dauerhaft:true})});const h=harness({local});assert.equal(h.document.getElementById('v-chat').hidden,false);assert.equal(h.document.getElementById('v-login').hidden,true);assert.equal(h.coach.S.nutzer.name,'Erfundene Person');
});
test('Known defect: a delayed reply after switching codes overwrites the new user usage and live announcement',async()=>{
 let resolveOld;const pending=new Promise(r=>resolveOld=r);
 const h=harness({fetch:()=>pending});await h.login('DEMO');h.coach.KONFIG.API_URL='https://synthetic.invalid/exec';await h.send('Erfundene Frage von A');assert.equal(h.coach.S.laeuft,true);
 h.coach.abmelden(false);h.coach.KONFIG.API_URL='';await h.login('DEMO-LP');assert.equal(h.coach.S.verbrauch.monatBudget,10);
 resolveOld({text:async()=>JSON.stringify({ok:true,antwort:'Erfundene private Antwort für A',verbrauch:{heute:4,tagesLimit:40,monatProzent:12,monatUsd:0.36,monatBudget:3}})});await h.flush();
 assert.equal(h.coach.S.code,'DEMOLP');assert.equal(h.coach.S.verbrauch.monatBudget,3);assert.match(h.document.getElementById('ansage').textContent,/private Antwort für A/);assert.equal(JSON.parse(h.local.getItem('lcCoach.v1.sitzung')).verbrauch.monatBudget,3);
});
test('Known defect: refreshed role updates state but leaves cached teacher controls and role label on screen',async()=>{
 const local=storage({'lcCoach.v1.sitzung':JSON.stringify({code:'DEMO',nutzer:{name:'Erfundene Person',vorname:'Erfunden',rolle:'Lehrperson',stufe:''},verbrauch:null,dauerhaft:true})});const h=harness({local});assert.ok(h.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'));await h.flush();assert.equal(h.coach.S.nutzer.rolle,'Schüler');assert.ok(h.document.querySelector('[data-fach="Unterrichtsvorbereitung"]'));assert.match(h.document.getElementById('who-rolle').textContent,/Lehrperson/);
});
test('Static layout/security inventory records responsive breakpoints and existing external font request',()=>{
 assert.match(originalHtml,/@media \(max-width:860px\)/);assert.match(originalHtml,/@media \(max-width:420px\)/);assert.match(originalHtml,/max-width:86%/);assert.match(originalHtml,/min-width:0/);assert.match(originalHtml,/fonts\.googleapis\.com/);assert.match(originalHtml,/src="logo\.png"/);assert.match(originalHtml,/\[hidden\]\{display:none !important;/);
});
