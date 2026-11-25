// lib/ExportClTaxMonthly.ts
// ─── Export Excel : ຕາຕະລາງຄິດໄລ່ ອມພ, ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ (ມີສູດ Excel ຈິງ) ───
import { LINES, calcAll, monthLabel, todayLabel, type TaxMonthlyRaw } from "./clTaxMonthlyCore";
import {
  XLSXStyle, BORDER, FONT_HEAD, FONT_NUM, NUM_B,
  put, txt, numv, fml, blank, colWidths, saveBook, sheetName,
  type WorkSheet, type CellStyle,
} from "./clXlsxCommon";

const GREEN = "375623";
const ORANGE = "FFC000";
const NAVY = "1F3864";
const RED = "C00000";

const hdr = (): CellStyle => ({
  font: { name: FONT_HEAD, sz: 12, bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: GREEN } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER,
});
const text = (o: { bold?: boolean; color?: string; center?: boolean } = {}): CellStyle => ({
  font: { name: FONT_HEAD, sz: 12, bold: !!o.bold, color: o.color ? { rgb: o.color } : undefined },
  alignment: { horizontal: o.center ? "center" : "left", vertical: "center" },
  border: BORDER,
});
const num = (o: { bold?: boolean; color?: string; fill?: string; underline?: boolean } = {}): CellStyle => ({
  font: { name: FONT_NUM, sz: 12, bold: !!o.bold, color: o.color ? { rgb: o.color } : undefined, underline: o.underline },
  fill: o.fill ? { patternType: "solid", fgColor: { rgb: o.fill } } : undefined,
  alignment: { vertical: "center" },
  border: BORDER,
  numFmt: NUM_B.replace(/\.00/g, ""), // ບໍ່ມີທົດສະນິຍົມ ຄືໃນຕາຕະລາງ
});
const plain = (sz: number, bold = true): CellStyle => ({
  font: { name: FONT_HEAD, sz, bold },
  alignment: { horizontal: "center", vertical: "center" },
});

// ແຖວ Excel (1-based) ຂອງແຕ່ລະລາຍການ: A=6 … J=15
const ROW: Record<string, number> = { A: 6, B: 7, C: 8, D: 9, E: 10, F: 11, G: 12, H: 13, I: 14, J: 15 };

export function exportClTaxMonthly(raw: TaxMonthlyRaw, month: string, incomeTax: number): void {
  const r = calcAll(raw, incomeTax);
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const cols = ["C", "D", "E"] as const; // DOG, PUP, TOTAL
  const keys = ["DOG", "PUP", "TOTAL"] as const;

  const center = (row: number, t: string, sz: number) => {
    put(ws, row, 0, txt(t, plain(sz)));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 4 } });
  };
  center(0, "ຕາຕະລາງຄິດໄລ່ ອມພ , ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ", 14);
  center(1, "ຂອງ ບໍລິສັດ ຊີແອວ ແຂ່ງໝາຈຳກັດ", 13);
  center(2, `ປະຈຳເດືອນ ${monthLabel(month)}`, 12);

  // header
  put(ws, 3, 0, txt("ລຳດັບ", hdr()));
  put(ws, 3, 1, txt("ເນື້ອໃນ", hdr()));
  put(ws, 3, 2, txt(`ເດືອນ ${monthLabel(month)}`, hdr()));
  put(ws, 3, 3, blank(hdr()));
  put(ws, 3, 4, blank(hdr()));
  put(ws, 4, 0, blank(hdr()));
  put(ws, 4, 1, blank(hdr()));
  put(ws, 4, 2, txt("ນ້ອງໝານຳໂຊກ", hdr()));
  put(ws, 4, 3, txt("ປູປາເຕົ້າມະຫາໂຊກ", hdr()));
  put(ws, 4, 4, txt("ລວມທັງໝົດ", hdr()));
  merges.push({ s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } });

  const f = (k: string, c: string): string => {
    const n = (x: string) => `${c}${ROW[x]}`;
    switch (k) {
      case "C": return `${n("A")}-${n("B")}`;
      case "E": return `ROUND(${n("C")}*100/110*0.1,0)`;
      case "D": return `${n("C")}-${n("E")}`;
      case "G": return `ROUND(${n("D")}*100/130*0.3,0)`;
      case "F": return `${n("D")}-${n("G")}`;
      case "H": return `${n("E")}+${n("G")}`;
      default: return "";
    }
  };

  LINES.forEach((ln) => {
    const row = ROW[ln.key] - 1; // 0-based
    const label = ln.key === "J" ? `${ln.label} ${monthLabel(month)}` : ln.label;
    put(ws, row, 0, txt(ln.no, text({ center: true })));
    put(ws, row, 1, txt(label, text({ bold: ln.bold, color: ln.bold ? NAVY : undefined })));
    cols.forEach((c, i) => {
      const ci = 2 + i;
      const col = keys[i];
      const total = col === "TOTAL";
      const st = num({
        bold: ln.bold || (total && ln.key === "A"),
        color: ln.red ? RED : ln.bold ? NAVY : undefined,
        fill: ln.hi && total ? ORANGE : undefined,
        underline: (ln.key === "H" && total) || ln.key === "J",
      });
      if (ln.totalOnly) {
        if (!total) { put(ws, row, ci, blank(num())); return; }
        if (ln.key === "I") put(ws, row, ci, numv(incomeTax, st));
        else put(ws, row, ci, fml(`E${ROW.H}+E${ROW.I}`, r.J, st));
        return;
      }
      const k = ln.key as keyof typeof r.DOG;
      const v = r[col][k];
      if (ln.key === "A" || ln.key === "B") {
        // ຊ່ອງລວມ = ລວມ 2 ກິດຈະກຳ
        if (total) put(ws, row, ci, fml(`C${ROW[ln.key]}+D${ROW[ln.key]}`, v, st));
        else put(ws, row, ci, numv(v, st));
      } else if (total) {
        put(ws, row, ci, fml(`C${ROW[ln.key]}+D${ROW[ln.key]}`, v, st)); // ຊ່ອງລວມ = ລວມ 2 ຊ່ອງ ຕາມຕາຕະລາງຫົວໜ້າ
      } else {
        put(ws, row, ci, fml(f(ln.key, c), v, st));
      }
    });
  });

  // ລົງທ້າຍ
  put(ws, 16, 2, txt(`ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ  ${todayLabel()}`, plain(13)));
  merges.push({ s: { r: 16, c: 2 }, e: { r: 16, c: 4 } });
  put(ws, 17, 2, txt("ຜູ້ອຳນວຍການ", plain(13)));
  merges.push({ s: { r: 17, c: 2 }, e: { r: 17, c: 4 } });

  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 17, c: 4 } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths([8, 52, 22, 22, 24]);
  ws["!rows"] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 20 }, { hpt: 24 }, { hpt: 24 }];

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName(`Tax-${month}`));
  saveBook(wb, `CL_Tax_Monthly_${month}.xlsx`);
}
