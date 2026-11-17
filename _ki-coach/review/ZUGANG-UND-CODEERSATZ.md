# KI-Coach: gemeinsame Geräte und Codeersatz

Stand 17.11.2026, Fortsetzung von `2bc0748` im bestehenden Entwurfs-PR #8. Nur die zwei freigegebenen Zugangskorrekturen. Die drei vorherigen Korrekturen bleiben erhalten; die vier Originaldateien sind bytegleich. Keine Übernahme von PR #9, keine Bearbeitung von Website, PDFs, Anmeldeformular, Portal oder PR #5–#7.

## Änderungen

- Gespeicherte Sitzungen werden vor der ersten Anzeige beim Server geprüft. Vorher bleiben persönliche Namen, Rollen, Chattexte und Chattitel aus DOM und Anwendungszustand entfernt; die Chatablage wird noch nicht gelesen. Abgelehnte, unvollständige, ausgebliebene oder fehlgeschlagene Antworten entsperren nichts. Ein erneuter manueller Versuch bleibt möglich. Nach Bestätigung wird die vollständige Rollenansicht mit aktuellen Serverdaten aufgebaut. Auch Rückkehr aus dem Seitencache fordert eine neue Bestätigung; verspätete alte Antworten bleiben wirkungslos.
- Der erste Codehash wird als dauerhafte Verbrauchs-ID in der Zugangszeile gesichert. Ein Ersatzcode ändert nur den Zugang, nicht die Zählerkennung. Bestehende Properties-Zähler, Journalvorgänge, Reservierungen, Wiederholungsbelege und Menütest-Zuordnung bleiben erhalten. Alte Codehashes bleiben gegen Wiedervergabe reserviert. Doppelte/inkonsistente Kennungen oder ungesicherte manuelle Codeänderungen sperren den Zugang zur Prüfung.
- Neues Verwaltungsmenü «Persönlichen Code ersetzen»: bisherigen Code eingeben, alten Code vorher nicht löschen. Technische Spalten «Verbrauchs-ID» und «Codehistorie» mit der vollständigen Zeile erhalten und mitsortieren. Die Historie enthält Hashes, keine alten Klartextcodes. Teilweise fehlgeschlagene Schreibvorgänge dürfen keinen neuen freien Zähler erzeugen. Eine alte, vorab geleerte Codezelle ohne ID braucht eine ausdrückliche Wiederzuordnung; nur eine tatsächlich neue Person darf als neu bestätigt werden.

Schüler-/Lehrpersonenmodus, Fachchats, Originalgestaltung, Lernanweisungen, Modelle, Preise, Limits und Fotoauswahl für die erste Frage bleiben erhalten. Keine Foto-Folgefragen, Erkennung oder erneuter Bildversand. Lokale Chatdaten werden bei Codeersatz nicht gelöscht, bleiben aber wie bisher an den bisherigen Code gebunden; eine automatische Chatübertragung auf den Ersatzcode ist nicht Bestandteil dieser Änderung.

## Prüfungen

111 positive Prüfungen der Arbeitsfassung bestanden: 32 bestehende Backend-, 22 bestehende UI-, 7 bestehende UI/Backend-, 2 Einstellungs-/Promptprüfungen sowie 27 Codeersatz-, 17 gemeinsame-Geräte-, 3 neue UI/Backend- und 1 reine Testkostenberechnung. Zusätzlich 5 Originalerhaltungsprüfungen und 1 HTTP-Vorschauprüfung bestanden; insgesamt 117 relevante Prüfungen. Der erste HTTP-Versuch wurde von der lokalen Netzwerkbeschränkung blockiert; die gezielte Wiederholung mit erlaubtem Loopback-Zugriff bestand. Der unabhängige Schlussreview bestätigte denselben Stand und zwei weitere eigene synthetische Abläufe ohne blockierenden Befund. Zusätzlich direkter SHA-256-Abgleich aller vier Originaldateien mit dem gelieferten ZIP und vollständiger Diffcheck.

Geprüfte Sonderfälle: teilweise verbrauchte Altzähler plus vorhandenes Journal, ausgeschöpfter Tag und Monat nach Ersatz, offener/unklarer Vorgang, Cacheverlust, Wiederholung ohne zweite Belastung, Codeersatz während Antwort, Meldungsbestätigung, Sperrung, Sortieren, konkurrierende Sperre, doppelte Kennungen und Fehler zwischen Identitäts- und Code-Schreibvorgang. Oberflächenprüfung umfasst verzögerte/abgelehnte/offline Bestätigung, lokalen und Sitzungsspeicher, beide Rollenwechsel und Seitencache-Ereignisse.

Alle Google-, Claude-, Speicher-, Mail- und Zeitdienste dieser Tests sind nachgebildet; Testpersonen und Aufgaben sind erfunden. Kein echter Claude-Aufruf. `einrichten()` läuft ausschliesslich in den bereits bestehenden isolierten Testnachbildungen, niemals im Google-Projekt. Die Kostenplanprüfung führt auch lokal keine Einrichtung aus.

