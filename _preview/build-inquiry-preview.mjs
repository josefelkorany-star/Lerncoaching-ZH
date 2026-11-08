import {execFileSync} from 'node:child_process';
import {readFile,writeFile,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]||path.join(root,'..','private','konsolidierung-20261108','website-vorschau'));
// Existing builder enforces output outside the public repository and copies exact production bytes.
execFileSync(process.execPath,[path.join(root,'_preview/build-preview.mjs'),output],{stdio:'inherit'});
let html=await readFile(path.join(output,'vorschau.html'),'utf8');
const url=(await readFile(path.join(root,'index.html'),'utf8')).match(/<iframe[\s\S]*?src="([^"]+)"/)[1];
html=html.split(url).join('http://127.0.0.1:4175/');
html=html.replace('Dies ist der vorgesehene Website-Code. Der noch nicht aktivierte Google-Bewertungsbereich ist hier zusätzlich sichtbar.','Vorgesehene Website mit passender lokaler Formularvorschau. Nur synthetische Testdaten verwenden: Speicherung und Benachrichtigungen werden im lokalen Prozess abgefangen. Das echte Formular wurde nicht umgestellt. Bestehende PDF-Downloads sind unverändert; neue Vertragsentwürfe werden separat privat geprüft. Der Google-Aufruf bleibt ohne bestätigten Link deaktiviert.');
html=html.replace('Produktionsansicht ohne Bewertungsaufruf','Codeansicht mit noch bestehendem externen Formular (keine Tests absenden)');
await writeFile(path.join(output,'vorschau.html'),html);
await cp(path.join(root,'_apps-script'),path.join(output,'form-preview'),{recursive:true,filter:source=>!source.endsWith('.log')});
await writeFile(path.join(output,'ANSICHT.txt'),'PRIVATE VORSCHAU – NICHT VERÖFFENTLICHT\n\n1. node form-preview/preview/server.cjs (Port 4175, Testdaten im Speicher)\n2. Im Repository: node _preview/serve-preview.mjs "'+output+'" (Port 4176)\n3. http://127.0.0.1:4176/vorschau.html öffnen.\n\nindex.html ist bytegleich mit dem vorgesehenen Website-Code, enthält aber noch das echte bestehende Formularziel. Keine echten Testanmeldungen absenden. Nur vorschau.html bindet das lokale Testformular ein. Neue Rechtsentwürfe liegen separat und sind nicht enthalten.\n');
console.log('Paired private preview: '+output);
