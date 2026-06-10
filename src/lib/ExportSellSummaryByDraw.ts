// lib/ExportSellSummaryByDraw.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານຍອດຂາຍຈາກລະບົບ Lotlink, Splus ແລະ SCN — ສັງລວມຕາມງວດ
//  xlsx-js-style@1.2.0
//
//  Layout:
//  R1     = ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ               (merged A:K)
//  R2     = ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ (merged A:K)
//  R3     = ຫົວຂໍ້ + ຂອບເຂດງວດ                               (merged A:K)
//  R4     = blank
//  R5-R6  = Table header (2 rows — group + sub-column):
//             A5:A6 = ງວດ,  B5:B6 = ວັນທີ
//             C5:C6 = Lotlink (080821001APP)
//             D5:E5 = SOKXAY-BCEL  → D6=BCEL, E6=POINT
//             F5:H5 = SCN-SOKXAY   → F6=BCEL, G6=LDB, H6=Mmoney
//             I5:J5 = SOKXAY-LDB/JDB → I6=JDB, J6=LDB
//             K5:K6 = Diff
//  R7+    = Data rows
//  RSum   = ລວມທັງໝົດ (merged A:B, C-K totals)
//  blank
//  RSig   = signature row
//  RPrinted = ຜູ້ພິມ (optional)
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SellSummaryRow {
  DRAW_ID: number;
  DRAW_DATE: string;
  LOTLINK: number;
  BCEL: number;
  POINT: number;
  SCN_BCEL: number;
  SCN_LDB: number;
  SCN_MMONEY: number;
  JDB: number;
  LDB: number;
  DIFF: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT = "Phetsarath OT";
const BG_HEADER = "9DC3E6"; // light blue — main header row
const BG_YELLOW = "FFFF00"; // yellow — group header row 1
const BG_YELLOW2 = "FFFF99"; // light yellow — group header row 2
const BG_CYAN = "DAEEF3"; // cyan tint — Lotlink col
const BG_BLUE = "DDEEFF"; // blue tint — SOKXAY-BCEL cols
const BG_GREEN = "DDEEDC"; // green tint — SCN cols
const BG_ORANGE = "FCE4D6"; // orange tint — JDB/LDB cols
const BG_RED = "FFE0E0"; // red tint — Diff col
const BG_SUM = "BDD7EE"; // lighter blue — grand total row
const BG_DIFF_NEG = "FFE0E0"; // red bg for negative diff
const BG_DIFF_POS = "E2EFDA"; // green bg for positive diff

const LAST_COL = 10; // K (index 10) — columns A through K

// ── Border helpers ────────────────────────────────────────────────────────────

type BSide = { color: CellStyleColor; style?: BorderType };

const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });

const allThin = (): CellStyle["border"] => ({
  left: thin(),
  right: thin(),
  top: thin(),
  bottom: thin(),
});
const medLeft = (): CellStyle["border"] => ({
  left: medium(),
  right: thin(),
  top: thin(),
  bottom: thin(),
});

// ── Style builders ────────────────────────────────────────────────────────────

function sTitle(sz = 12, bold = false): CellStyle {
  return {
    font: { name: FONT, sz, bold },
    alignment: { horizontal: "center", vertical: "center" },
  };
}

function sGroupHeader(bg: string, textColor = "000000", sz = 10): CellStyle {
  return {
    font: { name: FONT, bold: true, sz, color: { rgb: textColor } },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}

function sHeader(bg = BG_HEADER, sz = 10): CellStyle {
  return {
    font: { name: FONT, bold: true, sz },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}

function sData(
  align: "center" | "right" | "left" = "right",
  bg?: string,
  leftMed = false,
): CellStyle {
  const style: CellStyle = {
    font: { name: FONT, sz: 10 },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: "#,##0.00",
    border: leftMed ? medLeft() : allThin(),
  };
  if (bg) style.fill = { patternType: "solid", fgColor: { rgb: bg } };
  return style;
}

function sDataText(
  align: "center" | "left" = "center",
  bg?: string,
  bold = false,
  color?: string,
): CellStyle {
  const style: CellStyle = {
    font: {
      name: FONT,
      sz: 10,
      bold,
      ...(color ? { color: { rgb: color } } : {}),
    },
    alignment: { horizontal: align, vertical: "center" },
    border: allThin(),
  };
  if (bg) style.fill = { patternType: "solid", fgColor: { rgb: bg } };
  return style;
}

function sSum(align: "center" | "right" = "right", isLabel = false): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: BG_SUM } },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: isLabel ? undefined : "#,##0.00",
    border: allThin(),
  };
}

