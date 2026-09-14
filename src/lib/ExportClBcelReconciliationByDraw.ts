// lib/ExportClBcelReconciliationByDraw.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ການທຽບຍອດ CL (CL_BCEL_STMT) ແຍກຕາມງວດ (DRAWID) — xlsx-js-style
//  ຮອງຮັບ 3 ໂໝດ:
//    all      = ທຸກຄໍລຳ (ໝານຳໂຊກ + ປູປາເຕົ້າມະຫາໂຊກ)
//    dog      = ຕັດຄໍລຳ Pupatao ອອກ, ປ່ຽນຊື່ຄໍລຳ Dog racing -> ໝານຳໂຊກ
//    pupatao  = ຕັດຄໍລຳ Dog racing ອອກ, ປ່ຽນຊື່ຄໍລຳ Pupatao -> ປູປາເຕົ້າມະຫາໂຊກ
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClReconciliationByDrawRow {
  ງວດ: string | null;
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

export type ExportMode = "all" | "dog" | "pupatao";

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

// ── Column definitions (ຕົ້ນສະບັບ — ໂໝດ "all") ───────────────────────────

type ColKind = "text-center" | "text-left" | "number";

interface ColDef {
  key: keyof ClReconciliationByDrawRow;
  header: string;
  kind: ColKind;
  wch: number;
}

const BASE_COLS: ColDef[] = [
  { key: "ງວດ", header: "ງວດ", kind: "text-center", wch: 12 },
  { key: "ວັນທີ", header: "ວັນທີ", kind: "text-center", wch: 16 },
  { key: "ລວມໜີ້", header: "ລວມໜີ້", kind: "number", wch: 16 },
  { key: "ລວມມີ", header: "ລວມມີ", kind: "number", wch: 14 },
  { key: "ລາງວັນ", header: "ລາງວັນ", kind: "number", wch: 14 },
  { key: "ຄ່າທໍານຽມລາງວັນ", header: "ຄ່າທໍານຽມ ລາງວັນ", kind: "number", wch: 16 },
  { key: "ລາງວັນ Dog racing", header: "ລາງວັນ Dog racing", kind: "number", wch: 16 },
  { key: "ຄ່າທໍານຽມ Dog racing", header: "ຄ່າທໍານຽມ Dog racing", kind: "number", wch: 18 },
  { key: "ອາກອນ Dog racing", header: "ອາກອນ Dog racing", kind: "number", wch: 16 },
  { key: "ລາງວັນ Pupatao", header: "ລາງວັນ Pupatao", kind: "number", wch: 14 },
  { key: "ຄ່າທໍານຽມ Pupatao", header: "ຄ່າທໍານຽມ Pupatao", kind: "number", wch: 16 },
  { key: "ອາກອນ Pupatao", header: "ອາກອນ Pupatao", kind: "number", wch: 14 },
  { key: "ໂອນເງິນ - ໜີ້", header: "ໂອນເງິນ-ໜີ້", kind: "number", wch: 14 },
  { key: "ໂອນເງິນ - ມີ", header: "ໂອນເງິນ-ມີ", kind: "number", wch: 14 },
  { key: "Bank Fee", header: "Bank Fee", kind: "number", wch: 14 },
  { key: "ອື່ນໆ", header: "ອື່ນໆ", kind: "text-left", wch: 28 },
  { key: "ສ່ວນຕ່າງ", header: "ສ່ວນຕ່າງ", kind: "number", wch: 14 },
];

const DOG_KEYS: (keyof ClReconciliationByDrawRow)[] = [
  "ລາງວັນ Dog racing",
  "ຄ່າທໍານຽມ Dog racing",
  "ອາກອນ Dog racing",
];
const PUPATAO_KEYS: (keyof ClReconciliationByDrawRow)[] = [
  "ລາງວັນ Pupatao",
  "ຄ່າທໍານຽມ Pupatao",
  "ອາກອນ Pupatao",
];

const DOG_LABELS: Partial<Record<string, string>> = {
  "ລາງວັນ Dog racing": "ລາງວັນ ໝານຳໂຊກ",
  "ຄ່າທໍານຽມ Dog racing": "ຄ່າທໍານຽມ ໝານຳໂຊກ",
  "ອາກອນ Dog racing": "ອາກອນ ໝານຳໂຊກ",
};
const PUPATAO_LABELS: Partial<Record<string, string>> = {
  "ລາງວັນ Pupatao": "ລາງວັນ ປູປາເຕົ້າມະຫາໂຊກ",
  "ຄ່າທໍານຽມ Pupatao": "ຄ່າທໍານຽມ ປູປາເຕົ້າມະຫາໂຊກ",
  "ອາກອນ Pupatao": "ອາກອນ ປູປາເຕົ້າມະຫາໂຊກ",
};

function getColsForMode(mode: ExportMode): ColDef[] {
  if (mode === "dog") {
    return BASE_COLS.filter((c) => !PUPATAO_KEYS.includes(c.key)).map((c) =>
      DOG_LABELS[c.key] ? { ...c, header: DOG_LABELS[c.key]! } : c,
    );
  }
  if (mode === "pupatao") {
    return BASE_COLS.filter((c) => !DOG_KEYS.includes(c.key)).map((c) =>
      PUPATAO_LABELS[c.key] ? { ...c, header: PUPATAO_LABELS[c.key]! } : c,
    );
  }
  return BASE_COLS;
}

const MODE_TITLE: Record<ExportMode, string> = {
  all: "",
  dog: " — ໝານຳໂຊກ",
  pupatao: " — ປູປາເຕົ້າມະຫາໂຊກ",
};

// ── Sheet builder ──────────────────────────────────────────────────────────

function buildSheet(
  dateDisplay: string,
  dataRows: ClReconciliationByDrawRow[],
  totalRow: ClReconciliationByDrawRow | null,
  mode: ExportMode,
): WorkSheet {
  const cols = getColsForMode(mode);
  const NCOLS = cols.length;

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
      `ການທຽບຍອດ CL (CL_BCEL_STMT) ACCT-0101300016635 ແຍກຕາມງວດ${MODE_TITLE[mode]} — ວັນທີ ${dateDisplay}`,
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
  cols.forEach((col, c) => S(4, c, C(col.header, sHeader(9))));

  // ── R5+: Data rows ─────────────────────────────────────────────────────
  dataRows.forEach((row, i) => {
    const r = 5 + i;
    cols.forEach((col, ci) => {
      if (col.kind === "text-center") {
        S(r, ci, C(row[col.key] ?? "", sDate()));
      } else if (col.kind === "text-left") {
        S(r, ci, C(row[col.key] ?? "", sTxt()));
      } else {
        const v = parseSign(row[col.key]);
        S(r, ci, C(v === 0 ? "" : v, sNum()));
      }
    });
  });

  // ── Total row (ຄິດໄລ່ຈາກ rows ທີ່ສົ່ງເຂົ້າມາ — ອາດເປັນ ROLLUP ຈາກ Oracle
  //    ຫຼືຄິດໄລ່ຄືນຢູ່ໜ້າຈໍ ຕາມແຖບ tab ທີ່ເລືອກ) ──────────────────────────
  if (totalRow) {
    const rT = 5 + dataRows.length;
    cols.forEach((col, ci) => {
      if (col.key === "ງວດ") {
        S(rT, ci, C("ລວມທັງໝົດ", sTotalLabel()));
      } else if (col.kind !== "number") {
        S(rT, ci, CE(sTotalLabel()));
      } else {
        const v = parseSign(totalRow[col.key]);
        S(rT, ci, C(v === 0 ? "" : v, sTotalNum()));
      }
    });
  }

  // ── Signature ────────────────────────────────────────────────────────
  const rSig = 5 + dataRows.length + (totalRow ? 3 : 2);
  const sSig: CellStyle = {
    font: { name: FONT, sz: 11 },
    alignment: { horizontal: "center" },
  };
  const cA = Math.min(NCOLS - 1, Math.round(NCOLS * 0.2));
  const cB = Math.min(NCOLS - 1, Math.round(NCOLS * 0.5));
  const cC = Math.min(NCOLS - 1, Math.round(NCOLS * 0.8));
  S(rSig, cA, C("ຜູ້ສ້າງ", sSig));
  S(rSig, cB, C("ຜູ້ກວດສອບ", sSig));
  S(rSig, cC, C("ຜູ້ອະນຸມັດ", sSig));

  // ── Column widths ─────────────────────────────────────────────────────
  ws["!cols"] = cols.map((col) => ({ wch: col.wch }));

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

export async function exportClBcelReconciliationByDraw(
  rows: ClReconciliationByDrawRow[],
  dateFrom: string,
  dateTo: string,
  mode: ExportMode = "all",
): Promise<void> {
  const dataRows = rows.filter((r) => r["ງວດ"] !== null && r["ງວດ"] !== "");
  const totalRow =
    rows.find((r) => r["ງວດ"] === null || r["ງວດ"] === "") ?? null;

  const dateDisplay =
    !dateFrom && !dateTo
      ? "ທັງໝົດ"
      : dateFrom === dateTo
        ? fmtDate(dateFrom)
        : `${dateFrom ? fmtDate(dateFrom) : "—"} ຫາ ${dateTo ? fmtDate(dateTo) : "—"}`;

  const ws = buildSheet(dateDisplay, dataRows, totalRow, mode);
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "CL Reconciliation ByDraw");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsAny = wb.Sheets["CL Reconciliation ByDraw"] as any;
  if (!wsAny["!sheetPr"]) wsAny["!sheetPr"] = {};
  wsAny["!sheetPr"].pageSetUpPr = { fitToPage: true };

  XLSXStyle.writeFile(
    wb,
    `CL_BCEL_Reconciliation_ByDraw_${mode}_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`,
  );
}
