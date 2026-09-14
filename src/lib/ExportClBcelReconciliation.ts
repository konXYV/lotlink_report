// lib/ExportClBcelReconciliation.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ການທຽບຍອດ CL (CL_BCEL_STMT) — xlsx-js-style
//
//  Columns:
//  A = ວັນທີ            J = ລາງວັນ Pupatao
//  B = ລວມໜີ້            K = ຄ່າທໍານຽມ Pupatao
//  C = ລວມມີ             L = ອາກອນ Pupatao
//  D = ລາງວັນ            M = ໂອນເງິນ-ໜີ້
//  E = ຄ່າທໍານຽມລາງວັນ    N = ໂອນເງິນ-ມີ
//  F = ລາງວັນ Dog racing O = Bank Fee
//  G = ຄ່າທໍານຽມ Dog racing P = ອື່ນໆ
//  H = ອາກອນ Dog racing  Q = ສ່ວນຕ່າງ
//  I = ລາງວັນ Pupatao (ຕໍ່)
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClReconciliationRow {
  ວັນທີ: string | null;
  ລວມໜີ້: string;
  ລວມມີ: string;
  ລາງວັນ: string;
  ຄ່າທໍານຽມລາງວັນ: string;
  "ລາງວັນ Dog racing": string;
  "ຄ່າທໍານຽມ Dog racing": string;
  "ອາກອນ Dog racing": string;
  "ລາງວັນ Pupatao": string;
  "ຄ່າທໍານຽມ Pupatao": string;
  "ອາກອນ Pupatao": string;
  "ໂອນເງິນ - ໜີ້": string;
  "ໂອນເງິນ - ມີ": string;
  "Bank Fee": string;
  ອື່ນໆ: string | null;
  ສ່ວນຕ່າງ: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const FONT = "Phetsarath OT";
const BG_HEADER = "9DC3E6";
const BG_TOTAL = "D0D0D0";

// ── Border helpers ─────────────────────────────────────────────────────────

type BSide = { color: CellStyleColor; style?: BorderType };
const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });

const allThin = (): CellStyle["border"] => ({
  left: thin(),
  right: thin(),
  top: thin(),
  bottom: thin(),
});

// ── Style builders ─────────────────────────────────────────────────────────

