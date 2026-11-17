# KI-Coach: Ergebnis der Originalprüfung

Stand 17.11.2026. Die vier gelieferten Originaldateien bleiben bytegenau erhalten. Ergänzt wurden nur private Vorschau, Tests und diese getrennten Berichte. Keine stillen Korrekturen und kein eingeschränkter Teampilot.

## Was tatsächlich nachvollzogen wurde

Die unveränderte Demo hat einen Schüler- und einen Lehrpersonenmodus (`DEMO`, `DEMO-LP`), getrennte Fachchats, Wiederöffnen/Löschen, Fotoauswahl und unterschiedliche Lehrpersonenwerkzeuge. In lokalen DOM-/Servernachbildungen wurden diese Bedienwege und die tatsächlichen Originalfunktionen geprüft. Die Demo liefert feste Antworten. Die UI-Fotoverarbeitung wurde mit künstlichem Canvas nachvollzogen, nicht mit einer Kamera oder echten Bilddateien.

29 positive Funktionsprüfungen: 18 Backend- und 11 Frontendprüfungen. Zusätzlich 16 erfolgreiche Reproduktionen bekannter Originalfehler (9 Backend, 7 Frontend) und 2 Prüfungen von Daten-/Betriebsgrenzen. Das sind 47 Beobachtungen, kein Nachweis von 47 fehlerfreien Funktionen. Fünf Erhaltungsprüfungen und eine lokale HTTP-Prüfung sichern zusätzlich die unveränderte Auslieferung und die begrenzten Vorschaupfade. Insgesamt 53 erfolgreich ausgeführte Prüfungen; kein Live-Abnahmepass. Die in der Originalanleitung genannten früheren Browserprüfungen wurden nicht nachgewiesen und nicht mitgezählt.

Drei echte Subagents prüften Backend, Oberfläche und aktuelle Anbieterangaben getrennt. Anschliessend wurden die Befunde gegenseitig unabhängig mit Originalcode und Testfällen abgeglichen. Der Hauptagent führt die Originalerhaltung, Vorschau und Projektzuordnung zusammen.

## Wichtigste konkrete Fehler – Vorschläge, noch nicht geändert

1. **Persönlicher Codewechsel im selben geöffneten Fenster:** ungesendeter Text bleibt zurück; eine verspätete Antwort kann den Verbrauch der neu angemeldeten Person und die Liveansage überschreiben. Vorschlag: Sitzungskennung je Anmeldung, alte Anfragen entwerten und Eingabe/Liveausgabe löschen. Kein nachgewiesener serverseitiger Rollenwechsel oder Transfer ganzer fremder Chatlisten. Fundstellen: `coach.html:615–624,753–774`.
2. **Kosten-/Tagesgrenzen sind nicht hart abgesichert:** Restbudget wird vor dem Aufruf geprüft, Verbrauch erst danach gebucht; überlappende Anfragen können gemeinsam das Tageslimit überschreiten. Vorschlag: Kontingent und voraussichtlichen Höchstverbrauch vorab unter Lock reservieren und nachher abrechnen. Gewählte Grenzwerte beibehalten. Fundstellen: `Code (1).gs:153–190,485–501`.
3. **Meldungen und Sheet-Schreibvorgänge:** verlorene Meldungen können als angekommen erscheinen; freier Text mit führendem `=` erreicht Google Sheets ungeschützt. Vorschlag: gespeicherte Meldungs-ID bestätigen, Fehler korrekt zurückmelden und Texte als Literal schreiben. Fundstellen: `coach.html:917–931`, `Code (1).gs:205–217,522–553`.
4. **Fotos bei Folgefragen:** Die zweite Frage enthält nur `[Foto gesendet]`, nicht mehr das ursprüngliche Foto. Vorschlag: ausdrücklich festlegen, wie der relevante Bildkontext während eines Chats erneut übergeben wird; keine heimliche neue Speicherung. Fundstelle: `coach.html:724–749`.
5. **Weitere Abnahmefälle:** Dialoge haben keinen Tab-Fokusfang; Code-Neuerzeugung nach Leeren setzt persönliche Zähler zurück; sehr lange gleichartige Verläufe umgehen die Gesamtgrenze. Dazu kommen Rollenanzeige/gespeicherte Sitzung und das Risiko leerer Claude-Textantworten bei ausgeschöpftem Thinking-Limit. Genaue Repros und Vorschläge stehen in den getrennten Berichten.

Die Originaltexte zu Kostenfreiheit und Datenaufbewahrung sind nicht als kontobezogen bestätigt zu verstehen. Modellnamen und Basispreise sind mit aktuellen offiziellen Quellen abgeglichen; Guthaben, automatische Aufladung und konkrete Provider-Datenregelung wurden nicht im Nutzerkonto geprüft.

## Eigenes Google-Projekt

Die bestehende Autorisierung wurde für das vom Nutzer genannte Google-Konto erfolgreich weiterverwendet. Für den Coach wurden eine eigene leere Tabelle und ein daran gebundenes Apps-Script-Projekt angelegt. Der Originalcode wurde in den unveröffentlichten Projektstand übertragen und bytegenau zurückgelesen. Das separate Manifest und die neue Tabelle verwenden `Europe/Zurich`. Die vorherigen und nachherigen Projektinhalte sind privat gesichert; die lokale clasp-Zuordnung liegt ebenfalls ausserhalb des Repositorys.

Google liefert einen automatischen HEAD-Eintrag ohne Versionsnummer oder Einstiegspunkte. Er ist keine öffentliche Web-App: keine Web-App-Bereitstellung, keine Version und kein /exec-Ziel erstellt. Keine Coach-Funktion, keine Einrichtung, kein Trigger und kein Verbindungstest ausgeführt. Kein API-Key gesetzt. Anmeldeformular und bestehende Tabellen bleiben unberührt.

## Nächster konkreter Einrichtungsschritt

Im eigenen Coach-Projekt steht als Nächstes die einmalige Ausführung von `einrichten()` samt Google-Autorisierung an. Sie betrifft ausschliesslich die neue Coach-Tabelle und würde die fünf Originalblätter sowie den vorgesehenen Bereinigungstrigger anlegen. Dieser Schritt ist noch nicht ausgeführt. Der spätere Schlüssel gehört ausschliesslich in die Script Properties dieses Coach-Projekts, niemals in Chat oder Repository.

Für einen echten Claude-Test müssen danach das Konto/Guthaben und eine begrenzte Testfreigabe feststehen. Vor einer Freigabe für echte Personen sind die obigen Korrekturvorschläge zu entscheiden und getrennt zu testen. Eine Veröffentlichung ist dafür nicht stillschweigend erlaubt. Kein persönlicher Browser wird dafür verwendet; derzeit steht kein freigegebener kostenloser Cloud-Browser mit manueller Anmeldung bereit.

## Offene Prüfungen

Google-Berechtigungsdialog, echte Sheet-Verwaltung und Codeerzeugung, Quoten/Parallelität, Löschtrigger und E-Mails, Web-App/CORS/Weiterleitung, Claude-Schlüssel und Guthaben, Modellantworten/Lernverhalten, tatsächliche Fotoerkennung. Ebenfalls offen: Cloud-Browser-Layout auf Smartphone/Desktop, native Tastaturfolge, Kamera, Zwischenablage, Bildschirmleser und Browserkonsole. Kein kostenpflichtiger Browser, keine echte Anmeldung, kein echter Formularversand und keine Claude-Kosten ausgelöst.
