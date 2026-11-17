# Anbieter- und Einrichtungsprüfung der Claude-Originalversion

Stand: 17.11.2026. Unabhängige Prüfung der vier Dateien unter `../original/` anhand des Codes und öffentlich zugänglicher Primärquellen. Keine Originaldatei geändert, kein Anbieteraufruf mit API-Schlüssel, keine Google-Mutation, keine Kosten ausgelöst. Quellen wurden über den Web-Lesedienst abgerufen; kein persönlicher oder lokaler Browser verwendet.

## Ergebnis und Prüfgrenzen

Die Modellnamen und Basispreise sind aktuell dokumentiert. Der Requestaufbau passt grundsätzlich zur dokumentierten Messages-/Bilder-API. Das ist ein Quellen- und Codeabgleich, kein erfolgreicher Google-/Claude-Integrationstest. Die Betriebsanleitung nennt 17 Server- und 118 weitere Prüfungen sowie Chromium/WebKit-Tests; deren Protokolle liegen den vier Originaldateien nicht bei. Diese Angaben werden hier als Behauptungen der Vorlage geführt und nicht als selbst ausgeführte Tests gezählt.

Für die unveränderte Originalverwaltung braucht der Coach ein **eigenes, an eine neue Coach-Tabelle gebundenes Apps-Script-Projekt**. Ein separates Projekt bedeutet hier unabhängig vom Anmeldeformular, nicht zwingend ein technisch ungebundenes Script. Ohne Container fehlen dem Original seine Tabellenmenüs und Einrichtungsfunktionen.

## Dokumentierte Kompatibilität

| Gegenstand | Original und selbst geprüfter Befund | Noch nicht erprobt |
|---|---|---|
| Modelle | `claude-sonnet-5-5`, `claude-haiku-5-5` und das auswählbare `claude-opus-5-5` stehen in der offiziellen Modellübersicht. Die Modelle unterstützen Bild- und Texteingaben. Kein festgestellter Modellnamenfehler. | Freischaltung und konkrete Antworten im Konto des Nutzers. |
| Messages | `Code (1).gs:282–316` sendet `model`, `max_tokens`, `system`, `messages` an `/v1/messages` und liest Textblöcke sowie Nutzungszahlen. Dieser Grundaufbau ist dokumentiert. | Authentifizierung, Fehlerantworten, Google-Weiterleitungen und tatsächliche Antwortqualität. |
| API-Version | `2023-06-01` steht weiterhin in der Versionshistorie; die aktuelle Referenz empfiehlt `2026-10-21`. Die ältere Versionsnummer allein belegt keinen Defekt. Sie wurde nicht stillschweigend geändert. | Aktueller Modellaufruf mit dem originalen Versionsheader. |
| Aufgabenfotos | Base64-Bildblöcke mit JPEG, PNG, GIF oder WebP entsprechen dem beschriebenen Schema. Die Originalgrenze von 5 Mio. Base64-Zeichen liegt unter der aktuell dokumentierten direkten API-Grenze von 10 MB pro Bild. | Bilddekodierung und Bildverständnis durch Claude, Geräteupload/Komprimierung im echten Cloud-Browser. |

