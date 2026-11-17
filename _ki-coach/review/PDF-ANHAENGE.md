# PDFs und Anhänge – 17.11.2026

Basis: aktueller main-Stand `1ba2ebd` (PR #16). Root-Coach zuerst in die Arbeitsfassung übernommen; Eingabefeld, Einfügen/Hineinziehen, Rollen, Fachchats, bestehende Limits und vier Originaldateien erhalten. Die bereits geprüfte Server-Arbeitsfassung entspricht dem vor Änderung gesicherten Coach-v1-Code. Historische `_ki-coach/review/`-Berichte bleiben als frühere Nachweise erhalten.

## Verhalten

- Ein PDF bis 3.5 MiB und 20 Seiten oder bis fünf Fotos pro Nachricht. Auswahl, Zwischenablage und Drag-and-drop verwenden dieselbe Prüfung.
- PDFs werden im Browser mit lokaler, gepinnter pdf-lib normalisiert. Verschlüsselte/ungültige Dateien werden abgelehnt. Der Server prüft unabhängig XRef, Root und tatsächlichen Seitenbaum. Keine reine `/Count`- oder Clientangabe.
- Claude erhält einen `document`-Block (`application/pdf`); kein Rasterisieren oder OCR-Ersatz. Original und normalisierte Dateigrösse werden geprüft.
- Kostenlose `count_tokens`-Anfrage vor dem bezahlten Aufruf. Mehr als 60’000 Eingabe-Tokens bei PDF wird freundlich abgewiesen. Tokenzählung ist laut Anbieter eine Schätzung: Reserve plus mindestens 32 Tokens bzw. 2 Prozent, kalter Cache (1.25×) und maximale Ausgabe. Unter Lock werden Zugangsstatus, Rolle, Konfiguration, Tages- und Restbudgets erneut geprüft; doppelte Anfragekennungen lösen keinen zweiten bezahlten Aufruf aus.
- Der letzte Anhang bleibt je Chat ausschliesslich im Seitenspeicher. Folgefragen senden denselben Anhang am ursprünglichen Gesprächspunkt mit fünfminütigem `cache_control`-Präfix. Ein Cachetreffer hängt von Mindestlänge, identischem Präfix und Anbieter-TTL ab; keine garantierte Ersparnis nach Ablauf. Reload/Abmelden entfernt Anhangsdaten.
- Kein PDF-/Bild-Base64 in Sheets, Properties, Antwortcache, Browser-Speicher oder Fehlerprotokollen. Nachrichtentexte/Antworten folgen der bestehenden Protokollregel. API-Schlüssel und Testzugänge bleiben ausserhalb des Repositorys.

## Prüfungen vor Veröffentlichung

207 lokale Tests bestanden, darunter Original-Erhaltung, Rollen-/Sitzungs-/Codeersatzregressionen, 27 neue Frontend- und 16 neue Backend-Anhangsprüfungen. Getrennte Agenten verantworteten Frontend, Backend sowie unabhängigen API-/Schlussreview. Der Reviewer führte zusätzlich 30 unabhängige PDF-Manipulations-, Reservierungs- und Datenschutzproben aus; bisher kein Blocker.

Der Workflow `Coach – PDF and isolated cloud browser` prüft alle Regressionen und Chromium auf einem frischen Standard-Ubuntu-Runner im öffentlichen Repository. Breiten 320, 375, 390, 768, 1024, 1366 und 1440 Pixel; erfundene Antworten, keine echten Logins oder Modellaufrufe. Sein tatsächliches Ergebnis ist über den zugehörigen GitHub-Check einzusehen. Vor grünem Check kein Merge.

Der separate echte Abnahmetest erfolgt erst nach koordinierter Veröffentlichung, mit einem erfundenen einseitigen PDF und einer Folgefrage, maximal zwei bezahlten Aufrufen und insgesamt unter 0.10 USD. Keine automatischen Wiederholungen. Ergebnis und tatsächlicher Veröffentlichungsstand werden getrennt dokumentiert; diese Vorbereitung behauptet noch keinen erfolgreichen Live-Test.

## Anbietergrundlagen

- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/build-with-claude/pdf-support
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching

Sonnet/Opus 5.5: Cachelesen 0.05×; Haiku 5.5: 0.1×. Die gewählten Basistarife, Rollen und konfigurierten Kontingente bleiben unverändert.
