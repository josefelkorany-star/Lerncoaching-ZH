Dokumentquellen und Nachweise - Lerncoaching ZH

Die baseline/ enthält ausschliesslich unveränderte blanke Vorlagen aus dem Repository-Stand 653de67f819a9accd79b70b5206ab42beeda080a, keine ausgefüllten Schülerverträge.
Es gab keine editierbaren Ursprungsdateien. content.json wurde aus den Original-PDFs rekonstruiert und enthält die überprüfbaren Textblöcke. build_documents.py definiert den nachvollziehbaren Seitenaufbau.

Ausgaben:
- ../konzept.pdf: bisherige vierseitige Fassung; nur die Aufnahmegrenze wurde im Titelblock ergänzt.
- ../vertrag.pdf: blanker Hauptvertrag, vier Seiten; Aufnahme ab der 4. Primarklasse sowie Layoutkorrekturen.
- ../vertrag_ersttermin.pdf: blanke Ersttermin-Vereinbarung, zwei Seiten; Aufnahmegrenze und Layoutkorrekturen.
- ../entwuerfe/konzept-entwurf.pdf: separater zweiseitiger Entwurf. Kein Ersatz des Standard-Downloads, keine Freigabe zur Veröffentlichung.

Voraussetzungen: Python mit reportlab und pypdf, für Sichtprüfung Poppler. Diese Pakete sind im verwendeten Codex-PDF-Runtime enthalten. Keine neue Website-Abhängigkeit und kein Build-/Deployment-Workflow wurden eingerichtet.

Build:
  python _documents/build_documents.py

Text-/Strukturprüfung:
  python _documents/verify_documents.py

Nur zur Rekonstruktion aus den Baselines (überschreibt content.json):
  python _documents/extract_contract_sources.py

Änderungen an content.json oder draft_content.json sind danach mit Build, Textprüfung und Rendering sämtlicher Seiten zu prüfen. Vertragsbedingungen, Preise und Fristen nur nach entsprechendem Auftrag ändern.
Der Vergleich entfernt ausschliesslich zusätzliche Aufnahmegrenze, Layoutdatum, Seitennummern, wiederholte Seiten-/Footertexte sowie Aufzählungszeichen und grafische Leerlinien. Der übrige Vertragswortlaut muss identisch sein. Die ursprünglichen Versionsangaben bleiben erhalten; „Layoutstand 26.10.2026“ ist kein neues Wirksamkeitsdatum.

_documents/ beginnt mit einem Unterstrich und wird vom bestehenden Jekyll-Standardbuild nicht als öffentlicher Website-Inhalt verarbeitet. Der Entwurf in entwuerfe/ ist separat und nicht im Standard-Download verlinkt; ein späterer Merge würde diese PDF-Datei dennoch mit veröffentlichen. Dieser Auftrag erstellt ausschliesslich einen PR und veröffentlicht nichts.

Offene fachliche Fragen und die noch fehlende Bearbeitungsmöglichkeit des externen Formulars stehen in offene-entscheidungen.txt.
