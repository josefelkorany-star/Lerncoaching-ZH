"""Build blank contract templates, a minimal concept update, and a separate draft.

No deployment, browser, network request or website modification is performed.
Run from any directory: python _documents/build_documents.py
Requires ReportLab and pypdf (available in the bundled Codex PDF runtime).
"""
from pathlib import Path
from io import BytesIO
import json
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable, Image,
)
from pypdf import PdfReader, PdfWriter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DATA = json.loads((HERE / "content.json").read_text(encoding="utf-8"))
NAVY = colors.HexColor("#0B2244")
TEAL = colors.HexColor("#1D9E75")
TEAL_DARK = colors.HexColor("#0F6E56")
MINT = colors.HexColor("#E1F5EE")
BG = colors.HexColor("#F5F7FA")
MUTED = colors.HexColor("#5A6F8A")
BORDER = colors.HexColor("#DCE5EE")
YELLOW = colors.HexColor("#FFF3CD")
PAGE_W, PAGE_H = A4
MARGIN = 46
WIDTH = PAGE_W - 2 * MARGIN

S = {
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.1, textColor=NAVY, spaceAfter=6.5, alignment=TA_LEFT),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.5, leading=11.3, textColor=NAVY, spaceAfter=4),
    "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=9.3, leading=12.5, textColor=NAVY),
    "white": ParagraphStyle("white", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.white),
    "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=12.2, leading=16, textColor=NAVY, spaceBefore=10, spaceAfter=7, keepWithNext=True),
    "sub": ParagraphStyle("sub", fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=TEAL_DARK, spaceBefore=6, spaceAfter=5, keepWithNext=True),
    "draft": ParagraphStyle("draft", fontName="Helvetica", fontSize=10.2, leading=14.6, textColor=NAVY, spaceAfter=8),
    "draft_h": ParagraphStyle("draft_h", fontName="Helvetica-Bold", fontSize=13.5, leading=17, textColor=NAVY, spaceBefore=10, spaceAfter=6, keepWithNext=True),
}

def p(text, style="body", bold=False):
    text = escape(text).replace("\n", "<br/>")
    return Paragraph(("<b>" + text + "</b>") if bold else text, S[style])

def heading(text):
    return [p(text, "h"), HRFlowable(width="100%", thickness=.65, color=MINT, spaceAfter=7)]

def box(text, background=MINT, style="body"):
    t = Table([[p(text, style)]], colWidths=[WIDTH], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), background),
        ("LINEBEFORE", (0,0), (0,-1), 2.5, TEAL if background == MINT else colors.HexColor("#E07B39")),
        ("LEFTPADDING", (0,0), (-1,-1), 11), ("RIGHTPADDING", (0,0), (-1,-1), 11),
        ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    return [t, Spacer(1, 6)]

def basic_table(rows, widths, header=True, font="small"):
    data = [[p(c, "white" if header and i == 0 else font) for c in row] for i,row in enumerate(rows)]
    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    cmds = [("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING",(0,0),(-1,-1),9), ("RIGHTPADDING",(0,0),(-1,-1),9), ("TOPPADDING",(0,0),(-1,-1),7), ("BOTTOMPADDING",(0,0),(-1,-1),5), ("LINEBELOW",(0,0),(-1,-1),.5,BORDER)]
    if header: cmds += [("BACKGROUND",(0,0),(-1,0),NAVY)]
    for i in range(1 if header else 0, len(rows)):
        cmds += [("BACKGROUND",(0,i),(-1,i),MINT if header and i%2 else BG)]
    t.setStyle(TableStyle(cmds))
    return [t, Spacer(1, 7)]

def form_rows(labels, title=None, title_color=TEAL):
    rows = []
    if title: rows.append([p(title,"white"), ""])
    rows += [[p(label,"label"), p("____________________________________________", "body")] for label in labels]
    t = Table(rows, colWidths=[162, WIDTH-162], hAlign="LEFT", splitByRow=0)
    cmds = [("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BACKGROUND",(0,0),(-1,-1),BG),("BACKGROUND",(0,0),(0,-1),MINT),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),("LINEBELOW",(0,0),(-1,-1),.35,BORDER)]
    if title: cmds += [("SPAN",(0,0),(-1,0)),("BACKGROUND",(0,0),(-1,0),title_color)]
    t.setStyle(TableStyle(cmds))
    return [t, Spacer(1,10)]

