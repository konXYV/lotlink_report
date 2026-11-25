// lib/ExportClStmtDaily.ts
// Export ລາຍງານສະເຕັດເມັ້ນ ລວມຕາມສະກຸນເງິນ ແລະ ວັນທີ — 1 sheet, ແຕ່ລະສະກຸນເງິນ 4 ຖັນ
import { dayLabel, type StmtDailyResult } from "./clStmtDailyCore";
import {
  NUM_A, XLSXStyle, addSignatures, applyFonts, blank, colWidths, fillRange, numv, put,
  saveBook, sCellC, sCellN, sHead, sTitle, txt, type CellStyle, type WorkSheet,
} from "./clXlsxCommon";

const COMPANY = "ລາຍງານການເຄື່ອນໄຫວບັນຊີ ບໍລິສັດ ຊິແອວ ແຊ່ງໝາຈຳກັດ";
const GREEN = "92D050";
const SUBHEAD = ["ຍອດຍົກມາ", "ເຄື່ອນໄຫວໜີ້", "ເຄື່ອນໄຫວມີ", "ຍອດເຫຼືອທ້າຍ"];

export function exportClStmtDaily(res: StmtDailyResult, dateFrom: string, dateTo: string) {
  const { ccys, lines, summary } = res;
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const LAST = ccys.length * 4;
  const m = (r0: number, c0: number, r1: number, c1: number) => merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
  const head = sHead(GREEN, { bold: true });
  const labelStyle = (bg: string): CellStyle => ({
    ...sHead(bg, { bold: true }),
    alignment: { horizontal: "right", vertical: "center" },
  });

  let r = 0;
  const title = (t: string) => {
    put(ws, r, 0, txt(t, sTitle));
    fillRange(ws, r, 0, r, LAST, () => blank(sTitle));
    m(r, 0, r, LAST);
    r++;
  };
  title(COMPANY);
  title("(ລາຍງານລວມຕາມສະກຸນເງິນ ແລະ ວັນທີ)");
  title(`ແຕ່ວັນທີ ${dayLabel(dateFrom)} - ${dayLabel(dateTo)}`);

  // ຫົວຕາຕະລາງ 2 ແຖວ
  const h1 = r, h2 = r + 1;
  put(ws, h1, 0, txt("ວັນທີ", head));
  put(ws, h2, 0, blank(head));
  m(h1, 0, h2, 0);
  ccys.forEach((c, i) => {
    const c0 = 1 + i * 4;
    put(ws, h1, c0, txt(c, head));
    fillRange(ws, h1, c0, h1, c0 + 3, () => blank(head));
    m(h1, c0, h1, c0 + 3);
    SUBHEAD.forEach((h, k) => put(ws, h2, c0 + k, txt(h, head)));
  });
  r += 2;

  // ແຖວລາຍວັນ
  const numS = sCellN({ fmt: NUM_A });
  const badS = sCellN({ fmt: NUM_A, bad: true });
  for (const ln of lines) {
    put(ws, r, 0, txt(dayLabel(ln.date), sCellC(12)));
    ccys.forEach((c, i) => {
      const x = ln.cells[c];
      const c0 = 1 + i * 4;
      put(ws, r, c0, numv(x.open, x.brk ? badS : numS));
      put(ws, r, c0 + 1, numv(x.dr, numS));
      put(ws, r, c0 + 2, numv(x.cr, numS));
      put(ws, r, c0 + 3, numv(x.close, numS));
    });
    r++;
  }

  // ແຖວສະຫຼຸບທ້າຍຕາຕະລາງ — ແຖວໜີ້/ມີ ມີ "ຈຳນວນລາຍການ" ຢູ່ໜ້າຍອດເງິນ
  const INT = "#,##0";
  const foot: { label: string; key: "open" | "dr" | "cr" | "close"; bg: string; count?: "nDr" | "nCr" }[] = [
    { label: "ຍອດຍົກມາ:", key: "open", bg: GREEN },
    { label: "ລວມຍອດເຄື່ອນໄຫວເບື້ອງໜີ້:", key: "dr", bg: "FFFFFF", count: "nDr" },
    { label: "ລວມຍອດເຄື່ອນໄຫວເບື້ອງມີ:", key: "cr", bg: "FFFFFF", count: "nCr" },
    { label: "ຍອດເຫຼືອທ້າຍ:", key: "close", bg: GREEN },
  ];
  for (const f of foot) {
    ccys.forEach((c, i) => {
      const c0 = 1 + i * 4;
      const span = 1; // ທຸກແຖວ: ປ້າຍກວ້າງ 2 ຖັນ + ຊ່ອງຈຳນວນ 1 ຖັນ + ຍອດເງິນ (ຍົກມາ/ເຫຼືອທ້າຍ ຊ່ອງຈຳນວນວ່າງ)
      put(ws, r, c0, txt(f.label, labelStyle(f.bg)));
      fillRange(ws, r, c0, r, c0 + span, () => blank(labelStyle(f.bg)));
      m(r, c0, r, c0 + span);
      if (f.count) {
        put(ws, r, c0 + 2, numv(summary[c][f.count], sCellN({ fmt: INT, bold: true, center: true })));
      } else {
        put(ws, r, c0 + 2, blank(labelStyle(f.bg)));
      }
      const v = summary[c][f.key];
      const bad = f.key === "close" && summary[c].bad;
      const s: CellStyle = f.bg === GREEN
        ? { ...sHead(GREEN, { bold: true, numFmt: NUM_A }), alignment: { horizontal: "right", vertical: "center" } }
        : sCellN({ fmt: NUM_A, bold: true, bad });
      put(ws, r, c0 + 3, numv(v, s));
    });
    r++;
  }

  r = addSignatures(ws, merges, r + 1, LAST);
  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: LAST } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths([14, ...Array(LAST).fill(22)]);
  applyFonts(ws);

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "ສະເຕັດເມັ້ນ");
  saveBook(wb, `CL_ສະເຕັດເມັ້ນ_${dateFrom}_${dateTo}.xlsx`);
}
