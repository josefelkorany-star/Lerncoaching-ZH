# KI-Coach – Originalbasis und korrigierte Arbeitsfassung

Branch `codex/ki-coach-claude-original-20261117`, bestehender Entwurfs-PR #8. Der vollständige Coach bleibt erhalten; kein eingeschränkter Teampilot.

## Zwei getrennte Fassungen

- `original/`: genau die vier Dateien aus dem gelieferten Claude-ZIP, bytegenau unverändert. `original-sha256.json`, Git-Attribute und fünf Erhaltungsprüfungen sichern den Originalstand.
- `working/`: korrigierte Laufzeitdateien `coach.html` und `Code.gs`. Die drei bisherigen Korrekturen bleiben erhalten. Die Fortsetzung ab `2bc0748` ergänzt ausschliesslich gesperrte Sitzungswiederherstellung bis zur Serverbestätigung und Codeersatz mit erhaltenem Verbrauch. Die beiden Originalunterlagen bleiben Referenzen; sie sind keine aktualisierte Betriebsanleitung oder Freigabe.

## Private Vorschau

`node _ki-coach/preview/server.mjs --port 4194` startet ausschliesslich einen lokalen Server. Kein Browser wird geöffnet. Unter `http://127.0.0.1:4194/` erklärt die Startseite die Korrekturen. `/coach.html` liefert exakt die Arbeitsfassung, `/original/coach.html` das unveränderte Original zum Vergleich. Die Adresse ist nur auf diesem Rechner erreichbar; sie ist keine Cloud-Browser-Sitzung.

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

Tests mit Node 24: `node --test _ki-coach/tests/*.test.mjs`. Die DOM-Prüfungen verwenden die vorhandene Linkedom-Testinstallation im Arbeitsbereich. Alternativ `COACH_DEPENDENCY_ROOT` auf einen Ordner mit `package.json` und installiertem Linkedom setzen. Keine neue Produktionsabhängigkeit.

Die Originaltests mit `FINDING` bzw. `Known defect` reproduzieren weiterhin absichtlich Originalfehler. Die neuen `working-*`-Prüfungen testen die Korrekturen positiv und getrennt. Eine gemeinsame grüne Gesamtausgabe bedeutet keine fehlerfreie Originalversion und keine Google-/Claude-/Browserabnahme.

## Keine Freischaltung

Der aktuelle Folgeauftrag erlaubt allein die geprüfte Codeübertragung in den unveröffentlichten HEAD des vorhandenen Coach-Projekts, nach eindeutiger Projekt-/Tabellenzuordnung, Sicherung und exaktem Zurücklesen. Den tatsächlichen Übertragungsnachweis nennt der aktuelle Prüfbericht. Keine Einrichtung, Funktionsausführung, Version, Bereitstellung oder bezahlte Anfrage. Google-Projektkennungen, Sicherungen und Zugangsdaten bleiben ausserhalb des Repositorys.

Anmeldeformular, Portal, Website/PDFs, main und PR #5–#7 sowie PR #9 werden in diesem Auftrag nicht bearbeitet. Kein Merge, keine Veröffentlichung. Browserarbeit weiterhin ausschliesslich in einem nachweislich isolierten kostenlosen Cloud-Browser; kein persönlicher Browser.