function sHeader(sz = 9): CellStyle {
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

function sDate(): CellStyle {
  return {
    font: { name: FONT, sz: 9 },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}

function sNum(): CellStyle {
  return {
    font: { name: "Arial Narrow", sz: 9 },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: '#,##0.00;\\-#,##0.00;"-"',
    border: allThin(),
  };
}

function sTxt(): CellStyle {
  return {
    font: { name: FONT, sz: 8 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border: allThin(),
  };
}

function sTotalLabel(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}

function sTotalNum(): CellStyle {
  return {
    font: { name: "Arial Narrow", bold: true, sz: 9 },
    fill: { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: '#,##0.00;\\-#,##0.00;"-"',
    border: allThin(),
  };
}

// ── Cell factories ─────────────────────────────────────────────────────────

function C(v: string | number, s: CellStyle): CellObject {
  return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
}
function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseSign(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const neg = s.startsWith("-");
  const n = parseFloat(s.replace(/,/g, "").replace(/^-/, "")) || 0;
  return neg ? -n : n;
}

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const HEADERS = [
  "ວັນທີ",
  "ລວມໜີ້",
  "ລວມມີ",
  "ລາງວັນ",
  "ຄ່າທໍານຽມ ລາງວັນ",
  "ລາງວັນ Dog racing",
  "ຄ່າທໍານຽມ Dog racing",
  "ອາກອນ Dog racing",
  "ລາງວັນ Pupatao",
  "ຄ່າທໍານຽມ Pupatao",
  "ອາກອນ Pupatao",
  "ໂອນເງິນ-ໜີ້",
  "ໂອນເງິນ-ມີ",
  "Bank Fee",
  "ອື່ນໆ",
  "ສ່ວນຕ່າງ",
];

const NCOLS = HEADERS.length; // 16

const NUM_KEYS: (keyof ClReconciliationRow)[] = [
  "ລວມໜີ້",
  "ລວມມີ",
  "ລາງວັນ",
  "ຄ່າທໍານຽມລາງວັນ",
  "ລາງວັນ Dog racing",
  "ຄ່າທໍານຽມ Dog racing",
  "ອາກອນ Dog racing",
  "ລາງວັນ Pupatao",
  "ຄ່າທໍານຽມ Pupatao",
  "ອາກອນ Pupatao",
  "ໂອນເງິນ - ໜີ້",
  "ໂອນເງິນ - ມີ",
  "Bank Fee",
];

// ── Sheet builder ──────────────────────────────────────────────────────────

function buildSheet(
  dateDisplay: string,
  dataRows: ClReconciliationRow[],
  totalRow: ClReconciliationRow | null,
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  };

  // ── R0-R2: Title ───────────────────────────────────────────────────────
  S(0, 0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", sTitle(12)));
  S(
    1,
    0,
    C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", sTitle(12)),
  );
  S(
    2,
    0,
    C(
      `ການທຽບຍອດ CL (CL_BCEL_STMT) ACCT-0101300016635 ວັນທີ ${dateDisplay}`,
      sTitle(13, true),
    ),
  );
  M(0, 0, 0, NCOLS - 1);
  M(1, 0, 1, NCOLS - 1);
  M(2, 0, 2, NCOLS - 1);

  // ── R3: blank ──────────────────────────────────────────────────────────
  for (let c = 0; c < NCOLS; c++) S(3, c, CE(sTitle()));
  M(3, 0, 3, NCOLS - 1);

  // ── R4: Column headers ─────────────────────────────────────────────────
  HEADERS.forEach((h, c) => S(4, c, C(h, sHeader(9))));

  // ── R5+: Data rows ─────────────────────────────────────────────────────
  dataRows.forEach((row, i) => {
    const r = 5 + i;
    S(r, 0, C(row["ວັນທີ"] ?? "", sDate()));

    const vals = NUM_KEYS.map((k) => parseSign(row[k]));
    vals.forEach((v, ci) => S(r, 1 + ci, C(v === 0 ? "" : v, sNum())));

    // ອື່ນໆ (text)
    S(r, 14, C(row["ອື່ນໆ"] ?? "", sTxt()));

    // ສ່ວນຕ່າງ
    const diff = parseSign(row["ສ່ວນຕ່າງ"]);
    S(r, 15, C(diff === 0 ? "" : diff, sNum()));
  });

  // ── Total row (ROLLUP grand total from Oracle) ─────────────────────────
  if (totalRow) {
    const rT = 5 + dataRows.length;
    S(rT, 0, C("ລວມທັງໝົດ", sTotalLabel()));
    const tVals = NUM_KEYS.map((k) => parseSign(totalRow[k]));
    tVals.forEach((v, ci) => S(rT, 1 + ci, C(v === 0 ? "" : v, sTotalNum())));
    S(rT, 14, CE(sTotalLabel()));
    const tDiff = parseSign(totalRow["ສ່ວນຕ່າງ"]);
    S(rT, 15, C(tDiff === 0 ? "" : tDiff, sTotalNum()));
  }

  // ── Signature ────────────────────────────────────────────────────────
  const rSig = 5 + dataRows.length + (totalRow ? 3 : 2);
  const sSig: CellStyle = {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: "center" },
  };
  S(rSig, 3, C("ຜູ້ສ້າງ", sSig));
  S(rSig, 8, C("ຜູ້ກວດສອບ", sSig));
  S(rSig, 13, C("ຜູ້ອະນຸມັດ", sSig));

  // ── Column widths ─────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 12 }, // A ວັນທີ
    { wch: 16 }, // B ລວມໜີ້
    { wch: 14 }, // C ລວມມີ
    { wch: 14 }, // D ລາງວັນ
    { wch: 16 }, // E ຄ່າທໍານຽມ ລາງວັນ
    { wch: 16 }, // F ລາງວັນ Dog racing
    { wch: 18 }, // G ຄ່າທໍານຽມ Dog racing
    { wch: 16 }, // H ອາກອນ Dog racing
    { wch: 14 }, // I ລາງວັນ Pupatao
    { wch: 16 }, // J ຄ່າທໍານຽມ Pupatao
    { wch: 14 }, // K ອາກອນ Pupatao
    { wch: 14 }, // L ໂອນ-ໜີ້
    { wch: 14 }, // M ໂອນ-ມີ
    { wch: 14 }, // N Bank Fee
    { wch: 28 }, // O ອື່ນໆ
    { wch: 14 }, // P ສ່ວນຕ່າງ
  ];

  const lastDataRow = 5 + dataRows.length + (totalRow ? 2 : 1) + 3;
  ws["!rows"] = [
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 22 },
    { hpt: 10 },
    { hpt: 36 },
    ...Array.from({ length: dataRows.length }, () => ({ hpt: 22 })),
    { hpt: 26 },
    { hpt: 28 },
  ];

  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastDataRow, c: NCOLS - 1 },
  );

  // ── Print setup: A4 landscape, fit all columns on 1 page wide ───────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!pageSetup"] = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: 1,
    fitToWidth: 1,
    fitToHeight: 0,
    scale: 100,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!margins"] = {
    left: 0.31,
    right: 0.31,
    top: 0.39,
    bottom: 0.79,
    header: 0.2,
    footer: 0.2,
  };

  return ws;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function exportClBcelReconciliation(
  rows: ClReconciliationRow[],
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  const dataRows = rows.filter((r) => r["ວັນທີ"] !== null && r["ວັນທີ"] !== "");
  const totalRow =
    rows.find((r) => r["ວັນທີ"] === null || r["ວັນທີ"] === "") ?? null;

  const dateDisplay =
    dateFrom === dateTo
      ? fmtDate(dateFrom)
      : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;

  const ws = buildSheet(dateDisplay, dataRows, totalRow);
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "CL Reconciliation");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsAny = wb.Sheets["CL Reconciliation"] as any;
  if (!wsAny["!sheetPr"]) wsAny["!sheetPr"] = {};
  wsAny["!sheetPr"].pageSetUpPr = { fitToPage: true };

  XLSXStyle.writeFile(
    wb,
    `CL_BCEL_Reconciliation_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`,
  );
}
