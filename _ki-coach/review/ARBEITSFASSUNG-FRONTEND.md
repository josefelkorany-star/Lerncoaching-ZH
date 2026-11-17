# Korrigierte Arbeitsfassung: Oberfläche

Stand 17.11.2026. Geänderte Quelle ist ausschliesslich `working/coach.html`, abgeleitet von `original/coach.html`. Die vier Originaldateien bleiben unangetastet. HTML-Markup, CSS, sichtbare Originaltexte, Fachauswahl und beide Modi vor dem Inlineskript sind mit dem Original identisch; der Test vergleicht den gesamten Abschnitt vor `<script>`.

## Umgesetzte Korrekturen

1. **Sitzungswechsel:** Jede Anmeldung und Abmeldung entwertet vorherige asynchrone Arbeit. Netzwerkaufrufe werden zusätzlich abgebrochen; Rückläufe, Fehler, Login-/Sitzungsprüfung, Fotoverarbeitung, Meldungen, Zwischenablagenstatus und verzögerte UI-Timer prüfen ihre Sitzungszuordnung. Alte `CODE`-Fehler können keine neue Person abmelden. Eingabe, Liveansage, Meldetext/-auswahl/-status, Fotoauswahl, Wiederholungsauftrag und verborgene personenbezogene Ansichten werden geleert. Ein während der Anmeldung bearbeitetes Codefeld entwertet die alte Prüfung.
2. **Eindeutige Chatanfrage:** Beim Absenden entsteht eine `anfrageId`, die auch im gespeicherten Nachrichtenobjekt erhalten bleibt. «Nochmals versuchen» verwendet denselben Auftrag samt ID und Nutzlast. Doppelte lokale Wiederholung während eines Aufrufs wird unterbunden. Erfolgsantworten mit unpassender ID werden nicht übernommen. `VORGANG_OFFEN` kann mit derselben ID erneut abgefragt werden; ob eine Anfrage tatsächlich nur einmal Kosten verursacht, prüft der Backendteil, nicht die Oberfläche. Es wird kein zusätzlicher Fotoinhalt dauerhaft gespeichert.
3. **Nachgewiesene Meldung:** Erfolgsanzeige und «Gemeldet» erfordern `ok: true`, `gespeichert: true` und genau die gesendete `meldungId`. `SCHNELL`, fehlende Speicherbestätigung oder fremde IDs sind kein Erfolg. Die ID wird aus Chat, Antwortzeit und konkretem Meldungsinhalt abgeleitet, im üblichen Browser per SHA-256; so bleiben Wiederholungen nach einem Neuladen erkennbar, ohne Meldetext zusätzlich in der lokalen Chatablage abzulegen. Ohne Web Crypto verwendet die Oberfläche eine deterministische Kompatibilitätskennung; die Sicherheitsentscheidung liegt unverändert beim serverseitigen SHA-256-Nutzlastabgleich, der Konflikte zurückweist. Ein inzwischen geänderter Meldetext oder ein neu geöffneter Dialog erhält keine alte Erfolgsbestätigung und wird nicht durch einen alten Timer geschlossen.

Die Demo bleibt mit `DEMO` und `DEMO-LP` vorhanden und liefert feste Beispiele. Sie gibt für die neue Empfangsprüfung passende simulierte IDs zurück. Keine echte Speicherung oder Zustellung wird damit behauptet. Zusätzliche Meldetexte wurden nur für die korrigierte Zuordnung bzw. fehlende Bestätigung ergänzt; Lernprinzip, Gestaltung, Rollen, Fachchats und gewählte Limits blieben erhalten.

**Wiederholung nach Neuladen:** Der vorhandene «Nochmals versuchen»-Weg verwendet im noch geöffneten Fenster denselben Auftrag. Nach Neuladen bleibt zwar die `anfrageId` am gespeicherten Nachrichteneintrag, der vollständige letzte Auftrag wird jedoch bewusst nicht zusätzlich gespeichert; insbesondere keine Foto-Nutzlast. Es erfolgt nach Neuladen kein automatischer neuer Provideraufruf. Eine neue Funktion zum Wiederabholen einer ausstehenden Chatantwort wurde nicht hinzugefügt. Meldungen können dagegen aus ihren ohnehin vorhandenen Texten und der deterministischen Kennung wiederholt werden.

