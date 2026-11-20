// lib/ExportClBalance.ts
// Export ລາຍງານຍອດຍົກມາ (CL) — 1 sheet, ແຍກຕາມສະກຸນເງິນ ຄືໃບລາຍງານຕົ້ນແບບ
import { buildBalance, dayLabel, type BalanceRaw } from "./clBalanceCore";
import {
  BG, NUM_A, XLSXStyle, blank, fillRange, numv, put, saveBook, sCellC, sCellN, sHead, sSub, sTitle,
  txt, colWidths, addSignatures, applyFonts, type WorkSheet,
} from "./clXlsxCommon";

const COMPANY = "ລາຍງານການເຄື່ອນໄຫວບັນຊີ ບໍລິສັດ ຊິແອວ ແຊ່ງໝາຈຳກັດ";
const HEAD = ["ລຳດັບ", "ເລກບັນຊີ", "ທະນາຄານ", "ສະກຸນເງິນ", "ຍອດຍົກມາ", "ເຄື່ອນໄຫວໜີ້", "ເຄື່ອນໄຫວມີ", "ຍອດເຫຼືອທ້າຍ"];

export async function exportClBalance(rows: BalanceRaw[], dateFrom: string, dateTo: string) {
  const sections = buildBalance(rows);
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const LAST = 7;
  const m = (r0: number, c0: number, r1: number, c1: number) => merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
  const green = sHead("548235", { bold: true, color: "FFFFFF" });
  const left = { ...sCellC(12), alignment: { horizontal: "left", vertical: "center" } } as ReturnType<typeof sCellC>;

  let r = 0;
  put(ws, r, 0, txt(COMPANY, sTitle)); fillRange(ws, r, 0, r, LAST, () => blank(sTitle)); m(r, 0, r, LAST); r++;
  const sub = `ແຕ່ວັນທີ ${dayLabel(dateFrom)} - ${dayLabel(dateTo)}`;
  put(ws, r, 0, txt(sub, sTitle)); fillRange(ws, r, 0, r, LAST, () => blank(sTitle)); m(r, 0, r, LAST); r += 2;

  for (const s of sections) {
    put(ws, r, 0, txt(s.title, { font: { bold: true, sz: 12, color: { rgb: "1F3864" } } })); r++;
    HEAD.forEach((h, c) => put(ws, r, c, txt(h, green))); r++;
    for (const l of s.lines) {
      put(ws, r, 0, numv(l.no, sCellC(12)));
      put(ws, r, 1, txt(l.acct, left));
      put(ws, r, 2, txt(l.bank || "—", sCellC(12)));
      put(ws, r, 3, txt(l.ccy, sCellC(12)));
      put(ws, r, 4, numv(l.open, sCellN({ fmt: NUM_A })));
      put(ws, r, 5, numv(l.dr, sCellN({ fmt: NUM_A })));
      put(ws, r, 6, numv(l.cr, sCellN({ fmt: NUM_A })));
      put(ws, r, 7, numv(l.close, sCellN({ fmt: NUM_A, bad: Math.abs(l.diff) >= 0.005 })));
      r++;
    }
    put(ws, r, 0, txt("ລວມ", sSub(NUM_A))); fillRange(ws, r, 0, r, 3, () => blank(sSub(NUM_A))); m(r, 0, r, 3);
    put(ws, r, 4, numv(s.total.open, sSub(NUM_A)));
    put(ws, r, 5, numv(s.total.dr, sSub(NUM_A)));
    put(ws, r, 6, numv(s.total.cr, sSub(NUM_A)));
    put(ws, r, 7, numv(s.total.close, sSub(NUM_A)));
    r += 2;
  }
  void BG;
  r = addSignatures(ws, merges, r + 1, LAST);

  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: LAST } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths([8, 20, 12, 12, 24, 24, 24, 24]);
  applyFonts(ws);

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "ຍອດຍົກມາ");
  saveBook(wb, `CL_ຍອດຍົກມາ_${dateFrom}_${dateTo}.xlsx`);
}
