// lib/ExportSellByUserChannelSummary.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານຍອດຂາຍຕາມ Channel (APP vs POS) — sell_by_user_channel_summary
//  xlsx-js-style
//
//  Layout (18 data columns, A=ງວດ/ເດືອນ, B=ວັນທີ ນຳໃຊ້ສະເພາະງວດ):
//  R1-R3  = Title block                                    (merged A:S)
//  R4     = blank
//  R5-R6  = Table header (2 rows — group + sub-column)
//             A5:A6 = ງວດ/ເດືອນ
//             (draw only) B5:B6 = ວັນທີ
//             C-D = APP-Sokxay (ບິນ/ຍອດ)
//             E-F = APP-SCN (ບິນ/ຍອດ)
//             G-H = ລວມ APP (ບິນ/ຍອດ)
//             I-J = Diff APP (ບິນ/ຍອດ)
//             K-L = POS-TouBee (ບິນ/ຍອດ)
//             M-N = POS-SCN (ບິນ/ຍອດ)
//             O-P = ລວມ POS (ບິນ/ຍອດ)
//             Q-R = Diff POS (ບິນ/ຍອດ)
//             S-T = ລວມທັງໝົດ (ບິນ/ຍອດ)
//             U-V = Diff ລວມ (ບິນ/ຍອດ)
//  R7+    = Data rows
//  RSum   = ລວມທັງໝົດ
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

interface ChannelFields {
  TOTAL_BILLS_ALL: number;
  TOTAL_SALE_ALL: number;
  BILLS_APP_SOKXAY: number;
  SALE_APP_SOKXAY: number;
  BILLS_APP_SCN: number;
  SALE_APP_SCN: number;
  TOTAL_BILLS_APP: number;
  TOTAL_SALE_APP: number;
  DIFF_BILLS_APP: number;
  DIFF_SALE_APP: number;
  TOTAL_BILLS_POS: number;
  TOTAL_SALE_POS: number;
  BILLS_POS_TOUBEE: number;
  SALE_POS_TOUBEE: number;
  BILLS_POS_SCN: number;
  SALE_POS_SCN: number;
  DIFF_BILLS_POS: number;
  DIFF_SALE_POS: number;
  DIFF_BILLS_ALL: number;
  DIFF_SALE_ALL: number;
}

export interface ChannelDrawRow extends ChannelFields {
  DRAWID: string;
  DRAW_DATE: string;
}