## Tatsächlich ausgeführt

`node --test _ki-coach/tests/working-ui.test.mjs`: **22/22 positive Korrektur-/Erhaltungsprüfungen**. Anders als die Originaltests zählen diese Tests die erfolgreiche Beseitigung der geprüften Fehler, keine gewollte Fehlerreproduktion.

- Unveränderte Oberfläche vor dem Skript, beide Modi, Fachchats, Fotoauswahl und Beispielantworten.
- Leere Eingaben/Ansagen/Meldung/Fotos nach Abmeldung und direktem Codewechsel.
- Späte erfolgreiche Antwort, `CODE`-Fehler oder Netzfehler von Person A nach Anmeldung von Person B; B bleibt unverändert, der alte Request ist abgebrochen.
- Alte Loginantwort sowie alte gespeicherte Sitzungsprüfung nach neuer Anmeldung.
- Verspätete Bildkonvertierung und Bildfehler nach Abmeldung, Entfernen oder neuer Fotoauswahl.
- Verspätete Zwischenablagenbestätigung nach Sitzungswechsel.
- Gleiche Anfrage-ID und identische Nutzlast bei Wiederholung, keine zweite parallele lokale Sendung; eine absichtlich neue Frage erhält eine neue ID.
- Ein endgültig abgewiesener Vorgang (`abgeschlossen: true`) zeigt auch bei `ANDRANG` oder `NETZ` keinen irreführenden Wiederholen-Knopf und verwirft den Wiederholungsauftrag. Ein offener Vorgang bleibt dagegen mit derselben ID prüfbar.
- Chatantwort mit falscher Empfangs-ID wird nicht übernommen.
- `SCHNELL`, fehlender Speichernachweis und falsche Meldungs-ID erzeugen keine Erfolgsanzeige.
- Deterministische SHA-256-Meldungskennung und stabile Wiederholung derselben Meldung nach Neuladen.
- Geänderter Meldetext während der Speicherung, später Meldungsrücklauf nach anderer Anmeldung sowie alter Schliess-Timer beim nächsten Dialog.
- Bildbytes und Thumbnail verbleiben ausserhalb der persistenten Chatliste.

Die Tests führen das tatsächliche Arbeitsfassungsskript in einer Node-/Linkedom-Nachbildung aus. Netzwerk, Timer, Speicher und Image/Canvas sind Testnachbildungen; Web Crypto wurde zusätzlich mit Nodes echter SHA-256-Implementierung abgeglichen. Nur erfundene Daten, kein Browser, keine Google-/Claude-Verbindung, keine E-Mail, keine Kosten.

## Weiter offen

Reale Cloud-Browserdarstellung, native Tastaturfolge, Kamera/Bilddekodierung, Zwischenablage und echte Google-/Claude-Integration. Der schon dokumentierte Dialog-Fokusfang sowie die vorläufige Wiederherstellung gespeicherter Sitzungen und unvollständige Rollenanzeige beim Refresh bleiben ausserhalb dieser drei Korrekturen offen. Backend-, Konten-, Aufbewahrungs- und Anbieterbefunde sind gesondert zu beurteilen.

Das Aufgabenfoto wird weiterhin nur mit der ersten Frage übertragen. **Vorschlag, nicht eingebaut:** Das verkleinerte Foto ausschliesslich im Arbeitsspeicher des geöffneten Fachchats halten und bei passenden Folgefragen erneut übergeben. Beim Entfernen, Chatlöschen, Abmelden oder Schliessen/Neuladen der Seite verwerfen; nach Neuladen nötigenfalls erneut auswählen lassen. Kein Local Storage, kein Sheet, keine dauerhafte Bildablage. Vor einer Umsetzung müssen sichtbarer Bildkontext, Verwerfen und zusätzliche Eingabetokens mit dem Nutzer abgestimmt werden.
