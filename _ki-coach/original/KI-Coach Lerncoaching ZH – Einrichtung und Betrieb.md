# KI-Coach Lerncoaching ZH – Einrichtung und Betrieb

Nov 17, 2026 · @Jusef El Korany

## Überblick

Der KI-Coach ist fertig gebaut und getestet. Er besteht aus einer Chat-Seite für deine Website, einem Google Apps Script als Server und einem Google Sheet für die Verwaltung. Mit etwa 30 bis 45 Minuten Einrichtung ist er live.

**So läuft eine Frage ab**

1. Die Schülerin oder der Schüler öffnet lerncoaching-zh.ch/coach.html und meldet sich mit dem persönlichen Code an.
2. Die Frage geht an dein Apps Script. Es prüft den Code und die Limits pro Tag und pro Monat.
3. Das Skript schickt Frage, Stufe und Fach an Claude, ohne den Namen. Den API-Key kennt nur das Skript.
4. Die Antwort kommt zurück. Verbrauch und Protokoll landen im Google Sheet.
5. Bei bedenklichen Nachrichten oder gemeldeten Antworten bekommst du eine E-Mail.

| Datei | Wohin | Was sie macht |
| --- | --- | --- |
| coach.html | GitHub-Repo, Hauptordner | Chat-Seite: Login mit Code, Chats nach Fach, Foto einer Aufgabe, Tipps & Regeln, Datenschutz |
| Code.gs | Apps Script im neuen Google Sheet | Server: Login, Limits, Aufruf von Claude, Protokoll, Meldungen, Menü «KI-Coach» |

**Schon geprüft:** 17 Servertests, Browsertests in Chromium und WebKit (der Engine von Safari) auf Desktop und iPhone sowie 118 Prüfungen zu Safari, Rechtschreibung, Syntax und Sicherheit. Ein echter Aufruf an Claude steht noch aus. Den machst du in Schritt 2 mit «Verbindung testen».

## Einrichtung in 6 Schritten

Mach die Schritte am Computer. Nimm für Schritt 2 das Google-Konto, mit dem auch dein Anmeldeformular läuft.

### Schritt 1: API-Guthaben holen und API-Key erstellen

1. Auf claude.ai im Browser: Einstellungen → Billing → Abschnitt «API credits» → «Link organization». Organisation wählen oder neu erstellen, die «Supplemental Credit Terms» bestätigen.
2. Auf platform.claude.com mit derselben E-Mail anmelden: Settings → Workspaces → «Create workspace», Name «Lerncoaching».
3. Im Workspace «Lerncoaching» unter «Spend limits» ein Monatslimit von **90 USD** setzen. Das ist die zweite Sicherung neben dem Sheet.
4. Settings → API keys → Workspace «Lerncoaching» wählen → «Create Key», Name «KI-Coach». Den Key kopieren. Er beginnt mit sk-ant- und wird nur einmal angezeigt.

### Schritt 2: Google Sheet und Skript einrichten

1. Neues Google Sheet erstellen, Name «Lerncoaching ZH – KI-Coach».
2. Erweiterungen → Apps Script. Den vorhandenen Text löschen, den ganzen Inhalt von **Code.gs** einfügen, speichern. Projektname «KI-Coach».
3. Zurück ins Sheet und die Seite neu laden. Oben erscheint das Menü «KI-Coach».
4. KI-Coach → «1. Einrichten». Google fragt nach Berechtigungen: Konto wählen → «Erweitert» → «Zu KI-Coach wechseln (unsicher)» → «Zulassen». Das ist bei eigenen Skripten normal.
5. KI-Coach → «2. API-Key hinterlegen» und den Key einfügen. Er steht danach nur im Skript, nicht im Sheet.
6. KI-Coach → «3. Verbindung testen». Erwartet: «✓ claude-sonnet-5-5: Verbindung steht». Bei einem Fehler steht dort, was zu tun ist.

### Schritt 3: Als Web-App bereitstellen

