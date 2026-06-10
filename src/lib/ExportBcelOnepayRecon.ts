/**
 * ExportBcelOnepayRecon.ts
 * Export BCEL OnePay Reconciliation by DRAW_ID to Excel (.xlsx)
 * ໃຊ້ xlsx-js-style — ຄ້ວຍ style ຄືກັນກັນກັບ ExportSellSummaryByDraw.ts
 * npm install xlsx-js-style
 */
import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type BorderType,
  type CellStyleColor,
  type WorkSheet,
} from "xlsx-js-style";

import type { BcelOnepayReconRow } from "@/app/bcel_onepay_reconciliation/page";

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT = "Phetsarath OT";
const LAST_COL = 10; // columns A–K (index 0–10)

const BG_HEADER = "9DC3E6"; // blue header
const BG_BLUE = "BDD7EE"; // light blue — ຍອດຂາຍ cols
const BG_RED = "FFD7D7"; // red tint — REAL_STMT col
const BG_YELLOW = "FFFACD"; // yellow — ໝາຍເຫດ col
const BG_SUM = "BDD7EE"; // grand total row
const BG_TITLE = "CC0000"; // account number text colour

// ─── Border helpers ───────────────────────────────────────────────────────────
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

// ─── Style builders ───────────────────────────────────────────────────────────
function sTitle(sz = 12, bold = false, color?: string): CellStyle {
  return {
    font: { name: FONT, sz, bold, ...(color ? { color: { rgb: color } } : {}) },
    alignment: { horizontal: "center", vertical: "center" },
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
  const bg = val < 0 ? "FFE0E0" : val === 0 ? "E8F5E9" : "FFFBEB";
  const color = val < 0 ? "CC0000" : val === 0 ? "1B7A3E" : "B45309";
  return {
    font: { name: FONT, sz: 10, bold, color: { rgb: color } },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "#,##0.00",
    border: allThin(),
  };
}

function sSumDiff(val: number): CellStyle {
  const color = val < 0 ? "CC0000" : val === 0 ? "1B7A3E" : "B45309";
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

// ─── Cell factories ───────────────────────────────────────────────────────────
function C(v: string | number, s: CellStyle): CellObject {
  return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
}
function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

// ─── parseN helper ────────────────────────────────────────────────────────────
const parseN = (v: string | number | null | undefined): number => {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const neg = s.startsWith("-");
  const n = parseFloat(s.replace(/,/g, "").replace(/^-/, "")) || 0;
  return neg ? -n : n;
};

// ─── Sheet builder ────────────────────────────────────────────────────────────
function buildSheet(
  dataRows: BcelOnepayReconRow[],
  totalRow: BcelOnepayReconRow | undefined,
  drawFrom?: string,
  drawTo?: string,
  printedBy = "",
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  };

  // ── R0–R4: Title block ────────────────────────────────────────────────────
  S(0, 0, C("ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", sTitle(13)));
  M(0, 0, 0, LAST_COL);

  S(1, 0, C("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", sTitle(12)));
  M(1, 0, 1, LAST_COL);

  S(
    2,
    0,
    C(
      "ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ BCEL ປະຈຳເດືອນ",
      sTitle(14, true),
    ),
  );
  M(2, 0, 2, LAST_COL);

  S(3, 0, C("ບັນຊີ BCEL OnePay: 0901300002155", sTitle(11, true, BG_TITLE)));
  M(3, 0, 3, LAST_COL);

  if (drawFrom || drawTo) {
    const rangeStr =
      drawFrom === drawTo && drawFrom
        ? `ງວດ: ${drawFrom}`
        : `ງວດ: ${drawFrom || "—"}  ຫາ  ${drawTo || "—"}`;
    S(4, 0, C(rangeStr, sTitle(10)));
    M(4, 0, 4, LAST_COL);
  }

  // blank row before header
  const HDR_R = 6;

  // ── R6: Group header (1 row only — ຄືກັນ table ໃນໜ້າ) ──────────────────
  // Cols: 0=ລຳດັບ 1=ວັນທີ 2=ງວດ | 3=A(TOTALSALE) 4=B(POINT_SALE) | 5=C 6=D | 7=E | 8=F(REAL_STMT) | 9=G(DIFF) | 10=ໝາຍເຫດ
  const headers = [
    "ລຳດັບ",
    "ວັນທີ",
    "ງວດ",
    "ຍອດຂາຍໃບລະບົບ\nA",
    "ຊຳລະຜ່ານຄະແນນ\nB",
    "ຊຳລະຜ່ານລະບົບ OnePay\nC=A-B",
    "ຄ່າທຳນຽມ 1.35%\nD=C*1.35%",
    "ຍອດຫຼັງຫັກຄ່າທຳນຽດ\nE=C-D",
    "ຍອດໃນ ບ/ຊ ຕົວຈິງ\n0901300002155",
    "ສ່ວນຕ່າງ\nG=F-E",
    "ໝາຍເຫດ",
  ];
  const hdrBg = [
    BG_HEADER,
    BG_HEADER,
    BG_HEADER,
    "BDD7EE",
    "BDD7EE",
    BG_HEADER,
    BG_HEADER,
    BG_HEADER,
    "FFD7D7",
    BG_HEADER,
    "FFFACD",
  ];
  headers.forEach((label, ci) => {
    S(HDR_R, ci, C(label, sHeader(hdrBg[ci], 9)));
  });

  // sub-header row for A / B label under ຍອດຂາຍ cols (rows 7)
  // We use a single header row with \n wrapText — no need for 2 rows

  // ── Data rows ─────────────────────────────────────────────────────────────
  const DATA_START = HDR_R + 1;

  dataRows.forEach((row, i) => {
    const r = DATA_START + i;
    const oddBg = i % 2 === 1 ? "F5F5F5" : undefined;
    const diffVal = parseN(row.DIFF);

    // DRAW_DATE: DB may return numeric day "2.00" — keep as string, strip decimal
    const drawDateStr = row.DRAW_DATE
      ? String(row.DRAW_DATE).replace(/\.0+$/, "").trim()
      : "";
    // DRAW_ID: DB may return "26001.00" — round to integer string
    const drawIdNum = parseN(row.DRAW_ID);
    const drawIdStr =
      drawIdNum > 0 ? String(Math.round(drawIdNum)) : String(row.DRAW_ID ?? "");

    S(r, 0, C(i + 1, sDataText("center", oddBg)));
    S(r, 1, C(drawDateStr, sDataText("center", oddBg)));
    S(r, 2, C(drawIdStr, sDataText("center", oddBg, true, "5B2C8D")));
    S(r, 3, C(parseN(row.TOTALSALE), sData("right", "EEF6FF")));
    S(r, 4, C(parseN(row.POINT_SALE), sData("right", oddBg)));
    S(r, 5, C(parseN(row.PAY_ONE), sData("right", oddBg)));
    S(r, 6, C(parseN(row.ONEPOINTTHREEPERCENT), sData("right", oddBg)));
    S(r, 7, C(parseN(row.DISCUSPERCENT), sData("right", oddBg)));
    S(r, 8, C(parseN(row.REAL_STMT), sData("right", "FFF0F0")));
    S(r, 9, C(parseN(row.DIFF), sDiff(diffVal)));
    S(r, 10, CE(sDataText("left", oddBg)));
  });

  // ── Grand total row ──────────────────────────────────────────────────────────
  // Compute from dataRows directly — SQL total row may not include REAL_STMT/DIFF
  const rSum = DATA_START + dataRows.length;
  const sumTotalSale = dataRows.reduce((s, r) => s + parseN(r.TOTALSALE), 0);
  const sumPointSale = dataRows.reduce((s, r) => s + parseN(r.POINT_SALE), 0);
  const sumPayOne = dataRows.reduce((s, r) => s + parseN(r.PAY_ONE), 0);
  const sumFee = dataRows.reduce(
    (s, r) => s + parseN(r.ONEPOINTTHREEPERCENT),
    0,
  );
  const sumDiscus = dataRows.reduce((s, r) => s + parseN(r.DISCUSPERCENT), 0);
  const sumRealStmt = dataRows.reduce((s, r) => s + parseN(r.REAL_STMT), 0);
  const sumDiff = dataRows.reduce((s, r) => s + parseN(r.DIFF), 0);

  // Use SQL totalRow for TOTALSALE/PAY_ONE if available (authoritative), else computed
  const totTotalSale = totalRow
    ? parseN(totalRow.TOTALSALE) || sumTotalSale
    : sumTotalSale;
  const totPointSale = totalRow
    ? parseN(totalRow.POINT_SALE) || sumPointSale
    : sumPointSale;
  const totPayOne = totalRow
    ? parseN(totalRow.PAY_ONE) || sumPayOne
    : sumPayOne;
  const totFee = totalRow
    ? parseN(totalRow.ONEPOINTTHREEPERCENT) || sumFee
    : sumFee;
  const totDiscus = totalRow
    ? parseN(totalRow.DISCUSPERCENT) || sumDiscus
    : sumDiscus;

  S(rSum, 0, C("ລວມທັງໝົດ", sSum("center", true)));
  S(rSum, 1, CE(sSum("center", true)));
  S(rSum, 2, CE(sSum("center", true)));
  S(rSum, 3, C(totTotalSale, sSum("right")));
  S(rSum, 4, C(totPointSale, sSum("right")));
  S(rSum, 5, C(totPayOne, sSum("right")));
  S(rSum, 6, C(totFee, sSum("right")));
  S(rSum, 7, C(totDiscus, sSum("right")));
  S(rSum, 8, C(sumRealStmt, sSum("right"))); // always computed
  S(rSum, 9, C(sumDiff, sSumDiff(sumDiff))); // always computed
  S(rSum, 10, CE(sSum("center", true)));
  M(rSum, 0, rSum, 2);

  // ── Blank row ─────────────────────────────────────────────────────────────
  const rBlank = rSum + 1;
  S(rBlank, 0, CE(sTitle()));
  M(rBlank, 0, rBlank, LAST_COL);

  // ── Footer note ───────────────────────────────────────────────────────────
  const rNote = rBlank + 1;
  S(
    rNote,
    0,
    C(
      `ໝາຍເຫດ: ຄ່າທຳນຸງ 1.35% ຄຳນວນດ້ວຍ ROUND((PAY_ONE × 0.0135) × 2, 0) / 2  |  ອອກ Excel: ${new Date().toLocaleString("lo-LA")}`,
      {
        font: { name: FONT, sz: 9, color: { rgb: "555555" } },
        alignment: { horizontal: "left", vertical: "center" },
      },
    ),
  );
  M(rNote, 0, rNote, LAST_COL);

  // ── Signature row ─────────────────────────────────────────────────────────
  const rSig = rNote + 2;
  S(rSig, 0, C("ຜູ້ສ້າງ\nSokxay One Plus E-commerce", sSig()));
  S(rSig, 4, C("ຜູ້ກວດສອບ", sSig()));
  S(rSig, 8, C("ຜູ້ອະນຸມັດ", sSig()));
  M(rSig, 0, rSig, 3);
  M(rSig, 4, rSig, 7);
  M(rSig, 8, rSig, LAST_COL);

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

  // ── Column widths ──────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 7 }, // ລຳດັບ
    { wch: 13 }, // ວັນທີ
    { wch: 9 }, // ງວດ
    { wch: 22 }, // A TOTALSALE
    { wch: 20 }, // B POINT_SALE
    { wch: 22 }, // C PAY_ONE
    { wch: 20 }, // D 1.35%
    { wch: 22 }, // E =C-D
    { wch: 22 }, // F REAL_STMT
    { wch: 20 }, // G DIFF
    { wch: 18 }, // ໝາຍເຫດ
  ];

  // ── Row heights ────────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 18 }, // R0 title
    { hpt: 16 }, // R1 subtitle
    { hpt: 20 }, // R2 doc title
    { hpt: 18 }, // R3 account
    { hpt: 16 }, // R4 draw range
    { hpt: 8 }, // R5 blank
    { hpt: 36 }, // R6 header (wrapText 2 lines)
    ...Array.from({ length: dataRows.length }, () => ({ hpt: 20 })),
    { hpt: 24 }, // grand total
    { hpt: 8 }, // blank
    { hpt: 16 }, // note
    { hpt: 8 }, // blank before sig
    { hpt: 48 }, // signature
  ];

  // ── Merges + ref ───────────────────────────────────────────────────────────
  ws["!merges"] = merges;

  const lastRow = rSig + (printedBy ? 1 : 0);
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastRow + 1, c: LAST_COL },
  );

  return ws;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function exportBcelOnepayRecon(
  rows: BcelOnepayReconRow[],
  drawFrom?: string,
  drawTo?: string,
  printedBy = "",
): Promise<void> {
  const dataRows = rows.filter(
    (r) => r.DRAW_DATE !== null && r.DRAW_DATE !== "",
  );
  const totalRow = rows.find((r) => r.DRAW_DATE === null || r.DRAW_DATE === "");

  const ws = buildSheet(dataRows, totalRow, drawFrom, drawTo, printedBy);
  const wb = XLSXStyle.utils.book_new();

  const sheetName = `BCEL_Recon_${drawFrom || "all"}`.slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);

  const rangeLabel =
    drawFrom || drawTo ? `_${drawFrom || "all"}_to_${drawTo || "all"}` : "";
  XLSXStyle.writeFile(wb, `BCEL_OnePay_Reconciliation${rangeLabel}.xlsx`);
}
