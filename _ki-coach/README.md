# KI-Coach – Originalbasis und korrigierte Arbeitsfassung

Branch `codex/ki-coach-claude-original-20261117`, bestehender Entwurfs-PR #8. Der vollständige Coach bleibt erhalten; kein eingeschränkter Teampilot.

## Zwei getrennte Fassungen

- `original/`: genau die vier Dateien aus dem gelieferten Claude-ZIP, bytegenau unverändert. `original-sha256.json`, Git-Attribute und fünf Erhaltungsprüfungen sichern den Originalstand.
- `working/`: korrigierte Laufzeitdateien `coach.html` und `Code.gs`. Der ausdrückliche Folgeauftrag umfasst Sitzungsgrenzen, verbindliche Kontingent-/Budgetreservierungen samt Wiederholungsschutz und nachgewiesene Meldungsspeicherung mit Literaltexten in Sheets. Die beiden Originalunterlagen bleiben Referenzen; sie sind keine aktualisierte Betriebsanleitung oder Freigabe.

## Private Vorschau

`node _ki-coach/preview/server.mjs --port 4193` startet ausschliesslich einen lokalen Server. Kein Browser wird geöffnet. Unter `http://127.0.0.1:4193/` erklärt die Startseite die Korrekturen. `/coach.html` liefert exakt die Arbeitsfassung, `/original/coach.html` das unveränderte Original zum Vergleich.

`DEMO` öffnet den Schüler-, `DEMO-LP` den Lehrpersonenmodus. Beide liefern feste Beispielantworten, keine echte KI. Google Fonts bleiben wie im Original extern. Backend-Aufrufe sind im privaten Server zusätzlich gesperrt. Ausschliesslich erfundene Eingaben verwenden. Budgetreservierung und Sheets-Speicherung werden getrennt mit nachgebildeten Diensten getestet, nicht durch die reine Demo bewiesen.

## Nachweise

- [Aktuelle Korrekturen und offene Punkte](review/KORREKTUREN.md)
- [Arbeitsfassung Backend](review/ARBEITSFASSUNG-BACKEND.md)
- [Arbeitsfassung Frontend](review/ARBEITSFASSUNG-FRONTEND.md)
- [Ursprüngliche Bestandsprüfung](review/ERGEBNIS.md) mit getrennten Originalbefunden und Anbieterquellen

Tests mit Node 24: `node --test _ki-coach/tests/*.test.mjs`. Die DOM-Prüfungen verwenden die vorhandene Linkedom-Testinstallation im Arbeitsbereich. Alternativ `COACH_DEPENDENCY_ROOT` auf einen Ordner mit `package.json` und installiertem Linkedom setzen. Keine neue Produktionsabhängigkeit.

Die Originaltests mit `FINDING` bzw. `Known defect` reproduzieren weiterhin absichtlich Originalfehler. Die neuen `working-*`-Prüfungen testen die Korrekturen positiv und getrennt. Eine gemeinsame grüne Gesamtausgabe bedeutet keine fehlerfreie Originalversion und keine Google-/Claude-/Browserabnahme.

## Keine Freischaltung

In dieser Fortsetzung keine Google-Anmeldung oder Google-Schreibzugriffe, keine Einrichtung, kein Deployment, kein API-Schlüssel und keine kostenpflichtigen Aufrufe. Die zuvor gesicherte Originalkopie im eigenen Google-Projekt wird durch diese Arbeit nicht verändert. Die korrigierte Arbeitsfassung wurde dort nicht übertragen. Die vorhandene private Projektzuordnung und Sicherung bleiben erhalten.

Anmeldeformular, Portal, Website/PDFs, main und PR #5–#7 bleiben unverändert. Kein Merge, keine Veröffentlichung. Browserarbeit weiterhin ausschliesslich in einem nachweislich isolierten Cloud-Browser; kein persönlicher Browser und kein kostenpflichtiger Browsertest.