Die separate Originalsuite enthält 47 Beobachtungen, darunter 16 absichtliche Originalfehler-Reproduktionen. Eine grüne Originalsuite bedeutet ausdrücklich keine fehlerfreie Originalversion. Keine CI-Bestehensbehauptung.

Echte Subagents: getrennte Frontendumsetzung für gemeinsame Geräte, getrennte Backendumsetzung für Codeersatz sowie unabhängiger Schlussreview von Code, Tests und engem Google-Übertragungsweg. Hauptagent ergänzt die drei integrierten Abläufe, Kostenplan, Gesamtlauf, Original-/Paketvergleich und GitHub-/Google-Nachweise.

## Private Vorschau

`node _ki-coach/preview/server.mjs --port 4194`, dann `http://127.0.0.1:4194/`. Kein Browser wird automatisch geöffnet. `/coach.html` liefert exakt den vorgesehenen HTML-Code; `/original/coach.html` das unveränderte Original. `DEMO` und `DEMO-LP` liefern feste Beispielantworten. Eine gespeicherte Demo-Sitzung kann neu geöffnet werden, ihre Bestätigung ist aber nur nachgebildet. Codeersatz und Verbrauch sind durch die Tests belegt, nicht durch eine angebliche Google-Demo.

Kein kostenloser isolierter Cloud-Browser mit geeigneter bereitgestellter Testsitzung wurde verwendet. Keine echten Browser-/Layout-/Tastatur-/BFCache-Prüfungen. Die DOM- und HTTP-Prüfungen sind dafür kein Ersatz. Kein persönlicher Browser wurde geöffnet, ausgelesen oder gesteuert. Die lokale Vorschau ist keine Cloud-Browsersitzung.

## Google-Stand und erster echter Test

Das bestehende eigene Coach-Projekt wurde per vorhandener API-Autorisierung eindeutig seiner eigenen Coach-Tabelle und dem Eigentümer zugeordnet. Der vorgefundene unveröffentlichte Code, das Manifest und der Versions-/Bereitstellungsstand sind privat gesichert. Die Tabelle enthält weiterhin nur das bisherige leere Einrichtungsblatt; kein Initialisierungsauftrag wurde ausgeführt. Projektkennungen und Sicherungen stehen ausschliesslich im privaten Arbeitsordner.

Übertragung am 17.11.2026 um 13:15 UTC erfolgreich: ausschliesslich der geprüfte `working/Code.gs` in HEAD. Unmittelbar vorher wurden Projekt/Parent-Tabelle/Eigentümer und Veröffentlichungsstand nochmals geprüft und ein frischer vollständiger Sicherungsstand geschrieben. Danach wurde der vollständige Code erneut aus Google gelesen und exakt verglichen. SHA-256: `e0efc4522206dba1c7063056c0d4d0d35f4cf4feb5216f1fedff187e72404b79`. Manifest unverändert; weiterhin null Versionen und null Web-App-Endpunkte. Keine Funktion, Einrichtung oder Claude-Anfrage ausgeführt. Dies ist eine Codeübertragung, keine erfolgreiche Google-Laufzeitprüfung und kein Deployment. Private Nachweise: `upload-result.json`, `post-upload.json` und `pre-upload-*`; sie werden nicht ins Repository aufgenommen.

[ERSTER-TEXTTEST.json](ERSTER-TEXTTEST.json) legt genau eine erfundene Mathematikfrage ohne Foto und ohne bisherigen Verlauf fest. Unverändertes Schülermodell `claude-sonnet-5-5`, höchstens 900 Ausgabetokens, kalkulierte Eingabereserve 7’995 Tokens. Berechnete Reservierung 0.02499 USD, vorgesehene Obergrenze gerundet **0.025 USD für genau einen Aufruf**. Kein automatisches Wiederholen; bei unklarem Ausgang keinen neuen Vorgang starten. Das ist die Software-Reserve der vorhandenen Preiskonfiguration, keine live bestätigte Garantie einer Anbieterrechnung. Modellzugang und tatsächliche Abrechnung sind noch nicht getestet.

Nächster eigener Schritt des Nutzers: einen passenden Claude-API-Schlüssel direkt im bestehenden Coach-Projekt unter den Script Properties als `ANTHROPIC_API_KEY` hinterlegen, sofern dort noch keiner eingerichtet ist; niemals im Chat oder Repository. Tabellen-Ersteinrichtung, fiktiver Testzugang und tatsächlicher Test bleiben getrennt vorzubereiten/freizugeben. Jetzt weder `einrichten()` noch «Verbindung testen» ausführen. Kein Schlüssel wurde hierfür gelesen, erzeugt oder geprüft.

## Verbleibende Grenzen

Google-Laufzeit, echte gleichzeitige Ausführungen/Locks, Sheets-Literaltexte, Trigger, Mail und Claude-Verhalten bleiben getrennte Integrationstests. Der HEAD-Code allein macht den Coach nicht betriebsbereit. Dialog-Fokusfang, kombinierte Nachrichtenlänge, vollständige Bildvalidierung, Warnmeldungen nach fehlgeschlagenem Modellaufruf und Anbieter-/Richtlinienabgleich bleiben die früher dokumentierten separaten Befunde. Foto-Folgefragen und «Fotos als Text» wurden nicht umgesetzt.
