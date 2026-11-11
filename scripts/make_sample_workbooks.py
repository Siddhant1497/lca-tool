"""
Builds a sample filled IGBC calculation workbook for each rating system, in the layout the
IGBC Narrative Builder reads: workbook-level defined names pointing at single cells on the
credit tabs, a "Name Index" sheet (B = name, C = description, D = location, from row 4),
and SC_ID / SC_TARGET ranges for the credits targeted.

Figures are the builder's own worked example ("SAMPLE DATA – Test Tower"), not a real project.
Usage: python3 scripts/make_sample_workbooks.py  → docs/samples/IGBC_<rating>_SAMPLE.xlsx
"""
import json, re, pathlib
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.styles import Font, PatternFill

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'src/data/narratives/igbc.json').read_text(encoding='utf8'))
OUT = ROOT / 'docs/samples'; OUT.mkdir(parents=True, exist_ok=True)
# Names the builder uses to recognise each rating (first match wins in the reader).
DETECT = {'svc': 'SV_Type', 'wh': 'WH_Category', 'fac': 'Fac_Type', 'nb3': 'SA1_Meet', 'homes': 'Num_DU', 'nb': 'BLD_NAME'}
HEAD = Font(bold=True, color='FFFFFF'); FILL = PatternFill('solid', fgColor='0F766E'); YELLOW = PatternFill('solid', fgColor='FFF2CC')

def raw(text, fmt):
    """Turn a formatted figure back into the cell value Excel would hold."""
    if text is None or text == '': return None
    if fmt == '@': return text
    t = text.replace(',', '')
    try:
        if fmt.endswith('%') and t.endswith('%'): return round(float(t[:-1]) / 100, 6)
        n = float(t); return int(n) if n.is_integer() and '.' not in fmt else n
    except ValueError:
        return text

def sheet_of(label):
    m = re.search(r'\(([^()]*)\)\s*$', label or '')
    return m.group(1).strip() if m else 'Project Inputs'

def safe_title(s): return re.sub(r'[\\/*?:\[\]]', '-', s)[:31]

for key, R in DATA.items():
    S = R['sample']; wb = Workbook(); wb.remove(wb.active)
    sheets, rows = {}, {}
    def ws_for(name):
        t = safe_title(name)
        if t not in sheets:
            ws = wb.create_sheet(t); ws['A1'] = f"{R['title']} – {t}"; ws['A1'].font = Font(bold=True, size=13)
            ws['B3'], ws['C3'] = 'Item', 'Value'
            for c in ('B3', 'C3'): ws[c].font, ws[c].fill = HEAD, FILL
            ws.column_dimensions['B'].width = 70; ws.column_dimensions['C'].width = 26
            sheets[t] = ws; rows[t] = 4
        return sheets[t], t
    index = []
    def put(name, value, label, sheet_name):
        ws, t = ws_for(sheet_name); r = rows[t]; rows[t] += 1
        ws.cell(r, 2, label); c = ws.cell(r, 3, value); c.fill = YELLOW
        ref = f"'{t}'!$C${r}"
        wb.defined_names[name] = DefinedName(name, attr_text=ref)
        index.append((name, label.rsplit(' (', 1)[0] if label else name, f"{t}!C{r}"))
    seen = set()
    for name, fmt in R['tokens']:
        if name in seen: continue
        seen.add(name)
        label = S['labels'].get(name, name)
        put(name, raw(S['values'].get(f'{name}|{fmt}'), fmt), label, sheet_of(S['labels'].get(name)) if name in S['labels'] else 'Project Inputs')
    # Fields the reader needs that may not appear as tokens.
    extras = {'Proj_Name': S['project'], 'Total_Points': S['totals'].get('pts'), 'Cert_Level': S['totals'].get('level'),
              'Mandatory_All': S['totals'].get('mand'), 'Proj_Stage': S['totals'].get('stage')}
    for n, v in extras.items():
        if n not in seen and v is not None: put(n, v, n.replace('_', ' '), 'Project Inputs'); seen.add(n)
    det = DETECT[key]
    if det not in seen: put(det, 'Sample', 'Rating identifier', 'Project Inputs'); seen.add(det)
    # Scorecard: credit ids and targets.
    sc = wb.create_sheet('Credit Targets'); sc['A1'] = 'Credit targets'; sc['A1'].font = Font(bold=True, size=13)
    sc['B3'], sc['C3'] = 'Credit', 'Targeted'
    for c in ('B3', 'C3'): sc[c].font, sc[c].fill = HEAD, FILL
    tg = [(k, v) for k, v in S['targets'].items() if v is not None]
    for i, (cid, v) in enumerate(tg):
        sc.cell(4 + i, 2, cid); sc.cell(4 + i, 3, v)
    last = 3 + len(tg)
    wb.defined_names['SC_ID'] = DefinedName('SC_ID', attr_text=f"'Credit Targets'!$B$4:$B${last}")
    wb.defined_names['SC_TARGET'] = DefinedName('SC_TARGET', attr_text=f"'Credit Targets'!$C$4:$C${last}")
    ni = wb.create_sheet('Name Index'); ni['B3'], ni['C3'], ni['D3'] = 'Name', 'Description', 'Location'
    for c in ('B3', 'C3', 'D3'): ni[c].font, ni[c].fill = HEAD, FILL
    for i, (n, d, loc) in enumerate(index): ni.cell(4 + i, 2, n); ni.cell(4 + i, 3, d); ni.cell(4 + i, 4, loc)
    ni.column_dimensions['B'].width = 22; ni.column_dimensions['C'].width = 70; ni.column_dimensions['D'].width = 30
    readme = wb.create_sheet('READ ME', 0)
    readme['A1'] = f"SAMPLE workbook – {R['title']}"; readme['A1'].font = Font(bold=True, size=14)
    readme['A3'] = 'Illustrative figures from the IGBC Narrative Builder worked example (Test Tower). Not a real project.'
    readme['A4'] = 'Open it in SustainHub → Documentation → Open filled workbook to see every narrative fill in.'
    f = OUT / f"IGBC_{key}_SAMPLE.xlsx"; wb.save(f)
    print(f"{key:6} {R['title']:52} names={len(seen)+2:4} → {f.name}")