Quellen: [Modelle](https://platform.claude.com/docs/en/models/overview), [Messages-Referenz](https://platform.claude.com/docs/en/api/messages), [API-Versionen](https://platform.claude.com/docs/en/api/versioning), [Bilder](https://platform.claude.com/docs/en/build-with-claude/vision).

### Konkrete Integrationsrisiken mit Lösungsvorschlag

1. **Erfolgreiche API-Antwort kann ohne sichtbaren Antworttext bleiben.** Sonnet 5.5 verwendet ohne zusätzliche Angaben adaptives Thinking; dessen Tokens verbrauchen ebenfalls das Ausgabelimit. Das Original setzt standardmässig 900/2000 Tokens, übernimmt nur `text`-Blöcke und erklärt bei fehlendem Text trotzdem `ok: true` (`Code (1).gs:290, 313–316`). Der Menü-Verbindungstest verwendet sogar nur das auf 50 Tokens begrenzte Minimum. Das beweist noch keinen Fehler bei jeder Anfrage, erfordert aber einen gezielten echten Test mit `stop_reason: max_tokens` und einer Antwort ohne Textblock. Vorschlag: diesen Zustand ausdrücklich erkennen und vor einer Freigabe eine geeignete Antwort-/Thinking-Konfiguration gemeinsam abnehmen; Rollen, Limits oder Lernverhalten nicht eigenmächtig ändern. Quelle: [Thinking und Ausgabelimit](https://platform.claude.com/docs/en/build-with-claude/thinking).
2. **Cache-Verbrauch wäre bei Sonnet/Opus falsch berechnet.** `Code (1).gs:335` berechnet Cache-Lesetokens generell mit 10 % des Basiseingabepreises. Die aktuelle Preistabelle nennt für Sonnet 5.5 jedoch 0.10 USD statt der daraus resultierenden 0.20 USD und für Opus 5.5 0.20 USD statt 0.40 USD je Million Tokens. Haiku passt. Das Original aktiviert kein Prompt-Caching; ein tatsächlich aufgetretener Cache-Verbrauch ist daher nicht nachgewiesen. Vorschlag: falls Caching vorgesehen wird, die getrennten Cachepreise modellbezogen pflegen und gegen echte `usage`-Werte prüfen. Quelle: [Preistabelle](https://platform.claude.com/docs/en/about-claude/pricing).

## Preise, Guthaben und Limits

Die Basispreise im Original stimmen mit der aktuellen Tabelle überein: Sonnet 5.5 2/10 USD, Haiku 5.5 0.10/0.50 USD und Opus 5.5 4/20 USD je Million Eingabe-/Ausgabetokens. Haiku-Eingaben über 100'000 Tokens haben den beschriebenen fünffachen Satz. Die Beispiele in CHF, die angenommene Wechselrate und die erreichbare Nachrichtenanzahl sind Schätzungen der Vorlage, keine kontobezogene Messung. Thinking, Bilder und Verlauf verändern den Verbrauch. [Offizielle Preise](https://platform.claude.com/docs/en/about-claude/pricing).

Die Originalaussage «höchstens 90 der 100 USD» (`Einrichtung und Betrieb.md:92`) ist keine bereits bestätigte Eigenschaft des Nutzerkontos. Das monatliche Guthaben hängt von einem berechtigten aktiven Tarif, der Wartefrist und der verknüpften Console-Organisation ab. Max umfasst laut Dokumentation 100 USD, andere Tarife andere Beträge oder keine Credits. Die Erneuerung folgt der Abrechnungsperiode; die Coach-Zähler folgen dem Kalendermonat. Zusätzliches Kaufguthaben, automatische Aufladung oder Rechnungsabrechnung können die Nutzung nach Verbrauch der Monatscredits fortsetzen. Die Aussage, es werde nie dem Claude-Abonnement belastet, belegt deshalb keine allgemeine Kostenfreiheit des Coach-Betriebs. Tarif, Guthaben, Verknüpfung und Zahlungsoptionen wurden nicht eingesehen oder verändert. [Monatliche API-Credits](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans).

Eine rechnerische Grenze im Coach ersetzt keine nachgewiesene Anbietergrenze. Der separate Backendbericht prüft, wann das Original Limits prüft und Verbrauch verbucht. Vor echten Aufrufen sind vorhandenes Guthaben und gewünschte Kostenobergrenze im richtigen Workspace zu bestätigen. Kein API-Schlüssel gehört in HTML, Repository, Bericht oder Chat; im Original liegt er in Script Properties.

## Datenangaben der Originalunterlagen

| Originalaussage | Quellen-/Codebefund | Vorschlag ohne Änderung der Originale |
|---|---|---|
| Betriebsanleitung Zeile 127: standardmässig keine Aufbewahrung; Elterninformation/HTML: gewöhnlich innerhalb 30 Tagen gelöscht | Die allgemeine kommerzielle Datenschutzseite nennt 30 Tage mit Ausnahmen. Die API-Funktionsseite beschreibt daneben ZDR/funktionsbezogene Aufbewahrung und modellbezogene Ausnahmen. Eine konkrete ZDR-Vereinbarung der Nutzerorganisation wurde nicht nachgewiesen. Die Originalunterlagen sind untereinander nicht einheitlich. | Vor Nutzung mit echten Kindern die tatsächliche Organisation/Vertragskonfiguration prüfen und genau eine passende Erklärung vorschlagen. Keine garantierte Sofortlöschung behaupten. |
| Kein Training; markierte Inhalte bis zwei Jahre | Die API-Dokumentation beschreibt kein Training ohne ausdrückliche Erlaubnis. Für markierte Inhalte nennt sie bis zwei Jahre; gesetzliche Aufbewahrung kann gesondert gelten. | Nicht als ausnahmslose Löschgarantie oder selbst geprüfte Kontoeinstellung ausgeben. |
| «Dein Name geht nicht an Anthropic» (`coach.html:344`) | Das separate Namensfeld wird nicht in den Claude-Request eingebaut. Chattext und Foto werden aber übertragen; der Code entfernt darin enthaltene Namen nicht automatisch. | Nach Freigabe präzisieren: Der hinterlegte Name wird nicht als eigenes Datenfeld übertragen; keine persönlichen Angaben in Texte/Fotos aufnehmen. |
| Leitung allein sieht Daten; 30/180 Tage | Das hängt auch von der tatsächlichen Sheet-Freigabe und funktionierenden Löschtriggern ab. Diese Google-Konfiguration wurde hier nicht eingerichtet oder getestet. | Rechte, Trigger und Löschung zunächst ausschliesslich an erfundenen Daten prüfen. |

Quellen: [Allgemeine kommerzielle Aufbewahrung](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), [API-Datenaufbewahrung, ZDR und Ausnahmen](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention). Dies ist ein Abgleich der technischen Angaben und keine rechtliche Bestätigung.

## Eigenes Google-Projekt: minimale passende Vorbereitung

**Im Original nachgewiesen:** `einrichten()` nutzt `getActiveSpreadsheet()` und legt `SHEET_ID` in Script Properties ab (`Code (1).gs:572–574`). `onOpen()`, Schlüsselverwaltung, Codeerzeugung und Verbrauchsdialog nutzen `getUi()` und den Tabellencontainer. Erst die Webanfragen greifen über `kontext_()` und `openById(SHEET_ID)` auf die Tabelle zu (`402–406`). Nur eine `SHEET_ID` an ein beliebiges ungebundenes Projekt zu setzen, stellt deshalb nicht den vollständigen Originalumfang her.

Google dokumentiert die besonderen Containerfunktionen gebundener Projekte. Die Apps-Script-API kann ein solches Projekt mit `projects.create` und `parentId` der Coach-Tabelle anlegen. `clasp` kann gebundene Projekte klonen/bearbeiten; laut Bound-Script-Anleitung erstellt es sie nicht direkt. Quellen: [Gebundene Apps-Script-Projekte](https://developers.google.com/apps-script/guides/bound), [Projects.create und parentId](https://developers.google.com/apps-script/api/reference/rest/v1/projects/create).

Passende Abfolge, soweit die vorhandenen Rechte es zulassen:

1. Ein eigenes leeres Coach-Sheet verwenden und ein daran gebundenes Coach-Projekt anlegen; niemals das Formularprojekt oder die Anmeldetabelle verwenden.
2. Den unveränderten Originalcode als Ausgangsversion sichern; eigenes Manifest und Projektzuordnung getrennt dokumentieren, Zeitzone `Europe/Zurich` vorbereiten. Script-ID, Tabellen-ID und spätere Deployment-ID getrennt führen.
3. Nur dieses neue Projekt mit der vorhandenen Autorisierung verwaltbar machen. Keine Geheimnisse, OAuth-Dateien oder echten Zugangscodes versionieren.
4. Einrichten, Rechte, Trigger und Datenmodell später in dieser getrennten Umgebung mit erfundenen Personen prüfen; `setupSheet()` des Anmeldeformulars niemals ausführen.
5. Erst nach geklärtem Guthaben/Schlüssel und gezielt freigegebenem Test echte Claude-Aufrufe durchführen. Eine neue öffentliche Web-App-Bereitstellung und ein Austausch von `API_URL` sind noch nicht erfolgt und gehören nicht zur privaten Originalvorschau.

Dieser Bericht behauptet weder erfolgreiche Google-Autorisierung noch ein bereits angelegtes Projekt. Den tatsächlichen API-Zugriff und den erreichten Einrichtungsstand dokumentiert die Hauptaufgabe separat. UI-Rollenumschaltung und Demochats im Original sind eine private Simulation; sie belegen keine realen persönlichen Zugänge, Sheetverwaltung, Claude-Fotolösung oder serverseitige Rechteprüfung.