1. Im Apps-Script-Editor: Bereitstellen → Neue Bereitstellung → Zahnrad → Web-App.
2. Beschreibung «KI-Coach v1», Ausführen als: **Ich**, Zugriff: **Jeder**. Dann «Bereitstellen».
3. Die Web-App-URL kopieren. Sie endet auf /exec.

Wichtig für später: Änderst du das Skript, wähl nicht «Neue Bereitstellung». Nimm «Bereitstellungen verwalten» → Stift → Version «Neue Version» → «Bereitstellen». So bleibt die URL gleich und die Website muss nicht angepasst werden.

### Schritt 4: Coach-Seite auf die Website

1. In coach.html die Zeile `API_URL: '',` suchen (am Anfang des Skriptteils) und die URL zwischen die Anführungszeichen setzen. Oder schick mir die URL, dann setze ich sie ein.
2. Auf GitHub im Repo Lerncoaching-ZH: Add file → Upload files → coach.html → Commit. An index.html ändert sich nichts.
3. Nach ein bis zwei Minuten lerncoaching-zh.ch/coach.html öffnen. Der gelbe Vorschau-Hinweis darf nicht mehr erscheinen.

### Schritt 5: Zugänge verteilen

1. Im Blatt «Zugänge» pro Person Name, Rolle (Schüler oder Lehrperson) und Stufe eintragen, z.B. «6. Primar», «2. Sek A», «Gymi 1» oder «Lehre FaGe». Bei der Stufe nur die Stufe, keine Schule.
2. KI-Coach → «Codes für neue Zeilen erzeugen». Pro Person erscheint eine fertige WhatsApp-Nachricht mit Link und Code zum Kopieren.
3. Zuerst du und die Lehrpersonen. Schüler:innen erst, wenn die unterschriebene Einwilligung der Eltern da ist (siehe Elterninformation).

### Schritt 6: Testen

- [ ] Mit deinem Code als Lehrperson anmelden und eine Frage stellen
- [ ] Ein Foto einer Aufgabe schicken
- [ ] Im Sheet prüfen: Verbrauch im Blatt «Zugänge», neue Zeile im «Protokoll»
- [ ] Eine Antwort melden und prüfen, ob die E-Mail ankommt
- [ ] In «Einstellungen» den Status kurz auf PAUSE stellen, testen, wieder auf AKTIV

## Im Alltag

Alles läuft über das Google Sheet. Änderungen wirken sofort, ohne neue Bereitstellung.

| Aufgabe | Blatt | So geht es |
| --- | --- | --- |
| Neue Person | Zugänge | Zeile ausfüllen, dann Menü «Codes für neue Zeilen erzeugen» |
| Person sperren | Zugänge | Häkchen bei «Aktiv» entfernen |
| Code verloren oder weitergegeben | Zugänge | Code-Zelle leeren, Menü «Codes …», neuen Code schicken. Der alte gilt nicht mehr |
| Mehr oder weniger für eine Person | Zugänge | «Monatsbudget USD» oder «Nachrichten pro Tag» in ihrer Zeile eintragen |
| Alles sofort anhalten | Einstellungen | Status auf PAUSE |
| Günstiger laufen | Einstellungen | «Modell Schüler» auf claude-haiku-5-5 |
| Hinweis für alle Chats | Einstellungen | «Zusatzanweisung für den Coach», z.B. «Bis 30.11.: Prüfungsvorbereitung Brüche (6. Primar)» |
| Meldung per E-Mail erhalten | Meldungen | Inhalt lesen, reagieren, «Erledigt» anhaken |
| Verbrauch prüfen | Menü | «Verbrauch diesen Monat anzeigen»; den Stand des API-Guthabens zeigt die Claude Console |

Einmal pro Woche lohnt sich ein Blick in «Meldungen» und in den Verbrauch. Das Protokoll räumt sich jede Nacht selbst auf.

## Kosten und Limits

Mit den Standardwerten braucht der Coach höchstens 90 der 100 USD API-Guthaben pro Monat. Dein Abo wird nie belastet: Ist das Guthaben leer, pausiert der Coach bis zum nächsten Monat.

