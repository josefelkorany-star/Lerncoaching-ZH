# Interessenanfrage – vorbereiteter Apps-Script-Kandidat

Stand 08.11.2026. **Dieser Kandidat ist nicht veröffentlicht.** Das tatsächliche Produktionsprojekt und sein bestehendes Deployment wurden inzwischen im Browser bestätigt; Head und aktive Version 10 wurden über die Oberfläche privat gesichert und sind in Quelle und Manifest identisch. Die mitgelieferte `Code.gs` bleibt eine davon abweichende Vergleichsquelle. Die existierende Tabelle und ihre zwölf Überschriften wurden nur gelesen; keine Bestandszeilen wurden gelesen, geändert oder gelöscht. Es gab keine Änderung an produktivem Skriptcode, Tabellendaten oder Deployment und keinen echten Formular- oder Mailversand.

## Was hier ausführbar ist

```powershell
node --test tests/requests.test.cjs
node preview/server.cjs
```

Die Vorschau unter `http://127.0.0.1:4175/` rendert `src/Index.html` mit derselben `src/Code.gs`-Logik. Google-Dienste sind dabei durch lokale Speicher- und Mail-Mocks ersetzt. Nur synthetische Testdaten verwenden. Ein Neustart oder die Schaltfläche zum Zurücksetzen entfernt ausschliesslich lokale Testdaten. Die Vorschau lässt Speicherfehler, unsichere Schreibantworten, verlorene Serverantworten, Mailfehler und eine belegte Sperre simulieren. Sie ist keine zweite produktive Web-App.

`src/` enthält die drei vorgesehenen Projektdateien; `tests/`, `preview/` und `maintenance/` gehören nicht ins Apps-Script-Projekt. Die `.claspignore` ist eine Positivliste für `Code.gs`, `Index.html` und `appsscript.json`. Vor einer tatsächlichen Übertragung muss die installierte CLI bestätigen, dass exakt diese drei Dateien vorgesehen sind.

## Tatsächlicher Zugriff und offene Freigabepunkte

- Die bestehende Tabellen-ID ist bestätigt. Die Tabelle hat den Tab `Anmeldungen` mit zwölf bisherigen Spalten und den Tab `Übersicht`. Die Tabellen-ID ist **keine** Script-ID. Der Livecode verwendet bisher `getActiveSheet()` und sichert die Auswahl des Eingabetabs damit nicht ausdrücklich ab; der Kandidat verlangt stattdessen den konfigurierten Tabnamen. Echte Kennungen und private Herkunftsnachweise bleiben ausserhalb dieses Pakets.
- Das tatsächliche Produktionsprojekt ist an ein bestehendes Google-Formular gebunden. Eigentümerkonto, Script-ID und aktive Version 10 vom 08.06.2026 sind im Browser bestätigt; Deployment-ID und `/exec`-URL stimmen exakt mit Website-Einbettung und Direktlink überein. Die zuerst untersuchte leere Scriptdatei an der Tabelle ist ein anderes, nie bereitgestelltes Projekt und kein Uploadziel.
- Head und Version 10 sind über die Editoroberfläche privat gesichert und identisch. Im geprüften Konto zeigt das Projekt keine Script Properties und null sichtbare Trigger. Das beschreibt die aktuelle UI-Sicht; ein vollständiger automatisierter API-Export wurde noch nicht ausgeführt. Keine neuen Projekte oder Ersatzdeployments anlegen.
- `clasp` 3.4.1 ist isoliert lokal installiert. Versions-/Befehlshilfen und die Uploadpositivliste wurden mit dieser Version tatsächlich offline geprüft; nur die drei vorgesehenen Projektdateien werden ausgewählt. Der Eigentümer hat die Apps-Script-API selbst aktiviert; die eingeschaltete Einstellung ist bestätigt. Die erste CLI-Anmeldung bestätigte das richtige Konto, gewährte jedoch nur Profil-/E-Mail-Rechte. Der echte API-Abruf wurde deshalb wegen fehlender Scopes abgewiesen. Die separate Nutzerfreigabe für Projekt- und Deploymentzugriff ist noch offen; ein vollständiger API-Export wird nicht behauptet. **Upload und Deployment bleiben gesperrt**; eine OAuth-Freigabe ersetzt keine Veröffentlichungsfreigabe.
- Die echte Speicher-/CSV-Behandlung, Google-RPC-Ausführung, Quoten, Mailzustellung und mobile Darstellung im Google-iframe sind noch nicht geprüft. Die lokalen Mocks beweisen diese Integration nicht.
- Die konkrete Aufbewahrungs-/Löschregel und die abschliessende Datenschutzinformation müssen vor Veröffentlichung festgelegt werden. Der Text behauptet keinen bereits eingeführten Löschprozess und keine Zertifizierung oder zugesicherte Speicherregion.

