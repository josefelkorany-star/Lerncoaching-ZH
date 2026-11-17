# KI-Coach – unveränderte Claude-Originalbasis

Private Vorbereitung, 17.11.2026. Branch `codex/ki-coach-claude-original-20261117`, Ausgangspunkt `main` (`49635cee41ffb4ea40ea2a10ec28e4fe852bf316`). Der vollständige Originalumfang ersetzt den früheren eingeschränkten Teampiloten. Keine Funktion, Rolle, Grenze und kein Originaltext wurde geändert.

`original/` enthält exakt die vier Dateien aus `Lerncoaching_ZH_KI_Coach_Claude_Original.zip`. `original-sha256.json` und die Erhaltungstests sichern die bytegenaue Übernahme. Die Anleitungen bleiben Originalreferenzen; ihre späteren Veröffentlichungsaufträge und früheren Testbehauptungen wurden nicht als zusätzliche Freigabe oder eigene Testergebnisse übernommen.

## Ansicht

Vom Repository aus `node _ki-coach/preview/server.mjs --port 4192` starten. Die private Startseite liegt unter `http://127.0.0.1:4192/`, die unveränderte Originalansicht unter `/coach.html`. Es wird kein Browser automatisch geöffnet. Für die Ansicht wird ausschliesslich das vorhandene Website-Logo zusätzlich ausgeliefert.

Die Originaldemo verwendet `DEMO` und `DEMO-LP`, weil ihre `API_URL` leer ist. Antworten sind fest vorgegeben. Der Vorschauserver erlaubt zusätzlich keine Backend-Verbindung; Google Fonts bleiben wie im Original erlaubt. Die lokalen gespeicherten Chats sind keine zentrale Kontenverwaltung. Bitte ausschliesslich erfundene Eingaben verwenden.

## Prüfung und tatsächlicher Einrichtungsstand

- [Zusammenfassung und nächster Schritt](review/ERGEBNIS.md)
- [Backend: Funktionen, reproduzierte Fehler und Vorschläge](review/BACKEND.md)
- [Frontend: Bedienung, Sitzungsfehler und Prüfgrenzen](review/FRONTEND.md)
- [Anbieterquellen, Preise und Google-Projektaufbau](review/ANBIETER-UND-EINRICHTUNG.md)

Tests mit Node 24: `node --test _ki-coach/tests/*.test.mjs`. Die DOM-Prüfungen benötigen Linkedom als reine Testabhängigkeit; im bestehenden Arbeitsbereich wird die vorhandene Installation genutzt. Alternativ `COACH_DEPENDENCY_ROOT` auf einen Ordner mit `package.json` und installiertem `linkedom` setzen. Keine neue Produktionsabhängigkeit.

Die Tests mit `FINDING` bestehen gerade dann, wenn der dokumentierte Originalfehler reproduziert wird. Eine vollständig grüne Testausgabe ist ausdrücklich keine Freigabe für Kinder oder einen Livebetrieb. Google-/Claude-Integration, reale Fotoerkennung und echte Cloud-Browser-Darstellung bleiben offen.

Ein eigenes leeres Coach-Sheet und das daran gebundene Apps-Script-Projekt wurden über bestehende Autorisierung vorbereitet. Nur der unveränderte Servercode und ein separates Manifest mit `Europe/Zurich`/V8 wurden hochgeladen und zurückgelesen. Es gibt keine öffentliche Web-App, keine Projektversion, keinen Schlüssel und keine Funktionsausführung. IDs, Zuordnung, vor-/nachher gesicherter Projektstand und clasp-Konfiguration liegen ausschliesslich im privaten Arbeitsordner.

Anmeldeformular, Portal, Website, PDFs, PR #5–#7 und main bleiben unverändert. Kein Merge und keine Veröffentlichung. Die Original-Elterninformation ist hier eine Prüfquelle und wurde nicht als freigegebener Website-Download eingebunden.
