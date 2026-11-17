# Unabhängiger Schlussreview: Zugang und Codeersatz

Stand: 17. November 2026. Gezielter Review der zwei Folgekorrekturen ab `2bc0748` in PR #8. Der Reviewer hat weder Frontend noch Backend implementiert und keine Google-/Claude-Aufrufe ausgeführt.

## Ergebnis

Keine verbleibende blockierende Codeabweichung vom beauftragten Umfang gefunden. Die gemeinsame-Geräte-Sperre und der Codeersatz wurden anhand des tatsächlichen Arbeitscodes und mit erfundenen Daten unabhängig nachgeprüft. Das ist keine Freigabe für Merge, Einrichtung, Modellaufruf oder Deployment.

- Vor der bestätigten Anmeldung werden gespeicherte Namen und Chats weder angezeigt noch in den Anwendungszustand geladen. Ablehnung, Netzfehler, Zeitüberschreitung und unvollständige Antworten lassen die Ansicht gesperrt. Erst die aktuelle Serverrolle baut sämtliche Rollenbedienelemente auf.
- Der erste Codehash bleibt als feste Verbrauchs-ID erhalten. Das bewahrt die bisherigen Properties-, Journal-, Antwort-, Meldungs- und Menütest-Schlüssel; eine fehleranfällige Umschlüsselung oder doppelte Addition von Altverbrauch ist nicht erforderlich. Die neue Codezelle wird erst nach gesicherter Identität/Historie geschrieben. Ein bestätigter Ersatz macht den bisherigen Code ungültig.
- Rollen, Limits, Lernanweisungen, ursprüngliche Gestaltung, Fachchatfunktion und erste Fotoauswahl bleiben erhalten. Die vier Originaldateien wurden separat gegen ihre hinterlegten SHA-256-Werte geprüft.

Beim unabhängigen Erstlauf fiel ein Rest des zuletzt geöffneten Chattitels im versteckten DOM nach `pagehide` auf. Der zuständige Frontendagent hat Chattitel, Fachanzeige und Verbrauchs-Tooltip in die Bereinigung aufgenommen. Der verschärfte Test besteht im Schlusslauf. Ein zwischenzeitlicher HTTP-Fehler für den noch nicht fertig angelegten Prüfbericht verschwand nach dessen Fertigstellung; der Endpunkt wurde erneut geprüft.

## Tatsächlich ausgeführte Prüfungen

**117 von 117 relevanten Prüfungen bestanden**, aufgeteilt in 111 Arbeitsfassungsprüfungen, 5 Originalprüfungen und 1 HTTP-Vorschauprüfung:

| Prüfgruppe | Anzahl |
| --- | ---: |
| Bisherige Backend-Regressionsfälle | 32 |
| Neue Codeersatzfälle | 27 |
| Bisherige Oberflächenfälle | 22 |
| Neue Fälle für gemeinsame Geräte | 17 |
| Bisherige integrierte UI-/Backendfälle | 7 |
| Neue integrierte Zugangsfälle | 3 |
| Originale Einstellungen und Lernanweisungen | 2 |
| Reine Berechnung des vorbereiteten Texttests | 1 |
| Originaldateien und Originalordner | 5 |
| Lokaler HTTP-Vorschauserver und begrenzte Routen | 1 |

Ausgeführt wurden die Dateien `working-backend.test.mjs`, `code-replacement.test.mjs`, `working-ui.test.mjs`, `shared-device.test.mjs`, `working-integration.test.mjs`, `access-integration.test.mjs`, `working-preservation.test.mjs`, `first-text-plan.test.mjs`, `preservation.test.mjs` und `preview.test.mjs` unter `tests/`. Der kombinierte Lauf bestand zunächst 116 Fälle; die eingeschränkte Umgebung verweigerte den Loopback-Zugriff mit `EACCES`. Der HTTP-Fall wurde anschliessend einzeln mit erlaubtem lokalem Netzwerkzugriff bestanden. Dabei wurde kein Browser geöffnet und keine externe Website aufgerufen.

Zusätzlich führte der Reviewer zwei eigene, nicht in diese Anzahl eingerechnete Prüfabfolgen aus:

