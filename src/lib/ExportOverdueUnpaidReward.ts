// lib/ExportOverdueUnpaidReward.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານ ລາງວັນຄ້າງຈ່າຍ — ງວດອອກແລ້ວເກີນ N ວັນ ແຕ່ຍັງບໍ່ພົບລາຍການຈ່າຍ
//  (LOTLINK_REWARD ⟶ NOT EXISTS ⟶ LOTLINK_PAYOUT)
//  xlsx-js-style
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OverdueUnpaidRewardRow {
  DRAWID:        string;
  DRAWDATE:      string; // "YYYY-MM-DD HH24:MI:SS"
  LOTTO_BILL_NO: string;
  TOTAL_REWARD:  number;
  SELL_USER:     "APP" | "POS" | string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT      = "Phetsarath OT";
const NUMFONT   = "Arial Narrow";
const BG_HEADER = "9DC3E6"; // light blue — header row
const BG_TOTAL  = "D9D9D9"; // grey — grand total row
const LAST_COL  = 4;        // E (index 4)

// ── Border helpers ────────────────────────────────────────────────────────────

type BSide = { color: CellStyleColor; style?: BorderType };
const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const allThin = (): CellStyle["border"] => ({ left: thin(), right: thin(), top: thin(), bottom: thin() });

// ── Style builders ────────────────────────────────────────────────────────────

function sTitle(sz = 12, bold = false): CellStyle {
  return { font: { name: FONT, sz, bold }, alignment: { horizontal: "center", vertical: "center" } };
}

function sHeader(sz = 11): CellStyle {
  return {
    font: { name: FONT, bold: true, sz },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}

function sData(align: "center" | "right" | "left" = "right", bg?: string, bold = false): CellStyle {
  return {
    font: { name: NUMFONT, sz: 10, bold },
    fill: bg ? { patternType: "solid", fgColor: { rgb: bg } } : undefined,
    alignment: { horizontal: align, vertical: "center" },
    numFmt: "#,##0",
    border: allThin(),
  };
}

function sDataText(align: "center" | "left" = "center", bg?: string, bold = false): CellStyle {
  return {
    font: { name: FONT, sz: 10, bold },
    fill: bg ? { patternType: "solid", fgColor: { rgb: bg } } : undefined,
    alignment: { horizontal: align, vertical: "center" },
    border: allThin(),
  };
}

// ── Cell factories ────────────────────────────────────────────────────────────

// text cell — forced to string type so leading zeros in bill numbers are kept as-is
function CT(v: string, s: CellStyle): CellObject {
  return { v, t: "s", s } as CellObject;
}
function CN(v: number, s: CellStyle): CellObject {
  return { v, t: "n", s } as CellObject;
}
function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const datePart = String(s).slice(0, 10).split("-");
  const timePart = String(s).slice(11);
  const d = datePart.length === 3 ? `${datePart[2]}/${datePart[1]}/${datePart[0]}` : String(s);
  return timePart ? `${d} ${timePart}` : d;
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(
  rangeDisplay: string,
  days: number,
  rows: OverdueUnpaidRewardRow[],
  printedBy: string,
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => { ws[XLSXStyle.utils.encode_cell({ r, c })] = cl; };
  const M = (r1: number, c1: number, r2: number, c2: number) => { merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); };

  // ── Title ─────────────────────────────────────────────────────────────────
  S(0, 0, C_title("ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ"));
  S(1, 0, C_title("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", 12));
  S(2, 0, C_title(`ລາຍງານ ລາງວັນຄ້າງຈ່າຍ (ເກີນ ${days} ວັນ)${rangeDisplay ? "  " + rangeDisplay : ""}`, 13, true));
  M(0, 0, 0, LAST_COL); M(1, 0, 1, LAST_COL); M(2, 0, 2, LAST_COL);

  S(3, 0, CE(sTitle())); M(3, 0, 3, LAST_COL);

  // ── Header row ────────────────────────────────────────────────────────────
  const headers = ["ວັນທີອອກງວດ", "ງວດ", "ເລກບິນ", "ຍອດຖືກລາງວັນ", "ຊ່ອງທາງ"];
  headers.forEach((h, c) => S(4, c, CT(h, sHeader(11))));

  // ── Data rows ─────────────────────────────────────────────────────────────
  let r = 5;
  let sumReward = 0;
  for (const row of rows) {
    S(r, 0, CT(fmtDate(row.DRAWDATE), sDataText("center")));
    S(r, 1, CT(row.DRAWID, sDataText("center")));
    S(r, 2, CT(row.LOTTO_BILL_NO, sDataText("left")));
    S(r, 3, CN(row.TOTAL_REWARD, sData("right")));
    S(r, 4, CT(row.SELL_USER, sDataText("center")));
    sumReward += row.TOTAL_REWARD;
    r++;
  }

  // ── Grand total ───────────────────────────────────────────────────────────
  const rTotal = r;
  S(rTotal, 0, CT(`ລວມທັງໝົດ (${rows.length} ລາຍການ)`, sDataText("center", BG_TOTAL, true)));
  M(rTotal, 0, rTotal, 2);
  S(rTotal, 3, CN(sumReward, sData("right", BG_TOTAL, true)));
  S(rTotal, 4, CE(sDataText("center", BG_TOTAL)));
  r++;

  // ── Printed-by ────────────────────────────────────────────────────────────
  let rEnd = rTotal;
  if (printedBy) {
    rEnd = r + 1;
    S(rEnd, 0, CT(`ຜູ້ພິມ: ${printedBy}`, { font: { name: FONT, sz: 9, color: { rgb: "555555" } }, alignment: { horizontal: "left", vertical: "center" } }));
    M(rEnd, 0, rEnd, LAST_COL);
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 20 }, { wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 10 },
  ];

  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: rEnd, c: LAST_COL });

  return ws;
}

function C_title(v: string, sz = 13, bold = false): CellObject {
  return CT(v, sTitle(sz, bold));
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function exportOverdueUnpaidReward(
  rows:      OverdueUnpaidRewardRow[],
  days:      number,
  drawFrom:  string,
  drawTo:    string,
  printedBy = "",
): Promise<void> {
  const rangeDisplay = !drawFrom && !drawTo
    ? ""
    : drawFrom === drawTo
      ? `ງວດ ${drawFrom}`
      : `ງວດ ${drawFrom || "ທັງໝົດ"} ຫາ ${drawTo || "ທັງໝົດ"}`;

  const ws = buildSheet(rangeDisplay, days, rows, printedBy);
  const wb = XLSXStyle.utils.book_new();
  const sheetName = "OverdueUnpaidReward".slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().slice(0, 10);
  XLSXStyle.writeFile(wb, `OverdueUnpaidReward_${drawFrom || "all"}_to_${drawTo || "all"}_${today}.xlsx`);
}
