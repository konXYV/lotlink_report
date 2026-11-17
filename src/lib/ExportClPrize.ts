// lib/ExportClPrize.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານຈ່າຍລາງວັນ (CL) — ຮູບແບບຕົງກັບໃບສະຫລຸບ Excel ຈ່າຍລາງວັນ
//  1 sheet ຕໍ່ 1 ກິດຈະກຳ/ປີ (4 ຕົວທຳອິດຂອງ DRAWID) ຊື່ sheet: "<4 ຕົວ>-Prize"
//  ຄໍລຳ: ລຳດັບ · ລະຫັດຜູ້ຂາຍ · ວັນທີ · ງວດ · ຖືກຜ່ານຈ່າຍເງິນສົດ · ຖືກຜ່ານຈ່າຍຄະແນນ · ລວມມູນຄ່າຖືກລາງວັນ ·
//        ຄ່າທໍານຽມຈ່າຍລາງວັນ (1.800/ທຸລະກໍາ) · ຈ່າຍເງິນລາງວັນອອກຈາກບັນຊີ (I3 = ເລກບັນຊີ) ·
//        ຮັບອາກອນ 5% (ຈາກ CL_BCEL_STMT) · ສ່ວນຕ່າງ = ລວມມູນຄ່າຖືກລາງວັນ − ຈ່າຍອອກຈາກບັນຊີ
//  ບລັອກ: ແຖວ APP → ລວມ → ແຖວຜູ້ຂາຍອື່ນ (PDF) → ລວມ → ລວມທັງໝົດ
// ════════════════════════════════════════════════════════════════════════════
import {
  ACCT_PRIZE_OUT,
  PRIZE_FEE_LABEL,
  buildPrize,
  isOff,
  type PrizeRaw,
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
  no: "ລຳດັບ", user: "ລະຫັດຜູ້ຂາຍ", date: "ວັນທີ", draw: "ງວດ", win: "ຍອດຖືກລາງວັນ",
  cash: "ຖືກຜ່ານຈ່າຍເງິນສົດ", point: "ຖືກຜ່ານຈ່າຍຄະແນນ", total: "ລວມມູນຄ່າຖືກລາງວັນ",
  fee: "ຄ່າທໍານຽມຈ່າຍລາງວັນ", paid: "ຈ່າຍເງິນລາງວັນ\n ອອກຈາກບັນຊີ",
  tax: "ຮັບອາກອນ  5% \nຫັກຈາກຜູ້ຖືກລາງວັນເຂົ້າບັນຊີ",
  diff: "ສ່ວນຕ່າງ ລະຫວ່າງ\n ຍອດຖືກລາງວັນໃນລະບົບ \nແລະ ຈ່າຍເງິນລາງວັນອອກຈາກບັນຊີ",
};