def provider(text):
    t=Table([[p("Anbieter","label"),p(text)]],colWidths=[110,WIDTH-110])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),BG),("BACKGROUND",(0,0),(0,0),MINT),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    return [t,Spacer(1,10)]

def title_block(title, subtitle, version):
    big=ParagraphStyle("big",fontName="Helvetica-Bold",fontSize=20,leading=23,textColor=colors.white)
    light=ParagraphStyle("light",fontName="Helvetica",fontSize=10,leading=14,textColor=colors.HexColor("#7FD3BA"))
    rows=[[Paragraph("LERNCOACHING ZH",big)], [Paragraph(escape(title),ParagraphStyle("title",parent=light,fontName="Helvetica-Bold",fontSize=13,leading=17))], [Paragraph(escape(subtitle)+"<br/>"+escape(version),light)]]
    t=Table(rows,colWidths=[WIDTH])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY),("LEFTPADDING",(0,0),(-1,-1),14),("RIGHTPADDING",(0,0),(-1,-1),14),("TOPPADDING",(0,0),(-1,0),12),("BOTTOMPADDING",(0,-1),(-1,-1),10)]))
    return [t,Spacer(1,12)]

def signatures(text, regular=True):
    right="Erziehungsberechtigte/r (Option A)\noder Teilnehmende Person (Option B)\nName in Druckschrift" if regular else "Erziehungsberechtigte/r\nName in Druckschrift"
    # One unsplittable table: party labels and their signature lines stay together.
    rows=[[p("Lerncoaching ZH\nJosef El Korany","label"),p(right,"label")], [p("___________________________________\nOrt, Datum & Unterschrift","small"),p("___________________________________\nOrt, Datum & Unterschrift","small")]]
    t=Table(rows,colWidths=[WIDTH/2,WIDTH/2],rowHeights=[56,43],splitByRow=0)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),BG),("VALIGN",(0,0),(-1,-1),"TOP"),("VALIGN",(0,1),(-1,1),"BOTTOM"),("LINEAFTER",(0,0),(0,-1),.7,BORDER),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    return [KeepTogether(heading("Unterschriften")+[p(text),Spacer(1,4),t])]

class FooterCanvas(canvas.Canvas):
    def __init__(self,*args, source_footer="", label="", draft=False, **kwargs):
        super().__init__(*args,**kwargs)
        self.states=[]; self.source_footer=source_footer;self.label=label;self.draft=draft
    def showPage(self):
        self.states.append(dict(self.__dict__))
        self._startPage()
    def save(self):
        total=len(self.states)
        for state in self.states:
            self.__dict__.update(state)
            self.setStrokeColor(BORDER);self.setLineWidth(.5)
            self.line(MARGIN,55,PAGE_W-MARGIN,55)
            self.setFillColor(MUTED);self.setFont("Helvetica",6.8)
            self.drawCentredString(PAGE_W/2,44,DATA["footer"])
            if self.source_footer: self.drawCentredString(PAGE_W/2,34,self.source_footer)
            self.setFont("Helvetica",7.2)
            self.drawString(MARGIN,23,"ENTWURF - 26.10.2026" if self.draft else DATA["layout_version"])
            self.drawRightString(PAGE_W-MARGIN,23,f"Seite {self._pageNumber} von {total}")
            if self._pageNumber>1 and not self.draft:
                self.setFillColor(MUTED);self.setFont("Helvetica",7.5)
                self.drawString(MARGIN,PAGE_H-29,"Lerncoaching ZH | "+self.label)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

