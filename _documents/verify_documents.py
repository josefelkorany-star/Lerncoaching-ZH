"""Compare every contract word with the preserved blank original versions.

Only the approved admission sentence, layout date, page numbering, repeated
page labels, whitespace, bullet marks and drawn blank lines are excluded.
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

def main():
    results=[]
    for output,baseline,kind,pages in [
        ("vertrag.pdf","vertrag-v2.4.pdf","regular",4),
        ("vertrag_ersttermin.pdf","vertrag-ersttermin-v2026.pdf","trial",2),
    ]:
        before=normalized(read(HERE/"baseline"/baseline),kind)
        after=normalized(read(ROOT/output),kind,True)
        if before!=after:
            print("CONTENT MISMATCH: "+output)
            for line in difflib.unified_diff(before.split(),after.split(),fromfile="original",tofile="output",lineterm=""):
                print(line)
            raise SystemExit(1)
        r=PdfReader(ROOT/output)
        assert len(r.pages)==pages,(output,len(r.pages))
        assert read(ROOT/output).count(DATA["admission"])==1,output
        assert not r.get_fields(),output
        signature_pages=[i+1 for i,p in enumerate(r.pages) if "Unterschriften" in (p.extract_text() or "")]
        assert len(signature_pages)==1,signature_pages
        last_text=r.pages[signature_pages[0]-1].extract_text()
        assert last_text.count("Ort, Datum & Unterschrift")==2,output
        if kind=="regular":
            adults=[i for i,p in enumerate(r.pages) if "Option B — Volljährige" in (p.extract_text() or "")]
            assert len(adults)==1
            assert "Schulstufe / Ausbildung" in r.pages[adults[0]].extract_text()
        else:
            article4=[i for i,p in enumerate(r.pages) if "Art. 4" in (p.extract_text() or "")]
            assert len(article4)==1
            assert "Verbindliche Stornierungsfrist:" in r.pages[article4[0]].extract_text()
        # Exact text equality above also protects every amount, date and clause.
        amounts_before=Counter(re.findall(r"CHF\s+[\d.]+",before))
        amounts_after=Counter(re.findall(r"CHF\s+[\d.]+",after))
        assert amounts_before==amounts_after
        results.append({"file":output,"pages":pages,"contract_text_equal_except_approved_admission":True,"amounts_equal":True,"signatures_together_on_page":signature_pages[0],"no_interactive_fields_removed":True})

    original=PdfReader(HERE/"baseline"/"konzept-v2.3.pdf")
    updated=PdfReader(ROOT/"konzept.pdf")
    assert len(updated.pages)==len(original.pages)==4
    for i,(old,new) in enumerate(zip(original.pages,updated.pages)):
        old_text=compact(old.extract_text())
        new_text=compact((new.extract_text() or "").replace(DATA["admission"],""))
        assert old_text==new_text,("concept-page",i+1)
    assert read(ROOT/"konzept.pdf").count(DATA["admission"])==1
    results.append({"file":"konzept.pdf","pages":4,"all_original_text_preserved":True,"only_added_admission":True})

    draft=PdfReader(ROOT/"entwuerfe"/"konzept-entwurf.pdf")
    assert len(draft.pages)==2,len(draft.pages)
    assert all("ENTWURF" in p.extract_text() for p in draft.pages)
    text=read(ROOT/"entwuerfe"/"konzept-entwurf.pdf")
    assert DATA["admission"] in text
    assert "maximal vier Schüler:innen je Betreuungsperson" in text
    assert "höchstens zwölf Plätze" in text
    results.append({"file":"entwuerfe/konzept-entwurf.pdf","pages":2,"draft_mark_on_each_page":True})
    print(json.dumps({"status":"passed","checks":results},ensure_ascii=False,indent=2))

if __name__=="__main__":
    if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(encoding="utf-8")
    main()
