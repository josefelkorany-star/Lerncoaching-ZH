# Original-Frontend: Prüfung vom 17.11.2026

Geprüft wurde ausschliesslich die unveränderte Datei `original/coach.html`. Keine Funktion, Rolle, Grenze, Oberfläche oder Textstelle wurde korrigiert. Die beigefügte Anleitung ist eine Referenz, kein zusätzlicher Auftrag zur Veröffentlichung oder Website-/Vertragsänderung. Ihre früheren Testbehauptungen sind kein Nachweis dieses Prüflaufs.

## Tatsächlich ausgeführt

`node --test _ki-coach/tests/ui-original.test.mjs` führt den Original-Inlineskriptcode in Node mit Linkedom aus. Das Testprogramm hängt ausschliesslich im Speicher einen Zugriff auf bestehende Funktionen und Zustand an; die Originaldatei wird weder umgeschrieben noch ersetzt. DOM, Speicher, Timer, Bild-/Canvasoperationen und gegebenenfalls Serverantworten sind kontrollierte Testnachbildungen. Jeder Test nutzt erfundene Inhalte. Es gab keinen Onlineaufruf, keine echte Anmeldung, keine E-Mail und keinen Claude-Aufruf.

**18 von 18 Beobachtungsprüfungen liefen erfolgreich durch: 11 positive Verhaltensprüfungen und 7 ausdrücklich bezeichnete Reproduktionen vorhandener Fehler.** Das bedeutet nicht, dass 18 Produktfunktionen fehlerfrei oder die Originalversion betriebsbereit sind.

Positiv nachvollzogen:

- Das Originalskript ist syntaktisch gültig. Leere `API_URL` aktiviert die ausdrücklich beschriftete Demo; kein Serverzugriff erfolgt.
- `DEMO` zeigt den Schülermodus mit Tipps und Leitfragen, `DEMO-LP` den Lehrpersonenmodus samt Unterrichtsvorbereitung, Elternkommunikation und Kopieren. Antworten sind feste Beispiele, keine KI.
- Code-Normalisierung, Fachwahl, getrennte Chats, erneutes Öffnen und zweistufiges Löschen funktionieren in der DOM-Nachbildung.
- Speicherwahl nach der Option «angemeldet bleiben», unterschiedliche Chatablagen für die zwei Democodes sowie Abmelden mit Löschen wurden ausgeführt. Bildbytes/Vorschaubilder werden nicht in die gespeicherte Chatliste geschrieben.
- Nachrichten und Titel werden als Text ausgegeben; die geprüften HTML-/Markdown-Eingaben erzeugen keine Skripte oder eingeschleusten Elemente.
- Die simulierte Serveranfrage enthält Code, Fach und Nachrichtenverlauf. Bei Lehrpersonen wird der Kopierknopf angezeigt.
- Bildformatprüfung und Berechnung der JPEG-/Thumbnailabmessungen wurden mit künstlichem Image/Canvas nachvollzogen. Dies ist **kein** Test echter Fotodateien, EXIF-Ausrichtung, HEIC, Kamerazugriff oder Bildqualität.
- Dialog-Fokussetzen, Escape, Fokusrückgabe und Zustandswechsel des mobilen Menüs funktionieren als DOM-Ereignisse.
- CSS enthält Umschaltpunkte bei 860 und 420 Pixeln, flexible Inhaltsbreiten und eine mobile Seitenleiste. Das ist nur ein Quellenbefund, kein gemessener Layoutnachweis.

## Konkrete Fehler im erhaltenen Original

### 1. Angaben einer vorherigen Sitzung bleiben nach Codewechsel erhalten

**Fundstellen:** `coach.html` Zeilen 615–624 und 753–774; zusätzlich die Liveausgabe in Zeile 281/765.

**Reproduktion A:** Im Schülermodus einen ungesendeten Text eingeben, abmelden und mit dem Lehrpersonencode anmelden. Der vorherige Text steht weiterhin im Eingabefeld.

