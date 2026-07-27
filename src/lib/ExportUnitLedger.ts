// lib/ExportUnitLedger.ts
// ════════════════════════════════════════════════════════════════════════════
//  Generic export for the 3 new unit/province ledger reports
//  (sale summary by ໜ່ວຍ/ແຂວງ + live payout-by-user table underneath).
//  Mirrors the layout/styling conventions of ExportPayout.ts.
//
//  Layout:
//  R1-R3  = Title block                              (merged A:LAST_COL)
//  R4     = blank
//  R5     = Table header: entityLabel | ງວດ | ຍອດຂາຍ | % | [ເຫຼືອ] | ຍອດໂອນ | ຍອດຕ້ອງຖອກ
//  R6+    = Data rows
//  RSum   = ລວມທັງໝົດ
//  blank
//  RPayoutTitle = "ຍອດຈ່າຍ (Payout) ຕາມ User — ງວດນີ້"
//  RPayoutHdr   = User | ຈຳນວນລາຍການ | ຍອດຈ່າຍ
//  RPayout+     = one row per user
//  RPayoutSum   = ລວມທັງໝົດ
//  blank
//  RSig   = signature row
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

export interface LedgerExportRow {
  name: string;
  sale: number;
  pct: number;
  remaining?: number;
  transferred: number;
  due: number;
}

export interface PayoutExportRow {
  user: string;
  totalCount: number;
  totalAmount: number;
}

const FONT = "Phetsarath OT";
const BG_HEADER = "9DC3E6";
const BG_SUM = "BDD7EE";
const BG_PAYOUT_HEADER = "FCE4D6";
const BG_PAYOUT_SUM = "FDE9D9";

type BSide = { color: CellStyleColor; style?: BorderType };
const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const allThin = (): CellStyle["border"] => ({
  left: thin(),
  right: thin(),
  top: thin(),
  bottom: thin(),
});

function sTitle(sz = 12, bold = false): CellStyle {
  return { font: { name: FONT, sz, bold }, alignment: { horizontal: "center", vertical: "center" } };
}
function sHeader(bg = BG_HEADER, sz = 10): CellStyle {
  return {
    font: { name: FONT, bold: true, sz },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}
function sData(align: "center" | "right" | "left" = "right"): CellStyle {
  return {
    font: { name: FONT, sz: 10 },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: "#,##0",
    border: allThin(),
  };
}
function sDataText(align: "center" | "left" = "left"): CellStyle {
  return { font: { name: FONT, sz: 10 }, alignment: { horizontal: align, vertical: "center" }, border: allThin() };
}
function sSum(align: "center" | "right" = "right", bg = BG_SUM): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: align === "right" ? "#,##0" : undefined,
    border: allThin(),
  };
}
function sSig(): CellStyle {
  return { font: { name: FONT, sz: 11 }, alignment: { horizontal: "center", vertical: "center" } };
}

function C(v: string | number, s: CellStyle): CellObject {
  return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
}
function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

