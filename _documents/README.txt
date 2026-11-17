Dokumentquellen und Nachweise - Lerncoaching ZH

Die baseline/ enthält ausschliesslich unveränderte blanke Vorlagen aus dem Repository-Stand 653de67f819a9accd79b70b5206ab42beeda080a, keine ausgefüllten Schülerverträge.
Es gab keine editierbaren Ursprungsdateien. content.json wurde aus den Original-PDFs rekonstruiert und enthält die überprüfbaren Textblöcke. Der bisherige Dokumentgenerator wurde ausserhalb des öffentlichen Repositorys gesichert.

Ausgaben (Stand 17.11.2026):
- ../vertrag.pdf: Anmeldevertrag Version 2026/2.5, fünf Seiten. Neu ist Art. 3 «Laufzeit, Anmeldung und Kündigung» (Kündigung per Quartalsende kostenlos, Austritt während des Quartals mit Pauschale von vier Doppellektionen). Aufnahme ab der 4. Primarklasse in Art. 2. Vom Inhaber freigegeben.
- ../konzept.pdf: Konzept Version 2.4, fünf Seiten. Neu ist Abschnitt 4.2 mit derselben Regel; Aufnahme ab der 4. Primarklasse im Titelblock. Vom Inhaber freigegeben.
- ../vertrag_ersttermin.pdf: blanke Ersttermin-Vereinbarung, zwei Seiten; unverändert.
Vertrag v2.5 und Konzept v2.4 stammen aus einem anderen, ebenfalls ausserhalb des Repositorys gesicherten Generator. Layoutabweichungen gegenüber den Fassungen vom 26.10.2026 sind gewollt.

Freigegebener Soll-Stand für die Prüfung: baseline/vertrag-v2.5.pdf und baseline/konzept-v2.4.pdf (bytegleiche Kopien der freigegebenen Ausgaben) sowie baseline/vertrag-ersttermin-v2026.pdf. Die früheren Baselines vertrag-v2.4.pdf und konzept-v2.3.pdf bleiben als Nachweis der Vorgängerfassungen erhalten. Bestehende Familien behalten ihre unterschriebene Fassung, bis sie eine neue unterschreiben.
Der unfreigegebene Konzeptentwurf, seine Inhalte und der Dokumentgenerator werden ausserhalb dieses öffentlichen Repositorys aufbewahrt. Hier werden keine Entwürfe erzeugt.

Voraussetzungen: Python mit reportlab und pypdf, für Sichtprüfung Poppler. Diese Pakete sind im verwendeten Codex-PDF-Runtime enthalten. Keine neue Website-Abhängigkeit und kein Build-/Deployment-Workflow wurden eingerichtet.

Text-/Strukturprüfung:
  python _documents/verify_documents.py

Nur zur Rekonstruktion aus den Baselines (überschreibt content.json):
  python _documents/extract_contract_sources.py

Künftige Dokumentänderungen sind mit dem separat gesicherten Generator, Textprüfung und Rendering sämtlicher Seiten zu prüfen. Vertragsbedingungen, Preise und Fristen nur nach entsprechendem Auftrag ändern.
Die Prüfung verlangt für Vertrag v2.5 und Konzept v2.4 vollständige Textgleichheit mit dem freigegebenen Soll-Stand und denselben Wortlaut der Austrittsregel in beiden Dokumenten. Für die Ersttermin-Vereinbarung entfernt der Vergleich ausschliesslich zusätzliche Aufnahmegrenze, Layoutdatum, Seitennummern, wiederholte Seiten-/Footertexte sowie Aufzählungszeichen und grafische Leerlinien; der übrige Wortlaut muss identisch sein. „Layoutstand 26.10.2026“ ist kein neues Wirksamkeitsdatum. content.json und extract_contract_sources.py beziehen sich auf die historischen Baselines.

_documents/ beginnt mit einem Unterstrich und wird vom bestehenden Jekyll-Standardbuild nicht als Website-Inhalt verarbeitet. Das Repository selbst ist dennoch öffentlich. Keine privaten Dokumente, Schülerdaten oder unfreigegebenen Entwürfe hier ablegen. Die frühere Entwurfsdatei wurde vor der Veröffentlichung aus dem aktuellen Dateibaum entfernt; ältere Git-Commits und PRs bleiben öffentlich. Es wurde keine Vertraulichkeit der früher hochgeladenen Version hergestellt.

Offene fachliche Fragen und die noch fehlende Bearbeitungsmöglichkeit des externen Formulars stehen in offene-entscheidungen.txt.
