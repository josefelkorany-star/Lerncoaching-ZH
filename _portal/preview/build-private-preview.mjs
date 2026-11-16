// Run with an output path OUTSIDE this worktree. No upload, deployment or browser launch.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const output=path.resolve(process.argv[2]||'');
if(!process.argv[2]||output===root||output.startsWith(root+path.sep))throw new Error('Bitte einen privaten Ausgabeordner ausserhalb des Worktrees angeben.');
await fs.mkdir(output,{recursive:true});
const copy=async(src,dest=src)=>{const target=path.join(output,dest);await fs.mkdir(path.dirname(target),{recursive:true});await fs.cp(path.join(root,src),target,{recursive:true});};
for(const name of ['portal.html','portal.css','portal-ui.js','portal-app.js','portal-model.js','course-data.js','assets/portal/fonts','_portal/dev-dependencies.mjs','_portal/db-tests/fixtures.mjs','_portal/supabase/migrations','_portal/preview/serve-private-preview.mjs'])await copy(name);
for(const name of ['private-preview.js','private-preview.css'])await copy('_portal/preview/'+name,name);
let html=await fs.readFile(path.join(output,'portal.html'),'utf8');
html=html.replace('</head>','<link rel="stylesheet" href="private-preview.css">\n</head>')
 .replace('<body>','<body>\n<aside class="private-preview" aria-label="Private Testvorschau"><strong>Private Testvorschau – nicht veröffentlicht</strong><p>Nur erfundene Familien. Lokale PostgreSQL-Regeln mit simulierten Sitzungen; keine echte Supabase-Anmeldung und kein Nachweis für den Echtbetrieb.</p><label for="preview-actor">Testkonto wählen</label><select id="preview-actor"><option value="anonymous">Ausgeloggt</option></select><p id="preview-status" role="status">Änderungen bleiben nur bis zum Neustart erhalten.</p></aside>')
 .replace(/\s*<script src="assets\/portal\/supabase-[^"]+"><\/script>/,'')
 .replace('src="portal-main.js"','src="private-preview.js"');
await fs.writeFile(path.join(output,'portal.html'),html);
const require=createRequire(process.env.PORTAL_DEPENDENCY_ROOT?path.resolve(process.env.PORTAL_DEPENDENCY_ROOT,'package.json'):path.join(root,'_portal/package.json'));
let pkg=path.dirname(require.resolve('@electric-sql/pglite'));
while(path.basename(pkg)!=='pglite'){const parent=path.dirname(pkg);if(parent===pkg)throw new Error('PGlite package root not found.');pkg=parent;}
await fs.cp(pkg,path.join(output,'_portal/node_modules/@electric-sql/pglite'),{recursive:true});
await fs.writeFile(path.join(output,'_portal/package.json'),JSON.stringify({private:true,type:'module'},null,2));
await fs.writeFile(path.join(output,'Start-Vorschau.cmd'),`@echo off\r\ncd /d "%~dp0"\r\nset "PORTAL_NODE=${process.execPath}"\r\nif exist "%PORTAL_NODE%" (\r\n  "%PORTAL_NODE%" _portal\\preview\\serve-private-preview.mjs\r\n) else (\r\n  node _portal\\preview\\serve-private-preview.mjs\r\n)\r\npause\r\n`);
await fs.writeFile(path.join(output,'VORSCHAU-LESEN.txt'),'PRIVATE PORTALVORSCHAU – nur erfundene Testfamilien\n\nVoraussetzung: Node.js 22 oder neuer. Start-Vorschau.cmd starten; den dort angezeigten lokalen Link selbst öffnen. Kein Browser wird automatisch gestartet. Keine Verbindung zu Supabase oder anderen Online-Diensten.\n\nIm hellen Bereich oben Testkonto wählen. Eltern Birke sehen Nora und Milo, Eltern Linde nur Lina; Alex ist volljährig und hat keine Elternfreigabe. Team und Admin besitzen getrennte Rechte. Vertretung, unzugeordnet und entzogen erhalten keine Lerndaten. Änderungen sind flüchtig und beim Serverneustart zurückgesetzt.\n\nDiese Vorschau führt dieselbe SQL-Migration und RPCs in lokalem PGlite aus, simuliert aber Auth-Sitzungen. Echte Supabase-Auth-/REST- und Browserprüfungen sind noch offen. Passwortänderung ist hier deshalb nicht ausführbar. Keine echten Daten eingeben. Keine Veröffentlichung oder Freischaltung.\n');
console.log(`Private Vorschau erstellt: ${output}`);
