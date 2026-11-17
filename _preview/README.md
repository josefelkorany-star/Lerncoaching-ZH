# Private Website- und Formularvorschau

Die Vorschaugeneratoren kopieren den vorgesehenen Website-Code und seine benötigten Dateien in einen Ausgabeordner ausserhalb des Repositorys. Sie veröffentlichen nichts und ändern keine Hosting-Einstellung.

## Website

Mit vorhandenem Node.js: node _preview/build-preview.mjs ../preview-output

index.html entspricht dem Website-Kandidaten und enthält den echten Formularzugang. vorschau.html ist die private Designansicht; nur hier erscheint der noch nicht aktivierte Google-Bewertungsbereich. Ohne bestätigten Bewertungslink bleibt er in der Produktionsfassung verborgen. source-manifest.json enthält die Prüfsummen der kopierten Dateien.

## Gepaarte Anfragevorschau

Mit vorhandenem Node.js: node _preview/build-inquiry-preview.mjs ../inquiry-preview

Formularsimulator: node _apps-script/preview/server.cjs

Website-Vorschau in einem zweiten Terminal: node _preview/serve-preview.mjs ../inquiry-preview

Die private Ansicht auf Port 4176 unter /vorschau.html verwendet ausschliesslich den Formularsimulator auf Port 4175. Er verwendet erfundene Daten im Arbeitsspeicher und fängt Benachrichtigungen ab. Die mitgelieferte index.html bleibt dagegen der Website-Kandidat mit echtem externem Formular; sie ist keine Testformularseite.

Browserprüfungen durch Codex sind ausschliesslich in einer isolierten Cloud-Umgebung erlaubt. Das Cloud-Prüfskript _tests/inquiry-browser.cjs verweigert einen lokalen Browserstart. Reale Formularanfragen erfordern eine gesonderte ausdrückliche Freigabe.

Die Vorschau enthält die aktuellen Standarddownloads. Private Vertrags- und Konzeptentwürfe sowie Betriebsprotokolle gehören nicht in das öffentliche Repository. Anleitungen zu den Formularprüfungen stehen unter _apps-script/README.md.
