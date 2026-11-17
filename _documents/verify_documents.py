"""Compare the published documents with the approved blank versions.

Anmeldevertrag Version 2026/2.5 and Konzept Version 2.4 must be text-identical
to the approved copies in baseline/, and both must state the exit rule decided
on 6.11.2026 in the same words. The Ersttermin agreement is still compared
with its preserved original: only the approved admission sentence, layout
date, page numbering, repeated page labels, whitespace, bullet marks and drawn
blank lines are excluded there.
"""
from pathlib import Path
from collections import Counter
import difflib
import json
import re
import sys
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
DATA=json.loads((HERE/"content.json").read_text(encoding="utf-8"))

# Approved wording of the exit rule, identical in Anmeldevertrag Art. 3 and Konzept 4.2.
EXIT_RULE=[
    "Eine Kündigung per Quartalsende ist kostenlos, wenn sie spätestens am letzten Tag des laufenden Quartals eingeht.",
    "1 Kind CHF 160.– (mit Treuerabatt CHF 145.–), 2 Geschwister CHF 280.–, 3 Geschwister CHF 360.–.",
    "Geschuldet ist höchstens, was ab dem Austritt bis Quartalsende noch angefallen wäre.",
    "Bereits bezahlte Samstage nach dem Austritt werden an die Pauschale angerechnet; ein allfälliger Überschuss wird zurückerstattet.",
    "Keine Pauschale ist geschuldet, wenn Lerncoaching ZH begründeten Anlass zur Kündigung gegeben hat.",
]
WEBSITE_AMOUNTS="1 Kind CHF 160.– (mit Treuerabatt CHF 145.–), 2 Geschwister CHF 280.–, 3 Geschwister CHF 360.–"

def read(path):
    return " ".join(page.extract_text() or "" for page in PdfReader(path).pages)

def compact(text):
    return re.sub(r"\s+"," ",text).strip()

def normalized(text,kind,output=False):
    text=compact(text)
    # Remove repeated metadata, never substantive contract clauses.
    for value in [DATA["footer"],DATA[kind]["source_footer"]]:
        text=text.replace(compact(value),"")
    if output:
        text=text.replace(DATA["admission"],"")
        text=text.replace(DATA["layout_version"],"")
        text=re.sub(r"Seite \d+ von \d+", "",text)
        label="Anmeldevertrag" if kind=="regular" else "Ersttermin-Vereinbarung"
        text=text.replace("Lerncoaching ZH | "+label,"")
    text=re.sub(r"_+","",text)
    text=text.replace("\x7f","").replace("■","")
    text=re.sub(r"(?<!\S)-(?=\s)","",text)
    return compact(text)

def check_approved(output,baseline,pages,version):
    approved=PdfReader(HERE/"baseline"/baseline)
    published=PdfReader(ROOT/output)
    assert len(approved.pages)==len(published.pages)==pages,(output,len(published.pages))
    for i,(a,p) in enumerate(zip(approved.pages,published.pages)):
        before=compact(a.extract_text() or "")
        after=compact(p.extract_text() or "")
        if before!=after:
            print("CONTENT MISMATCH: "+output+", Seite "+str(i+1))
            for line in difflib.unified_diff(before.split(),after.split(),fromfile="approved",tofile="output",lineterm=""):
                print(line)
            raise SystemExit(1)
    text=compact(read(ROOT/output))
    assert version in text,(output,version)
    assert text.count(DATA["admission"])==1,output
    assert "ß" not in text,output
    for sentence in EXIT_RULE:
        assert text.count(sentence)==1,(output,sentence)
    assert not published.get_fields(),output
    return published

def main():
    results=[]

    contract=check_approved("vertrag.pdf","vertrag-v2.5.pdf",5,"Version 2026 / 2.5")
    signature_pages=[i+1 for i,p in enumerate(contract.pages) if "Unterschriften" in (p.extract_text() or "")]
    assert len(signature_pages)==1,signature_pages
    assert contract.pages[signature_pages[0]-1].extract_text().count("Ort, Datum & Unterschrift")==2
    adults=[i for i,p in enumerate(contract.pages) if "Option B — Volljährige" in (p.extract_text() or "")]
    assert len(adults)==1
    assert "Schulstufe / Ausbildung" in contract.pages[adults[0]].extract_text()
    results.append({"file":"vertrag.pdf","pages":5,"version":"2026/2.5","identical_to_approved":True,"exit_rule_wording":True,"signatures_together_on_page":signature_pages[0]})

    check_approved("konzept.pdf","konzept-v2.4.pdf",5,"Version 2.4 | 2026")
    results.append({"file":"konzept.pdf","pages":5,"version":"2.4","identical_to_approved":True,"exit_rule_wording":True})

    before=normalized(read(HERE/"baseline"/"vertrag-ersttermin-v2026.pdf"),"trial")
    after=normalized(read(ROOT/"vertrag_ersttermin.pdf"),"trial",True)
    if before!=after:
        print("CONTENT MISMATCH: vertrag_ersttermin.pdf")
        for line in difflib.unified_diff(before.split(),after.split(),fromfile="original",tofile="output",lineterm=""):
            print(line)
        raise SystemExit(1)
    r=PdfReader(ROOT/"vertrag_ersttermin.pdf")
    assert len(r.pages)==2,len(r.pages)
    assert read(ROOT/"vertrag_ersttermin.pdf").count(DATA["admission"])==1
    assert not r.get_fields()
    signature_pages=[i+1 for i,p in enumerate(r.pages) if "Unterschriften" in (p.extract_text() or "")]
    assert len(signature_pages)==1,signature_pages
    assert r.pages[signature_pages[0]-1].extract_text().count("Ort, Datum & Unterschrift")==2
    article4=[i for i,p in enumerate(r.pages) if "Art. 4" in (p.extract_text() or "")]
    assert len(article4)==1
    assert "Verbindliche Stornierungsfrist:" in r.pages[article4[0]].extract_text()
    assert Counter(re.findall(r"CHF\s+[\d.]+",before))==Counter(re.findall(r"CHF\s+[\d.]+",after))
    results.append({"file":"vertrag_ersttermin.pdf","pages":2,"contract_text_equal_except_approved_admission":True,"amounts_equal":True,"signatures_together_on_page":signature_pages[0]})

    html=(ROOT/"index.html").read_text(encoding="utf-8")
    assert html.count(WEBSITE_AMOUNTS)==2,"Austrittsbeträge auf der Website"
    assert "Version 2026/2.5" in html,"Aktuelle Vertragsfassung auf der Website"
    assert "begründeten Anlass zur Kündigung" in html
    results.append({"file":"index.html","exit_rule_amounts_in_rules_and_faq":True,"current_version_named":True})

    assert not (ROOT/"entwuerfe"/"konzept-entwurf.pdf").exists(), "Unapproved draft in public output"
    assert not (HERE/"draft_content.json").exists(), "Draft content in public repository"
    results.append({"unapproved_concept_draft_absent_from_current_tree":True})
    print(json.dumps({"status":"passed","checks":results},ensure_ascii=False,indent=2))

if __name__=="__main__":
    if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(encoding="utf-8")
    main()
