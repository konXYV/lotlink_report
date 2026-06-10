/**
 * ExportJdbSellRecon.ts
 * Export JDB Sell Reconciliation by DRAW_ID to Excel (.xlsx)
 * Layout ອີງຕາມຮູບລາຍງານ: ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ JDB
 * npm install xlsx-js-style
 */
import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type BorderType,
  type CellStyleColor,
  type WorkSheet,
} from "xlsx-js-style";

import type { JdbSellReconRow } from "@/app/jdb_sell_reconciliation/page";

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT = "Phetsarath OT";
const LAST_COL = 11; // columns A–L (index 0–11)

const BG_HEADER = "9DC3E6"; // blue header
const BG_ORANGE = "FCE4D6"; // orange tint — ຖັນສ່ວນຫຼຸດ + Refund
const BG_RED = "FFD7D7"; // red tint — REAL_STMT col
const BG_YELLOW = "FFFACD"; // yellow — ໝາຍເຫດ col
const BG_SUM = "BDD7EE"; // grand total row (ຄ້ວຍ BCEL)
const BG_BLUE_LT = "EEF6FF"; // light blue — ຍອດຂາຍ col A

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

function sHeader(bg = BG_HEADER, sz = 9): CellStyle {
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
  dataRows: JdbSellReconRow[],
  drawFrom?: string,
  drawTo?: string,
  printedBy = "",
  month = "", // e.g. "04/2026"
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

  const monthLabel = month ? ` ປະຈຳເດືອນ ${month}` : "";
  S(
    2,
    0,
    C(
      `ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ JDB${monthLabel}`,
      sTitle(14, true),
    ),
  );
  M(2, 0, 2, LAST_COL);

  S(3, 0, C("ບັນຊີ JDB: 02920020000003180", sTitle(11, true, "CC0000")));
  M(3, 0, 3, LAST_COL);

  if (drawFrom || drawTo) {
    const rangeStr =
      drawFrom === drawTo && drawFrom
        ? `ງວດ: ${drawFrom}`
        : `ງວດ: ${drawFrom || "—"}  ຫາ  ${drawTo || "—"}`;
    S(4, 0, C(rangeStr, sTitle(10)));
    M(4, 0, 4, LAST_COL);
  }

  // R5: blank spacer
  const HDR_R1 = 6; // group header row
  const HDR_R2 = 7; // sub-header row

  // ── R6: Group header (row 1 of 2) ─────────────────────────────────────────
  // Col map:
  //  0=ລຳດັບ  1=ວັນທີ  2=ງວດ
  //  3=A(ຍອດຂາຍ)
  //  4=B(ສ່ວນຫຼຸດ)  5=C(Refund)      ← group "ລາຍການຫັກ"
  //  6=D  7=E  8=F
  //  9=G(REAL_STMT)
  //  10=H(DIFF)
  //  11=ໝາຍເຫດ

  // Group header cells (rowspan via merge)
  S(HDR_R1, 0, C("ລຳດັບ", sHeader(BG_HEADER)));
  S(HDR_R1, 1, C("ວັນທີ", sHeader(BG_HEADER)));
  S(HDR_R1, 2, C("ງວດ", sHeader(BG_HEADER)));
  S(HDR_R1, 3, C("ຍອດຂາຍໃບລະບົບ\nA", sHeader("DDEEFF")));
  S(HDR_R1, 4, C("ລາຍການຫັກ", sHeader(BG_ORANGE))); // colspan 2
  S(HDR_R1, 5, CE(sHeader(BG_ORANGE)));
  S(
    HDR_R1,
    6,
    C("ຍອດຫຼັງຫັກສ່ວນຫຼຸດ\nແລະ Refund\nD=A-B-C", sHeader(BG_HEADER)),
  );
  S(HDR_R1, 7, C("ຄ່າທຳນຽມ\n1%\nE=D*1%", sHeader(BG_HEADER)));
  S(HDR_R1, 8, C("ຍອດຫຼັງຫັກ\nຄ່າທຳນຽມ\nF=D-E", sHeader(BG_HEADER)));
  S(
    HDR_R1,
    9,
    C("ຍອດເງິນເຂົ້າ\nບ/ຊ ຕົວຈິງ\n02920020000003180", sHeader("FFD7D7")),
  );
  S(HDR_R1, 10, C("ສ່ວນຕ່າງ\nI=G-D-C", sHeader(BG_HEADER)));
  S(HDR_R1, 11, C("ໝາຍເຫດ", sHeader(BG_YELLOW)));

  // Merge: rows 0–2 → rowspan 2 for single-col headers
  M(HDR_R1, 0, HDR_R2, 0); // ລຳດັບ
  M(HDR_R1, 1, HDR_R2, 1); // ວັນທີ
  M(HDR_R1, 2, HDR_R2, 2); // ງວດ
  M(HDR_R1, 3, HDR_R2, 3); // A — rowspan 2
  M(HDR_R1, 4, HDR_R1, 5); // "ລາຍການຫັກ" colspan 2
  M(HDR_R1, 6, HDR_R2, 6); // D — rowspan 2
  M(HDR_R1, 7, HDR_R2, 7); // E — rowspan 2
  M(HDR_R1, 8, HDR_R2, 8); // F — rowspan 2
  M(HDR_R1, 9, HDR_R2, 9); // G — rowspan 2
  M(HDR_R1, 10, HDR_R2, 10); // H — rowspan 2
  M(HDR_R1, 11, HDR_R2, 11); // ໝາຍເຫດ — rowspan 2

  // ── R7: Sub-header row (B, C labels) ─────────────────────────────────────
  S(HDR_R2, 0, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 1, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 2, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 3, CE(sHeader("DDEEFF")));
  S(HDR_R2, 4, C("ສ່ວນຫຼຸດ\nB", sHeader(BG_ORANGE)));
  S(HDR_R2, 5, C("Refund\nC", sHeader(BG_ORANGE)));
  S(HDR_R2, 6, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 7, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 8, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 9, CE(sHeader("FFD7D7")));
  S(HDR_R2, 10, CE(sHeader(BG_HEADER)));
  S(HDR_R2, 11, CE(sHeader(BG_YELLOW)));

  // ── Formula label row (italic row under header) ────────────────────────────
  const HDR_F = HDR_R2 + 1; // R8
  const fmtLabel = (txt: string): CellObject =>
    C(txt, {
      font: { name: FONT, sz: 8, italic: true, color: { rgb: "444444" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { patternType: "solid", fgColor: { rgb: "F0F4FF" } },
      border: allThin(),
    });
  S(HDR_F, 0, fmtLabel(""));
  S(HDR_F, 1, fmtLabel(""));
  S(HDR_F, 2, fmtLabel(""));
  S(HDR_F, 3, fmtLabel("A"));
  S(HDR_F, 4, fmtLabel("B"));
  S(HDR_F, 5, fmtLabel("C"));
  S(HDR_F, 6, fmtLabel("D=A-B-C"));
  S(HDR_F, 7, fmtLabel("E=D*1%"));
  S(HDR_F, 8, fmtLabel("F=D*99%"));
  S(HDR_F, 9, fmtLabel("G"));
  S(HDR_F, 10, fmtLabel("I=G-D-C"));
  S(HDR_F, 11, fmtLabel(""));

  // ── Data rows ─────────────────────────────────────────────────────────────
  const DATA_START = HDR_F + 1; // R9

  dataRows.forEach((row, i) => {
    const r = DATA_START + i;
    const oddBg = i % 2 === 1 ? "F8F8F8" : undefined;
    const diffVal = parseN(row.DIFF);

    const drawDateStr = row.DRAWDATE
      ? String(row.DRAWDATE).replace(/\.0+$/, "").trim()
      : "";
    const drawIdNum = parseN(row.DRAWID);
    const drawIdStr =
      drawIdNum > 0 ? String(Math.round(drawIdNum)) : String(row.DRAWID ?? "");

    S(r, 0, C(i + 1, sDataText("center", oddBg)));
    S(r, 1, C(drawDateStr, sDataText("center", oddBg)));
    S(r, 2, C(drawIdStr, sDataText("center", oddBg, true, "5B2C8D")));
    S(r, 3, C(parseN(row.A_YODKHAI), sData("right", BG_BLUE_LT)));
    S(r, 4, C(parseN(row.DISCUSPOINT), sData("right", "FFF2EC")));
    S(r, 5, C(parseN(row.REFUND_AMOUNT), sData("right", "FFF2EC")));
    S(r, 6, C(parseN(row.AFTERDISCOUNT), sData("right", oddBg)));
    S(r, 7, C(parseN(row.FEE_ONE_PERCENT), sData("right", oddBg)));
    S(r, 8, C(parseN(row.AFTER_DISCUS_ALL), sData("right", oddBg)));
    S(r, 9, C(parseN(row.REAL_STMT), sData("right", "FFF0F0")));
    S(r, 10, C(diffVal, sDiff(diffVal)));
    S(r, 11, CE(sDataText("left", oddBg)));
  });

  // ── Grand total row ──────────────────────────────────────────────────────
  const rSum = DATA_START + dataRows.length;

  const totA = dataRows.reduce((s, r) => s + parseN(r.A_YODKHAI), 0);
  const totB = dataRows.reduce((s, r) => s + parseN(r.DISCUSPOINT), 0);
  const totC = dataRows.reduce((s, r) => s + parseN(r.REFUND_AMOUNT), 0);
  const totD = dataRows.reduce((s, r) => s + parseN(r.AFTERDISCOUNT), 0);
  const totE = dataRows.reduce((s, r) => s + parseN(r.FEE_ONE_PERCENT), 0);
  const totF = dataRows.reduce((s, r) => s + parseN(r.AFTER_DISCUS_ALL), 0);
  const totG = dataRows.reduce((s, r) => s + parseN(r.REAL_STMT), 0);
  const totDiff = dataRows.reduce(
    (s, r) =>
      s +
      parseN(r.REAL_STMT) -
      parseN(r.AFTERDISCOUNT) -
      parseN(r.REFUND_AMOUNT),
    0,
  );

  S(rSum, 0, C("ລວມຍອດ", sSum("center", true)));
  S(rSum, 1, CE(sSum("center", true)));
  S(rSum, 2, CE(sSum("center", true)));
  S(rSum, 3, C(totA, sSum("right")));
  S(rSum, 4, C(totB, sSum("right")));
  S(rSum, 5, C(totC, sSum("right")));
  S(rSum, 6, C(totD, sSum("right")));
  S(rSum, 7, C(totE, sSum("right")));
  S(rSum, 8, C(totF, sSum("right")));
  S(rSum, 9, C(totG, sSum("right")));
  S(rSum, 10, C(totDiff, sSumDiff(totDiff)));
  S(rSum, 11, CE(sSum("center", true)));
  M(rSum, 0, rSum, 2);

  // ── Blank row ──────────────────────────────────────────────────────────────
  const rBlank = rSum + 1;
  S(rBlank, 0, CE(sTitle()));
  M(rBlank, 0, rBlank, LAST_COL);

  // ── Footer note ────────────────────────────────────────────────────────────
  const rNote = rBlank + 1;
  S(
    rNote,
    0,
    C(
      `ໝາຍເຫດ: ສ່ວນຫຼຸດ (B) = A - TOTAL_BANK_CR  |  Refund (C) ຈາກ JDB_STMT (TXN_TYPE=SPLUS_REFUND)  |  ອອກ Excel: ${new Date().toLocaleString("lo-LA")}`,
      {
        font: { name: FONT, sz: 9, color: { rgb: "555555" } },
        alignment: { horizontal: "left", vertical: "center" },
      },
    ),
  );
  M(rNote, 0, rNote, LAST_COL);

  // ── Signature row ──────────────────────────────────────────────────────────
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
    { wch: 7 }, // 0  ລຳດັບ
    { wch: 13 }, // 1  ວັນທີ
    { wch: 9 }, // 2  ງວດ
    { wch: 22 }, // 3  A ຍອດຂາຍ
    { wch: 20 }, // 4  B ສ່ວນຫຼຸດ
    { wch: 18 }, // 5  C Refund
    { wch: 22 }, // 6  D ຫຼັງຫັກ
    { wch: 20 }, // 7  E 1%
    { wch: 22 }, // 8  F ຫຼັງຫັກຄ່າທຳນຽມ
    { wch: 22 }, // 9  G REAL_STMT
    { wch: 20 }, // 10 H DIFF
    { wch: 18 }, // 11 ໝາຍເຫດ
  ];

  // ── Row heights ────────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 18 }, // R0 title
    { hpt: 16 }, // R1 subtitle
    { hpt: 22 }, // R2 doc title
    { hpt: 18 }, // R3 account
    { hpt: 16 }, // R4 draw range
    { hpt: 8 }, // R5 blank
    { hpt: 42 }, // R6 group header
    { hpt: 30 }, // R7 sub-header
    { hpt: 16 }, // R8 formula label row
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
export async function exportJdbSellRecon(
  rows: JdbSellReconRow[],
  drawFrom?: string,
  drawTo?: string,
  printedBy = "",
  month = "",
): Promise<void> {
  const dataRows = rows.filter((r) => r.DRAWDATE !== null && r.DRAWDATE !== "");

  const ws = buildSheet(dataRows, drawFrom, drawTo, printedBy, month);
  const wb = XLSXStyle.utils.book_new();

  const sheetName = `JDB_Recon_${drawFrom || "all"}`.slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);

  const rangeLabel =
    drawFrom || drawTo ? `_${drawFrom || "all"}_to_${drawTo || "all"}` : "";
  XLSXStyle.writeFile(wb, `JDB_Sell_Reconciliation${rangeLabel}.xlsx`);
}
