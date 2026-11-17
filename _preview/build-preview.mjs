import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Local review artefact only; this directory is excluded by GitHub Pages/Jekyll.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.argv[2] || path.join(root, '..', 'audit', 'update-20261106', 'website'));
const relativeOutput = path.relative(root, output);
const outsideRoot = relativeOutput === '..' || relativeOutput.startsWith('..' + path.sep) || path.isAbsolute(relativeOutput);
if (!outsideRoot) {
  throw new Error('Choose an output directory outside the production repository.');
}
await mkdir(output, { recursive: true });
const files = ['index.html', 'calendar.css', 'calendar.js', 'course-data.js', 'site-config.js',
  'logo.png', 'poster.jpg', 'konzept.pdf', 'vertrag.pdf', 'vertrag_ersttermin.pdf'];
const manifest = [];
for (const file of files) {
  const source = path.join(root, file);
  await copyFile(source, path.join(output, file));
  const bytes = await readFile(source);
  manifest.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const production = await readFile(path.join(root, 'index.html'), 'utf8');
const notice = `<aside aria-label="Private Vorschau" style="margin:calc(var(--nav-height,7rem) + 1rem) 1rem 0;padding:1rem;border:1px solid #b6d7cd;background:#edf7f3;border-radius:10px;">
<strong>Private Vorschau – nicht veröffentlicht</strong><p>Dies ist der vorgesehene Website-Code. Der noch nicht aktivierte Google-Bewertungsbereich ist hier zusätzlich sichtbar.</p>
<p><a href="index.html">Produktionsansicht ohne Bewertungsaufruf</a> · <a href="#stundenplan">Kalender</a> · <a href="#bewerten">Bewertungsbereich</a> · <a href="#dokumente">Downloads</a></p></aside>`;
const privateOnly = `<script>
document.addEventListener('DOMContentLoaded', function () {
  const section = document.getElementById('bewerten');
  const link = document.getElementById('lc-review-button');
  if (!section || !link || link.hasAttribute('href')) return;
  section.hidden = false;
  link.setAttribute('aria-disabled', 'true');
  link.style.cursor = 'not-allowed';
  const note = document.createElement('p');
  note.id = 'private-review-note';
  note.textContent = 'Nur zur Ansicht: Der bestätigte Google-Bewertungslink fehlt. Dieser Aufruf ist deaktiviert und bleibt in der Produktionsansicht ausgeblendet.';
  note.style.cssText = 'margin-top:1rem;padding:.8rem;background:#fff8e7;border:1px solid #e9d7ae;border-radius:8px;font-size:.85rem;line-height:1.5';
  link.setAttribute('aria-describedby', note.id);
  link.after(note);
});
</script>`;
await writeFile(path.join(output, 'vorschau.html'), production.replace('</nav>', '</nav>\n' + notice).replace('</body>', privateOnly + '\n</body>'), 'utf8');
await writeFile(path.join(output, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(output, 'ANSICHT.txt'), 'Private Website-Vorschau Lerncoaching ZH\n\nindex.html ist bytegleich mit dem vorgesehenen Produktionscode.\nvorschau.html zeigt zusätzlich den noch nicht aktivierten Google-Bewertungsbereich.\nDie echten Formularlinks bleiben erhalten. Keine Testanmeldung absenden.\n\nAlle benötigten lokalen Bilder, Skripte und Standard-PDFs sind enthalten.\nDateien zusammen entpacken und vorschau.html im Browser öffnen oder lokal per HTTP bereitstellen.\nGoogle-Schriften und echtes Anmeldeformular benötigen Internetzugang.\nEs wurde nichts veröffentlicht.\n');
console.log(JSON.stringify({ output, files: manifest.length, productionIndexUnchanged: true }));