export interface ChannelMonthRow extends ChannelFields {
  SALE_MONTH: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT = "Phetsarath OT";
const BG_YELLOW = "FFFF00";
const BG_YELLOW2 = "FFFF99";
const BG_INDIGO = "E0E0F8";
const BG_CYAN = "DAEEF3";
const BG_INDIGO_TOTAL = "C7C7F0";
const BG_INDIGO_DIFF = "AFAFE8";
const BG_ORANGE = "FCE4D6";
const BG_AMBER = "FFF2CC";
const BG_ORANGE_TOTAL = "F8CBAD";
const BG_ORANGE_DIFF = "F4B183";
const BG_GRAND = "D9D9D9";
const BG_GRAND_DIFF = "BFBFBF";
const BG_SUM = "BDD7EE";
const BG_DIFF_NEG = "FFE0E0";
const BG_DIFF_POS = "E2EFDA";

// ── Border helpers ────────────────────────────────────────────────────────────

type BSide = { color: CellStyleColor; style?: BorderType };
const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const allThin = (): CellStyle["border"] => ({
  left: thin(),
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

function sHeader(bg: string, sz = 10): CellStyle {
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
  isInt = false,
): CellStyle {
  const style: CellStyle = {
    font: { name: FONT, sz: 10 },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: isInt ? "#,##0" : "#,##0.00",
    border: allThin(),
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

function sSum(
  align: "center" | "right" = "right",
  isLabel = false,
  isInt = false,
): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: BG_SUM } },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: isLabel ? undefined : isInt ? "#,##0" : "#,##0.00",
    border: allThin(),
  };
}

function sDiff(val: number, isInt = false): CellStyle {
  const bg = val < 0 ? BG_DIFF_NEG : val === 0 ? "E8F5E9" : BG_DIFF_POS;
  const color = val < 0 ? "CC0000" : val === 0 ? "1B7A3E" : "7D4E00";
  return {
    font: { name: FONT, sz: 10, bold: true, color: { rgb: color } },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: isInt ? "#,##0" : "#,##0.00",
    border: allThin(),
  };
}

function sSumDiff(val: number, isInt = false): CellStyle {
  const color = val < 0 ? "CC0000" : val === 0 ? "1B7A3E" : "7D4E00";
  return {
    font: { name: FONT, bold: true, sz: 10, color: { rgb: color } },
    fill: { patternType: "solid", fgColor: { rgb: BG_SUM } },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: isInt ? "#,##0" : "#,##0.00",
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

// ── Zero accumulator ──────────────────────────────────────────────────────────

function zero(): ChannelFields {
  return {
    TOTAL_BILLS_ALL: 0,
    TOTAL_SALE_ALL: 0,
    BILLS_APP_SOKXAY: 0,
    SALE_APP_SOKXAY: 0,
    BILLS_APP_SCN: 0,
    SALE_APP_SCN: 0,
    TOTAL_BILLS_APP: 0,
    TOTAL_SALE_APP: 0,
    DIFF_BILLS_APP: 0,
    DIFF_SALE_APP: 0,
    TOTAL_BILLS_POS: 0,
    TOTAL_SALE_POS: 0,
    BILLS_POS_TOUBEE: 0,
    SALE_POS_TOUBEE: 0,
    BILLS_POS_SCN: 0,
    SALE_POS_SCN: 0,
    DIFF_BILLS_POS: 0,
    DIFF_SALE_POS: 0,
    DIFF_BILLS_ALL: 0,
    DIFF_SALE_ALL: 0,
  };
}

// ── Sheet builder ─────────────────────────────────────────────────────────────
// mode "draw"  → col A = ງວດ, col B = ວັນທີ, data starts col C (index 2)
// mode "month" → col A = ເດືອນ (no date col), data starts col B (index 1)

function buildSheet(
  mode: "draw" | "month",
  rangeLabel: string,
  rows: (ChannelDrawRow | ChannelMonthRow)[],
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

  const dataStartCol = mode === "draw" ? 2 : 1;
  const LAST_COL = dataStartCol + 17; // 18 data cols (9 pairs)

  // ── R1-R3: Title ──────────────────────────────────────────────────────────
  S(0, 0, C("ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", sTitle(13)));
  S(1, 0, C("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", sTitle(12)));
  S(
    2,
    0,
    C(`ລາຍງານຍອດຂາຍຕາມ Channel (APP vs POS)${rangeLabel}`, sTitle(13, true)),
  );
  M(0, 0, 0, LAST_COL);
  M(1, 0, 1, LAST_COL);
  M(2, 0, 2, LAST_COL);

  // ── R4: blank ─────────────────────────────────────────────────────────────
  S(3, 0, CE(sTitle()));
  M(3, 0, 3, LAST_COL);

  // ── R5-R6: Header ─────────────────────────────────────────────────────────
  let c = 0;
  S(4, c, C(mode === "draw" ? "ງວດ" : "ເດືອນ", sGroupHeader(BG_YELLOW)));
  M(4, c, 5, c);
  c++;

  if (mode === "draw") {
    S(4, c, C("ວັນທີ", sGroupHeader(BG_YELLOW)));
    M(4, c, 5, c);
    c++;
  }

  // APP-Sokxay
  S(4, c, C("APP-Sokxay", sGroupHeader(BG_INDIGO, "1A237E")));
  S(4, c + 1, CE(sGroupHeader(BG_INDIGO, "1A237E")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_INDIGO)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_INDIGO)));
  c += 2;

  // APP-SCN
  S(4, c, C("APP-SCN", sGroupHeader(BG_CYAN, "006080")));
  S(4, c + 1, CE(sGroupHeader(BG_CYAN, "006080")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_CYAN)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_CYAN)));
  c += 2;

  // ລວມ APP
  S(4, c, C("ລວມ APP", sGroupHeader(BG_INDIGO_TOTAL, "1A237E")));
  S(4, c + 1, CE(sGroupHeader(BG_INDIGO_TOTAL, "1A237E")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_INDIGO_TOTAL)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_INDIGO_TOTAL)));
  c += 2;

  // Diff APP
  S(4, c, C("Diff APP", sGroupHeader(BG_INDIGO_DIFF, "1A237E")));
  S(4, c + 1, CE(sGroupHeader(BG_INDIGO_DIFF, "1A237E")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_INDIGO_DIFF)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_INDIGO_DIFF)));
  c += 2;

  // POS-TouBee
  S(4, c, C("POS-TouBee", sGroupHeader(BG_ORANGE, "7D4000")));
  S(4, c + 1, CE(sGroupHeader(BG_ORANGE, "7D4000")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_ORANGE)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_ORANGE)));
  c += 2;

  // POS-SCN
  S(4, c, C("POS-SCN", sGroupHeader(BG_AMBER, "7D4000")));
  S(4, c + 1, CE(sGroupHeader(BG_AMBER, "7D4000")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_AMBER)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_AMBER)));
  c += 2;

  // ລວມ POS
  S(4, c, C("ລວມ POS", sGroupHeader(BG_ORANGE_TOTAL, "7D4000")));
  S(4, c + 1, CE(sGroupHeader(BG_ORANGE_TOTAL, "7D4000")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_ORANGE_TOTAL)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_ORANGE_TOTAL)));
  c += 2;

  // Diff POS
  S(4, c, C("Diff POS", sGroupHeader(BG_ORANGE_DIFF, "7D4000")));
  S(4, c + 1, CE(sGroupHeader(BG_ORANGE_DIFF, "7D4000")));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_ORANGE_DIFF)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_ORANGE_DIFF)));
  c += 2;

  // ລວມທັງໝົດ
  S(4, c, C("ລວມທັງໝົດ", sGroupHeader(BG_GRAND)));
  S(4, c + 1, CE(sGroupHeader(BG_GRAND)));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_GRAND)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_GRAND)));
  c += 2;

  // Diff ລວມ
  S(4, c, C("Diff ລວມ", sGroupHeader(BG_GRAND_DIFF)));
  S(4, c + 1, CE(sGroupHeader(BG_GRAND_DIFF)));
  M(4, c, 4, c + 1);
  S(5, c, C("ບິນ", sHeader(BG_GRAND_DIFF)));
  S(5, c + 1, C("ຍອດ", sHeader(BG_GRAND_DIFF)));

  // ── R7+: Data rows ────────────────────────────────────────────────────────
  const ROW_START = 6;
  const grand = zero();

  for (let i = 0; i < rows.length; i++) {
    const r = ROW_START + i;
    const dr = rows[i];
    const oddBg = i % 2 === 1 ? "F5F5F5" : undefined;

    (Object.keys(grand) as (keyof ChannelFields)[]).forEach((k) => {
      grand[k] += Number(dr[k] ?? 0);
    });

    let cc = 0;
    if (mode === "draw") {
      const d = dr as ChannelDrawRow;
      S(r, cc, C(String(d.DRAWID), sDataText("center", oddBg, true, "5B2C8D")));
      cc++;
      S(r, cc, C(String(d.DRAW_DATE ?? ""), sDataText("center", oddBg)));
      cc++;
    } else {
      const d = dr as ChannelMonthRow;
      S(
        r,
        cc,
        C(String(d.SALE_MONTH), sDataText("center", oddBg, true, "5B2C8D")),
      );
      cc++;
    }

    S(r, cc++, C(dr.BILLS_APP_SOKXAY, sData("right", "EEF0FB", true)));
    S(r, cc++, C(dr.SALE_APP_SOKXAY, sData("right", "EEF0FB")));
    S(r, cc++, C(dr.BILLS_APP_SCN, sData("right", "EAF7FA", true)));
    S(r, cc++, C(dr.SALE_APP_SCN, sData("right", "EAF7FA")));
    S(r, cc++, C(dr.TOTAL_BILLS_APP, sData("right", "DCDCF5", true)));
    S(r, cc++, C(dr.TOTAL_SALE_APP, sData("right", "DCDCF5")));
    S(r, cc++, C(dr.DIFF_BILLS_APP, sDiff(dr.DIFF_BILLS_APP, true)));
    S(r, cc++, C(dr.DIFF_SALE_APP, sDiff(dr.DIFF_SALE_APP)));
    S(r, cc++, C(dr.BILLS_POS_TOUBEE, sData("right", "FFF4EC", true)));
    S(r, cc++, C(dr.SALE_POS_TOUBEE, sData("right", "FFF4EC")));
    S(r, cc++, C(dr.BILLS_POS_SCN, sData("right", "FFF9E8", true)));
    S(r, cc++, C(dr.SALE_POS_SCN, sData("right", "FFF9E8")));
    S(r, cc++, C(dr.TOTAL_BILLS_POS, sData("right", "FBE0C4", true)));
    S(r, cc++, C(dr.TOTAL_SALE_POS, sData("right", "FBE0C4")));
    S(r, cc++, C(dr.DIFF_BILLS_POS, sDiff(dr.DIFF_BILLS_POS, true)));
    S(r, cc++, C(dr.DIFF_SALE_POS, sDiff(dr.DIFF_SALE_POS)));
    S(r, cc++, C(dr.TOTAL_BILLS_ALL, sData("right", "EDEDED", true)));
    S(r, cc++, C(dr.TOTAL_SALE_ALL, sData("right", "EDEDED")));
    S(r, cc++, C(dr.DIFF_BILLS_ALL, sDiff(dr.DIFF_BILLS_ALL, true)));
    S(r, cc++, C(dr.DIFF_SALE_ALL, sDiff(dr.DIFF_SALE_ALL)));
  }

  // ── Grand total row ───────────────────────────────────────────────────────
  const rSum = ROW_START + rows.length;
  const labelSpan = mode === "draw" ? 2 : 1;
  S(rSum, 0, C("ລວມທັງໝົດ", sSum("center", true)));
  if (mode === "draw") {
    S(rSum, 1, CE(sSum("center", true)));
    M(rSum, 0, rSum, 1);
  }

  let sc = labelSpan;
  S(rSum, sc++, C(grand.BILLS_APP_SOKXAY, sSum("right", false, true)));
  S(rSum, sc++, C(grand.SALE_APP_SOKXAY, sSum("right")));
  S(rSum, sc++, C(grand.BILLS_APP_SCN, sSum("right", false, true)));
  S(rSum, sc++, C(grand.SALE_APP_SCN, sSum("right")));
  S(rSum, sc++, C(grand.TOTAL_BILLS_APP, sSum("right", false, true)));
  S(rSum, sc++, C(grand.TOTAL_SALE_APP, sSum("right")));
  S(rSum, sc++, C(grand.DIFF_BILLS_APP, sSumDiff(grand.DIFF_BILLS_APP, true)));
  S(rSum, sc++, C(grand.DIFF_SALE_APP, sSumDiff(grand.DIFF_SALE_APP)));
  S(rSum, sc++, C(grand.BILLS_POS_TOUBEE, sSum("right", false, true)));
  S(rSum, sc++, C(grand.SALE_POS_TOUBEE, sSum("right")));
  S(rSum, sc++, C(grand.BILLS_POS_SCN, sSum("right", false, true)));
  S(rSum, sc++, C(grand.SALE_POS_SCN, sSum("right")));
  S(rSum, sc++, C(grand.TOTAL_BILLS_POS, sSum("right", false, true)));
  S(rSum, sc++, C(grand.TOTAL_SALE_POS, sSum("right")));
  S(rSum, sc++, C(grand.DIFF_BILLS_POS, sSumDiff(grand.DIFF_BILLS_POS, true)));
  S(rSum, sc++, C(grand.DIFF_SALE_POS, sSumDiff(grand.DIFF_SALE_POS)));
  S(rSum, sc++, C(grand.TOTAL_BILLS_ALL, sSum("right", false, true)));
  S(rSum, sc++, C(grand.TOTAL_SALE_ALL, sSum("right")));
  S(rSum, sc++, C(grand.DIFF_BILLS_ALL, sSumDiff(grand.DIFF_BILLS_ALL, true)));
  S(rSum, sc++, C(grand.DIFF_SALE_ALL, sSumDiff(grand.DIFF_SALE_ALL)));

  // ── Blank row ─────────────────────────────────────────────────────────────
  const rBlank = rSum + 1;
  S(rBlank, 0, CE(sTitle()));
  M(rBlank, 0, rBlank, LAST_COL);

  // ── Signature row ─────────────────────────────────────────────────────────
  const rSig = rBlank + 1;
  const third = Math.floor((LAST_COL + 1) / 3);
  S(rSig, 0, C("ອຳນວຍການ ບໍລິສັດ\nSokxay One Plus E-commerce", sSig()));
  S(rSig, third, C("ຜູ້ຈັດການບັນຊີ\nບໍລິສັດ ຫວຍ", sSig()));
  S(rSig, third * 2, C("ຜູ້ສັງລວມ", sSig()));
  M(rSig, 0, rSig, third - 1);
  M(rSig, third, rSig, third * 2 - 1);
  M(rSig, third * 2, rSig, LAST_COL);

  // ── Printed-by info ───────────────────────────────────────────────────────
  let lastRow = rSig;
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
    lastRow = rPrinted;
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  const cols: { wch: number }[] = [{ wch: 10.0 }];
  if (mode === "draw") cols.push({ wch: 12.0 });
  for (let i = 0; i < 9; i++) {
    cols.push({ wch: 12.0 }, { wch: 14.0 });
  }
  ws["!cols"] = cols;

  // ── Row heights ───────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 18.0 },
    { hpt: 16.0 },
    { hpt: 20.0 },
    { hpt: 10.0 },
    { hpt: 26.0 },
    { hpt: 22.0 },
    ...Array.from({ length: rows.length }, () => ({ hpt: 20.0 })),
    { hpt: 24.0 },
    { hpt: 10.0 },
    { hpt: 48.0 },
  ];

  // ── Merges + ref ──────────────────────────────────────────────────────────
  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastRow, c: LAST_COL },
  );

  return ws;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * exportSellByUserChannelDraw — export the "ສັງລວມຕາມງວດ" tab
 */
