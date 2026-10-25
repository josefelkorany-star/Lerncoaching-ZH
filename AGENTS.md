# Arbeitsregeln für Codex – Lerncoaching ZH

## Ziel und Kommunikation

Pflege die bestehende Lerncoaching-ZH-Website zuverlässig, verständlich und mit möglichst wenig manuellem Aufwand für den Auftraggeber. Antworte auf Deutsch, knapp und konkret. Unterscheide erledigte Arbeit, Vorschläge, Annahmen und blockierte Schritte. Diese Datei ist eine Arbeitsanweisung, keine technische Freischaltung von Werkzeugen oder Berechtigungen.

## Projekt zuerst verstehen

- Repository: `josefelkorany-star/Lerncoaching-ZH`; Standardbranch zum Zeitpunkt der Einrichtung: `main`. Prüfe vor Änderungen den aktuellen Stand, den Arbeitsbranch und bereits vorhandene Änderungen.
- Der vorgefundene Bestand enthält `index.html`, `CNAME`, `logo.png`, `poster.jpg`, `konzept.pdf`, `vertrag.pdf` und `vertrag_ersttermin.pdf`. Verifiziere den aktuellen Aufbau statt von einem unveränderlichen Dateibestand auszugehen.
- Lies vor jedem Auftrag die betroffenen Abschnitte und ihre Abhängigkeiten. Prüfe insbesondere eingebettete Dienste, Skripte, mehrfach genannte Inhalte und Download-Verweise.
- Führe ohne fachlichen Bedarf keinen Framework-Wechsel, keine neue Build-Pipeline und keine zusätzlichen Produktionsabhängigkeiten ein.

## Subagents proaktiv einsetzen

- Setze bei Entwicklungs- und Prüfaufträgen verfügbare echte Subagents eigenständig ein; warte nicht auf eine erneute Aufforderung. Entscheide selbst über die passende Anzahl und Aufteilung innerhalb der verfügbaren Ressourcen und Plattformgrenzen.
- Bei kleinen Änderungen genügt in der Regel ein unabhängiger Reviewer zusätzlich zum Hauptagenten. Bei umfangreicheren Aufträgen delegiere voneinander unabhängige Aufgaben parallel, beispielsweise Bestandsanalyse, Darstellung und Bedienbarkeit, Tests oder Sicherheitsprüfung. Starte weitere Subagents nur für klar benannte Aufgaben mit erkennbarem Nutzen.
- Gib jedem Subagenten Ziel, relevanten Kontext, genaue Zuständigkeit, erlaubte Änderungen und ein erwartetes Ergebnis. Fordere konkrete Dateiverweise und überprüfbare Befunde statt allgemeiner Qualitätsurteile.
- Vermeide konkurrierende Änderungen an denselben Dateien oder Abschnitten, insbesondere an `index.html`. Nutze vorzugsweise parallele Analyse und Prüfung sowie einen verantwortlichen Bearbeiter je Datei. Verwende getrennte Worktrees nur, wenn die Umgebung sie tatsächlich unterstützt und du die Integration prüfen kannst.
- Der Hauptagent integriert die Ergebnisse, löst Widersprüche anhand des Codes und überprüft die Gesamtänderung. Warte auf alle für die Abnahme relevanten Ergebnisse. Schliesse abgeschlossene Agenten und vermeide unbegrenzte rekursive Delegation.
- Lasse Codeänderungen vor der Übergabe möglichst von einem Subagenten prüfen, der sie nicht selbst geschrieben hat. Weise eine Prüfung durch ein zweites Modell nicht als Garantie für Fehlerfreiheit aus.
- Fehlt die Subagent-Funktion, melde dies ausdrücklich und arbeite mit einer getrennten Selbstprüfung weiter. Erfinde niemals Agenten, Agentenberichte oder angeblich ausgeführte Tests. Versuche nicht, Berechtigungs- oder Nutzungslimits zu umgehen.

## Änderungen gezielt und konsistent umsetzen

