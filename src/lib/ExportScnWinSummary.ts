// lib/ExportScnWinSummary.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ຍອດຖືກລາງວັນ SCN (O_SCN_BCEL_STMT x SCN_PORTAL_DATA) — xlsx-js-style
//
//  Layout ອີງຕາມ template ລາງວັນ.xlsx ທີ່ຜູ້ໃຊ້ແນບ:
//  R1     = Title + ວັນທີພິມ (right)
//  R2     = ຫົວຂໍ້ຕາຕະລາງສະຫລຸບ (merge B:I)
//  R3     = ຫົວຂໍ້ຍ່ອຍ (merge B:I)
//  R4     = Table header: ລ/ດ, ວັນທີ, ງວດ, ລາງວັນຕົວຕົງ, ລາງວັນໂບນັດ, ຄ່າທຳນຽມຕົວຕົງ, ຄ່າທຳນຽມໂບນັດ, ຄ່າທຳນຽມ ທ/ຄ, ອາກອນ5%
//  R5+    = Data rows (ຕໍ່ງວດ)
//  ROW ລວມ = SUM ຂອງແຕ່ລະຖັນ
//  +2 rows = ລວມລາຍຈ່າຍ (highlight yellow)
//  ຈາກນັ້ນ = ລາຍລະອຽດຕໍ່ງວດ (Total_Reward, Tax_Reward, Reward_After_Tax, Total_Bonus, Total_Win
//            + ລາຍລະອຽດແຍກປະເພດໂບນັດ matchwin2..invoice6) ຂອງແຕ່ລະງວດ ຕໍ່ໆກັນ
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScnWinRow {
  "ລ/ດ": number | null;
  ວັນທີ: string | null;
  ງວດ: string;
  ລາງວັນຕົວຕົງ: number;
  ລາງວັນໂບນັດ: number;
  ຄ່າທຳນຽມຕົວຕົງ: number;
  ຄ່າທຳນຽມໂບນັດ: number;
  "ຄ່າທຳນຽມ ທ/ຄ": number;
  "ອາກອນ5%": number;
}

export interface ScnWinTaxItem {
  BCEL_DATE: string;
  DRAWID: string;
  BCEL_CR: number;
}

