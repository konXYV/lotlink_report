// lib/ExportClSales.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານຂາຍ (CL) — ຮູບແບບຕົງກັບໃບສະຫລຸບ Excel "3626-Sales"
//  1 sheet ຕໍ່ 1 ກິດຈະກຳ/ປີ (4 ຕົວທຳອິດຂອງ DRAWID) ຊື່ sheet: "<4 ຕົວ>-Sales"
//  ຄໍລຳ: ລຳດັບ · ລະຫັດຜູ້ຂາຍ · ວັນທີ · ງວດ · ຈ່າຍເງິນສົດ · ຈ່າຍຄະແນນ · ລວມມູນຄ່າຂາຍໄດ້ ·
//        ຄ່າທໍານຽມ (H3) · ຍອດຂາຍຫຼັງຫັກຄ່າທໍານຽມ · ເງິນເຂົ້າບັນຊີ (J3 = ເລກບັນຊີ) · ສ່ວນຕ່າງ
//  ບລັອກ: ແຖວ APP → ລວມ → ແຖວຜູ້ຂາຍອື່ນ (PDF) → ລວມ → ລວມທັງໝົດ (E:G)
//  ຄ່າທໍານຽມ = ເງິນສົດ × H3 (ຈ່າຍຄະແນນບໍ່ມີເງິນເຂົ້າບັນຊີ ຈຶ່ງບໍ່ຄິດ) — ແກ້ອັດຕາໃນ cell H3 ໄດ້
// ════════════════════════════════════════════════════════════════════════════
import {
  ACCT_SALES_IN,
  buildSales,
  isOff,
  type SalesRaw,
  SVC_LABEL,
  type SvcFilter,
} from "./clSalesPrizeCore";
import {
  BG, NUM_A, NUM_B, DATE_FMT,
  XLSXStyle, blank, dateCell, fillRange, fml, numv, put, saveBook, sCellC, sCellN, sGrand, sHead, sSub,
  sTitle, sheetName, txt, col, colWidths, addSignatures, applyFonts,
  type WorkSheet,
} from "./clXlsxCommon";

const H = {
  no: "ລຳດັບ", user: "ລະຫັດຜູ້ຂາຍ", date: "ວັນທີ", draw: "ງວດ", sales: "ຍອດຂາຍ",
  cash: "ຈ່າຍເງິນສົດ", point: "ຈ່າຍຄະແນນ", total: "ລວມມູນຄ່າຂາຍໄດ້", fee: "ຄ່າທໍານຽມ",
  net: "ຍອດຂາຍຫຼັງຫັກຄ່າທໍານຽມ", bank: "ເງິນເຂົ້າບັນຊີ",
  diff: "ສ່ວນຕ່າງຍອດຂາຍໃນລະບົບ\n ແລະ ຍອດເງິນເຂົ້າບັນຊີ",
};

