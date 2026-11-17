# Unabhängiger Schlussreview der Arbeitsfassung

Stand: 17.11.2026. Zuständig: separater Review-Subagent, ohne Beteiligung an der Implementierung von `working/Code.gs`, `working/coach.html` oder deren Tests. Originale und andere Projektarbeiten wurden nicht verändert.

## Ergebnis

Die drei beauftragten Fehler sind in der geprüften Arbeitsfassung durch passende Schutzmechanismen und lokale Gegenproben abgedeckt. Dies ist eine Aussage über Original- und Arbeitscode in simulierten Diensten, keine Freigabe oder Behauptung erfolgreicher Google-/Claude-/Browserintegration.

Die abschliessende neue Suite wurde unabhängig erneut ausgeführt: **63/63 bestanden** – 32 Backend-, 22 UI-, 7 UI/Backend-Integrationsprüfungen und 2 Prüfungen der unveränderten Einstellungen und Lernanweisungen. Die ursprünglichen Fehlerreproduktionstests zählen nicht zu diesen 63 Korrekturprüfungen. Zusätzlich wurde die getrennte Originalerhaltung erneut geprüft: **5/5 bestanden**, darunter die vier Dateihashes und der genaue Dateibestand.

1. **Sitzungswechsel:** Chat-, Login-, gespeicherte Sitzungs-, Melde-, Bild- und Clipboard-Rückläufe sind an die aktuelle Sitzung gebunden. Alte Eingaben, Liveausgabe, Meldetext, Fotos, Wiederholungsauftrag und ausgeblendete persönliche Ansichten werden entfernt. Späte Erfolgs-, CODE- und Netzfehler dürfen weder Daten der neuen Sitzung verändern noch sie abmelden.
2. **Reservierung/Wiederholung:** Unter dem Script-Lock werden aktiver Zugang und Einstellungen frisch gelesen, Tagesplatz und vorsichtige Kostenreserve gespeichert, geflusht und zurückgelesen. Nur der neu angelegte Vorgang darf den Anbieter aufrufen. Kennung, Nutzer und Nutzlast sind gebunden. Offene Vorgänge bleiben reserviert; Cacheverlust oder ein neuer Script-Lauf erzeugt keinen zweiten Aufruf. Abgeschlossene Ablehnungen sind als terminal gekennzeichnet. Tages-/Monatszuordnung bleibt auch bei verspätetem Abschluss in Europe/Zurich beim ursprünglichen Vorgang.
3. **Meldungen/Text:** Eine Erfolgsmeldung setzt die passende Kennung und tatsächlich zurückgelesene Inhaltsfelder ohne Formeln voraus. Verlust einer Schreibbestätigung führt nicht zu einer zweiten Meldungszeile. Mailfehler werden nicht mit dem Speicherergebnis verwechselt. Freitext wird mit dem Sheets-Literalmarker geschrieben; bestehende Textlängen bleiben erhalten.

## Zusätzlich unabhängig injizierte Fehlerfenster

Neben der Suite wurden gezielt weitere bzw. überlappende Abläufe direkt gegen den Arbeitscode ausgeführt:

- Reservierungszeile gespeichert, Bestätigung oder `flush()` wirft: kein Anbieteraufruf; derselbe Vorgang bleibt beim nächsten Versuch offen.
- Abschlusswrite scheitert vor Speicherung: nur ein Anbieteraufruf, Reserve bleibt stehen. Bei verlorener Bestätigung nach tatsächlicher Speicherung bleibt der Vorgang abgeschlossen; nach Cacheverlust wird keine zweite Anfrage ausgelöst.
- Während des Wartens auf den Lock auf null gesetztes Tageslimit: kein Anbieteraufruf.
- Absichtlich geleertes gespeichertes Meldefeld oder nachträglich simulierte Formel: keine falsche Speicherbestätigung.
- Monats-/Tageswechsel während der Antwort sowie alte Kennung nach Cacheverlust: alte Periode bleibt zugeordnet, neue Tagesquote startet korrekt.
- Haiku-Verbrauch unter einem Mikro-USD: konservative Aufrundung statt systematischer Unterzählung.