## Ablauf und Datenvertrag

Die Oberfläche nimmt jederzeit eine **unverbindliche Interessenanfrage** entgegen. Sie erzeugt weder Vertrag noch Rechnung, Zahlungspflicht, reservierten Platz oder bestätigten Termin. Josef entscheidet persönlich; eine spätere Aufnahme braucht eine ausdrückliche Bestätigung und eine separate unterschriebene Vereinbarung. Der Ersttermin für CHF 20 und Online-Termine werden erst separat vereinbart. Bestehende Tarife und interne Angebotswerte bleiben erhalten.

Erfasst werden Name, Schulstufe, gewünschtes Angebot, Kontakt, optional ein unverbindliches Wunschdatum und eine kurze Nachricht. Keine Adresse, Vertragszustimmung oder Gesundheitsangabe wird verlangt. Die Primarstufenanzeige lautet 4.–6. Klasse; der bisherige interne Wert `Primarschule (3.–6. Kl.)` bleibt aus Kompatibilitätsgründen erhalten. Die zusätzliche Spalte `Schulstufe Anzeige` hält den tatsächlich angezeigten neuen Text fest. Höhere Schul-/Ausbildungsstufen bleiben auswählbar.

Öffentlich erreichbar sind nur `doGet`, das nicht schreibende `doPost` und `submitInterest`. Alle Hilfsfunktionen enden auf `_` und sind damit keine `google.script.run`-RPCs. Es gibt keine öffentliche Schema-, Status-, Export- oder Löschfunktion. Die asynchrone Oberfläche zeigt Erfolg erst nach einer Serverquittung mit `ok:true`, `saved:true` und Vorgangs-ID. [Google: Client-Server-Kommunikation](https://developers.google.com/apps-script/guides/html/communication)

Die Originalspalten A:L bleiben in bisheriger Reihenfolge bestehen. Neue Anfragezeilen lassen die Adress- und drei Einwilligungsspalten leer. Erforderliche Ergänzungen rechts von den bisherigen Spalten:

| Metadatum | Zweck |
|---|---|
| Vorgangs-ID / Anfrage-ID | Serverquittung und dauerhafte technische Idempotenz |
| Datensatztyp / Anfragestatus | `INTERESSENANFRAGE` und zunächst `Anfrage`; keine Umdeutung historischer Einträge |
| Eingang UTC | Serverseitiger ISO-Zeitpunkt; bestehende Datumsspalte zusätzlich Zürich-Ortszeit |
| Anfrageinfo-Version / Datenschutzhinweis-Version | Nachvollziehbare Informationsfassung, keine Vertragsannahme |
| Schulstufe Anzeige / Wunschdatum unverbindlich | Anzeige-/Legacytrennung und unverbindlicher Terminwunsch |
| Inhalt-Hash / Kontakt-Hash | Technische Wiederholungen und einfache Frequenzbegrenzung |
| Benachrichtigung | Ausstehend, versandt, fehlgeschlagen/manuell prüfen oder abgefangener Test |

`maintenance/plan-headers.cjs` liest ausschliesslich eine lokale JSON-Liste der Überschriften und erzeugt einen Ergänzungsplan. Es greift nicht auf Google zu. Beispiel: `node maintenance/plan-headers.cjs headers.json`. Bestehende Zusatzspalten werden behalten, widersprüchliche Originalspalten führen zum Abbruch. Der Plan ist keine ausgeführte Migration. Die Web-App selbst erstellt oder verschiebt keine Spalten; ein unvorbereiteter Tab führt zu einer allgemeinen Fehlermeldung.

Privat werden Anfragen mit `Anfrage`, `in Prüfung`, `Warteliste`, `bestätigt`, `abgeschlossen` bearbeitet. Statuswechsel erfolgen nur durch Josef im berechtigten Arbeitsablauf; dieser Kandidat automatisiert sie nicht. Eine Auswertung muss `Datensatztyp=INTERESSENANFRAGE` und eindeutige Vorgangs-IDs verwenden. Historische Vertragszeilen werden separat ausgewertet. Einträge aus getrennten Tests zählen nie als Interessenten. Bestehende individuelle Verträge, alte Zustimmungen und historische Spalten bleiben unverändert.

## Schutz und geprüfte Grenzen

Serverseitig gelten Whitelists, Längen-/Typprüfungen, reale ISO-Daten und `Europe/Zurich` für Tagesgrenzen. Ein neues Wunschdatum liegt nicht in der Vergangenheit; für Präsenz wird Samstag verlangt. Der Wunsch ist keine Zusage eines tatsächlich angebotenen Kurstags; massgeblich bleibt der veröffentlichte Kursplan und die persönliche Terminvereinbarung.

Skriptweite Sperre plus dauerhaft in derselben Anfragezeile gespeicherte ID verhindern gleichzeitiges doppeltes Anlegen. Eine identische bereits gespeicherte Anfrage wird auch nach zwei Stunden, über Mitternacht und nach einem Wechsel der Informationstexte erneut quittiert. Ein noch ungespeicherter Versuch mit altem signiertem Token erhält nur ein frisches Token für **dieselbe** ID; ein weiterer bewusster Sendeklick ist erforderlich. Nach bestätigtem Erfolg wird die technische Browser-ID entfernt und eine weitere Anfrage ist möglich. Bei ungeklärtem Ergebnis bleibt sie erhalten. Im Browser werden keine Namen/Kontakte/Nachrichten gespeichert.

Nach Verlust des Browserspeichers oder Wechsel des Browsers existiert keine zuverlässige Verbindung zur vorherigen technischen ID. Identischer Inhalt wird zusätzlich während 30 Minuten zusammengefasst; das ist keine unbegrenzte personenscharfe Dublettenerkennung. Bei Unklarheit verweist der Fehlertext auf direkten Kontakt. Der Inhalt-Hash kann Daten nicht anonymisieren; die Metadaten bleiben private Anfrageinformationen.

Ein Honeypot, signierte Tokens, Mindestverweildauer und Grenzen von drei neuen Anfragen je Kontakt-Hash bzw. 80 insgesamt pro Stunde reduzieren einfachen Missbrauch. Das ist kein Schutzversprechen gegen gezielte Angriffe oder verbrauchte Google-Quoten. Unterschiedliche Kontaktangaben können diese einfache Grenze umgehen. Die Form bleibt grundsätzlich erreichbar, auch bei fehlenden freien Plätzen.

Erfolg folgt erst nach dem Schreibaufruf und `flush`. Wenn ein Schreibvorgang erfolgreich gewesen sein könnte, liefert ein Wiederholungsversuch anhand der gespeicherten ID dieselbe Quittung. Mailfehler nach Speicherung führen nicht zu einem zweiten Eintrag oder automatischen erneuten Mailversand; `Benachrichtigung` bleibt zur manuellen Prüfung. Zwischen erfolgreichem Speichern und Mailversand sind Abbrüche möglich; ausstehende Benachrichtigungen müssen privat kontrolliert werden. Die Tabellenzeile ist die führende Eingangsbestätigung.

Alle Schreibwerte erhalten Textformat; gefährliche Formelpräfixe einschliesslich führender Leer-/Steuerzeichen werden mit Apostroph geschützt. Der Mock prüft die übergebenen Werte und Formate. **Echter Google-Sheets- und CSV-Export/Reimport-Test steht aus**; ohne ihn ist keine vollständige CSV-Sicherheitsabnahme behauptet. Die App enthält keine automatische Bereinigung historischer Zeilen.

## Konfiguration und Berechtigungen

Diese Werte werden erst im bestätigten bestehenden Projekt in privaten Script Properties gesetzt. Keine echten Werte in `.gs`, HTML, Beispielkonfiguration, Auditlogs oder Git eintragen:

| Script Property | Bedeutung |
|---|---|
| `LC_MODE` | explizit `production` oder `test` |
| `LC_SPREADSHEET_ID` | bestätigte bisherige Produktivtabelle |
| `LC_SHEET_NAME` | expliziter bestehender Eingabetab; hier nach Abgleich `Anmeldungen` |
| `LC_NOTIFY_EMAIL` | bestätigter bisheriger Empfänger; nicht aus Vergleichscode blind übernehmen |
| `LC_TOKEN_SECRET` | neuer kryptografisch zufälliger privater Schlüssel mit mindestens 32 Zeichen; nicht ausgeben/committen |
| `LC_TEST_SPREADSHEET_ID` | nur für Testmodus: getrennte, ausdrücklich autorisierte Testtabelle; darf nicht Produktiv-ID sein |

Der lokale Simulator braucht keine dieser realen Werte. `LC_MODE=test` verhindert MailApp-Aufrufe und kennzeichnet Testzeilen; für den aktuellen Auftrag wurde keine echte Testtabelle angelegt. Das Umschalten globaler Script Properties eines live genutzten Projekts würde auch die aktive Anwendung betreffen und darf nicht als Testabkürzung erfolgen.

Das Kandidatenmanifest nutzt weiterhin die zwei expliziten Scopes `spreadsheets` für `openById` und `script.send_mail` für MailApp. Genau diese beiden Berechtigungen zeigt auch die geprüfte Übersicht des tatsächlichen Projekts; dessen gesichertes Manifest enthält bislang keine explizite `oauthScopes`-Liste. Der Kandidat fügt damit keine Gmail-Lese-, Drive-, Calendar- oder UrlFetch-Berechtigung hinzu. Er erhält den tatsächlichen Web-App-Block mit `executeAs: USER_DEPLOYING` und `access: ANYONE_ANONYMOUS` sowie `exceptionLogging: STACKDRIVER`; eine ungeprüfte Umstellung des Fehlerloggings ist zurückgenommen. Zeitzone, V8-Laufzeit und leerer Abhängigkeitsblock bleiben erhalten. Private Anfrageinhalte gehören nicht in eigene Logs. Die Deploymentverwaltung benötigt gegebenenfalls separate CLI-/API-Berechtigungen; diese gehören nicht in die Laufzeitscopes der Web-App. Vor einem später freigegebenen Upload Manifest und Zugriffseinstellungen erneut mit der dann aktuellen privaten Sicherung vergleichen. [Google: Autorisierung](https://developers.google.com/apps-script/guides/services/authorization)

## Nachvollziehbarer Update- und Rücksetzweg – noch nicht ausgeführt

1. Die bestätigte Produktionszuordnung und die privaten UI-Sicherungen von Head, Version 10, Manifest und Bereitstellung als Ausgangspunkt verwenden. Vor einem späteren Upload Projekt-URL/Script-ID, Eigentümer, Deployment-ID, vollständige `/exec`-URL, aktive Version, Ausführungsidentität, Zugriffseinstellungen und Konfiguration erneut lesend abgleichen. Aktuelle Quellen und Metadaten zusätzlich über den noch ausstehenden autorisierten API-/CLI-Lesezugriff privat sichern. Die gelieferte Vergleichsquelle bleibt von diesen tatsächlich aus dem Projekt gesicherten Dateien getrennt.
2. Die installierte CLI 3.4.1 und ihre Hilfen sind geprüft; die Apps-Script-API ist vom Eigentümer aktiviert. Vor dem erneuten Leseabruf fehlen noch die nötigen Projekt-/Deployment-Scopes der CLI-Anmeldung. Ein frischer privater Sicherungsordner verhindert das Überschreiben vorhandener Arbeit. Geprüfte Syntax: `clasp clone-script SCRIPT_ID ALTE_VERSION --rootDir src` mit positionaler Versionsnummer, `clasp list-deployments`, `clasp list-versions`, `clasp pull --versionNumber ALTE_VERSION`. Für verschiedene Versionen separate Ordner verwenden. [Offizielle clasp-Dokumentation](https://github.com/google/clasp/blob/master/README.md)
3. Die tatsächlichen Quellen mit diesem Kandidaten vergleichen und fremde Funktionen/Trigger ausdrücklich berücksichtigen. Nicht blind alles ersetzen: Ein `clasp push` synchronisiert den gesamten Script-Dateibestand. Die Positivliste hier gilt nur, wenn der bestätigte Zielbestand genau diese drei Dateien benötigt. Vor jedem Push `clasp show-file-status --json` prüfen; Beispielkonfiguration, Tests, Auditdateien und Geheimnisse müssen ausgeschlossen sein. Die reale `.clasp.json` bleibt privat und enthält die bestätigte Script-ID; `.clasp.example.json` ist kein ausführbares Deploymentziel.
4. Vor jeder freigegebenen Schemaergänzung eine private Tabellensicherung und die reale Auswertung/Übersicht prüfen. Danach ausschliesslich die fehlenden Metadaten rechts ergänzen und nötigenfalls die physische Spaltenkapazität erweitern; A:L und Bestandszeilen unangetastet lassen. Keine Ausführung von `setupSheet`, keine `clear`- oder Löschoperation. Dies ist aktuell ausdrücklich **nicht autorisiert/ausgeführt**. Vor Produktivumschaltung alle isolierten Tests sowie echten Text-/CSV-Roundtrip auf getrennten Testdaten abschliessen.
5. Aufbewahrung/Datenschutz und neue unverbindliche Formulierung fachlich freigeben. Website, Formular, Mail und Dokumentfassungen müssen zusammenpassen. Erst dann bei erteilter Veröffentlichungsfreigabe Quelle synchronisieren, eine Version mit `clasp create-version BESCHREIBUNG` anlegen und **das bestehende** Deployment mit `clasp update-deployment DEPLOYMENT_ID --versionNumber NEUE_VERSION --description BESCHREIBUNG` aktualisieren. Kein neues Script, keine neue Tabelle als Ersatz und keine neue `/exec`-URL anlegen. Code-Push allein ändert eine versionierte Live-Web-App nicht. [Google: bestehendes Deployment aktualisieren](https://developers.google.com/apps-script/concepts/deployments)
6. Die unveränderte `/exec`-URL aus Website und Direktlink prüfen, sichtbare Textversion/Class-Label, RPC-Antwort und die tatsächliche bereitgestellte Versionsnummer kontrollieren. Reale Übermittlung nur mit gesondert autorisiertem Test, eindeutig markierten Testdaten und abgefangenen Benachrichtigungen. In diesem Auftrag wurde nichts an das echte Formular gesendet.
7. Bei Fehlern nicht auf einen unbekannten Stand springen. Die zuvor protokollierte alte Version kann am **gleichen** Deployment wieder ausgewählt werden (`update-deployment ... --versionNumber ALTE_VERSION`). Gleichzeitig die passende Websitefassung herstellen, damit keine unverbindliche Website mit alter verbindlicher Formularlogik kombiniert bleibt. Neue Anfragezeilen/Metadaten beim Rollback nicht löschen; sie bleiben separate Interessenanfragen. Private Properties anhand der Sicherung prüfen, denn sie sind nicht Teil der unveränderlichen Codeversion. Bestehende Vertragszeilen nie rückwirkend umdeuten. [Google: Deployment-Update-API](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments/update)

Eine separate Tabelle zu Testzwecken setzt eine ausdrückliche Autorisierung voraus und ersetzt die bestehende Produktivtabelle nicht. Ein neuer Test- oder Deploymentstand wird hier nicht automatisch erstellt. Eine erneute Freigabe ist erst für den konkret überprüften späteren Produktionswechsel erforderlich.

## Vergleich mit dem gelieferten Code

Die mitgelieferte `Code.gs` unterscheidet sich in zwei Vertragstextabschnitten vom bestätigten Livecode der Version 10. Sie ist deshalb keine Quelle für behauptete aktuelle Livebedingungen. Die abweichenden neuen Konditionen wurden nicht als produktive oder bereits vereinbarte Bedingungen übernommen.

Übernommen: bestehende Schul-/Ausbildungsgruppen, Angebotskennungen und Tarife, bestehendes Farbschema, Einbettbarkeit, bisheriger Tabellenschemaanfang, E-Mail-Benachrichtigung nach bestätigtem Speichern als Prinzip.

Geändert: Interessenanfrage statt Vertragszustimmung; 4.–6.-Klasse-Anzeige mit Legacytrennung; sparsamere Felder; validierter Server-RPC; sichere Fehler-/Erfolgsführung; persistente IDs/Sperre; explizite Tab-/ID-Konfiguration; private Hilfsfunktionen; isolierte Tests und lokale Formularvorschau.

Verworfen: `setupSheet().clear`, aktive zufällige Tabelle, unvalidierte POST-Annahme, `no-cors` als falscher Erfolgsnachweis, automatische Buchung des nächsten Samstags, Zustimmungscheckboxen für Verträge, vorzeitige Absage-/Zahlungspflicht und jede Behauptung, die lokale Eingangsdatei sei bereits der bestätigte Livecode. Neue Vertragsbedingungen werden nicht durch das Anfrageformular eingeführt.