**Reproduktion B:** Person A sendet eine Frage, meldet sich während der Antwort ab; Person B meldet sich an. Die verspätete Antwort von A überschreibt anschliessend B's Verbrauchsanzeige und gespeicherten Verbrauch. A's Antwort wird ausserdem in die zugängliche Liveausgabe `#ansage` geschrieben. Reproduziert mit einer kontrolliert verzögerten Antwort: Lehrperson B erhält danach das Schülerbudget von 3 statt 10 USD. Das ist kein Google-/Claude-Test und keine echte personenbezogene Information.

**Vorschlag:** Beim Abmelden Eingabe, Liveausgabe, letztes Anfrageobjekt und laufende Bildverarbeitung verwerfen. Jede Anmeldung erhält eine eigene Generationskennung; Antworten und Bildrückläufe dürfen nur die passende aktive Sitzung verändern. Laufende Netzaufrufe zusätzlich abbrechen. Änderungen nur nach ausdrücklicher Freigabe, nicht in den Originaldateien dieses Auftrags.

### 2. Eine neue Meldung kann fälschlich als angekommen erscheinen

**Fundstellen:** `coach.html` Zeilen 917–931; `Code (1).gs` Zeilen 205–217.

**Reproduktion:** Der Client erhält `{ok:false,fehler:'SCHNELL'}` für eine Meldung. Er markiert die Antwort trotzdem lokal als gemeldet und zeigt «Deine Meldung ist angekommen». Der Server begrenzt Meldungen zehn Sekunden lang nur je Person; eine andere Antwort innerhalb dieses Fensters wird somit gar nicht separat gespeichert. Eine pauschale Rate-Limit-Antwort ist kein Nachweis derselben bereits gespeicherten Meldung.

**Vorschlag:** Eindeutige Meldungskennung und Bestätigung derselben Meldung verwenden. Bei einem blossen Rate Limit darf keine neue Meldung als gespeichert markiert werden; stattdessen Wartehinweis und erneuter Versuch.

### 3. Das Aufgabenfoto fehlt in Folgefragen desselben Chats

**Fundstellen:** `coach.html` Zeilen 724–749; `Code (1).gs` Zeilen 172–184 und 282–290.

**Reproduktion:** Zuerst eine Frage mit Bild senden, anschliessend «Ich meine Aufgabe zwei auf dem Foto». Nur die erste Anfrage enthält Bilddaten. Die zweite enthält `bild:null` und im früheren Nachrichtentext lediglich `[Foto gesendet]`. Der Server sendet den gelieferten Verlauf jeweils als neue Anfrage; die frühere Bildquelle ist darin nicht mehr enthalten. Eine textliche Zusammenfassung in einer früheren Antwort kann zufällig helfen, ersetzt aber das Foto nicht zuverlässig.

**Vorschlag:** Nach einer freigegebenen Architekturentscheidung das für den aktuellen Chat relevante Bild auch bei Folgefragen mitgeben oder einen ausdrücklich entworfenen Bild-/Extraktionskontext verwenden. Dabei bestehende Datenminimierung, Löschverhalten und Kosten sichtbar abwägen; keine stille Speicherung oder neue Limits einführen.

### 4. Dialoge halten den Tastaturfokus nicht fest

**Fundstellen:** `coach.html` Zeilen 831–841 und 987–992.

**Reproduktion:** Datenschutzdialog öffnen. Fokus landet auf «Schliessen», Escape und Rückgabe funktionieren. Tab wird jedoch nicht behandelt; der Hintergrund wird weder inaktiv noch aus dem Fokusweg genommen. Die DOM-Prüfung zeigt, dass der Hintergrund bei geöffnetem `aria-modal` fokussierbar bleibt. Die reale Tastaturfolge muss zusätzlich im isolierten Browser geprüft werden.

**Vorschlag:** Sichtbare fokussierbare Dialogelemente ermitteln, Tab/Shift+Tab begrenzen und den Hintergrund während des Dialogs inaktiv setzen; vorhandene Maus-/Touchbedienung und Fokusrückgabe erhalten.