export function buildSalesSheet(rows: SalesRaw[], rate: number, title: string): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const m = (r0: number, c0: number, r1: number, c1: number) => merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
  const LAST = 10; // K
  const RATE = "$H$3";

  // ── ຫົວ (ແຖວ 1-3) ──
  put(ws, 0, 0, txt(title, sTitle));
  fillRange(ws, 0, 0, 0, LAST, () => blank(sTitle));
  m(0, 0, 0, LAST);
  const hd = sHead(BG.headSales);
  const rowSpan2: [number, string][] = [[0, H.no], [1, H.user], [2, H.date], [3, H.draw], [6, H.total], [8, H.net], [10, H.diff]];
  for (const [c, label] of rowSpan2) {
    put(ws, 1, c, txt(label, c === 6 ? sHead(BG.headSales, { bold: true }) : c === 10 ? sHead(BG.headSales, { wrap: true, color: "C00000" }) : hd));
    m(1, c, 2, c);
  }
  put(ws, 1, 4, txt(H.sales, hd)); m(1, 4, 1, 5);
  put(ws, 2, 4, txt(H.cash, hd));
  put(ws, 2, 5, txt(H.point, hd));
  put(ws, 1, 7, txt(H.fee, hd));
  put(ws, 2, 7, numv(rate, sHead(BG.headSales, { numFmt: "0%" }))); // H3 = ອັດຕາຄ່າທໍານຽມ (ແກ້ໄດ້)
  put(ws, 1, 9, txt(H.bank, hd));
  put(ws, 2, 9, txt(ACCT_SALES_IN, hd)); // J3 = ເລກບັນຊີຮັບເງິນຂາຍ
  fillRange(ws, 1, 0, 2, LAST, () => blank(hd));

  // ── ແຖວຂໍ້ມູນ ──
  const sec = buildSales(rows, "ALL", rate);
  let r = 3;

  const sumRow = (label: string, r0: number, r1: number, rowIdx: number, cols: number[], vals: Record<number, number>) => {
    for (let c = 0; c <= LAST; c++) put(ws, rowIdx, c, blank(sSub(NUM_A)));
    put(ws, rowIdx, 0, txt(label, { ...sSub(NUM_A), alignment: { horizontal: "center", vertical: "center" } }));
    m(rowIdx, 0, rowIdx, 3);
    for (const c of cols) {
      const f = r1 >= r0 ? `SUM(${col(c)}${r0 + 1}:${col(c)}${r1 + 1})` : "0";
      put(ws, rowIdx, c, fml(f, vals[c] ?? 0, sSub(NUM_A)));
    }
  };

  // APP
  const appFirst = r;
  for (const l of sec.app.lines) {
    const x = r + 1;
    put(ws, r, 0, txt(l.no, sCellC()));
    put(ws, r, 1, txt(l.USERNAME, sCellC()));
    put(ws, r, 2, dateCell(l.DAY, sCellC(12, DATE_FMT)));
    put(ws, r, 3, txt(l.DRAWID, sCellC()));
    put(ws, r, 4, numv(l.c.CASH, sCellN({ fmt: NUM_A, center: true })));
    put(ws, r, 5, numv(l.c.POINT, sCellN({ fmt: NUM_A, center: true })));
    put(ws, r, 6, fml(`E${x}+F${x}`, l.c.TOTAL, sCellN({ fmt: NUM_A, bold: true })));
    put(ws, r, 7, fml(`E${x}*${RATE}`, l.c.FEE, sCellN({ fmt: NUM_A, center: true })));
    put(ws, r, 8, fml(`E${x}-H${x}`, l.c.NET, sCellN({ fmt: NUM_B })));
    put(ws, r, 9, numv(l.c.BANK_IN, sCellN({ fmt: NUM_A })));
    put(ws, r, 10, fml(`J${x}-I${x}`, l.c.DIFF, sCellN({ fmt: NUM_B, bad: isOff(l.c.DIFF) })));
    r++;
  }
  const appSub = r++;
  const T = sec.app.total;
  sumRow("ລວມຍອດຂາຍ ຜ່ານ APP", appFirst, appSub - 1, appSub, [4, 5, 6, 7, 8, 9, 10], {
    4: T.CASH, 5: T.POINT, 6: T.TOTAL, 7: T.FEE, 8: T.NET, 9: T.BANK_IN, 10: T.DIFF,
  });

  // ຜູ້ຂາຍອື່ນ (PDF) — ມີສະເພາະ ເງິນສົດ/ຄະແນນ/ລວມ
  const othFirst = r;
  for (const l of sec.other.lines) {
    const x = r + 1;
    put(ws, r, 0, txt(l.no, sCellC(11)));
    put(ws, r, 1, txt(l.USERNAME, sCellC(11)));
    put(ws, r, 2, dateCell(l.DAY, sCellC(11, DATE_FMT)));
    put(ws, r, 3, txt(l.DRAWID, sCellC(11)));
    put(ws, r, 4, numv(l.c.CASH, sCellN({ fmt: NUM_A, sz: 11 })));
    put(ws, r, 5, numv(l.c.POINT, sCellN({ fmt: NUM_A, sz: 11 })));
    put(ws, r, 6, fml(`E${x}+F${x}`, l.c.TOTAL, sCellN({ fmt: NUM_B, bold: true })));
    for (let c = 7; c <= LAST; c++) put(ws, r, c, blank(sCellN({ fmt: NUM_B, sz: 11 })));
    r++;
  }
  const othSub = r++;
  const O = sec.other.total;
  sumRow("ລວມຍອດຂາຍ ຜ່ານ POS", othFirst, othSub - 1, othSub, [4, 5, 6, 7, 8, 9, 10], {
    4: O.CASH, 5: O.POINT, 6: O.TOTAL, 7: O.FEE, 8: O.NET, 9: O.BANK_IN, 10: O.DIFF,
  });

  // ລວມທັງໝົດ (E:G ຄືກັບຕົ້ນແບບ)
  const gr = r;
  for (let c = 0; c <= LAST; c++) put(ws, gr, c, blank(sGrand));
  const G = sec.grand;
  put(ws, gr, 4, fml(`E${appSub + 1}+E${othSub + 1}`, G.CASH, sGrand));
  put(ws, gr, 5, fml(`F${appSub + 1}+F${othSub + 1}`, G.POINT, sGrand));
  put(ws, gr, 6, fml(`G${appSub + 1}+G${othSub + 1}`, G.TOTAL, sGrand));

  put(ws, gr, 0, txt("ລວມທັງໝົດ", { ...sGrand, alignment: { horizontal: "center", vertical: "center" } }));
  m(gr, 0, gr, 3);
  const sigEnd = addSignatures(ws, merges, gr + 2, LAST);
  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigEnd, c: LAST } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths([5.6, 11.9, 14.4, 10.4, 19.6, 16, 19.6, 17, 21.4, 22, 22.6]);
  applyFonts(ws);
  ws["!rows"] = [{ hpt: 15.6 }, { hpt: 18 }, { hpt: 18 }];
  return ws;
}

export async function exportClSales(
  rows: SalesRaw[],
  rate: number,
  dateFrom: string,
  dateTo: string,
  svc: SvcFilter = "ALL",
): Promise<void> {
  void svc; // ສະເໝີ export 3 sheet: ລວມ + DOG + PUP
  const wb = XLSXStyle.utils.book_new();
  if (!rows.length) throw new Error("ບໍ່ມີຂໍ້ມູນໃຫ້ Export");
  const types: { f: SvcFilter; name: string; label: string }[] = [
    { f: "ALL", name: "ALL", label: "ລວມທັງໝົດ" },
    { f: "DOG", name: "DOG", label: SVC_LABEL.DOG },
    { f: "PUP", name: "PUP", label: SVC_LABEL.PUP },
  ];
  for (const t of types) {
    const g = t.f === "ALL" ? rows : rows.filter((r) => r.SVC === t.f);
    const title = `ລາຍງານຍອດຂາຍ · ${t.label} · ວັນທີ ${dateFrom} ຫາ ${dateTo}`;
    XLSXStyle.utils.book_append_sheet(wb, buildSalesSheet(g, rate, title), sheetName(`${t.name}-Sales`));
  }
  saveBook(wb, `CL_Sales_Report_${dateFrom}_to_${dateTo}.xlsx`);
}