export async function exportUnitLedger(opts: {
  fileName: string;
  sheetName: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  entityLabel: string; // "ໜ່ວຍ" | "ແຂວງ"
  drawId: string;
  hasRemainingCol: boolean;
  rows: LedgerExportRow[];
  payoutRows: PayoutExportRow[];
  printedBy?: string;
}): Promise<void> {
  const {
    fileName, sheetName, titleLine1, titleLine2, titleLine3,
    entityLabel, drawId, hasRemainingCol, rows, payoutRows, printedBy = "",
  } = opts;

  const LAST_COL = hasRemainingCol ? 5 : 4; // 6 or 5 columns (A..)
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  };

  // ── Title ──────────────────────────────────────────────────────────────
  S(0, 0, C(titleLine1, sTitle(13)));
  S(1, 0, C(titleLine2, sTitle(12)));
  S(2, 0, C(titleLine3, sTitle(13, true)));
  M(0, 0, 0, LAST_COL);
  M(1, 0, 1, LAST_COL);
  M(2, 0, 2, LAST_COL);
  S(3, 0, CE(sTitle()));
  M(3, 0, 3, LAST_COL);

  // ── Table header ───────────────────────────────────────────────────────
  let col = 0;
  S(4, col++, C(entityLabel, sHeader()));
  S(4, col++, C("ງວດ", sHeader()));
  S(4, col++, C("ລວມຍອດຂາຍ", sHeader()));
  S(4, col++, C("%", sHeader()));
  if (hasRemainingCol) S(4, col++, C("ເຫຼືອ", sHeader()));
  S(4, col++, C("ຍອດໂອນ", sHeader()));
  S(4, col++, C("ຍອດຕ້ອງຖອກ", sHeader()));

  // ── Data rows ──────────────────────────────────────────────────────────
  let r = 5;
  const totals = { sale: 0, pct: 0, remaining: 0, transferred: 0, due: 0 };
  for (const row of rows) {
    let c = 0;
    S(r, c++, C(row.name, sDataText("left")));
    S(r, c++, C(drawId, sDataText("center")));
    S(r, c++, C(row.sale, sData("right")));
    S(r, c++, C(row.pct, sData("right")));
    if (hasRemainingCol) S(r, c++, C(row.remaining ?? 0, sData("right")));
    S(r, c++, C(row.transferred, sData("right")));
    S(r, c++, C(row.due, sData("right")));
    totals.sale += row.sale;
    totals.pct += row.pct;
    totals.remaining += row.remaining ?? 0;
    totals.transferred += row.transferred;
    totals.due += row.due;
    r++;
  }

  // ── Sum row ────────────────────────────────────────────────────────────
  const rSum = r;
  {
    let c = 0;
    S(rSum, c, C("ລວມທັງໝົດ", sSum("center")));
    c++;
    S(rSum, c++, CE(sSum("center")));
    S(rSum, c++, C(totals.sale, sSum("right")));
    S(rSum, c++, C(totals.pct, sSum("right")));
    if (hasRemainingCol) S(rSum, c++, C(totals.remaining, sSum("right")));
    S(rSum, c++, C(totals.transferred, sSum("right")));
    S(rSum, c++, C(totals.due, sSum("right")));
    M(rSum, 0, rSum, 1);
  }

  // ── blank ──────────────────────────────────────────────────────────────
  let rr = rSum + 2;

  // ── Payout-by-user block ──────────────────────────────────────────────
  const rPayoutTitle = rr;
  S(rPayoutTitle, 0, C("ຍອດຈ່າຍ (Payout) ຕາມ User — ງວດນີ້", sTitle(11, true)));
  M(rPayoutTitle, 0, rPayoutTitle, LAST_COL);
  rr++;

  const rPayoutHdr = rr;
  S(rPayoutHdr, 0, C("User", sHeader(BG_PAYOUT_HEADER)));
  M(rPayoutHdr, 0, rPayoutHdr, 1);
  S(rPayoutHdr, 2, C("ຈຳນວນລາຍການ", sHeader(BG_PAYOUT_HEADER)));
  S(rPayoutHdr, 3, C("ຍອດຈ່າຍ", sHeader(BG_PAYOUT_HEADER)));
  rr++;

  let payoutTotal = 0;
  let payoutCount = 0;
  for (const p of payoutRows) {
    S(rr, 0, C(p.user, sDataText("left")));
    M(rr, 0, rr, 1);
    S(rr, 2, C(p.totalCount, sData("right")));
    S(rr, 3, C(p.totalAmount, sData("right")));
    payoutTotal += p.totalAmount;
    payoutCount += p.totalCount;
    rr++;
  }
  const rPayoutSum = rr;
  S(rPayoutSum, 0, C("ລວມທັງໝົດ", sSum("center", BG_PAYOUT_SUM)));
  M(rPayoutSum, 0, rPayoutSum, 1);
  S(rPayoutSum, 2, C(payoutCount, sSum("right", BG_PAYOUT_SUM)));
  S(rPayoutSum, 3, C(payoutTotal, sSum("right", BG_PAYOUT_SUM)));
  rr = rPayoutSum + 2;

  // ── Signature row ──────────────────────────────────────────────────────
  const rSig = rr;
  S(rSig, 0, C("ຜູ້ສະຫຼຸບ", sSig()));
  S(rSig, Math.floor((LAST_COL + 1) / 2), C("ຜູ້ກວດສອບ", sSig()));
  S(rSig, LAST_COL, C("ຜູ້ອະນຸມັດ", sSig()));

  if (printedBy) {
    const rPrinted = rSig + 1;
    S(rPrinted, 0, C(`ຜູ້ພິມ: ${printedBy}`, {
      font: { name: FONT, sz: 9, color: { rgb: "555555" } },
      alignment: { horizontal: "left", vertical: "center" },
    }));
    M(rPrinted, 0, rPrinted, LAST_COL);
  }

  // ── Column widths ──────────────────────────────────────────────────────
  const cols = [
    { wch: 20 }, // entity
    { wch: 12 }, // ງວດ
    { wch: 16 }, // ຍອດຂາຍ
    { wch: 14 }, // %
  ];
  if (hasRemainingCol) cols.push({ wch: 14 }); // ເຫຼືອ
  cols.push({ wch: 14 }); // ຍອດໂອນ
  cols.push({ wch: 16 }); // ຍອດຕ້ອງຖອກ
  ws["!cols"] = cols;

  ws["!merges"] = merges;
  const lastRow = (printedBy ? rSig + 1 : rSig) + 1;
  ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: lastRow, c: LAST_COL });

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSXStyle.writeFile(wb, fileName);
}
