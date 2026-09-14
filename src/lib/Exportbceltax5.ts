// lib/exportBcelTax5.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ສະຫຼຸບລາງວັນ BCEL — xlsx-js-style@1.2.0
//
//  Type fixes (v1.2.0 compatible):
//  - ໃຊ້ CellObject (ບໍ່ແມ່ນ XLSXStyle.Cell ທີ່ບໍ່ exist)
//  - ໃຊ້ BorderType  (ບໍ່ແມ່ນ XLSXStyle.BorderStyle)
//  - fill: { patternType, fgColor }  (ບໍ່ມີ `type` field)
//  - border sides: { color: CellStyleColor; style?: BorderType }
//
//  Layout (ຕາມ template example_reportBCEL.xlsx):
//  R1-R3  = Title (merged A:L)
//  R4     = blank
//  R5-R6  = Table header:  A5:A6, B5:B6, C5:F5, H5:J5, K5:K6, L5:L6
//  R7+    = Data: A-J = DRAWID rows, K = ອາກອນ SCN 5%, L = ອາກອນ SX 5%
//  SUM    = flexible row after last data row
//  TOTAL  = SUM+1,  SIG = TOTAL+3
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BcelRow {
  ງວດ: string;
  ລາງວັນ: string;
  ໂຊກຊ້ອນໂຊກ: string;
  "ໂຊກ Spin": string;
  "ຄ່າທຳນຽມ ທຄ": string; // ✅ ລວມ ຄ່າທຳນຽມ + ຄ່າທຳນຽມ SPIN ເຂົ້ານຳກັນ
  "ລາງວັນ SCN": string;
  "ໂຊກຊ້ອນໂຊກ SCN": string;
  "ຄ່າທຳນຽມ SCN": string;
  "ອາກອນ SCN 5%": string;
  "ອາກອນ SX 5%": string;
  "ລວມອາກອນ 5%": string; // ✅ ເພີ່ມໃໝ່ — ລວມອາກອນ SCN 5% + SX 5%
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT = "Phetsarath OT";
const BG_HEADER = "9DC3E6";
const BG_TOTAL = "DAEEF3";

// ── Border helpers ────────────────────────────────────────────────────────────

type BSide = { color: CellStyleColor; style?: BorderType };

const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
// xlsx-js-style@1.2.0 does not have "double" BorderType → use "thick" for bottom double-line effect
const thickB = (): BSide => ({ style: "thick", color: { rgb: "000000" } });

const allThin = (): CellStyle["border"] => ({
  left: thin(),
  right: thin(),
  top: thin(),
  bottom: thin(),
});
const kBorder = (): CellStyle["border"] => ({
  left: medium(),
  right: medium(),
  top: thin(),
  bottom: thin(),
});
const aBorder = (): CellStyle["border"] => ({
  left: medium(),
  right: thin(),
  top: thin(),
  bottom: thin(),
});

// ── Style builders ────────────────────────────────────────────────────────────

function sHeader(sz = 12): CellStyle {
  return {
    font: { name: FONT, bold: true, sz },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}

function sTitle(sz = 12, bold = false): CellStyle {
  return {
    font: { name: FONT, sz, bold },
    alignment: { horizontal: "center", vertical: "center" },
  };
}

function sData(
  align: "center" | "right" = "right",
  leftMed = false,
): CellStyle {
  return {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: align, vertical: "center" },
    numFmt: '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)',
    border: leftMed ? aBorder() : allThin(),
  };
}

function sKData(): CellStyle {
  return {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-',
    border: kBorder(),
  };
}

function sLData(): CellStyle {
  return {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-',
    border: aBorder(),
  };
}

function sSum(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)',
    border: allThin(),
  };
}

function sTotalLabel(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    fill: { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { bottom: thickB() },
  };
}

function sTotalValue(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    fill: { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)',
    border: { bottom: thickB() },
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

function parseNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/,/g, "")) || 0;
}

