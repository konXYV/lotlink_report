// lib/ExportScnRewardQuota.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ສະຫລຸບການຈ່າຍລາງວັນຫວຍ Quota SCN / Sokxay ຜ່ານ BCEL — xlsx-js-style
//  Layout ອີງຕາມ "Reward_SCN_-_08-2026.xlsx" ທີ່ຜູ້ໃຊ້ແນບ (1 sheet ຕໍ່ quota):
//  R2-3   = ຫົວບໍລິສັດ (ຊື່ + ທີ່ຢູ່) + ວັນທີພິມ (right)
//  R4     = ຫົວຂໍ້ (merge A:N) "ສະຫລຸບການຈ່າຍລາງວັນຫວຍ Quota XXX ຜ່ານ BCEL, ປະຈຳເດືອນ MM/YYYY"
//  R5     = "ລາງວັນໂປຣໂມຊັ່ນ" (merge O:AF)
//  R6-7   = ຫົວຄໍລໍາ (main cols merge vertically R6:R7, promo cols: label R6 / key R7)
//  R8+    = ແຖວຂໍ້ມູນ ຕໍ່ງວດ (DRAW_ID)
//  Total  = ຜົນລວມແຕ່ລະຄໍລໍາ
//  +2 rows = "ສະຫລຸບລາງວັນ:" ບລັອກ (ລວມລາງວັນ / ອາກອນ 5% / ຫລັງຫັກອາກອນ / Bonus / ລວມຍອດຈ່າຍຜ່ານ BCEL)
//
//  ໝາຍເຫດ: ບໍ່ລວມສ່ວນ "ຕິດຕາມຈ່າຍລາງວັນ Bank Statement" ຂອງ template ຕົ້ນສະບັບ —
//  ສ່ວນນັ້ນອີງໃສ່ຂໍ້ມູນ Bank Statement ທີ່ປ້ອນມືເອງ, ບໍ່ໄດ້ມາຈາກ SCN_PORTAL_DATA.
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuotaRewardRow {
  DRAW_DATE: string | null;
  DRAW_ID: string;
  QUOTA: string;
  PAYMENT_CHANNEL: string;
  AMOUNT: number;
  POINT_USE: number;
  DISCOUNT: number;
  AFTER_DISCOUNT: number;
  RECON: number;
  TOTAL_REWARD: number;
  TAX_REWARD: number;
  REWARD_AFTER_TAX: number;
  TOTAL_BONUS: number;
  TOTAL_WIN: number;
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

type NumericCol = Exclude<keyof QuotaRewardRow, "DRAW_DATE" | "DRAW_ID" | "QUOTA" | "PAYMENT_CHANNEL">;

// ── Column layout (matches E..AF in the source Excel, in order) ────────────

const MAIN_COLS: [NumericCol, string][] = [
  ["AMOUNT",           "Amount"],
  ["POINT_USE",        "Point_Use"],
  ["DISCOUNT",         "Discount"],
  ["AFTER_DISCOUNT",   "After_Discount"],
  ["RECON",            "Recon"],
  ["TOTAL_REWARD",     "Total_Reward"],
  ["TAX_REWARD",       "Tax_Reward"],
  ["REWARD_AFTER_TAX", "Reward_After_Tax"],
  ["TOTAL_BONUS",      "Total_Bonus"],
  ["TOTAL_WIN",        "Total_Win"],
];

const PROMO_COLS: [NumericCol, string, string][] = [
  ["MATCHWIN2",      "ເລກ 6 ໂຕຖືກ 2 ໂຕໜ້າຫຼັງ ", "matchwin2"],
  ["MATCHWIN3",      " ເລກ 6 ໂຕຖືກ 3 ໂຕໜ້າຫຼັງ ", "matchwin3"],
  ["ADJACENT2",      " ເລກຂ້າງຄຽງໜ້າ ເລກ 2 ໂຕ ", "adjacent2"],
  ["ADJACENT2FRONT", " ເລກຂ້າງຄຽງຫລັງ ເລກ 2 ໂຕ ", "adjacent2front"],
  ["ADJACENT3",      " ເລກຂ້າງຄຽງໜ້າ ເລກ 3 ໂຕ ", "adjacent3"],
  ["ADJACENT3FRONT", " ເລກຂ້າງຄຽງຫລັງ ເລກ 3 ໂຕ ", "adjacent3front"],
  ["ADJACENT4",      " ເລກຂ້າງຄຽງໜ້າ ເລກ 4 ໂຕ ", "adjacent4"],
  ["ADJACENT5",      " ເລກຂ້າງຄຽງໜ້າ ເລກ 5 ໂຕ ", "adjacent5"],
  ["ADJACENT6",      " ເລກຂ້າງຄຽງໜ້າ ເລກ 6 ໂຕ ", "adjacent6"],
  ["RANDOM3",        " ເລກສະຫຼັບ 3 ໂຕ ", "random3"],
  ["RANDOM4",        " ເລກສະຫຼັບ 4 ໂຕ ", "random4"],
  ["RANDOM5",        " ເລກສະຫຼັບ 5 ໂຕ ", "random5"],
  ["RANDOM6",        " ເລກສະຫຼັບ 6 ໂຕ ", "random6"],
  ["INVOICE2",       " ເລກທ້າຍບິນ 2 ໂຕ ", "invoice2"],
  ["INVOICE3",       " ເລກທ້າຍບິນ 3 ໂຕ ", "invoice3"],
  ["INVOICE4",       " ເລກທ້າຍບິນ 4 ໂຕ ", "invoice4"],
  ["INVOICE5",       " ເລກທ້າຍບິນ 5 ໂຕ ", "invoice5"],
  ["INVOICE6",       " ເລກທ້າຍບິນ 6 ໂຕ", "invoice6"],
];

const ALL_COLS: [NumericCol, string][] = [
  ...MAIN_COLS,
  ...PROMO_COLS.map(([k, label]) => [k, label] as [NumericCol, string]),
];

// ── Style helpers ─────────────────────────────────────────────────────────────

const FONT = "Phetsarath OT";
const BG_HEADER = "FFFF00";

type BSide = { color: CellStyleColor; style?: BorderType };
const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const allThin = (): CellStyle["border"] => ({
  left: thin(), right: thin(), top: thin(), bottom: thin(),
});

const numFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';

function sPlain(bold = false, align: "left" | "center" | "right" = "left"): CellStyle {
  return { font: { name: FONT, sz: 11, bold }, alignment: { horizontal: align, vertical: "center" } };
}
function sDateTop(): CellStyle {
  return {
    font: { name: FONT, sz: 10 },
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "mm-dd-yy",
  };
}
function sTitle(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 13 },
    alignment: { horizontal: "center", vertical: "center" },
  };
}
function sPromoBand(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}
function sHeaderMain(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}
function sHeaderPromo(): CellStyle {
  return {
    font: { name: FONT, bold: true, sz: 9 },
    fill: { patternType: "solid", fgColor: { rgb: "FFF9C4" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}
function sHeaderPromoKey(): CellStyle {
  return {
    font: { name: FONT, sz: 8, italic: true, color: { rgb: "808080" } },
    fill: { patternType: "solid", fgColor: { rgb: "FFF9C4" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: allThin(),
  };
}
function sDataC(): CellStyle {
  return { font: { name: FONT, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, border: allThin() };
}
function sDataDate(): CellStyle {
  return { font: { name: FONT, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, numFmt: "mm-dd-yy", border: allThin() };
}
function sDataN(): CellStyle {
  return { font: { name: FONT, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, numFmt, border: allThin() };
}
function sTotalLabel(): CellStyle {
  return { font: { name: FONT, bold: true, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, border: allThin() };
}
function sTotalN(): CellStyle {
  return { font: { name: FONT, bold: true, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, numFmt, border: allThin() };
}
function sSummaryLabel(bold = false): CellStyle {
  return { font: { name: FONT, sz: 11, bold }, alignment: { horizontal: "left", vertical: "center" } };
}
function sSummaryN(bold = false): CellStyle {
  return { font: { name: FONT, sz: 11, bold }, alignment: { horizontal: "right", vertical: "center" }, numFmt };
}

// ── Cell factories ────────────────────────────────────────────────────────────

function C(v: string | number, s: CellStyle): CellObject {
  return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
}
function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

function toExcelDate(s: string | null): number | string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const epoch = Date.UTC(1899, 11, 30);
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc - epoch) / 86400000);
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(quotaLabel: string, monthLabel: string, rows: QuotaRewardRow[]): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => { ws[XLSXStyle.utils.encode_cell({ r, c })] = cl; };
  const M = (r1: number, c1: number, r2: number, c2: number) => { merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); };

  const lastCol = 1 + ALL_COLS.length; // col index of last data column (0-based, col A = 0)

  // ── R2-3: company header, R3 col N = print date ─────────────────────────
  S(1, 1, C("ບໍລິສັດ ສົມໃຈນຶກເທຣດດິ້ງແອນລ໋ອດເຕີຣີ ຈຳກັດຜູ້ດຽວ", sPlain(false)));
  S(2, 1, C("ບ້ານດອນກອຍ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫລວງວຽງຈັນ", sPlain(false)));
  S(2, 13, C(toExcelDate(new Date().toISOString().slice(0, 10)), sDateTop()));

  // ── R4: Title (merge A:N) ────────────────────────────────────────────
  S(3, 0, C(`ສະຫລຸບການຈ່າຍລາງວັນຫວຍ Quota ${quotaLabel} ຜ່ານ BCEL, ປະຈຳເດືອນ ${monthLabel}`, sTitle()));
  for (let c = 1; c <= 13; c++) S(3, c, CE(sTitle()));
  M(3, 0, 3, 13);

  // ── R5: "ລາງວັນໂປຣໂມຊັ່ນ" band over promo cols ───────────────────────
  S(4, 14, C("ລາງວັນໂປຣໂມຊັ່ນ", sPromoBand()));
  for (let c = 15; c <= lastCol; c++) S(4, c, CE(sPromoBand()));
  M(4, 14, 4, lastCol);

  // ── R6-7: Table headers ──────────────────────────────────────────────
  const mainHeaders = ["Draw_Date", "Draw_ID", "Quota", "Payment_Channel", ...MAIN_COLS.map(([, l]) => l)];
  mainHeaders.forEach((h, i) => {
    S(5, i, C(h, sHeaderMain()));
    S(6, i, CE(sHeaderMain()));
    M(5, i, 6, i);
  });
  PROMO_COLS.forEach(([, label, key], i) => {
    const c = 14 + i;
    S(5, c, C(label, sHeaderPromo()));
    S(6, c, C(key, sHeaderPromoKey()));
  });

  // ── R8+: Data rows ────────────────────────────────────────────────────
  const totals: Record<NumericCol, number> = ALL_COLS.reduce((acc, [k]) => ({ ...acc, [k]: 0 }), {} as Record<NumericCol, number>);
  let r = 7;
  for (const row of rows) {
    S(r, 0, row.DRAW_DATE ? C(toExcelDate(row.DRAW_DATE), sDataDate()) : CE(sDataDate()));
    S(r, 1, C(row.DRAW_ID, sDataC()));
    S(r, 2, C(row.QUOTA, sDataC()));
    S(r, 3, C(row.PAYMENT_CHANNEL, sDataC()));
    ALL_COLS.forEach(([key], i) => {
      const v = Number(row[key]) || 0;
      totals[key] += v;
      S(r, 4 + i, C(v, sDataN()));
    });
    r += 1;
  }

  // ── Total row ─────────────────────────────────────────────────────────
  const rTotal = r;
  S(rTotal, 0, C("Total", sTotalLabel()));
  for (let c = 1; c <= 3; c++) S(rTotal, c, CE(sTotalLabel()));
  ALL_COLS.forEach(([key], i) => S(rTotal, 4 + i, C(totals[key], sTotalN())));

  // ── ສະຫລຸບລາງວັນ block ────────────────────────────────────────────────
  const rewardAfterTaxPlusBonus = totals.REWARD_AFTER_TAX + totals.TOTAL_BONUS;
  let rs = rTotal + 2;
  S(rs, 0, C("ສະຫລຸບລາງວັນ:", sSummaryLabel(true))); rs += 1;
  S(rs, 0, C("ລວມລາງວັນ", sSummaryLabel())); S(rs, 4, C(totals.TOTAL_REWARD, sSummaryN())); rs += 1;
  S(rs, 0, C("ອາກອນລາງວັນ 5%", sSummaryLabel())); S(rs, 4, C(totals.TAX_REWARD, sSummaryN())); rs += 1;
  S(rs, 0, C("ຈ່າຍລາງວັນຫລັງຫັກອາກອນ 5%", sSummaryLabel())); S(rs, 4, C(totals.REWARD_AFTER_TAX, sSummaryN())); rs += 1;
  S(rs, 0, C("ລາງວັນ ໂປຣໂມຊັ່ນ/Bonus", sSummaryLabel())); S(rs, 4, C(totals.TOTAL_BONUS, sSummaryN())); rs += 1;
  S(rs, 0, C("ລວມຍອດຈ່າຍລາງວັນຜ່ານ BCEL", sSummaryLabel(true))); S(rs, 4, C(rewardAfterTaxPlusBonus, sSummaryN(true))); rs += 1;

  // ── Metadata ──────────────────────────────────────────────────────────
  const colWidths = [
    { wch: 11 }, { wch: 9 }, { wch: 8 }, { wch: 14 },
    ...MAIN_COLS.map(() => ({ wch: 15 })),
    ...PROMO_COLS.map(() => ({ wch: 13 })),
  ];
  ws["!cols"] = colWidths;
  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: rs, c: lastCol });

  return ws;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Export both Quota SCN and Quota Sokxay as two sheets in one workbook,
 * matching the layout of the source "Reward_SCN_-_MM-YYYY.xlsx" template.
 */
export async function exportScnRewardQuota(
  scnRows: QuotaRewardRow[],
  sokxayRows: QuotaRewardRow[],
  monthLabel: string, // e.g. "08/2026"
): Promise<void> {
  const wb = XLSXStyle.utils.book_new();
  const wsScn = buildSheet("SCN", monthLabel, scnRows);
  const wsSokxay = buildSheet("SOKXAY", monthLabel, sokxayRows);
  const monthTag = monthLabel.replace("/", "-");
  XLSXStyle.utils.book_append_sheet(wb, wsScn, `Reward Quota SCN_${monthTag}`.slice(0, 31));
  XLSXStyle.utils.book_append_sheet(wb, wsSokxay, `Reward Quota Sokxay_${monthTag}`.slice(0, 31));
  XLSXStyle.writeFile(wb, `Reward_SCN_-_${monthTag}.xlsx`);
}

/** Fetch rows for a single quota (SCN | SOKXAY) over an optional date range. */
export async function fetchScnRewardQuota(
  quota: "SCN" | "SOKXAY",
  dateFrom: string,
  dateTo: string,
): Promise<QuotaRewardRow[]> {
  const qs = new URLSearchParams({ view: "scn_reward_quota", quota });
  if (dateFrom) qs.set("date_from", dateFrom);
  if (dateTo)   qs.set("date_to",   dateTo);
  const res = await fetch(`/api/oracle?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
  return Array.isArray(json.rows) ? json.rows : [];
}
