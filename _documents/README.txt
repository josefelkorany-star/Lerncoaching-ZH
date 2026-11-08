Dokumentquellen und Nachweise - Lerncoaching ZH

Die baseline/ enthält ausschliesslich unveränderte blanke Vorlagen aus dem Repository-Stand 653de67f819a9accd79b70b5206ab42beeda080a, keine ausgefüllten Schülerverträge.
Es gab keine editierbaren Ursprungsdateien. content.json wurde aus den Original-PDFs rekonstruiert und enthält die überprüfbaren Textblöcke. Der bisherige Dokumentgenerator wurde ausserhalb des öffentlichen Repositorys gesichert.

Ausgaben:
- ../konzept.pdf: bisherige vierseitige Fassung; nur die Aufnahmegrenze wurde im Titelblock ergänzt.
- ../vertrag.pdf: blanker Hauptvertrag, vier Seiten; Aufnahme ab der 4. Primarklasse sowie Layoutkorrekturen.
- ../vertrag_ersttermin.pdf: blanke Ersttermin-Vereinbarung, zwei Seiten; Aufnahmegrenze und Layoutkorrekturen.
Der unfreigegebene Konzeptentwurf, seine Inhalte und der Dokumentgenerator werden ausserhalb dieses öffentlichen Repositorys aufbewahrt. Hier werden keine Entwürfe erzeugt.

Voraussetzungen: Python mit reportlab und pypdf, für Sichtprüfung Poppler. Diese Pakete sind im verwendeten Codex-PDF-Runtime enthalten. Keine neue Website-Abhängigkeit und kein Build-/Deployment-Workflow wurden eingerichtet.

Text-/Strukturprüfung:
  python _documents/verify_documents.py

Nur zur Rekonstruktion aus den Baselines (überschreibt content.json):
  python _documents/extract_contract_sources.py

Künftige Dokumentänderungen sind mit dem separat gesicherten Generator, Textprüfung und Rendering sämtlicher Seiten zu prüfen. Vertragsbedingungen, Preise und Fristen nur nach entsprechendem Auftrag ändern.
Der Vergleich entfernt ausschliesslich zusätzliche Aufnahmegrenze, Layoutdatum, Seitennummern, wiederholte Seiten-/Footertexte sowie Aufzählungszeichen und grafische Leerlinien. Der übrige Vertragswortlaut muss identisch sein. Die ursprünglichen Versionsangaben bleiben erhalten; „Layoutstand 26.10.2026“ ist kein neues Wirksamkeitsdatum.

_documents/ beginnt mit einem Unterstrich und wird vom bestehenden Jekyll-Standardbuild nicht als Website-Inhalt verarbeitet. Das Repository selbst ist dennoch öffentlich. Keine privaten Dokumente, Schülerdaten oder unfreigegebenen Entwürfe hier ablegen. Die frühere Entwurfsdatei wurde vor der Veröffentlichung aus dem aktuellen Dateibaum entfernt; ältere Git-Commits und PRs bleiben öffentlich. Es wurde keine Vertraulichkeit der früher hochgeladenen Version hergestellt.

Offene fachliche Fragen und die noch fehlende Bearbeitungsmöglichkeit des externen Formulars stehen in offene-entscheidungen.txt.
