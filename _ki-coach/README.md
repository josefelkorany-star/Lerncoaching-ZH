# KI-Coach – Originalbasis und korrigierte Arbeitsfassung

Aktueller Stand: PDF-/Anhangsauftrag auf `codex/ki-coach-pdf-20261117`, ausgehend von veröffentlichtem PR #16. Der vollständige Coach bleibt erhalten. Die nachstehenden älteren Prüfberichte dokumentieren die ursprünglichen Entwurfsphasen; sie sind kein aktueller Veröffentlichungsnachweis. Aktuelle Änderungen und Prüfung: [PDF und Anhänge](review/PDF-ANHAENGE.md).

## Zwei getrennte Fassungen

- `original/`: genau die vier Dateien aus dem gelieferten Claude-ZIP, bytegenau unverändert. `original-sha256.json`, Git-Attribute und fünf Erhaltungsprüfungen sichern den Originalstand.
- `working/`: korrigierte Laufzeitdateien `coach.html` und `Code.gs`. Die veröffentlichten Sitzungs-, Zugangs-, Verbrauchs- und Eingabekorrekturen bleiben erhalten. Root `coach.html` und `working/coach.html` sind identisch. Neu: PDF-Dokumentblöcke, bis fünf Fotos, kostenlose Tokenzählung vor Reservierung und kurzzeitiger Anhangskontext mit Prompt-Caching. Die Originalunterlagen bleiben historische Referenzen.

## Private Vorschau

`node _ki-coach/preview/server.mjs --port 4194` startet ausschliesslich einen lokalen Server. Kein Browser wird geöffnet. `/coach.html` liefert die Arbeitsfassung mit ausschliesslich in dieser privaten Antwort deaktivierter API, `/original/coach.html` das unveränderte Original zum Vergleich. Die Adresse ist nur auf diesem Rechner erreichbar; sie ist keine Cloud-Browser-Sitzung und darf nicht für automatisierte lokale Browserprüfungen verwendet werden.

`DEMO` öffnet den Schüler-, `DEMO-LP` den Lehrpersonenmodus. Beide liefern feste Beispielantworten, keine echte KI. Google Fonts bleiben wie im Original extern. Backend-Aufrufe sind im privaten Server zusätzlich gesperrt. Ausschliesslich erfundene Eingaben verwenden. Budgetreservierung und Sheets-Speicherung werden getrennt mit nachgebildeten Diensten getestet, nicht durch die reine Demo bewiesen.

## Nachweise

- [Aktuelle Zugangskorrekturen und Prüfnachweise](review/ZUGANG-UND-CODEERSATZ.md)
- [Gemeinsame Geräte](review/GEMEINSAME-GERAETE.md)
- [Codeersatz und Verbrauch](review/CODEERSATZ.md)
- [Unabhängiger Schlussreview](review/SCHLUSSREVIEW-ZUGANG.md)
- [Vorbereiteter erster Texttest, noch nicht ausgeführt](review/ERSTER-TEXTTEST.json)
- [Vorherige drei Korrekturen und übrige offene Punkte](review/KORREKTUREN.md)
- [Arbeitsfassung Backend](review/ARBEITSFASSUNG-BACKEND.md)
- [Arbeitsfassung Frontend](review/ARBEITSFASSUNG-FRONTEND.md)
- [Ursprüngliche Bestandsprüfung](review/ERGEBNIS.md) mit getrennten Originalbefunden und Anbieterquellen

Tests mit Node 24: `node --test _ki-coach/tests/*.test.mjs`. Die DOM-Prüfungen verwenden Linkedom; alternativ `COACH_DEPENDENCY_ROOT` auf einen Ordner mit `package.json` und Linkedom setzen. Die notwendige PDF-Normalisierung verwendet lokal vendorte pdf-lib 1.17.1 mit Lizenz und verifizierter Paket-Prüfsumme unter `assets/vendor/`. Kein Laufzeit-CDN und kein Frameworkwechsel.

Die Originaltests mit `FINDING` bzw. `Known defect` reproduzieren weiterhin absichtlich Originalfehler. Die neuen `working-*`-Prüfungen testen die Korrekturen positiv und getrennt. Eine gemeinsame grüne Gesamtausgabe bedeutet keine fehlerfreie Originalversion und keine Google-/Claude-/Browserabnahme.

## Veröffentlichung und Grenzen

Der PDF-/Anhangsauftrag ist ausdrücklich für Merge und Veröffentlichung am bestehenden Coach-Deployment freigegeben. Google-Zuordnung, Sicherungen und Testzugangsdaten bleiben privat ausserhalb des Repositorys. Das Anmeldeformular, Portal und die übrigen Website-/PDF-Inhalte bleiben unberührt. Die vier Originaldateien bleiben bytegleich. Keine Einrichtung und keine neuen Tabellen oder Deployments. Der echte Abnahmetest ist auf zwei erfundene Aufgabenaufrufe und zusammen weniger als 0.10 USD begrenzt. Browserprüfungen laufen ausschliesslich auf kostenlosen isolierten GitHub-Cloud-Runnern mit erfundenen Daten und abgefangenen Backendantworten.