const MONTH_LAO: Record<number, string> = {
  1: "ມັງກອນ",
  2: "ກຸມພາ",
  3: "ມີນາ",
  4: "ເມສາ",
  5: "ພຶດສະພາ",
  6: "ມິຖຸນາ",
  7: "ກໍລະກົດ",
  8: "ສິງຫາ",
  9: "ກັນຍາ",
  10: "ຕຸລາ",
  11: "ພະຈິກ",
  12: "ທັນວາ",
};

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function monthLabel(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `ເດືອນ ${MONTH_LAO[d.getMonth() + 1] ?? ""} ${d.getFullYear()}`;
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(dateDisplay: string, dataRows: BcelRow[]): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  };

  // ── R1-R3: Title ──────────────────────────────────────────────────────────
  S(
    0,
    0,
    C(`ສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (BCEL) ວັນທີ ${dateDisplay}`, sTitle(12, true)),
  );
  M(0, 0, 0, 11);
  M(1, 0, 1, 11);
  M(2, 0, 2, 11);

  // ── R4: blank ─────────────────────────────────────────────────────────────
  // ── R5: Group header ──────────────────────────────────────────────────────
  S(4, 0, C("ລຳດັບ", sHeader(11)));
  S(4, 1, C("ງວດທີ", sHeader(12)));
  S(4, 2, C("ການຈ່າຍລາງວັນແອັບ Sokxay", sHeader(12)));
  for (let c = 3; c <= 4; c++) S(4, c, CE(sHeader(12)));
  S(4, 5, CE(sHeader(11)));
  S(4, 6, C("ການຈ່າຍລາງວັນແອັບ SCN", sHeader(12)));
  for (let c = 7; c <= 8; c++) S(4, c, CE(sHeader(12)));
  S(4, 9, C("ອາກອນ SCN 5%", sHeader(12)));
  S(4, 10, C("ອາກອນ SX 5%", sHeader(12)));
  S(4, 11, C("ລວມອາກອນ 5%", sHeader(12)));

  M(4, 0, 5, 0);
  M(4, 1, 5, 1);
  M(4, 2, 4, 5);
  M(4, 6, 4, 8);
  M(4, 9, 5, 9);
  M(4, 10, 5, 10);
  M(4, 11, 5, 11);

  // ── R6: Sub-column header ─────────────────────────────────────────────────
  S(5, 0, CE(sHeader(11)));
  S(5, 1, CE(sHeader(12)));
  S(5, 2, C("ລາງວັນ", sHeader(11)));
  S(5, 3, C("ໂຊກຊ້ອນໂຊກ", sHeader(11)));
  S(5, 4, C("ໂຊກSpin", sHeader(11)));
  S(5, 5, C("ຄ່າທຳນຽມ ທຄ", sHeader(11)));
  S(5, 6, C("ລາງວັນ", sHeader(11)));
  S(5, 7, C("ໂຊກຊ້ອນໂຊກ", sHeader(11)));
  S(5, 8, C("ຄ່າທຳນຽມ", sHeader(11)));
  S(5, 9, CE(sHeader(11)));
  S(5, 10, CE(sHeader(11)));
  S(5, 11, CE(sHeader(11)));

  // ── R7+: Data rows ────────────────────────────────────────────────────────
  const totalRows = dataRows.length;

  let sumC = 0,
    sumD = 0,
    sumE = 0,
    sumF = 0,
    sumH = 0,
    sumI = 0,
    sumJ = 0,
    sumK = 0,
    sumL = 0,
    sumM = 0;
  for (const dr of dataRows) {
    sumC += parseNum(dr["ລາງວັນ"]);
    sumD += parseNum(dr["ໂຊກຊ້ອນໂຊກ"]);
    sumE += parseNum(dr["ໂຊກ Spin"]);
    sumF += parseNum(dr["ຄ່າທຳນຽມ ທຄ"]);
    sumH += parseNum(dr["ລາງວັນ SCN"]);
    sumI += parseNum(dr["ໂຊກຊ້ອນໂຊກ SCN"]);
    sumJ += parseNum(dr["ຄ່າທຳນຽມ SCN"]);
    sumK += parseNum(dr["ອາກອນ SCN 5%"]);
    sumL += parseNum(dr["ອາກອນ SX 5%"]);
    sumM += parseNum(dr["ລວມອາກອນ 5%"]);
  }

  for (let i = 0; i < totalRows; i++) {
    const r = 6 + i;
    const dr = dataRows[i];

    S(
      r,
      0,
      C(i + 1, {
        font: { name: FONT, sz: 11 },
        alignment: { horizontal: "center", vertical: "center" },
        border: aBorder(),
      }),
    );
    S(
      r,
      1,
      C(dr["ງວດ"], {
        font: { name: FONT, sz: 11 },
        alignment: { horizontal: "center", vertical: "center" },
        border: allThin(),
      }),
    );
    const amts = [
      parseNum(dr["ລາງວັນ"]),
      parseNum(dr["ໂຊກຊ້ອນໂຊກ"]),
      parseNum(dr["ໂຊກ Spin"]),
      parseNum(dr["ຄ່າທຳນຽມ ທຄ"]),
      parseNum(dr["ລາງວັນ SCN"]),
      parseNum(dr["ໂຊກຊ້ອນໂຊກ SCN"]),
      parseNum(dr["ຄ່າທຳນຽມ SCN"]),
    ];
    for (let ci = 0; ci < 7; ci++) S(r, 2 + ci, C(amts[ci], sData("right")));

    const scn5 = parseNum(dr["ອາກອນ SCN 5%"]);
    const sx5 = parseNum(dr["ອາກອນ SX 5%"]);
    const total5 = parseNum(dr["ລວມອາກອນ 5%"]);
    S(r, 9, scn5 ? C(scn5, sKData()) : CE(sKData()));
    S(r, 10, sx5 ? C(sx5, sLData()) : CE(sLData()));
    S(r, 11, total5 ? C(total5, sLData()) : CE(sLData()));
  }

  // ── SUM row ───────────────────────────────────────────────────────────────
  const rSum = 6 + totalRows;
  S(rSum, 0, CE(sSum()));
  S(rSum, 1, CE(sSum()));
  S(rSum, 2, C(sumC, sSum()));
  S(rSum, 3, C(sumD, sSum()));
  S(rSum, 4, C(sumE, sSum()));
  S(rSum, 5, C(sumF, sSum()));
  S(rSum, 6, C(sumH, sSum()));
  S(rSum, 7, C(sumI, sSum()));
  S(rSum, 8, C(sumJ, sSum()));
  S(rSum, 9, C(sumK, sSum()));
  S(rSum, 10, C(sumL, sSum()));
  S(rSum, 11, C(sumM, sSum()));

  // ── TOTAL row ─────────────────────────────────────────────────────────────
  const rTot = rSum + 1;
  const grand = sumC + sumD + sumE + sumF + sumH + sumI + sumJ;
  S(rTot, 0, C("ລວມຈ່າຍທັງໝົດ", sTotalLabel()));
  S(rTot, 1, CE(sTotalLabel()));
  S(rTot, 2, C(grand, sTotalValue()));
  S(rTot, 3, CE(sTotalValue()));
  S(rTot, 4, CE(sTotalValue()));
  for (let c = 5; c <= 11; c++) S(rTot, c, CE(sTotalLabel()));
  M(rTot, 0, rTot, 1);
  M(rTot, 2, rTot, 4);

  // ── Signature row (+3 from TOTAL) ─────────────────────────────────────────
  const rSig = rTot + 3;
  const sSig: CellStyle = {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: "center" },
  };
  S(rSig, 4, C("ຜູ້ກວດກາ", sSig));
  S(rSig, 10, C("ຜູ້ສະຫຼຸບ", sSig));

  // ── Metadata ──────────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 5.82 },
    { wch: 13.18 },
    { wch: 23.18 },
    { wch: 22.27 },
    { wch: 17.54 },
    { wch: 20.27 },
    { wch: 15.73 },
    { wch: 19.82 },
    { wch: 14.54 },
    { wch: 16.27 },
    { wch: 16.27 },
    { wch: 19.27 },
  ];
  ws["!rows"] = [
    { hpt: 20.5 },
    { hpt: 20.5 },
    { hpt: 20.5 },
    { hpt: 21.0 },
    { hpt: 32.25 },
    { hpt: 31.5 },
    ...Array.from({ length: totalRows }, () => ({ hpt: 25 })),
    { hpt: 34.5 },
    { hpt: 39.75 },
    { hpt: 20.5 },
    { hpt: 20.5 },
    { hpt: 20.5 },
  ];
  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: rSig, c: 11 });

  return ws;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportBcelTax5(
  bcelRows: BcelRow[],
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  // ✅ Export ຂໍ້ມູນທັງໝົດ (ບໍ່ຕັດແຖວອອກ), ບໍ່ວ່າຈະສະແດງໃນຈໍຫຼືບໍ່
  const dataRows = bcelRows.filter((r) => r["ງວດ"] !== "ລວມທັງໝົດ");
  const dateDisplay =
    dateFrom === dateTo
      ? fmtDate(dateFrom)
      : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;

  const ws = buildSheet(dateDisplay, dataRows);
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(
    wb,
    ws,
    (monthLabel(dateFrom) || "BCEL Report").slice(0, 31),
  );
  XLSXStyle.writeFile(
    wb,
    `BCEL_Tax5_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`,
  );
}