def build_contracts():
    r=DATA["regular"]
    story=title_block("ANMELDEVERTRAG","Nachhilfe & Coaching",r["version"])
    story+=box(r["legal"],YELLOW,"small")+heading("Art. 1   Vertragsparteien")+[p(r["parties_intro"])]
    story+=provider(r["provider"])
    story+=form_rows(["Erziehungsberechtigte/r\n(Name, Vorname)","Strasse & Hausnummer","PLZ & Wohnort","Tel. / E-Mail","Name, Vorname Kind\n(Minderjährige/r)","Schulstufe","Ggf. weiteres Kind"],"Option A — Minderjährige (unter 18 Jahre)")
    story+=form_rows(["Name, Vorname\n(Teilnehmende Person)","Strasse & Hausnummer","PLZ & Wohnort","Tel. / E-Mail","Schulstufe / Ausbildung"],"Option B — Volljährige Teilnehmende (ab 18 Jahre)",NAVY)
    story+=[PageBreak()]
    story+=heading("Art. 2   Gegenstand und Leistungen")+[p(r["subject"]),p(DATA["admission"],bold=True)]
    story+=box(r["double_lesson"],YELLOW)
    story+=[p("- "+x) for x in r["services"]]
    story+=box(r["holidays"])+box(r["team"],BG)
    story+=heading("Art. 3   Laufzeit, Anmeldung und Kündigung")+[p(r["term"])]
    story+=basic_table([["Quartal","Zeitraum","Kündigungsfrist"],["Q1","August – Oktober","31. Oktober"],["Q2","November – Januar","31. Januar"],["Q3","Februar – April","30. April"],["Q4","Mai – Juli","31. Juli"]],[70,WIDTH-210,140])
    story+=[p(r["termination"])]+box(r["registration_fee"],YELLOW)+[p(r["trial"]),p(r["entry"]),PageBreak()]
    story+=heading("Art. 4   Vergütung, Treuerabatt und Zahlungsmodalitäten")+[p(r["pricing"])]
    story+=basic_table([["Paket","Preis pro Doppellektion / Kind","Referenz: 4 Samstage/Monat"],["1 Kind","CHF 40.–","CHF 160.–"],["2 Geschwister","CHF 35.– pro Kind","CHF 280.–"],["3 Geschwister","CHF 30.– pro Kind","CHF 360.–"]],[110,190,WIDTH-300])
    story+=box(r["loyalty"])+[p(r["payment"]),p("Zahlungsverzug und Mahnwesen","sub"),p(r["late_intro"])]
    story+=[p(x) for x in r["late_steps"]]+[p(r["late_end"])]
    story+=heading("Art. 5   Absenzen und Ausfall")+[p(r["absence"]),p(r["illness"]),p(r["cancellation"]),PageBreak()]
    for label,key in [("Art. 6   Verhalten und Hausordnung","conduct"),("Art. 7   Haftungsbeschränkung und Aufsichtspflicht","liability")]:
        story+=heading(label)+[p(r[key])]
    story+=[p(r["supervision"])]
    for label,key in [("Art. 8   Datenschutz (DSG)","privacy"),("Art. 9   Online-Nachhilfe","online"),("Art. 10   Salvatorische Klausel und anwendbares Recht","law")]:
        story+=heading(label)+[p(r[key])]
    story+=signatures(r["signature"])
    doc=SimpleDocTemplate(str(ROOT/"vertrag.pdf"),pagesize=A4,leftMargin=MARGIN,rightMargin=MARGIN,topMargin=43,bottomMargin=65,title="Lerncoaching ZH - Anmeldevertrag",author="Lerncoaching ZH")
    doc.build(story,canvasmaker=lambda *a,**kw:FooterCanvas(*a,source_footer=r["source_footer"],label="Anmeldevertrag",**kw))

    r=DATA["trial"]
    story=title_block("ERSTTERMIN-VEREINBARUNG","Probedoppellektion",r["version"])+box(r["intro"])
    story+=heading("Art. 1   Vertragsparteien")+provider(r["provider"])
    story+=form_rows(["Erziehungsberechtigte/r","Kind / Schüler:in","Schulstufe"])
    story+=heading("Art. 2   Gegenstand")+[p(r["subject"]),p(DATA["admission"],bold=True)]
    story+=form_rows(["Datum Ersttermin","Fächer / Themen"])
    story+=heading("Art. 3   Gebühr und Zahlungspflicht")+box(r["fee_label"])+[p(r["fee"]),PageBreak()]
    story+=heading("Art. 4   Stornierung und Absenz — Zahlungspflicht")+box(r["deadline"],YELLOW)+[p(r["absence_intro"])]
    story+=[p("- "+x) for x in r["absence_reasons"]]+[p(r["explanation"])]
    story+=heading("Art. 5   Folgebuchung")+[p(r["followup"])]
    story+=heading("Art. 6   Anwendbares Recht und Gerichtsstand")+[p(r["law"])]
    story+=signatures(r["signature"],False)
    doc=SimpleDocTemplate(str(ROOT/"vertrag_ersttermin.pdf"),pagesize=A4,leftMargin=MARGIN,rightMargin=MARGIN,topMargin=43,bottomMargin=65,title="Lerncoaching ZH - Ersttermin-Vereinbarung",author="Lerncoaching ZH")
    doc.build(story,canvasmaker=lambda *a,**kw:FooterCanvas(*a,source_footer=r["source_footer"],label="Ersttermin-Vereinbarung",**kw))

