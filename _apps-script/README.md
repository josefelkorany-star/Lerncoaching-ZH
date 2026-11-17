# Ersttermin vereinbaren – unverbindliches Anfrageformular

Das Formular stellt eine unverbindliche Anfrage. Es entsteht weder ein Vertrag noch eine Buchung des Ersttermins. Verbindlich wird es erst mit der unterschriebenen Ersttermin-Vereinbarung beziehungsweise dem Anmeldevertrag.

Website und Formular verwenden «Ersttermin vereinbaren» und «Unverbindlich – wir melden uns persönlich bei dir.» Die Speicherquittung lautet: «Danke! Wir melden uns in der Regel innert 2–3 Werktagen. Für den Ersttermin schicken wir dir dann die Ersttermin-Vereinbarung zum Unterschreiben.» Anfragen ohne Vertrag werden nach zwölf Monaten gelöscht, auf Wunsch früher.

src/ enthält den vorbereiteten Servercode, die Formularoberfläche und das Manifest. tests/ und preview/ verwenden ausschliesslich erfundene Daten und nachgebildete Google- und Maildienste. Die Vorschau ist kein produktives Formular. Private Konfiguration und Betriebsprotokolle gehören nicht ins Repository.

Tests: node --test _apps-script/tests/requests.test.cjs aus dem Repository-Stamm. Die gepaarte Website-/Formularvorschau wird mit _preview/build-inquiry-preview.mjs ausserhalb des Repositorys erzeugt; siehe _preview/README.md.

Stand 17.11.2026: 33 Formularprüfungen bestanden. Die reale Google-Speicherung und Mailzustellung sind damit nicht geprüft. Dieser Code ist noch nicht veröffentlicht; Website und bestehendes Formular müssen gemeinsam umgestellt werden.