- Setze den konkreten Auftrag vollständig um; ändere keine fachlichen Angaben, Preise, Verträge, Kontaktdaten oder Rechtsformulierungen aus eigener Initiative. Melde entdeckte Widersprüche mit Fundstellen.
- Erhalte nicht betroffene Inhalte, Markenbestandteile, Gestaltung und Funktionen. Verwende Schweizer Rechtschreibung und die bestehende Sprachkonvention, sofern nichts anderes beauftragt ist.
- Berücksichtige bei einer Inhaltsänderung alle betroffenen Wiederholungen, Navigationseinträge und Verweise. Prüfe Abhängigkeiten zu PDFs oder externen Formularen, statt automatisch anzunehmen, dass eine HTML-Änderung diese ebenfalls aktualisiert.
- Verändere `CNAME`, Hosting, DNS, externe Formularziele, Zugriffsrechte oder Veröffentlichungsregeln nur, wenn der konkrete Auftrag dies umfasst.
- Gib bei unkritischen technischen Details eine begründete Standardlösung vor und arbeite weiter. Frage nur nach, wenn eine fehlende Information die fachliche Richtigkeit, den Umfang, Kosten, Datenschutz oder eine irreversible Aktion wesentlich betrifft.

## Prüfen und Nachweise liefern

- Ermittle zunächst, welche Prüfwerkzeuge tatsächlich vorhanden sind. Nutze vorhandene Tests; installiere oder ergänze nur benötigte Entwicklungswerkzeuge, ohne die Website unnötig umzubauen.
- Prüfe bei Änderungen an der Darstellung die betroffenen Ansichten auf schmalem Smartphone, Tablet und Desktop. Nutze nach Möglichkeit echte Browserprüfungen und Screenshots; überprüfe Lesbarkeit, horizontales Überlaufen, Navigation und Tastaturbedienung.
- Prüfe passende Links, lokale Dateien, Downloads und relevante Interaktionen sowie verfügbare JavaScript- und Konsolenprüfungen. Unterscheide einen Syntaxcheck von einem funktionalen Browsertest.
- Löse keine echten Anmeldungen, E-Mails, Zahlungen oder sonstigen externen Schreibaktionen als Test aus, sofern dies nicht gesondert beauftragt ist. Verwende geeignete Testdaten und Testumgebungen.
- Prüfe den vollständigen Diff auf unbeabsichtigte Änderungen. Dokumentiere ausgeführte Prüfungen samt Ergebnis und benenne nicht ausgeführte oder blockierte Prüfungen ausdrücklich. Melde bereits vorhandene Fehler getrennt von neu eingeführten.

## GitHub und Veröffentlichung

- Arbeite standardmässig auf einem separaten `codex/…`-Branch. Erhalte fremde oder bereits vorhandene Änderungen; kein destruktives Zurücksetzen und kein Force-Push ohne ausdrücklichen Auftrag.
- Wenn ein Auftrag GitHub-Änderungen umfasst und die Berechtigungen verfügbar sind, erstelle nachvollziehbare Commits und einen Pull Request mit Zusammenfassung und Prüfergebnissen.
- Führe keinen Merge nach `main` und keine Live-Veröffentlichung aus, solange der konkrete Auftrag die Veröffentlichung nicht ausdrücklich erlaubt. Eine Aufforderung zum Bearbeiten oder Prüfen allein ist keine Veröffentlichungsfreigabe.
- Bei ausdrücklicher Veröffentlichungsfreigabe prüfe zuerst den tatsächlichen Veröffentlichungsweg, den neuesten Branchstand und die verfügbaren Prüfungen. Veröffentliche nur die beauftragte Änderung. Prüfe anschliessend den Deploymentstatus und die erreichbare Website, soweit die Werkzeuge dies ermöglichen.
- Behaupte weder einen erfolgreichen Upload noch eine Veröffentlichung ohne bestätigtes Ergebnis. Nenne verbleibende Freigaben oder fehlende Zugriffe konkret.
- Speichere niemals Passwörter, Tokens, personenbezogene Schülerdaten oder sonstige vertrauliche Informationen in diesem öffentlichen Repository, in Pull Requests oder Testartefakten.

## Abschluss jedes Auftrags

Berichte kurz: Was wurde geändert oder untersucht? Welche Subagent-Aufgaben wurden tatsächlich erledigt? Welche Prüfungen bestanden, scheiterten oder fehlen? Auf welchem Branch und gegebenenfalls in welchem Pull Request liegt das Ergebnis? Ist die Website unverändert, zur Freigabe bereit oder nachweislich veröffentlicht?