export interface ScnWinDrawDetail {
  DRAWID: string;
  DRAW_DATE: string | null;
  TOTAL_REWARD: number;
  TAX_REWARD: number;
  REWARD_AFTER_TAX: number;
  TOTAL_BONUS: number;
  MATCHWIN2: number;
  MATCHWIN3: number;
  ADJACENT2: number;
  ADJACENT2FRONT: number;
  ADJACENT3: number;
  ADJACENT3FRONT: number;
  ADJACENT4: number;
  ADJACENT5: number;
  ADJACENT6: number;
  RANDOM3: number;
  RANDOM4: number;
  RANDOM5: number;
  RANDOM6: number;
  INVOICE2: number;
  INVOICE3: number;
  INVOICE4: number;
  INVOICE5: number;
  INVOICE6: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT = "Phetsarath OT";
const BG_HEADER = "D9D9D9";
const BG_YELLOW = "FFFF00";

const BONUS_BREAKDOWN: { key: keyof ScnWinDrawDetail; label: string }[] = [
  { key: "MATCHWIN2", label: "ເລກ 6 ໂຕຖືກ 2 ໂຕໜ້າຫຼັງ " },
  { key: "MATCHWIN3", label: " ເລກ 6 ໂຕຖືກ 3 ໂຕໜ້າຫຼັງ " },
  { key: "ADJACENT2", label: " ເລກຂ້າງຄຽງໜ້າ ເລກ 2 ໂຕ " },
  { key: "ADJACENT2FRONT", label: " ເລກຂ້າງຄຽງຫລັງ ເລກ 2 ໂຕ " },
  { key: "ADJACENT3", label: " ເລກຂ້າງຄຽງໜ້າ ເລກ 3 ໂຕ " },
  { key: "ADJACENT3FRONT", label: " ເລກຂ້າງຄຽງຫລັງ ເລກ 3 ໂຕ " },
  { key: "ADJACENT4", label: " ເລກຂ້າງຄຽງໜ້າ ເລກ 4 ໂຕ " },
  { key: "ADJACENT5", label: " ເລກຂ້າງຄຽງໜ້າ ເລກ 5 ໂຕ " },
  { key: "ADJACENT6", label: " ເລກຂ້າງຄຽງໜ້າ ເລກ 6 ໂຕ " },
  { key: "RANDOM3", label: " ເລກສະຫຼັບ 3 ໂຕ " },
  { key: "RANDOM4", label: " ເລກສະຫຼັບ 4 ໂຕ " },
  { key: "RANDOM5", label: " ເລກສະຫຼັບ 5 ໂຕ " },
  { key: "RANDOM6", label: " ເລກສະຫຼັບ 6 ໂຕ " },
  { key: "INVOICE2", label: " ເລກທ້າຍບິນ 2 ໂຕ " },
  { key: "INVOICE3", label: " ເລກທ້າຍບິນ 3 ໂຕ " },
  { key: "INVOICE4", label: " ເລກທ້າຍບິນ 4 ໂຕ " },
  { key: "INVOICE5", label: " ເລກທ້າຍບິນ 5 ໂຕ " },
  { key: "INVOICE6", label: " ເລກທ້າຍບິນ 6 ໂຕ" },
];

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

const numFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';

function sTitle(sz = 12, bold = false): CellStyle {
  return {
    font: { name: FONT, sz, bold },
    alignment: { horizontal: "center", vertical: "center" },
  };
}
function sDateTop(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "dd/mm/yyyy",
    border: allThin(),
  };
}
function sHeader(sz = 12): CellStyle {
  return {
    font: { name: FONT, bold: true, sz },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}
function sBandTitle(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}
function sDataC(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}
function sDataDate(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: "dd/mm/yyyy",
    border: allThin(),
  };
}
function sDataN(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt,
    border: allThin(),
  };
}
function sTotalLabel(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}
function sTotalN(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt,
    border: allThin(),
  };
}
function sYellowLabel(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    fill: { patternType: "solid", fgColor: { rgb: BG_YELLOW } },
    alignment: { horizontal: "left", vertical: "center" },
  };
}
function sYellowN(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 12 },
    fill: { patternType: "solid", fgColor: { rgb: BG_YELLOW } },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt,
  };
}
function sPlain(bold = false): CellStyle {
  return {
    font: { name: FONT, sz: 12, bold },
    alignment: { horizontal: "left", vertical: "center" },
  };
}
function sPlainDate(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: "dd/mm/yyyy",
    border: allThin(),
  };
}
function sPlainN(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt,
  };
}
function sBreakdownLabel(): CellStyle {
  return {
    font: { name: FONT, sz: 12 },
    alignment: { horizontal: "left", vertical: "center" },
  };
}
function sBreakdownCode(): CellStyle {
  return {
    font: { name: FONT, sz: 10, italic: true, color: { rgb: "808080" } },
    alignment: { horizontal: "left", vertical: "center" },
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

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function toExcelDate(s: string | null): number | string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  // Excel epoch: 1899-12-30
  const epoch = Date.UTC(1899, 11, 30);
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc - epoch) / 86400000);
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(
  dateDisplay: string,
  summaryRows: ScnWinRow[],
  drawDetails: ScnWinDrawDetail[],
  taxItems: ScnWinTaxItem[],
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  };

  // ── R1: Title (left) + print date (right, col J) ────────────────────────
  S(0, 1, C(`ລາຍຈ່າຍ Statement ວັນທີ ${dateDisplay}`, sTitle(12, false)));
  S(0, 9, C(toExcelDate(new Date().toISOString().slice(0, 10)), sDateTop()));

  // ── R2: Sub-title 1 (merge B:J) ───────────────────────────────────────
  S(
    1,
    1,
    C(
      `ຕາຕະລາງສະຫລຸບຈ່າຍລາງວັນຫວຍຂອງ (BCEL-190) ວັນທີ ${dateDisplay}`,
      sBandTitle(),
    ),
  );
  for (let c = 2; c <= 9; c++) S(1, c, CE(sBandTitle()));
  M(1, 1, 1, 9);

  // ── R3: Sub-title 2 (merge B:J) ────────────────────────────────────────
  S(2, 1, C("ຈ່າຍລາງວັນຫວຍ SCN Easy ຍອດຂາຍຜ່ານ App", sBandTitle()));
  for (let c = 2; c <= 9; c++) S(2, c, CE(sBandTitle()));
  M(2, 1, 2, 9);

  // ── R4: Table header ─────────────────────────────────────────────────
  const headers = [
    "ລ/ດ",
    "ວັນທີ",
    "ງວດ",
    "ລາງວັນຕົວຕົງ",
    "ລາງວັນໂບນັດ",
    "ຄ່າທຳນຽມຕົວຕົງ",
    "ຄ່າທຳນຽມໂບນັດ",
    "ຄ່າທຳນຽມ ທ/ຄ",
    "ອາກອນ5% (ຫັກໃນລະບົບ)",
  ];
  headers.forEach((h, i) => S(3, 1 + i, C(h, sHeader(12))));

  // ── R5+: Data rows (ຕໍ່ງວດ, ບໍ່ນັບແຖວ ລວມ) ───────────────────────────────
  const dataRows = summaryRows.filter((r) => r["ງວດ"] !== "ລວມ");
  const totalRow = summaryRows.find((r) => r["ງວດ"] === "ລວມ") ?? null;

  // ອາກອນ5% ຕໍ່ງວດ ໃຊ້ຄ່າ "ອາກອນ5%" ທີ່ Backend ຄິດໄລ່ລວມມາຕາມ DRAWID ແລ້ວ
  // (ຄືກັນກັບວິທີສະແດງໃນ ສະຫຼຸບລາງວັນ BCEL — REWARD_BCEL_STMT) ແທນທີ່ຈະໃຊ້
  // ລາຍການ taxItems ແບບຈັບຄູ່ຕາມລໍາດັບ ເຊິ່ງບໍ່ກົງກັບງວດ (DRAWID) ຈິງ
  const mainRowCount = dataRows.length;

  let sumE = 0,
    sumF = 0,
    sumG = 0,
    sumG2 = 0,
    sumH = 0,
    sumI = 0;

  for (let i = 0; i < mainRowCount; i++) {
    const row = dataRows[i];
    const r = 4 + i;

    if (row) {
      S(r, 1, C(i + 1, sDataC()));
      S(
        r,
        2,
        row.ວັນທີ ? C(toExcelDate(row.ວັນທີ), sDataDate()) : CE(sDataDate()),
      );
      S(r, 3, C(row["ງວດ"], sDataC()));
      S(r, 4, C(row.ລາງວັນຕົວຕົງ, sDataN()));
      S(r, 5, C(row.ລາງວັນໂບນັດ, sDataN()));
      S(r, 6, C(row.ຄ່າທຳນຽມຕົວຕົງ, sDataN()));
      S(r, 7, C(row.ຄ່າທຳນຽມໂບນັດ, sDataN()));
      S(r, 8, C(row["ຄ່າທຳນຽມ ທ/ຄ"], sDataN()));

      sumE += row.ລາງວັນຕົວຕົງ;
      sumF += row.ລາງວັນໂບນັດ;
      sumG += row.ຄ່າທຳນຽມຕົວຕົງ;
      sumG2 += row.ຄ່າທຳນຽມໂບນັດ;
      sumH += row["ຄ່າທຳນຽມ ທ/ຄ"];
      sumI += row["ອາກອນ5%"];
    } else {
      for (let c = 1; c <= 8; c++) S(r, c, CE(sDataN()));
    }

    if (row) {
      S(r, 9, C(row["ອາກອນ5%"], sDataN()));
    } else {
      S(r, 9, CE(sDataN()));
    }
  }

  // Use grand total row from backend if provided, otherwise fall back to computed sums
  if (totalRow) {
    sumE = totalRow.ລາງວັນຕົວຕົງ;
    sumF = totalRow.ລາງວັນໂບນັດ;
    sumG = totalRow.ຄ່າທຳນຽມຕົວຕົງ;
    sumG2 = totalRow.ຄ່າທຳນຽມໂບນັດ;
    sumH = totalRow["ຄ່າທຳນຽມ ທ/ຄ"];
    sumI = totalRow["ອາກອນ5%"];
  }

  // ── ລວມ row ───────────────────────────────────────────────────────────
  const rTotal = 4 + mainRowCount;
  S(rTotal, 1, C("ລວມ", sTotalLabel()));
  M(rTotal, 1, rTotal, 3);
  S(rTotal, 2, CE(sTotalLabel()));
  S(rTotal, 3, CE(sTotalLabel()));
  S(rTotal, 4, C(sumE, sTotalN()));
  S(rTotal, 5, C(sumF, sTotalN()));
  S(rTotal, 6, C(sumG, sTotalN()));
  S(rTotal, 7, C(sumG2, sTotalN()));
  S(rTotal, 8, C(sumH, sTotalN()));
  S(rTotal, 9, C(sumI, sTotalN()));

  // ── ລວມລາຍຈ່າຍ (highlight yellow) ────────────────────────────────────────
  const rSpend = rTotal + 2;
  const grandSpend = sumE + sumF + sumG + sumG2 + sumH;
  S(rSpend, 3, C("ລວມລາຍຈ່າຍ", sYellowLabel()));
  S(rSpend, 4, C(grandSpend, sYellowN()));

  // ── ລາຍລະອຽດຕໍ່ງວດ ──────────────────────────────────────────────────────
  let r = rSpend + 2;
  for (const d of drawDetails) {
    // ວັນທີ
    S(
      r,
      2,
      d.DRAW_DATE
        ? C(toExcelDate(d.DRAW_DATE), sPlainDate())
        : CE(sPlainDate()),
    );
    r += 1;
    // ງວດ xxxxx
    S(r, 2, C(`ງວດ ${d.DRAWID}`, sPlain(false)));
    r += 1;

    const grid: { c: string; d: string; e: number }[] = [
      { c: "ລວມລາງວັນ", d: "Total_Reward", e: d.TOTAL_REWARD },
      { c: "ອາກອນລາງວັນ", d: "Tax_Reward", e: d.TAX_REWARD },
      { c: "ຫລັງຫັກອາກອນ", d: "Reward_After_Tax", e: d.REWARD_AFTER_TAX },
      { c: "ລາງວັນໂບນັດ", d: "Total_Bonus", e: d.TOTAL_BONUS },
    ];
    for (const g of grid) {
      S(r, 2, C(g.c, sPlain(false)));
      S(r, 3, C(g.d, sBreakdownCode()));
      S(r, 4, C(g.e, sPlainN()));
      r += 1;
    }

    // Total_Win = Reward_After_Tax + Total_Bonus
    const totalWin = d.REWARD_AFTER_TAX + d.TOTAL_BONUS;
    S(r, 3, C("Total_Win", sBreakdownCode()));
    S(r, 4, C(totalWin, sPlainN()));
    S(
      r,
      5,
      C("(= Reward_After_Tax + Total_Bonus)", {
        font: { name: FONT, sz: 10, italic: true, color: { rgb: "808080" } },
        alignment: { horizontal: "left", vertical: "center" },
      }),
    );
    r += 1;

    // ລາຍລະອຽດແຍກປະເພດໂບນັດ
    for (const b of BONUS_BREAKDOWN) {
      S(r, 2, C(b.label, sBreakdownLabel()));
      S(r, 3, C(String(b.key).toLowerCase(), sBreakdownCode()));
      S(r, 4, C(Number(d[b.key]) || 0, sPlainN()));
      r += 1;
    }

    // Total_Bonus (sub-footer, ຄືກັນກັບ D61/E61 ໃນ template)
    S(r, 3, C("Total_Bonus", sBreakdownCode()));
    S(r, 4, C(d.TOTAL_BONUS, sPlainN()));
    r += 2; // blank row between draws
  }

  // ── Metadata ──────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 2.66 },
    { wch: 4.1 },
    { wch: 25.44 },
    { wch: 18.55 },
    { wch: 20.0 },
    { wch: 20.0 },
    { wch: 20.0 },
    { wch: 15.22 },
    { wch: 13.66 },
    { wch: 23.0 },
  ];
  ws["!merges"] = merges;
  const lastRow = Math.max(r - 1, rSpend);
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastRow, c: 9 },
  );

  return ws;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportScnWinSummary(
  summaryRows: ScnWinRow[],
  drawDetails: ScnWinDrawDetail[],
  taxItems: ScnWinTaxItem[],
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  const dateDisplay =
    dateFrom === dateTo || !dateTo
      ? fmtDate(dateFrom)
      : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;

  const ws = buildSheet(dateDisplay, summaryRows, drawDetails, taxItems);
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "ຍອດຖືກລາງວັນ SCN".slice(0, 31));
  XLSXStyle.writeFile(
    wb,
    `SCN_Win_Summary_${dateFrom || "all"}_to_${dateTo || dateFrom || "all"}.xlsx`,
  );
}

export async function fetchScnWinDrawDetail(
  dateFrom: string,
  dateTo: string,
): Promise<ScnWinDrawDetail[]> {
  const qs = new URLSearchParams({ view: "scn_win_draw_detail" });
  if (dateFrom) qs.set("date_from", dateFrom);
  if (dateTo) qs.set("date_to", dateTo);
  const res = await fetch(`/api/oracle?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "ດຶງລາຍລະອຽດງວດລົ້ມເຫຼວ");
  return Array.isArray(json.rows) ? json.rows : [];
}

export async function fetchScnWinTax5Items(
  dateFrom: string,
  dateTo: string,
): Promise<ScnWinTaxItem[]> {
  const qs = new URLSearchParams({ view: "scn_win_tax5_items" });
  if (dateFrom) qs.set("date_from", dateFrom);
  if (dateTo) qs.set("date_to", dateTo);
  const res = await fetch(`/api/oracle?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "ດຶງລາຍລະອຽດອາກອນລົ້ມເຫຼວ");
  return Array.isArray(json.rows) ? json.rows : [];
}