def update_original_concept():
    # Keep every original page/object/content unchanged except this added header line.
    base=PdfReader(HERE/"baseline"/"konzept-v2.3.pdf")
    overlay=BytesIO()
    c=canvas.Canvas(overlay,pagesize=A4)
    c.setFont("Helvetica",10)
    c.setFillColor(colors.HexColor("#7FD3BA"))
    c.drawString(88.86614,PAGE_H-134,DATA["admission"])
    c.save();overlay.seek(0)
    writer=PdfWriter();writer.clone_document_from_reader(base)
    writer.pages[0].merge_page(PdfReader(overlay).pages[0])
    with (ROOT/"konzept.pdf").open("wb") as f:writer.write(f)

def draft_header(page_label):
    logo=Image(str(ROOT/"logo.png"),width=218,height=218*147/460)
    status=Paragraph("ENTWURF<br/><font size=9>26.10.2026<br/>Zur inhaltlichen Abstimmung</font>",ParagraphStyle("draft_status",fontName="Helvetica-Bold",fontSize=13,leading=17,textColor=TEAL_DARK,alignment=2))
    t=Table([[logo,status]],colWidths=[280,WIDTH-280])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),12)]))
    label=p(page_label,"white")
    band=Table([[label]],colWidths=[WIDTH])
    band.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY),("LEFTPADDING",(0,0),(-1,-1),13),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10)]))
    return [t,band,Spacer(1,14)]

def build_draft():
    d=json.loads((HERE/"draft_content.json").read_text(encoding="utf-8"))
    story=draft_header("1 | Angebot und Arbeitsweise")
    story+=[p(d["title"],"draft_h"),p(d["intro"],"draft")]
    story+=box(d["audience"],MINT,"draft")
    for h,body in d["page1_sections"]:
        story+=[p(h,"draft_h"),p(body,"draft")]
    story+=[p("Vier Kompetenzen im Lernalltag","draft_h")]
    skill_rows=[]
    for i in range(0,4,2):
        skill_rows.append([p(d["skills"][i][0]+"\n"+d["skills"][i][1],"draft"),p(d["skills"][i+1][0]+"\n"+d["skills"][i+1][1],"draft")])
    skills=Table(skill_rows,colWidths=[WIDTH/2,WIDTH/2])
    skills.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),BG),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),11),("RIGHTPADDING",(0,0),(-1,-1),11),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),6),("INNERGRID",(0,0),(-1,-1),4,colors.white)]))
    story+=[skills,Spacer(1,8)]+box(d["capacity"],MINT,"draft")+[PageBreak()]
    story+=draft_header("2 | Begleitung und Organisation")
    for h,body in d["page2_sections"]:
        story+=[p(h,"draft_h"),p(body,"draft")]
    story+=[p("Bestehender organisatorischer Rahmen","draft_h")]
    story+=basic_table([["Vor Ort","Samstags, 09:30–11:30 Uhr, einschliesslich Pause"],["Standort","Dörflistrasse 67, 8050 Zürich"],["Online-Nachhilfe","Auf Anfrage; separat vereinbarte Einzeltermine"],["Kontakt","+41 76 282 92 44 · zhlerncoaching@gmail.com"]],[112,WIDTH-112],header=False,font="draft")
    story+=box(d["terms"],YELLOW,"draft")
    story+=[p(d["status_note"],"small")]
    out=ROOT/"entwuerfe"/"konzept-entwurf.pdf";out.parent.mkdir(exist_ok=True)
    doc=SimpleDocTemplate(str(out),pagesize=A4,leftMargin=MARGIN,rightMargin=MARGIN,topMargin=43,bottomMargin=65,title="ENTWURF - Lerncoaching ZH Konzept",author="Lerncoaching ZH")
    doc.build(story,canvasmaker=lambda *a,**kw:FooterCanvas(*a,draft=True,**kw))

if __name__=="__main__":
    update_original_concept()
    build_contracts()
    build_draft()
    for f in [ROOT/"konzept.pdf",ROOT/"vertrag.pdf",ROOT/"vertrag_ersttermin.pdf",ROOT/"entwuerfe"/"konzept-entwurf.pdf"]:
        print(f"{f.relative_to(ROOT)}: {len(PdfReader(f).pages)} pages, {f.stat().st_size} bytes")