### 5. Gespeicherte Sitzung wird vor der aktuellen Codeprüfung geöffnet

**Fundstelle:** `coach.html` Zeilen 1009–1021.

**Reproduktion:** Im Testspeicher liegt eine frühere Sitzung mit inzwischen ungültigem Code. Schon vor der asynchronen Antwort öffnet `anmelden(...)` die Chatansicht aus dem Speicher. Bei einem Netzfehler bleibt sie geöffnet; der Fehler wird ignoriert. Das ist **kein** Nachweis eines serverseitigen Claude-Zugriffsbypasses: Der Server prüft den Code bei Anfragen erneut. Es betrifft die lokale Sichtbarkeit gespeicherter Inhalte und die Darstellung eines bereits widerrufenen Zugangs.

**Vorschlag:** Erst Code prüfen, dann gespeicherte private Chatansicht öffnen; einen gegebenenfalls gewünschten Offlinezugriff ausdrücklich entscheiden statt ungeprüft voraussetzen.

### 6. Geänderte Rolle wird nach dem Nachladen nicht vollständig angezeigt

**Fundstelle:** `coach.html` Zeilen 1012–1017, abhängig von `anmelden(...)` Zeilen 599–612.

**Reproduktion:** Zwischengespeicherte Sitzung behauptet «Lehrperson», aktuelle Loginantwort liefert «Schüler». Der interne Zustand wird korrigiert, die Lehrpersonen-Fachknöpfe, der Rollenhinweis und Teile der anfänglichen Ansicht bleiben jedoch stehen. Die serverseitige Rolle wird aus dem Sheet abgeleitet; eine Berechtigungseskalation wurde hier nicht nachgewiesen.

**Vorschlag:** Nach bestätigter Rollen-/Stufenänderung die gesamte rollenabhängige Ansicht und den passenden Entwurf konsistent neu aufbauen. Lokale Eingaben dabei nicht ungefragt einer anderen Rolle/Sitzung zuordnen.

## Vorschau und externe Einbindungen

- Originalzeile 396 enthält `API_URL: ''`. Die fertige lokale Demo benötigt deshalb keine Konfigurationsänderung und keinen API-Key.
- `logo.png` wird relativ geladen; bei fehlendem Logo greift ein Textfallback. Für die Vorschau kann das bestehende Website-Logo als getrennte Zusatzdatei bereitliegen, ohne `coach.html` zu verändern.
- Die unveränderte Datei lädt Google Fonts von `fonts.googleapis.com` und `fonts.gstatic.com` (Zeilen 9–11). Diese Einbindung ist keine lokal geladene Schrift. Eine etwaige Sperre durch Vorschau-HTTP-Header ist als solche zu erklären; sie wäre kein Original-Layoutnachweis.
- Der Link zur bestehenden öffentlichen Website bleibt im Original vorhanden. Er ist keine Coach-Veröffentlichung.
- Fachchats und Meldungsanzeige sind in der Demo ausprobierbar. Sheets-Verwaltung und tatsächliche Meldungszustellung sind es dort nicht.

## Ausdrücklich nicht geprüft

Kein Browser wurde gestartet, gelesen oder gesteuert. Es gab keine persönliche Browsersitzung und keinen kostenpflichtigen Cloud-Browsertest. Layout bei 320/375/768/1024/1440 Pixeln sowie 859/861 Pixeln, native Fokusfolge, Safari, Kamera/Dateiauswahl, tatsächliche Bildverarbeitung, Zwischenablage, Bildschirmleser und Konsolenverhalten bleiben offen. Google-Fetch/CORS/Weiterleitungen, echte Codes/Sperren, reale Sheets-Werte, E-Mails und Claude-Antwortqualität müssen später am getrennten freigegebenen Projekt geprüft werden. Die beigefügten Behauptungen früherer Chromium-/WebKit-Tests wurden nicht übernommen.
