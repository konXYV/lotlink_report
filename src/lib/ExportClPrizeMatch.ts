// lib/ExportClPrizeMatch.ts
// ─── Export Excel "ກະທົບຍ່ອຍ ລາງວັນ CL" — 1 sheet ຕໍ່ ກິດຈະກຳ (ALL / DOG / PUP) ───────────────────
import {
  type PrizeMatchRow,
  ACCT_PRIZE_OUT,
  STATUS_LABEL,
  SVC_LABEL,
  summarize,
  filterByTab,
  isOff,
  type MatchTab,
} from "./clPrizeMatchCore";
import {
  BG, NUM_B, DATE_FMT,
  XLSXStyle, blank, dateCell, fillRange, fml, numv, put, saveBook, sCellC, sCellN, sGrand, sHead,
  sTitle, sheetName, txt, col, colWidths, addSignatures, applyFonts,
  type WorkSheet,
} from "./clXlsxCommon";

const HEADS = [
  "ລຳດັບ", "ກິດຈະກຳ", "ງວດ", "ວັນທີງວດ", "ເລກໃບບິນ", "ຈຳນວນ (ລະບົບ)", "ຍອດຖືກລາງວັນ\nໃນລະບົບ",
  "ຈຳນວນ (Statement)", `ຈ່າຍອອກ Statement\n${ACCT_PRIZE_OUT}`, "ຄ່າທຳນຽມ (FEE)", "ອາກອນ (TAX)", "ວັນທີຈ່າຍ", "ສ່ວນຕ່າງ", "ສະຖານະ",
];
const LAST = HEADS.length - 1; // L

function buildSheet(rows: PrizeMatchRow[], title: string): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  put(ws, 0, 0, txt(title, sTitle));
  fillRange(ws, 0, 0, 0, 6, () => blank(sTitle));
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

  const hd = sHead(BG.headPrize, { wrap: true });
  HEADS.forEach((h, c) => put(ws, 1, c, txt(h, hd)));

  let r = 2;
  rows.forEach((x, i) => {
    const bad = x.STATUS !== "MATCH";
    const n = r + 1;
    put(ws, r, 0, txt(String(i + 1), sCellC()));
    put(ws, r, 1, txt(x.SVC === "OTHER" ? "-" : SVC_LABEL[x.SVC], sCellC(11)));
    put(ws, r, 2, txt(x.DRAWID, sCellC()));
    put(ws, r, 3, x.DRAWDATE ? dateCell(x.DRAWDATE, sCellC(12, DATE_FMT)) : blank(sCellC()));
    put(ws, r, 4, txt(x.BILL, sCellC(11)));
    put(ws, r, 5, numv(x.SYS_CNT, sCellN({ fmt: "0", center: true })));
    put(ws, r, 6, numv(x.SYS_AMT, sCellN({ fmt: NUM_B })));
    put(ws, r, 7, numv(x.BANK_CNT, sCellN({ fmt: "0", center: true })));
    put(ws, r, 8, numv(x.BANK_AMT, sCellN({ fmt: NUM_B })));
    put(ws, r, 9, numv(x.FEE_AMT, sCellN({ fmt: NUM_B })));
    put(ws, r, 10, numv(x.TAX_AMT, sCellN({ fmt: NUM_B })));
    put(ws, r, 11, x.BANK_DATE ? dateCell(x.BANK_DATE, sCellC(12, DATE_FMT)) : blank(sCellC()));
    put(ws, r, 12, fml(`G${n}-I${n}`, x.DIFF, sCellN({ fmt: NUM_B, bad: isOff(x.DIFF) })));
    put(ws, r, 13, txt(STATUS_LABEL[x.STATUS], sCellC(11)));
    void bad;
    r++;
  });

  // ລວມທັງໝົດ
  const T = summarize(rows);
  const first = 3; // ແຖວຂໍ້ມູນແຖວທຳອິດ (1-based)
  for (let c = 0; c <= LAST; c++) put(ws, r, c, blank(sGrand));
  put(ws, r, 0, txt("ລວມທັງໝົດ", { ...sGrand, alignment: { horizontal: "center", vertical: "center" } }));
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  const sumF = (c: number, v: number) =>
    put(ws, r, c, fml(rows.length ? `SUM(${col(c)}${first}:${col(c)}${r})` : "0", v, sGrand));
  sumF(5, rows.reduce((a, x) => a + x.SYS_CNT, 0));
  sumF(6, T.sysAmt);
  sumF(7, rows.reduce((a, x) => a + x.BANK_CNT, 0));
  sumF(8, T.bankAmt);
  sumF(9, T.feeAmt);
  sumF(10, T.taxAmt);
  sumF(12, T.diff);

  // ສະຫຼຸບຕາມສະຖານະ
  let sr = r + 2;
  (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).forEach((k) => {
    put(ws, sr, 0, txt(STATUS_LABEL[k], { ...sCellC(11), alignment: { horizontal: "left" } }));
    merges.push({ s: { r: sr, c: 0 }, e: { r: sr, c: 4 } });
    put(ws, sr, 5, numv(T.count[k], sCellN({ fmt: "0", center: true })));
    put(ws, sr, 12, numv(T.amount[k], sCellN({ fmt: NUM_B })));
    sr++;
  });

  const sigEnd = addSignatures(ws, merges, sr + 1, LAST);
  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigEnd, c: LAST } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths([7, 20, 12, 13, 26, 13, 20, 15, 24, 16, 16, 13, 18, 28]);
  applyFonts(ws);
  ws["!rows"] = [{ hpt: 18 }, { hpt: 40 }];
  return ws;
}

export async function exportClPrizeMatch(
  rows: PrizeMatchRow[],
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  if (!rows.length) throw new Error("ບໍ່ມີຂໍ້ມູນໃຫ້ Export");
  const wb = XLSXStyle.utils.book_new();
  const types: { f: MatchTab; label: string }[] = [
    { f: "ALL", label: "ລວມທັງໝົດ" },
    { f: "DOG", label: SVC_LABEL.DOG },
    { f: "PUP", label: SVC_LABEL.PUP },
  ];
  for (const t of types) {
    const g = filterByTab(rows, t.f);
    const title = `ກະທົບຍ່ອຍລາງວັນ CL · ${t.label} · ວັນທີ ${dateFrom} ຫາ ${dateTo}`;
    XLSXStyle.utils.book_append_sheet(wb, buildSheet(g, title), sheetName(`${t.f}-PrizeMatch`));
  }
  saveBook(wb, `CL_Prize_Match_${dateFrom}_to_${dateTo}.xlsx`);
}