1. Teilverbrauch aus Altzählern von 38/40 Tagesnachrichten und 1.25 USD im Monat, ergänzt durch einen Journalvorgang: Nach Codeersatz blieb genau ein weiterer Tagesplatz frei, danach wurde gesperrt. Alter Code ungültig; Zeilensortierung änderte die Personenzuordnung nicht.
2. Unklarer Anfrageausgang, Codeersatz, Cacheverlust und neuer VM-Lauf: Reservierung blieb erhalten, erneute Prüfung erzeugte keinen zweiten Anbieteraufruf. Dieselbe Meldung blieb auch über einen weiteren Codeersatz hinweg genau einmal gespeichert und genau einmal benachrichtigt.

Alle dabei verwendeten Anbieter-, Tabellen- und Mailoperationen waren lokale Nachbildungen. Es gab **null echte Claude-Aufrufe**. Die bisherige Original-Fehlerbeobachtungssuite ist keine Aussage, dass die Originalversion fehlerfrei sei; sie ist nicht Teil dieser 117 Positivprüfungen. `git diff --check` war sauber.

Geprüfte Arbeitsdateien:

- `working/Code.gs`: SHA-256 `e0efc4522206dba1c7063056c0d4d0d35f4cf4feb5216f1fedff187e72404b79`
- `working/coach.html`: SHA-256 `5a6992e5beeb91cb8498da7df1cfa25744d6b9b1d8d5a49fe69099b81ea7fdbc`

## Prüfung des vorbereiteten Google-Übertragungswegs

Der private Uploadhelfer und sein vorhandener Autorisierungshelfer wurden nur gelesen. Der Uploadhelfer bindet sich an das bereits vorhandene Coach-Projekt und seine Coach-Tabelle; fremdes Projekt, fremder Besitzer, geändertes Manifest, unerwarteter Code, andere Dateien oder ein bereits veröffentlichter Stand führen zum Abbruch. Vor dem Schreiben werden aktuelle Projektmetadaten, Code, Manifest sowie Versions-/Bereitstellungsstand privat gesichert.

Die einzige vorgesehene externe Mutation ist das Ersetzen von `Code` über `PUT /content` im vorhandenen Projekt. Die Manifestquelle wird unverändert übernommen. Anschliessend vergleicht der Helfer Code und Manifest exakt durch Zurücklesen und fordert unveränderte Versionen/Bereitstellungen. Er erstellt weder Projekt noch Tabelle, führt keine Funktion aus und enthält keinen Setup-, Claude-, Versions- oder Deploymentaufruf. Die vorhandene Autorisierung wird ohne Browseröffnung verwendet; Zugangsdaten werden nicht ausgegeben.

Dieser Review bestätigt den geprüften Übertragungsweg, **nicht dessen Ausführung**. Den tatsächlichen Upload und Rücklesebeleg dokumentiert der Hauptagent separat. Private Projektkennungen, Sicherungen und Zugangsdaten gehören nicht in diesen Bericht oder den PR.

## Erster Texttest und offene Grenzen

Die vorbereitete Frage in `ERSTER-TEXTTEST.json` ergibt mit der unveränderten lokalen Preiskonfiguration eine Reserve von **0.02499 USD**: genau ein geplanter Aufruf, höchstens 900 Ausgabetokens, kalkulierte Eingabereserve 7’995 Tokens, kein Bild und kein vorheriger Verlauf. Der Plan nennt gerundet 0.025 USD. Der unabhängige Rechentest führt nur reine Funktionen aus, auch keine lokale Einrichtung. Tatsächliche Modellverfügbarkeit, Abrechnung und eine universelle Anbieter-Kostenobergrenze wurden damit nicht bestätigt.

Nicht ausgeführt: echter Browser-/Seitencache-/Layouttest, Google-Laufzeittest mit echten Locks und Sheets-Schreibvorgängen, Mail/Trigger oder Claude-Anfrage. Der Reviewer hat keinen persönlichen Browser verwendet. Die DOM-Nachbildung ist kein echter Browsernachweis.

Bestehende lokale Chats bleiben gespeichert, sind jedoch weiterhin an den bisherigen Code gebunden; ein Ersatzcode migriert diese Historie nicht automatisch. Technische Identitätsspalten müssen mit der ganzen Zugangszeile erhalten bleiben. Eine vorab manuell gelöschte/überschriebene Altzuordnung ohne belegten bisherigen Code lässt sich nicht zuverlässig aus Namen rekonstruieren. Diese Grenzen sind ausdrücklich dokumentiert. Frühere separate Befunde sowie Foto-Folgefragen, Erkennung und Richtlinienabgleich bleiben ausserhalb dieses Auftrags.