| Einstellung | Schüler | Lehrperson |
| --- | --- | --- |
| Modell | Claude Sonnet 5.5 | Claude Sonnet 5.5 |
| Monatsbudget pro Person | 3 USD | 10 USD |
| Nachrichten pro Tag | 40 | 100 |
| Antwortlänge höchstens | 900 Tokens (ca. 600 Wörter) | 2000 Tokens (ca. 1300 Wörter) |

Dazu gilt ein Gesamtbudget von 90 USD pro Monat für alle zusammen. Alle Werte änderst du im Blatt «Einstellungen».

| Modell | Preis pro Million Tokens (Input / Output) | Kosten pro Nachricht | Nachrichten mit 3 USD |
| --- | --- | --- | --- |
| Claude Sonnet 5.5 | 2 / 10 USD | ca. 1 bis 2 Rappen | ca. 140 bis 270 |
| Claude Haiku 5.5 | 0.10 / 0.50 USD | unter 0.1 Rappen | ca. 2900 bis 5400 |

Annahme: 3000 bis 8000 Tokens Verlauf und 500 Tokens Antwort pro Nachricht, 1 USD ≈ 0.81 CHF. Ein Foto kostet mit Sonnet zusätzlich etwa 0.4 Rappen. Die Zähler im Sheet laufen pro Kalendermonat, das API-Guthaben erneuert sich mit deiner Abo-Zahlung und verfällt ungenutzt. Quellen: [Preise der Claude-API](https://platform.claude.com/docs/en/about-claude/pricing), [Monatliches API-Guthaben für Max](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans).

## Kinderschutz und Datenschutz

Die Vorgaben von Anthropic für Angebote mit Minderjährigen sind technisch umgesetzt. Offen sind die Einwilligung der Eltern und zwei Ergänzungen in Website und Vertrag.

| Vorgabe | Umsetzung im KI-Coach | Stand |
| --- | --- | --- |
| Altersgerechte Schutzmassnahmen | Coach-Anweisung mit Sicherheitsregeln, Tipps statt fertiger Lösungen | eingebaut |
| Überwachung und Meldewege | Automatische Markierung mit E-Mail, Knopf «Antwort melden», Protokoll 30 Tage | eingebaut |
| Zugangskontrolle | Persönlicher Code von dir, sofort sperrbar, Limits pro Tag und Monat | eingebaut |
| Informationen für Kinder | «Tipps & Regeln» mit Pro Juventute 147 und Notrufen | eingebaut |
| Hinweis, dass es eine KI ist | Login, jede Antwort, Eingabefeld | eingebaut |
| Einhaltung öffentlich festhalten | «Datenschutz & Sicherheit» auf der Coach-Seite | eingebaut |
| Datensparsamkeit | Namen gehen nicht an Claude | eingebaut |
| Einwilligung der Eltern | Elterninformation mit Unterschrift | **offen, vor dem ersten Schülerzugang** |
| Datenschutzerklärung der Website | Absatz zum KI-Coach ergänzen (Text im Codex-Auftrag unten) | offen |
| Anmeldevertrag Art. 8 | Anthropic als Dienstleister ergänzen, bei der nächsten Vertragsversion | offen |

Was Anthropic mit den Daten macht: Inhalte aus der API werden nicht zum Training verwendet und standardmässig nicht aufbewahrt. Von Anthropics Sicherheitssystemen markierte Inhalte können bis zu zwei Jahre gespeichert werden. Das ist keine Rechtsberatung. Bei Unsicherheit lohnt sich ein kurzer Check durch eine Fachperson. Quellen: [Anthropic: Richtlinien für Angebote mit Minderjährigen](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors), [Anthropic: API und Datenaufbewahrung](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention).

## Wenn etwas nicht klappt

Die Seite zeigt verständliche Meldungen. So löst du die häufigsten:

| Meldung oder Problem | Ursache | Lösung |
| --- | --- | --- |
| «Dieser Code ist ungültig oder nicht aktiv» | Code falsch getippt oder Häkchen «Aktiv» fehlt | Code und Häkchen im Blatt «Zugänge» prüfen |
| «Keine Verbindung zum Server» | URL in coach.html falsch oder Web-App nicht für «Jeder» freigegeben | URL vergleichen, Bereitstellung prüfen |
| Gelber Vorschau-Hinweis auf der Live-Seite | URL in coach.html fehlt | URL einsetzen (Schritt 4) |
| «Der KI-Coach ist noch nicht eingerichtet» | «1. Einrichten» ist nicht gelaufen | Menü «KI-Coach» → «1. Einrichten» |
| «… API-Key prüfen» | Key falsch, gelöscht oder abgelaufen | Neuen Key erstellen, «2. API-Key hinterlegen» |
| «Das eingestellte Claude-Modell ist nicht verfügbar» | Modellname in «Einstellungen» falsch | claude-sonnet-5-5 eintragen, «3. Verbindung testen» |
| «Das API-Guthaben … ist aufgebraucht» | Guthaben leer oder Spend limit erreicht | Claude Console → Billing und Spend limits prüfen |
| Änderung am Skript wirkt nicht | Die alte Version ist noch bereitgestellt | Bereitstellungen verwalten → Neue Version |
| Keine Warn-E-Mails | Spam-Ordner oder falsche Adresse | Spam prüfen, «Warn-E-Mail an» in «Einstellungen» setzen |

Klappt es trotzdem nicht: Schick mir die genaue Meldung und einen Screenshot, dann finde ich den Fehler.

## Später: Link auf der Website und Portal

Der Coach funktioniert ohne Änderung an index.html, weil du den Link zusammen mit dem Code verschickst. Für einen sichtbaren Link und die ergänzte Datenschutzerklärung kannst du Codex diesen Auftrag geben, sobald der Coach läuft:

```text
Auftrag: KI-Coach auf der Website verlinken und Datenschutzerklärung ergänzen

Repository: josefelkorany-star/Lerncoaching-ZH. Halte dich an AGENTS.md.
Arbeite auf einem codex/…-Branch und erstelle einen Pull Request, kein Merge.

Ausgangslage: coach.html liegt im Hauptordner und ist live
(lerncoaching-zh.ch/coach.html). Diese Datei nicht verändern.

1. Footer von index.html: neben «Datenschutzerklärung» einen Link
   «KI-Coach (Login)» auf coach.html, im selben Stil.
2. Datenschutz-Modal (#dsModal): vor «Ihre Rechte (Art. 25 DSG)» diesen
   Abschnitt unverändert einfügen, im selben Stil wie die anderen:
   Titel: KI-Coach
   Text: Für angemeldete Schüler:innen und Lehrpersonen betreiben wir unter
   lerncoaching-zh.ch/coach.html einen KI-Lernhelfer (Claude von Anthropic,
   USA). Zur Beantwortung gehen Nachrichten, Fotos, Stufe und Fach an
   Anthropic, Namen nicht. Anthropic verwendet diese Daten nicht zum Training
   und löscht sie in der Regel innerhalb von 30 Tagen. Unsere Protokolle
   löschen wir nach 30 Tagen, markierte oder gemeldete Nachrichten nach
   spätestens 180 Tagen. Minderjährige nutzen den KI-Coach nur mit
   Einwilligung der Eltern. Details stehen auf der Seite des KI-Coachs unter
   «Datenschutz & Sicherheit».
3. Berücksichtige die offenen Branches codex/portal-v1 und
   codex/website-release-20261116, damit keine Konflikte entstehen.
4. Prüfe Desktop, Tablet und Smartphone mit Screenshots und lass die
   bestehenden Tests laufen.
```

Wenn das Supabase-Portal live ist, kann der Coach dort als eigener Bereich erscheinen. Dann gilt ein Login für alles. Der Server mit Apps Script bleibt, nur die Anmeldung wechselt.
