"""Reconstruct editable text blocks from the unchanged blank baseline PDFs.

Run only to reconstruct content.json from the original versions. The normal
build reads content.json and does not overwrite editorial changes to it.
"""
from pathlib import Path
import json
import re
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent

def read(name):
    return re.sub(r"\s+", " ", " ".join(p.extract_text() for p in PdfReader(HERE / "baseline" / name).pages)).strip()

def span(text, start, end):
    assert text.count(start) == 1, (start, text.count(start))
    remainder = text.split(start, 1)[1]
    assert end in remainder, end
    return remainder.split(end, 1)[0].strip()

def incl(text, start, end):
    return start + " " + span(text, start, end)

regular = read("vertrag-v2.4.pdf")
trial = read("vertrag-ersttermin-v2026.pdf")
foot = "Lerncoaching ZH · Dörflistrasse 67, 8050 Zürich · +41 76 282 92 44 · zhlerncoaching@gmail.com · www.lerncoaching-zh.ch"

data = {
    "admission": "Aufnahme ab der 4. Primarklasse.",
    "layout_version": "Layoutstand 26.10.2026",
    "footer": foot,
    "regular": {
        "version": "Version 2026 / 2.4",
        "legal": incl(regular, "Rechtlicher Hinweis:", "Art. 1"),
        "parties_intro": span(regular, "Art. 1 Vertragsparteien", "Anbieter"),
        "provider": span(regular, "Anbieter", "Option A"),
        "subject": span(regular, "Art. 2 Gegenstand und Leistungen", "■ Ausschliesslich"),
        "double_lesson": incl(regular, "Ausschliesslich Doppellektionen", "\x7f Individueller"),
        "services": [
            "Individueller Lernplan (Diagnostik, Zielsetzung, Fortschrittskontrolle)",
            "Fachliche Nachhilfe in vereinbarten Fächern",
            "Soft Skills: Problemlösung, Organisation, Selbstregulation, Kommunikation",
            "Eltern-Feedback auf Anfrage"
        ],
        "holidays": incl(regular, "Ferienregelung & Kulanz:", "■ Teambasierte"),
        "team": incl(regular, "Teambasierte Betreuung:", "Art. 3"),
        "term": span(regular, "Art. 3 Laufzeit, Anmeldung und Kündigung", "Quartal Zeitraum Kündigungsfrist"),
        "termination": incl(regular, "Kündigung schriftlich", "■ Einmalige"),
        "registration_fee": incl(regular, "Einmalige Anmeldungsgebühr:", "Ersttermin / Probetag:"),
        "trial": incl(regular, "Ersttermin / Probetag:", "Eintritt jederzeit"),
        "entry": incl(regular, "Eintritt jederzeit", "Art. 4"),
        "pricing": span(regular, "Art. 4 Vergütung, Treuerabatt und Zahlungsmodalitäten", "Paket Preis pro Doppellektion / Kind"),
        "loyalty": incl(regular, "Treuerabatt:", "Die Zahlung erfolgt"),
        "payment": incl(regular, "Die Zahlung erfolgt", "Zahlungsverzug und Mahnwesen"),
        "late_intro": span(regular, "Zahlungsverzug und Mahnwesen", "1. Zahlungserinnerung"),
        "late_steps": [
            incl(regular, "1. Zahlungserinnerung", "2. 1. Mahnung"),
            incl(regular, "2. 1. Mahnung", "3. 2. Mahnung"),
            incl(regular, "3. 2. Mahnung", "4. Danach"),
            incl(regular, "4. Danach", "Die Mahngebühren")
        ],
        "late_end": incl(regular, "Die Mahngebühren", "Art. 5"),
        "absence": span(regular, "Art. 5 Absenzen und Ausfall", "Lerncoaching ZH kann bei krankheitsbedingter"),
        "illness": incl(regular, "Lerncoaching ZH kann bei krankheitsbedingter", "Ausfall durch Lerncoaching ZH:"),
        "cancellation": incl(regular, "Ausfall durch Lerncoaching ZH:", "Art. 6"),
        "conduct": span(regular, "Art. 6 Verhalten und Hausordnung", "Art. 7"),
        "liability": span(regular, "Art. 7 Haftungsbeschränkung und Aufsichtspflicht", "Die Aufsichtspflicht"),
        "supervision": incl(regular, "Die Aufsichtspflicht", "Art. 8"),
        "privacy": span(regular, "Art. 8 Datenschutz (DSG)", "Art. 9"),
        "online": span(regular, "Art. 9 Online-Nachhilfe", "Art. 10"),
        "law": span(regular, "Art. 10 Salvatorische Klausel und anwendbares Recht", "Unterschriften"),
        "signature": span(regular, "Unterschriften", "Lerncoaching ZH Josef El Korany Erziehungsberechtigte/r"),
        "source_footer": "Josef El Korany, handelnd unter Lerncoaching ZH · Anmeldevertrag Version 2026/2.4 · Gerichtsstand Zürich"
    },
    "trial": {
        "version": "Version 2026",
        "intro": span(trial, "Probedoppellektion Version 2026", "Art. 1"),
        "provider": span(trial, "Anbieter", "Erziehungsberechtigte/r"),
        "subject": span(trial, "Art. 2 Gegenstand", "Datum Ersttermin"),
        "fee_label": span(trial, "Art. 3 Gebühr und Zahlungspflicht", "Die Gebühr von"),
        "fee": incl(trial, "Die Gebühr von", "Art. 4"),
        "deadline": incl(trial, "Verbindliche Stornierungsfrist:", "Die Zahlungspflicht gilt"),
        "absence_intro": incl(trial, "Die Zahlungspflicht gilt", "\x7f Krankheit"),
        "absence_reasons": [
            "Krankheit oder sonstiger Verhinderung des Kindes",
            "Vergessen oder kurzfristiger Planänderung",
            "Abwesenheit ohne Absage (No-Show)"
        ],
        "explanation": incl(trial, "Begründung:", "Art. 5"),
        "followup": span(trial, "Art. 5 Folgebuchung", "Art. 6"),
        "law": span(trial, "Art. 6 Anwendbares Recht und Gerichtsstand", "Unterschriften"),
        "signature": span(trial, "Unterschriften", "Lerncoaching ZH Josef El Korany Erziehungsberechtigte/r"),
        "source_footer": "Josef El Korany, handelnd unter Lerncoaching ZH · Ersttermin-Vereinbarung Version 2026 · Gerichtsstand Zürich"
    }
}

for section in (data["regular"], data["trial"]):
    for key, value in section.items():
        if isinstance(value, str):
            section[key] = value.replace("■", "").strip()

(HERE / "content.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print("Wrote _documents/content.json from blank baseline PDFs.")