function sDiff(val: number, bold = false): CellStyle {
  const bg = val < 0 ? BG_DIFF_NEG : val === 0 ? "E8F5E9" : BG_DIFF_POS;
  const color = val < 0 ? "CC0000" : val === 0 ? "1B7A3E" : "7D4E00";
  return {
    font: { name: FONT, sz: 10, bold, color: { rgb: color } },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "#,##0.00",
    border: allThin(),
  };
}

function sSumDiff(val: number): CellStyle {
  const color = val < 0 ? "CC0000" : val === 0 ? "1B7A3E" : "7D4E00";
  return {
    font: { name: FONT, bold: true, sz: 10, color: { rgb: color } },
    fill: { patternType: "solid", fgColor: { rgb: BG_SUM } },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "#,##0.00",
    border: allThin(),
  };
}

function sSig(): CellStyle {
  return {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
  };
}

// ── Cell factories ────────────────────────────────────────────────────────────

function C(v: string | number, s: CellStyle): CellObject {
  return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
}

function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n === 0
    ? "-"
    : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(
  drawFrom: string,
  drawTo: string,
  dataRows: SellSummaryRow[],
  printedBy: string,
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  };

  // ── R1-R3: Title ──────────────────────────────────────────────────────────
  S(0, 0, C("ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", sTitle(13)));
  S(1, 0, C("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", sTitle(12)));
  const rangeLabel =
    !drawFrom && !drawTo
      ? ""
      : drawFrom === drawTo
        ? ` (ງວດທີ ${drawFrom})`
        : ` (ງວດທີ ${drawFrom || "…"} ຫາ ${drawTo || "…"})`;
  S(
    2,
    0,
    C(
      `ລາຍງານຍອດຂາຍຈາກລະບົບ Lotlink, ລະບົບ Splus ແລະ ລະບົບ SCN${rangeLabel}`,
      sTitle(13, true),
    ),
  );
  M(0, 0, 0, LAST_COL);
  M(1, 0, 1, LAST_COL);
  M(2, 0, 2, LAST_COL);

  // ── R4: blank ─────────────────────────────────────────────────────────────
  S(3, 0, CE(sTitle()));
  M(3, 0, 3, LAST_COL);

  // ── R5: Group header row ──────────────────────────────────────────────────
  // A5:A6 = ງວດ (rowspan 2)
  S(4, 0, C("ງວດ", sGroupHeader(BG_YELLOW, "000000")));
  // B5:B6 = ວັນທີ (rowspan 2)
  S(4, 1, C("ວັນທີ", sGroupHeader(BG_YELLOW, "000000")));
  // C5:C6 = Lotlink (rowspan 2)
  S(4, 2, C("Lotlink\n080821001APP", sGroupHeader(BG_CYAN, "006080")));
  // D5:E5 = SOKXAY-BCEL (colspan 2)
  S(4, 3, C("SOKXAY-BCEL", sGroupHeader(BG_BLUE, "003399")));
  S(4, 4, CE(sGroupHeader(BG_BLUE, "003399")));
  M(4, 3, 4, 4);
  // F5:H5 = SCN-SOKXAY (colspan 3)
  S(4, 5, C("SCN-SOKXAY", sGroupHeader(BG_GREEN, "006600")));
  S(4, 6, CE(sGroupHeader(BG_GREEN, "006600")));
  S(4, 7, CE(sGroupHeader(BG_GREEN, "006600")));
  M(4, 5, 4, 7);
  // I5:J5 = SOKXAY-LDB/JDB (colspan 2)
  S(4, 8, C("SOKXAY-LDB/JDB", sGroupHeader(BG_ORANGE, "7D4000")));
  S(4, 9, CE(sGroupHeader(BG_ORANGE, "7D4000")));
  M(4, 8, 4, 9);
  // K5:K6 = Diff (rowspan 2)
  S(4, 10, C("Diff", sGroupHeader(BG_RED, "990000")));

  // ── R6: Sub-column header row ─────────────────────────────────────────────
  S(5, 0, CE(sHeader(BG_YELLOW2))); // ງວດ continued (merge)
  S(5, 1, CE(sHeader(BG_YELLOW2))); // ວັນທີ continued (merge)
  S(5, 2, CE(sHeader(BG_CYAN))); // Lotlink continued (merge)
  S(5, 3, C("BCEL", sHeader(BG_BLUE)));
  S(5, 4, C("POINT", sHeader(BG_BLUE)));
  S(5, 5, C("BCEL", sHeader(BG_GREEN)));
  S(5, 6, C("LDB", sHeader(BG_GREEN)));
  S(5, 7, C("Mmoney", sHeader(BG_GREEN)));
  S(5, 8, C("JDB", sHeader(BG_ORANGE)));
  S(5, 9, C("LDB", sHeader(BG_ORANGE)));
  S(5, 10, CE(sHeader(BG_RED))); // Diff continued (merge)

  // rowspan merges for col A, B, C, K across rows 5-6
  M(4, 0, 5, 0); // ງວດ
  M(4, 1, 5, 1); // ວັນທີ
  M(4, 2, 5, 2); // Lotlink
  M(4, 10, 5, 10); // Diff

  // ── R7+: Data rows ────────────────────────────────────────────────────────
  const ROW_START = 6;

  // Grand total accumulators
  let gLotlink = 0,
    gBcel = 0,
    gPoint = 0;
  let gScnBcel = 0,
    gScnLdb = 0,
    gScnMmoney = 0;
  let gJdb = 0,
    gLdb = 0,
    gDiff = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const r = ROW_START + i;
    const dr = dataRows[i];

    gLotlink += Number(dr.LOTLINK ?? 0);
    gBcel += Number(dr.BCEL ?? 0);
    gPoint += Number(dr.POINT ?? 0);
    gScnBcel += Number(dr.SCN_BCEL ?? 0);
    gScnLdb += Number(dr.SCN_LDB ?? 0);
    gScnMmoney += Number(dr.SCN_MMONEY ?? 0);
    gJdb += Number(dr.JDB ?? 0);
    gLdb += Number(dr.LDB ?? 0);
    gDiff += Number(dr.DIFF ?? 0);

    const oddBg = i % 2 === 1 ? "F5F5F5" : undefined;

    // ງວດ — violet bold
    S(r, 0, C(String(dr.DRAW_ID), sDataText("center", oddBg, true, "5B2C8D")));
    // ວັນທີ
    S(r, 1, C(String(dr.DRAW_DATE ?? ""), sDataText("center", oddBg)));
    // Lotlink — cyan bg
    S(r, 2, C(Number(dr.LOTLINK ?? 0), sData("right", BG_CYAN, true)));
    // SOKXAY-BCEL
    S(r, 3, C(Number(dr.BCEL ?? 0), sData("right", "EEF6FF")));
    S(r, 4, C(Number(dr.POINT ?? 0), sData("right", "EEF6FF")));
    // SCN-SOKXAY
    S(r, 5, C(Number(dr.SCN_BCEL ?? 0), sData("right", "EEF8EE")));
    S(r, 6, C(Number(dr.SCN_LDB ?? 0), sData("right", "EEF8EE")));
    S(r, 7, C(Number(dr.SCN_MMONEY ?? 0), sData("right", "EEF8EE")));
    // JDB/LDB
    S(r, 8, C(Number(dr.JDB ?? 0), sData("right", "FFF4EC")));
    S(r, 9, C(Number(dr.LDB ?? 0), sData("right", "FFF4EC")));
    // Diff — colour-coded
    S(r, 10, C(Number(dr.DIFF ?? 0), sDiff(Number(dr.DIFF ?? 0))));
  }

  // ── Grand total row ───────────────────────────────────────────────────────
  const rSum = ROW_START + dataRows.length;
  S(rSum, 0, C("ລວມທັງໝົດ", sSum("center", true)));
  S(rSum, 1, CE(sSum("center", true)));
  S(rSum, 2, C(gLotlink, sSum("right")));
  S(rSum, 3, C(gBcel, sSum("right")));
  S(rSum, 4, C(gPoint, sSum("right")));
  S(rSum, 5, C(gScnBcel, sSum("right")));
  S(rSum, 6, C(gScnLdb, sSum("right")));
  S(rSum, 7, C(gScnMmoney, sSum("right")));
  S(rSum, 8, C(gJdb, sSum("right")));
  S(rSum, 9, C(gLdb, sSum("right")));
  S(rSum, 10, C(gDiff, sSumDiff(gDiff)));
  M(rSum, 0, rSum, 1);

  // ── Blank row ─────────────────────────────────────────────────────────────
  const rBlank = rSum + 1;
  S(rBlank, 0, CE(sTitle()));
  M(rBlank, 0, rBlank, LAST_COL);

  // ── Signature row ─────────────────────────────────────────────────────────
  const rSig = rBlank + 1;
  S(rSig, 0, C("ອຳນວຍການ ບໍລິສັດ\nSokxay One Plus E-commerce", sSig()));
  S(rSig, 3, C("ຜູ້ຈັດການບັນຊີ\nບໍລິສັດ ຫວຍ", sSig()));
  S(rSig, 6, C("IT ບໍລິສັດ\nSokxay One Plus E-commerce", sSig()));
  S(rSig, 9, C("ຜູ້ສັງລວມ", sSig()));
  M(rSig, 0, rSig, 2);
  M(rSig, 3, rSig, 5);
  M(rSig, 6, rSig, 8);
  M(rSig, 9, rSig, LAST_COL);

  // ── Printed-by info ───────────────────────────────────────────────────────
  if (printedBy) {
    const rPrinted = rSig + 1;
    S(
      rPrinted,
      0,
      C(`ຜູ້ພິມ: ${printedBy}`, {
        font: { name: FONT, sz: 9, color: { rgb: "555555" } },
        alignment: { horizontal: "left", vertical: "center" },
      }),
    );
    M(rPrinted, 0, rPrinted, LAST_COL);
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 8.0 }, // A: ງວດ
    { wch: 12.0 }, // B: ວັນທີ
    { wch: 16.0 }, // C: Lotlink
    { wch: 15.0 }, // D: BCEL
    { wch: 15.0 }, // E: POINT
    { wch: 15.0 }, // F: SCN BCEL
    { wch: 14.0 }, // G: SCN LDB
    { wch: 14.0 }, // H: SCN Mmoney
    { wch: 14.0 }, // I: JDB
    { wch: 14.0 }, // J: LDB
    { wch: 16.0 }, // K: Diff
  ];

  // ── Row heights ───────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 18.0 }, // R1 title
    { hpt: 16.0 }, // R2 subtitle
    { hpt: 20.0 }, // R3 doc title
    { hpt: 10.0 }, // R4 blank
    { hpt: 30.0 }, // R5 group header
    { hpt: 24.0 }, // R6 sub-header
    ...Array.from({ length: dataRows.length }, () => ({ hpt: 20.0 })),
    { hpt: 24.0 }, // grand total
    { hpt: 10.0 }, // blank
    { hpt: 48.0 }, // signature (2 lines)
  ];

  // ── Merges + ref ──────────────────────────────────────────────────────────
  ws["!merges"] = merges;

  const lastRow = rSig + (printedBy ? 1 : 0);
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastRow + 1, c: LAST_COL },
  );

  return ws;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * exportSellSummaryByDraw
 *
 * @param rows      - data rows (SellSummaryRow[])
 * @param drawFrom  - draw ID start (for filename + title)
 * @param drawTo    - draw ID end
 * @param printedBy - display name of logged-in user (optional)
 */
export async function exportSellSummaryByDraw(
  rows: SellSummaryRow[],
  drawFrom: string,
  drawTo: string,
  printedBy = "",
): Promise<void> {
  const ws = buildSheet(drawFrom, drawTo, rows, printedBy);
  const wb = XLSXStyle.utils.book_new();
  const sheetName = `SellSummary ${drawFrom || "all"}`.slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  XLSXStyle.writeFile(
    wb,
    `SellSummary_Draw_${drawFrom || "all"}_to_${drawTo || "all"}.xlsx`,
  );
}