Diese zusätzlichen Läufe verwenden dieselben synthetischen Dienstgrenzen. Sie sind keine unabhängige Nachbildung der internen Transaktionsgarantien von Google.

## Kostenannahmen und Betriebsgrenzen

Die Reservierung verwendet die unveränderten Modellpreise, das konfigurierte Ausgabelimit, eine vorsichtige Text-/Rahmenreserve und einen dokumentierten Bildhöchstwert. Die aktuelle offizielle Visionbeschreibung begrenzt die Bildverarbeitung der hier verwendeten Modelle auf 4784 visuelle Tokens pro Bild. Dadurch wird die Base64-Datei nicht fälschlich als Millionen Texttokens reserviert. Quelle: [Claude Vision: Auflösung und Tokenkosten](https://platform.claude.com/docs/en/build-with-claude/vision).

Die Textberechnung ist eine konservative technische Annahme, keine vom Anbieter bestätigte universelle Rechnungsobergrenze. Auch der offizielle Tokenzählendpunkt beschreibt seine Ausgabe als Schätzung. Modell-/Preisänderungen, tatsächliche Tokenzahlen und Guthaben sind vor Livebetrieb gesondert abzugleichen. Unerwartete oder ungültige Verbrauchszahlen sperren weitere Aufrufe zur Prüfung. Quelle: [Claude Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting?q=count_tokens).

Der Code ruft `SpreadsheetApp.flush()` vor Freigabe des Locks auf, entsprechend der [Google-Lock-Dokumentation](https://developers.google.com/apps-script/reference/lock/lock.html). Ob die echte Google-Laufzeit alle erwarteten Schreib-/Lesefehler und Formate genauso abbildet, bleibt offen.

Das technische Journal bewahrt Vorgangsmetadaten ohne Chattexte oder Bilder auf. Antworten liegen nur im zeitlich begrenzten Cache. Nach dessen Verlust kann eine Antwort nicht erneut geliefert werden, aber der Vorgang wird auch nicht erneut kostenpflichtig ausgeführt. Ein offener Ausgang kann eine Reservierung bis zur ausdrücklichen Prüfung blockieren; das ist der gewählte Schutz vor unbemerkten Doppelkosten.

## Menütest und offene Prüfungen

Der im Zwischenreview gefundene Ausfall des Menü-Verbindungstests ist korrigiert. Der Menüpunkt fragt nun nach einem persönlichen Code und benennt den normalen Tages-/Budgetverbrauch der Testfrage ausdrücklich. Er verwendet den regulär reservierten Chatweg und den zugehörigen Schüler-/Lehrpersonenmodus. Abbrechen löst keinen Anbieteraufruf aus. Ein noch offener oder unklarer Menütest verwendet beim erneuten Prüfen dieselbe gespeicherte Kennung; ein weiterer kostenpflichtiger Test erfordert nach Abschluss eine bewusst neue Bestätigung. Diese Abläufe wurden im finalen Code gelesen und mit den neuen Menütests unabhängig ausgeführt.

Noch offen bleiben die übrigen Originalbefunde: Fotokontext bei Folgefragen, Tab-Fokusfang, lokal geöffnete Sitzung vor Codeprüfung, vollständige Rollenansicht nach Refresh, persönlicher Zähler bei Code-Neuerzeugung, Verlaufs-/Base64-Randfälle sowie Anbieter-/Datenschutzaussagen. Reale Browserdarstellung, Fotoverarbeitung, Google-Speicher-/Mail-/Trigger-/Parallelitätsverhalten und echte Claude-Antworten wurden nicht geprüft. Kein Browser, keine Anmeldung, keine kostenpflichtige API-Anfrage und kein Deployment wurden durch diesen Reviewer ausgelöst.
