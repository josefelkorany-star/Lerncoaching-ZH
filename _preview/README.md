# Website-Vorschau und Konfiguration

Dieses Update baut auf PR #3 (`36b76c088ca2b123729ddf108ef3b80f082e8a03`) und damit auf dem veröffentlichten PR-2-Stand auf. Flyer, Standard-PDFs und der separate Konzeptentwurf werden unverändert übernommen. `konzept.pdf` bleibt das bestehende Download-Konzept; `entwuerfe/konzept-entwurf.pdf` bleibt ein Entwurf.

## Produktionsdateien

- `course-data.js`: freigegebene Termine, freie Samstage 2027, Zeitzone, Uhrzeiten und unveränderte Standardtarife pro Kind. Monatsanzahl, Beiträge, nächster Kurstag und ICS werden daraus berechnet.
- `calendar.js`: Darstellung, Jahresauswahl, feste bisherige Kursquartale, Zürich-Datumslogik und Kalenderexport. ICS enthält UTC-Zeitpunkte, die 09:30–11:30 Uhr in Zürich entsprechen; Sommerzeit wird berücksichtigt. Ein Export ist ein einmaliger Import, kein Kalenderabonnement und keine Anmeldung.
- `calendar.css`: Kalender-/Bewertungsdesign aus der freigegebenen Vorlage und responsive Anpassungen.
- `site-config.js`: `googleReviewUrl` bleibt leer, bis der direkte Google-Bewertungslink bestätigt ist. Danach nur diesen Wert ersetzen und prüfen. Der Link führt ohne Zwischenabfrage direkt zu Google. Ohne bestätigten Link bleiben der gesamte Bereich und der Footerlink bereits im initialen HTML verborgen. Keine erfundenen Google-Rezensionen oder Kennzahlen, keine bezahlten Dienste.

Der Kalender braucht JavaScript. Bei deaktiviertem JavaScript erscheint ein Hinweis mit Kontaktverweis. Anmeldung, Kontakt und Dokumentlinks bleiben vorhanden.

## Private Vorschau erzeugen

Im Repository mit vorhandenem Node.js ausführen; keine Installation nötig:

```powershell
node _preview/build-preview.mjs
```

Optional als erstes Argument einen Ausgabeordner **ausserhalb** des Repositorys angeben. Standardausgabe: `../audit/update-20261106/website/`.

- `index.html` und sämtliche benötigten Assets werden bytegleich aus dem Produktionsstand kopiert.
- `vorschau.html` ist eine zusätzliche Ansicht desselben Codes. Nur dort erscheinen ein privater Hinweis und der noch nicht aktivierte Bewertungsbereich mit ausdrücklich deaktiviertem Aufruf. Es gibt keinen Demo-Dialog und keinen öffentlichen Vorschau-Schalter.
- `source-manifest.json` enthält SHA256 der kopierten Produktionsdateien.
- Die Dateien zusammen aufbewahren/entpacken; `vorschau.html` im Browser öffnen oder lokal über HTTP bereitstellen. Das echte Anmeldeformular und die vorhandenen Google-Schriften brauchen Internetzugang. Keine Testanmeldung absenden.

Der Generator veröffentlicht nichts. `_preview/` und `_tests/` sind durch den bestehenden Jekyll-Standard vom Pages-Inhalt ausgeschlossen. Es wurde keine Hosting-Konfiguration verändert.

## Offene Punkte

- Am 06.11.2026 zeigte das echte Apps-Script-Formular weiterhin `Primarschule (3.–6. Kl.)` als sichtbare Beschriftung **und** als internen Optionswert. Das zugehörige Skriptprojekt bzw. dessen Editorzugriff ist über die verfügbaren Werkzeuge nicht zugänglich. Vor einer Änderung müssen Anzeige, interner Wert und die bestehende Verarbeitung zusammen geprüft werden. Kein Ersatzformular, keine Änderung von URL, Versand oder Speicherziel; keine Anmeldung versandt.
- Der tatsächliche Google-Bewertungslink ist nicht bestätigt. Es wurde weder ein Unternehmensprofil erstellt noch ein vorhandenes als das richtige ausgegeben. Eine echte Weiterleitung zu dessen Bewertungsformular ist deshalb noch nicht getestet.
- Bestehende Preis-/Vertragswidersprüche bleiben als fachliche Entscheidung in `_documents/offene-entscheidungen.txt` dokumentiert. Die pauschalen bisherigen Monatskarten, Gebühren, Rabatte, Quartalslaufzeiten und Kündigungsregeln wurden nicht geändert. Kalenderkarten zeigen lediglich die bisherigen Standardtarife multipliziert mit den angebotenen Kurstagen.
- Konzeptentwurf und individuelle Schülerverträge wurden bei diesem Update nicht verändert.

## Prüfung am 06.11.2026

- `node --test _tests/calendar.test.cjs`: 17 Prüfungen bestanden; zusätzlich unter UTC, Los Angeles und Tokio. Alle 36 Kurstage 2027 und 16 freien Samstage, alle 24 erhaltenen Termine 2026, Quartale, Beiträge, Zürich-Mitternacht/Jahreswechsel und Sommerzeit, sämtliche ICS-Ereignisse sowie Formular-/Download-Invarianten.
- Echter Chromium-Appbrowser: 320, 375, 768, 1024 und 1440 CSS-Pixel; zusätzlich Navigation auf beiden Seiten des 1279-Pixel-Umschaltpunkts. Kalender, geöffnete Quartals-/Beitragsdetails, Downloads und private Bewertungsansicht ohne horizontalen Inhaltsüberlauf; Anmeldeknopf sichtbar. Alle neun mobilen Navigationsziele per Tastatur aktiviert.
- Beide bestehenden Dialoge bei 320 und 1440 Pixeln: Öffnen, sinnvoller Fokus, Tab/Shift+Tab innerhalb des Dialogs, Escape, Rückkehr zum Auslöser und Schliessen per Maus bestanden.
- ICS für 2026 und 2027 tatsächlich heruntergeladen und bytegenau mit dem vorgesehenen Export abgeglichen. Die drei Standard-PDFs tatsächlich heruntergeladen und SHA256 gegen die PR-3-Dateien geprüft. Der Browser begrenzte einen unmittelbar zweiten Download; nach normalem Neuladen gelang auch der 2026-Download.
- Echte Formulareinbettung und Direktzugang im Browser erreichbar; keine Eingaben oder Übermittlung. Keine Website-Konsolenfehler beobachtet. Formular- und Preisabschnitt sowie die bisherigen Inline-Skripte sind bytegleich mit PR #3.
- Unabhängiger Subagent-Review von vollständigem Diff, Daten/JS/CSS und Vorschaugenerator; Dokumentverifier erneut bestanden. Hinweise zu Datenquelle der ICS-Beschreibung, unnötigen Live-Ansagen und der Generator-Pfadprüfung wurden umgesetzt.
- Keine CI-Workflowtests im Repository vorhanden. Keine Tests auf realer Smartphone-Hardware, Safari, Firefox oder mit Screenreader; kein Import in reale Kalenderprogramme. Externer Formularversand und Speicherung ausdrücklich nicht getestet.

Kein Merge nach main und keine Live-Veröffentlichung sind Teil dieses Auftrags.