export function buildPrizeSheet(rows: PrizeRaw[], title: string): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const m = (r0: number, c0: number, r1: number, c1: number) => merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
  const LAST = 10; // K

  // ── ຫົວ (ແຖວ 1-3) ──
  put(ws, 0, 0, txt(title, sTitle));
  fillRange(ws, 0, 0, 0, 6, () => blank(sTitle));
  m(0, 0, 0, 6); // ຕົ້ນແບບ merge A1:G1
  const hd = sHead(BG.headPrize);
  const rowSpan2: [number, string][] = [[0, H.no], [1, H.user], [2, H.date], [3, H.draw], [6, H.total], [9, H.tax], [10, H.diff]];
  for (const [c, label] of rowSpan2) {
    put(ws, 1, c, txt(label, c === 6 ? sHead(BG.headPrize, { bold: true, sz: 10 }) : c === 9 ? sHead(BG.headPrize, { wrap: true, color: "C00000" }) : sHead(BG.headPrize, { wrap: c === 10 })));
    m(1, c, 2, c);
  }
  put(ws, 1, 4, txt(H.win, hd)); m(1, 4, 1, 5);
  put(ws, 2, 4, txt(H.cash, hd));
  put(ws, 2, 5, txt(H.point, hd));
  put(ws, 1, 7, txt(H.fee, hd));
  put(ws, 2, 7, txt(PRIZE_FEE_LABEL, hd)); // H3
  put(ws, 1, 8, txt(H.paid, sHead(BG.headPrize, { wrap: true })));
  put(ws, 2, 8, txt(ACCT_PRIZE_OUT, sHead(BG.headPrize, { bold: true }))); // I3 = ເລກບັນຊີຈ່າຍລາງວັນ
  fillRange(ws, 1, 0, 2, LAST, () => blank(hd));

  // ── ແຖວຂໍ້ມູນ ──
  const sec = buildPrize(rows, "ALL");
  let r = 3;
  const lastCalc = [4, 5, 6, 7, 8, 9, 10];

  const sumRow = (label: string, r0: number, r1: number, rowIdx: number, vals: Record<number, number>) => {
    for (let c = 0; c <= LAST; c++) put(ws, rowIdx, c, blank(sSub(NUM_A)));
    put(ws, rowIdx, 0, txt(label, { ...sSub(NUM_A), alignment: { horizontal: "center", vertical: "center" } }));
    m(rowIdx, 0, rowIdx, 3);
    for (const c of lastCalc) {
      const f = r1 >= r0 ? `SUM(${col(c)}${r0 + 1}:${col(c)}${r1 + 1})` : "0";
      put(ws, rowIdx, c, fml(f, vals[c] ?? 0, sSub(NUM_A)));
    }
  };
  const vals = (T: { CASH: number; POINT: number; TOTAL: number; FEE: number; PAID: number; TAX: number; DIFF: number }) => ({
    4: T.CASH, 5: T.POINT, 6: T.TOTAL, 7: T.FEE, 8: T.PAID, 9: T.TAX, 10: T.DIFF,
  });

  // APP
  const appFirst = r;
  for (const l of sec.app.lines) {
    const x = r + 1;
    put(ws, r, 0, txt(l.no, sCellC()));
    put(ws, r, 1, txt(l.USERNAME, sCellC()));
    put(ws, r, 2, dateCell(l.DAY, sCellC(12, DATE_FMT)));
    put(ws, r, 3, txt(l.DRAWID, sCellC()));
    put(ws, r, 4, numv(l.c.CASH, sCellN({ fmt: NUM_B })));
    put(ws, r, 5, numv(l.c.POINT, sCellN({ fmt: NUM_B })));
    put(ws, r, 6, fml(`E${x}+F${x}`, l.c.TOTAL, sCellN({ fmt: NUM_B, bold: true })));
    put(ws, r, 7, numv(l.c.FEE, sCellN({ fmt: NUM_B, sz: 11 })));
    put(ws, r, 8, numv(l.c.PAID, sCellN({ fmt: NUM_B, sz: 11 })));
    put(ws, r, 9, numv(l.c.TAX, sCellN({ fmt: NUM_B, sz: 11 }))); // ອາກອນ 5% ເຂົ້າບັນຊີ
    put(ws, r, 10, fml(`G${x}-I${x}`, l.c.DIFF, sCellN({ fmt: NUM_B, sz: 11, bad: isOff(l.c.DIFF) })));
    r++;
  }
  const appSub = r++;
  sumRow("ລວມຍອດຈ່າຍ ຜ່ານ APP", appFirst, appSub - 1, appSub, vals(sec.app.total));

  // ຜູ້ຂາຍອື່ນ (PDF) — ມີສະເພາະ ຖືກເງິນສົດ/ຄະແນນ/ລວມ
  const othFirst = r;
  for (const l of sec.other.lines) {
    const x = r + 1;
    put(ws, r, 0, txt(l.no, sCellC(11)));
    put(ws, r, 1, txt(l.USERNAME, sCellC(11)));
    put(ws, r, 2, dateCell(l.DAY, sCellC(11, DATE_FMT)));
    put(ws, r, 3, txt(l.DRAWID, sCellC(11)));
    put(ws, r, 4, numv(l.c.CASH, sCellN({ fmt: NUM_B, sz: 11 })));
    put(ws, r, 5, numv(l.c.POINT, sCellN({ fmt: NUM_B, sz: 11 })));
    put(ws, r, 6, fml(`E${x}+F${x}`, l.c.TOTAL, sCellN({ fmt: NUM_B, bold: true })));
    for (let c = 7; c <= LAST; c++) put(ws, r, c, blank(sCellN({ fmt: NUM_B, sz: 11 })));
    r++;
  }
  const othSub = r++;
  sumRow("ລວມຍອດຈ່າຍ ຜ່ານ POS", othFirst, othSub - 1, othSub, vals(sec.other.total));

  // ລວມທັງໝົດ (E:K)
  const gr = r;
  for (let c = 0; c <= LAST; c++) put(ws, gr, c, blank(sGrand));
  const G = vals(sec.grand);
  for (const c of lastCalc) put(ws, gr, c, fml(`${col(c)}${appSub + 1}+${col(c)}${othSub + 1}`, G[c as keyof typeof G], sGrand));

  put(ws, gr, 0, txt("ລວມທັງໝົດ", { ...sGrand, alignment: { horizontal: "center", vertical: "center" } }));
  m(gr, 0, gr, 3);
  const sigEnd = addSignatures(ws, merges, gr + 2, LAST);
  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigEnd, c: LAST } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths([5.6, 11.9, 14.4, 9, 19.7, 17.9, 20.4, 17.9, 18.7, 23.3, 21.9]);
  applyFonts(ws);
  ws["!rows"] = [{ hpt: 15.6 }, { hpt: 37.5 }, { hpt: 18 }];
  return ws;
}

export async function exportClPrize(
  rows: PrizeRaw[],
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
    const title = `ລາຍງານຈ່າຍລາງວັນ · ${t.label} · ວັນທີ ${dateFrom} ຫາ ${dateTo}`;
    XLSXStyle.utils.book_append_sheet(wb, buildPrizeSheet(g, title), sheetName(`${t.name}-Prize`));
  }
  saveBook(wb, `CL_Prize_Report_${dateFrom}_to_${dateTo}.xlsx`);
}
