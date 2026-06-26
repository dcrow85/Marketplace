#!/usr/bin/env python3
"""Extract embedded card photos from an Azuki master-sheet .xlsx and name them by card ID.

The Alpha master sheet keeps card photos as EMBEDDED images (floating, anchored to the IMG
column) — NOT as cell URLs. So a CSV export shows empty IMG columns and a CSV-based catalog
export misses them entirely. This reads the workbook's drawing anchors directly: for every
image anchored in the IMG column, the anchor's row -> that row's ID cell -> <ID>.jpg. Spans
all tabs. Pure stdlib.

  python3 simulations/azuki_sheet_image_extract.py <workbook.xlsx> <out-dir>

Get the xlsx with all embedded media via:
  curl -L "https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=xlsx" -o sheet.xlsx
"""
import os
import sys
import zipfile
from xml.etree import ElementTree as ET

M = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS = {'main': M, 'r': R, 'xdr': XDR, 'a': A}


def colnum(ref):
    c = ''.join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in c:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: azuki_sheet_image_extract.py <workbook.xlsx> <out-dir>")
    xlsx, out = sys.argv[1], sys.argv[2]
    Z = zipfile.ZipFile(xlsx)
    os.makedirs(out, exist_ok=True)
    ss = ([''.join((t.text or '') for t in si.iter('{%s}t' % M))
           for si in ET.fromstring(Z.read('xl/sharedStrings.xml')).findall('main:si', NS)]
          if 'xl/sharedStrings.xml' in Z.namelist() else [])

    def cellval(c):
        v = c.find('main:v', NS)
        if v is None:
            return ''
        return ss[int(v.text)] if c.get('t') == 's' and v.text else (v.text or '')

    total = 0
    for sx in sorted(p for p in Z.namelist() if p.startswith('xl/worksheets/sheet') and p.endswith('.xml')):
        ws = ET.fromstring(Z.read(sx))
        name = sx.split('/')[-1]
        rowid, imgcol = {}, None
        for row in ws.findall('main:sheetData/main:row', NS):
            rn = int(row.get('r')) - 1               # 0-indexed; matches drawing anchor rows
            for c in row.findall('main:c', NS):
                if not c.get('r'):
                    continue
                ci, val = colnum(c.get('r')), cellval(c)
                if ci == 0:
                    rowid[rn] = val                   # column A = card ID
                if rn == 0 and val.strip().upper() == 'IMG':
                    imgcol = ci                        # locate the IMG column from the header
        de = ws.find('main:drawing', NS)
        relp = 'xl/worksheets/_rels/%s.rels' % name
        if de is None or imgcol is None or relp not in Z.namelist():
            continue
        dt = next((r.get('Target') for r in ET.fromstring(Z.read(relp)) if r.get('Id') == de.get('{%s}id' % R)), None)
        if not dt:
            continue
        dname = dt.split('/')[-1]
        draw = ET.fromstring(Z.read('xl/drawings/' + dname))
        embed = {r.get('Id'): r.get('Target') for r in ET.fromstring(Z.read('xl/drawings/_rels/%s.rels' % dname))}
        for anc in list(draw):
            frm, blip = anc.find('xdr:from', NS), anc.find('.//a:blip', NS)
            if frm is None or blip is None:
                continue
            if int(frm.find('xdr:col', NS).text) != imgcol:
                continue
            cid = (rowid.get(int(frm.find('xdr:row', NS).text)) or '').strip()
            if not cid or cid.upper() == 'ID':
                continue
            media = 'xl/media/' + embed[blip.get('{%s}embed' % R)].split('/')[-1]
            ext = os.path.splitext(media)[1] or '.jpg'
            open(os.path.join(out, cid + ext), 'wb').write(Z.read(media))
            total += 1
    print('extracted %d card photos to %s' % (total, out))


if __name__ == '__main__':
    main()