export async function exportSellByUserChannelDraw(
  rows: ChannelDrawRow[],
  drawFrom: string,
  drawTo: string,
  printedBy = "",
): Promise<void> {
  const rangeLabel =
    !drawFrom && !drawTo
      ? ""
      : drawFrom === drawTo
        ? ` (ງວດທີ ${drawFrom})`
        : ` (ງວດທີ ${drawFrom || "…"} ຫາ ${drawTo || "…"})`;
  const ws = buildSheet("draw", rangeLabel, rows, printedBy);
  const wb = XLSXStyle.utils.book_new();
  const sheetName = `ByDraw ${drawFrom || "all"}`.slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  XLSXStyle.writeFile(
    wb,
    `SellByChannel_Draw_${drawFrom || "all"}_to_${drawTo || "all"}.xlsx`,
  );
}

/**
 * exportSellByUserChannelMonth — export the "ສັງລວມຕາມເດືອນ" tab
 */
export async function exportSellByUserChannelMonth(
  rows: ChannelMonthRow[],
  monthFrom: string,
  monthTo: string,
  printedBy = "",
): Promise<void> {
  const rangeLabel =
    !monthFrom && !monthTo
      ? ""
      : monthFrom === monthTo
        ? ` (ເດືອນ ${monthFrom})`
        : ` (ເດືອນ ${monthFrom || "…"} ຫາ ${monthTo || "…"})`;
  const ws = buildSheet("month", rangeLabel, rows, printedBy);
  const wb = XLSXStyle.utils.book_new();
  const sheetName = `ByMonth ${monthFrom || "all"}`.slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  XLSXStyle.writeFile(
    wb,
    `SellByChannel_Month_${monthFrom || "all"}_to_${monthTo || "all"}.xlsx`,
  );
}
