"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw, Search, AlertCircle, BarChart3,
  Printer, X, Filter, FileSpreadsheet,
} from "lucide-react";
import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ══════════════════════════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════════════════════════

interface JdbRow {
  "ງວດ":           string | number;
  "ລາງວັນ Sokxay": string | number;
  "ໂຊກຊ້ອນໂຊກ":    string | number;
  "ທຳນຽມ":         string | number;
  "ໂຊກ Spin":      string | number;
}

interface JdbTaxRow {
  BANK_DATE: string;
  DRAWID:    string | number;
  BANK_CR:   number;
}

interface JdbOtherRow {
  TXN_TYPE:         string;
  BANK_DESCRIPTION: string;
  BANK_DATE:        string;
  BANK_DR:          number;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Excel Export (xlsx-js-style)
//  Cols A–G (0–6):
//    A=ລຳດັບ  B=ງວດທີ  C=ລາງວັນ  D=ໂຊກຊ້ອນໂຊກ  E=ທຳນຽມ  F=ໂຊກSpin  G=ອາກອນ5%
// ══════════════════════════════════════════════════════════════════════════════

const FONT      = "Phetsarath OT";
const BG_HEADER = "9DC3E6";
const BG_TOTAL  = "BDD7EE";
const BG_OTHER  = "FFF2CC";
const LAST_COL  = 6; // G

type BSide = { color: CellStyleColor; style?: BorderType };
const thin    = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
const allThin = (): CellStyle["border"] => ({ left:thin(), right:thin(), top:thin(), bottom:thin() });

const sTitle = (sz = 12, bold = false): CellStyle => ({
  font:      { name: FONT, sz, bold },
  alignment: { horizontal: "center", vertical: "center" },
});
const sHeader = (sz = 11): CellStyle => ({
  font:      { name: FONT, bold: true, sz },
  fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border:    allThin(),
});
const sData = (align: "center" | "right" = "right"): CellStyle => ({
  font:      { name: FONT, sz: 11 },
  alignment: { horizontal: align, vertical: "center" },
  numFmt:    "#,##0.00",
  border:    allThin(),
});
const sDataText = (align: "center" | "left" = "center"): CellStyle => ({
  font:      { name: FONT, sz: 11 },
  alignment: { horizontal: align, vertical: "center" },
  border:    allThin(),
});
const sSum = (): CellStyle => ({
  font:      { name: FONT, bold: true, sz: 11 },
  fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
  alignment: { horizontal: "center", vertical: "center" },
  numFmt:    "#,##0.00",
  border:    allThin(),
});
const sTotalLabel = (): CellStyle => ({
  font:      { name: FONT, bold: true, sz: 12 },
  fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
  alignment: { horizontal: "center", vertical: "center" },
  border:    allThin(),
});
const sTotalValue = (): CellStyle => ({
  font:      { name: FONT, bold: true, sz: 12 },
  fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
  alignment: { horizontal: "center", vertical: "center" },
  numFmt:    "#,##0.00",
  border:    allThin(),
});
const sOtherLabel = (): CellStyle => ({
  font:      { name: FONT, sz: 10, italic: true, color: { rgb: "5C4A00" } },
  fill:      { patternType: "solid", fgColor: { rgb: BG_OTHER } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border:    allThin(),
});
const sOtherValue = (): CellStyle => ({
  font:      { name: FONT, sz: 10, bold: true, color: { rgb: "7B5C00" } },
  fill:      { patternType: "solid", fgColor: { rgb: BG_OTHER } },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt:    "#,##0.00",
  border:    allThin(),
});

/** ຕາລາງຄ່າ (string ຫຼື number) */
const C  = (v: string | number, s: CellStyle): CellObject =>
  ({ v, t: typeof v === "number" ? "n" : "s", s } as CellObject);

/** ຕາລາງຫວ່າງ */
const CE = (s: CellStyle): CellObject =>
  ({ v: "", t: "s", s } as CellObject);

/** ຕາລາງສູດ Excel — v ໃຊ້ເປັນ cached value, f ເປັນ formula string */
const CF = (v: number, formula: string, s: CellStyle): CellObject =>
  ({ v, f: formula, t: "n", s } as CellObject);

function parseNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/,/g, "")) || 0;
}

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

const MONTH_LAO: Record<number, string> = {
  1:"ມັງກອນ",2:"ກຸມພາ",3:"ມີນາ",4:"ເມສາ",5:"ພຶດສະພາ",6:"ມິຖຸນາ",
  7:"ກໍລະກົດ",8:"ສິງຫາ",9:"ກັນຍາ",10:"ຕຸລາ",11:"ພະຈິກ",12:"ທັນວາ",
};
function monthLabel(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `ເດືອນ ${MONTH_LAO[d.getMonth()+1] ?? ""} ${d.getFullYear()}`;
}

function buildSheet(
  dateDisplay: string,
  dataRows:    JdbRow[],
  taxItems:    JdbTaxRow[],
  otherItems:  JdbOtherRow[],
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
  };
  const M = (r1: number, c1: number, r2: number, c2: number) => {
    merges.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} });
  };

  // ── Rows 1-4: Title ───────────────────────────────────────────────────────
  S(0,0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",                      sTitle(12)));
  S(1,0, C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",      sTitle(12)));
  S(2,0, C(`ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (JDB) ວັນທີ ${dateDisplay}`, sTitle(12, true)));
  S(3,0, CE(sTitle()));
  M(0,0, 0,LAST_COL); M(1,0, 1,LAST_COL); M(2,0, 2,LAST_COL); M(3,0, 3,LAST_COL);

  // ── Row 5: Group headers ──────────────────────────────────────────────────
  S(4,0, C("ລຳດັບ",                    sHeader(11)));
  S(4,1, C("ງວດທີ",                    sHeader(12)));
  S(4,2, C("ການຈ່າຍລາງວັນແອັບ Sokxay", sHeader(12)));
  for (let c = 3; c <= 5; c++) S(4,c, CE(sHeader(12)));
  S(4,6, C("ອາກອນ 5%",                 sHeader(12)));
  M(4,0, 5,0); M(4,1, 5,1); M(4,2, 4,5); M(4,6, 5,6);

  // ── Row 6: Sub-headers ────────────────────────────────────────────────────
  S(5,0, CE(sHeader(11))); S(5,1, CE(sHeader(12)));
  S(5,2, C("ລາງວັນ",     sHeader(11)));
  S(5,3, C("ໂຊກຊ້ອນໂຊກ", sHeader(11)));
  S(5,4, C("ທຳນຽມ",      sHeader(11)));
  S(5,5, C("ໂຊກ Spin",   sHeader(11)));
  S(5,6, CE(sHeader(11)));

  // ── Data rows ─────────────────────────────────────────────────────────────
  const actualRows    = Math.max(dataRows.length, taxItems.length);
  const MIN_ROWS      = actualRows < 5 ? 2 : 0;
  const totalDataRows = Math.max(actualRows, MIN_ROWS);

  // Excel row numbers (1-based) for formula ranges
  // Row index 6 = Excel row 7 (first data row)
  const firstDataExcelRow = 7;
  const lastDataExcelRow  = 6 + totalDataRows; // row index 6+n-1 → Excel row 6+n

  const numCell = (v: number): CellObject =>
    v === 0 ? CE(sData("right")) : C(v, sData("right"));

  // Pre-calculate sums (used as cached values inside CF)
  let sumC=0, sumD=0, sumE=0, sumF=0;
  for (const dr of dataRows) {
    sumC += parseNum(dr["ລາງວັນ Sokxay"]);
    sumD += parseNum(dr["ໂຊກຊ້ອນໂຊກ"]);
    sumE += parseNum(dr["ທຳນຽມ"]);
    sumF += parseNum(dr["ໂຊກ Spin"]);
  }
  const sumI = taxItems.reduce((s,t) => s + t.BANK_CR, 0);

  for (let i = 0; i < totalDataRows; i++) {
    const r  = 6 + i;
    const dr = dataRows[i] ?? null;
    const tx = taxItems[i] ?? null;

    if (dr) {
      S(r,0, C(i+1, {
        font:      { name:FONT, sz:11 },
        alignment: { horizontal:"center", vertical:"center" },
        border:    allThin(),
      }));
      S(r,1, C(String(dr["ງວດ"]),                    sDataText("center")));
      S(r,2, numCell(parseNum(dr["ລາງວັນ Sokxay"])));
      S(r,3, numCell(parseNum(dr["ໂຊກຊ້ອນໂຊກ"])));
      S(r,4, numCell(parseNum(dr["ທຳນຽມ"])));
      S(r,5, numCell(parseNum(dr["ໂຊກ Spin"])));
    } else {
      S(r,0, CE({ font:{ name:FONT, sz:11 }, border:allThin() }));
      for (let c = 1; c <= 5; c++) S(r,c, CE(sData("right")));
    }
    S(r,6, tx && tx.BANK_CR !== 0
      ? C(tx.BANK_CR, sData("right"))
      : CE(sData("right")));
  }

  // ── Sum row (ໃຊ້ສູດ SUM) ──────────────────────────────────────────────────
  const rSum      = 6 + totalDataRows;
  const rSumExcel = rSum + 1; // 1-based Excel row of the sum row

  S(rSum,0, CE(sSum()));
  S(rSum,1, CE(sSum()));
  S(rSum,2, CF(sumC, `SUM(C${firstDataExcelRow}:C${lastDataExcelRow})`, sSum()));
  S(rSum,3, CF(sumD, `SUM(D${firstDataExcelRow}:D${lastDataExcelRow})`, sSum()));
  S(rSum,4, CF(sumE, `SUM(E${firstDataExcelRow}:E${lastDataExcelRow})`, sSum()));
  S(rSum,5, CF(sumF, `SUM(F${firstDataExcelRow}:F${lastDataExcelRow})`, sSum()));
  S(rSum,6, CF(sumI, `SUM(G${firstDataExcelRow}:G${lastDataExcelRow})`, sSum()));
  M(rSum,0, rSum,1);

  // ── Grand-total row (ສູດອ້າງ sum row, merge C:G) ──────────────────────────
  const rTot  = rSum + 1;
  const grand = sumC + sumD + sumE + sumF;

  S(rTot,0, C("ລວມຈ່າຍທັງໝົດ", sTotalLabel()));
  S(rTot,1, CE(sTotalLabel()));
  // formula: sum the four prize-type columns from the sum row
  S(rTot,2, CF(
    grand,
    `C${rSumExcel}+D${rSumExcel}+E${rSumExcel}+F${rSumExcel}`,
    sTotalValue(),
  ));
  S(rTot,3, CE(sTotalValue()));
  S(rTot,4, CE(sTotalValue()));
  S(rTot,5, CE(sTotalValue()));
  S(rTot,6, CE(sTotalValue()));   // G ຢູ່ໃນ merge ດ້ວຍ
  M(rTot,0, rTot,1);
  M(rTot,2, rTot,6);              // ← C:G (ເດີມ C:F, ແກ້ໃຫ້ຄົບທຸກຖັນ)

  // ── Other TXN_TYPE rows ────────────────────────────────────────────────────
  let rOther = rTot + 1;
  for (const oth of otherItems) {
    const label = `[${oth.TXN_TYPE}] ${oth.BANK_DESCRIPTION} (${oth.BANK_DATE})`;
    const oBg: CellStyle = {
      font:   { name:FONT, sz:10 },
      fill:   { patternType:"solid", fgColor:{ rgb:BG_OTHER } },
      border: allThin(),
    };
    S(rOther,0, CE(oBg));
    S(rOther,1, C(label, sOtherLabel()));
    for (let c = 2; c <= 5; c++) S(rOther,c, CE(oBg));
    S(rOther,6, C(oth.BANK_DR, sOtherValue()));
    M(rOther,1, rOther,5);
    rOther++;
  }

  // ── Signature section ─────────────────────────────────────────────────────
  // 7 blank spacer rows (ເພີ່ມຈາກ 3 → 7 ເພື່ອລະຍະຫ່າງ) → sig-line → sig-label
  const rSigLine  = rOther + 7;
  const rSigLabel = rSigLine + 1;

  const sSigLine: CellStyle = {
    font:      { name: FONT, sz: 11 },
    alignment: { horizontal: "center", vertical: "bottom" },
  };
  const sSigLabel: CellStyle = {
    font:      { name: FONT, sz: 11, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const sSigEmpty: CellStyle = { font: { name: FONT, sz: 11 } };

  // sig line row: A-C merged | D spacer | E-G merged
  S(rSigLine,0, CE(sSigLine)); S(rSigLine,1, CE(sSigLine)); S(rSigLine,2, CE(sSigLine));
  S(rSigLine,3, CE(sSigEmpty));
  S(rSigLine,4, CE(sSigLine)); S(rSigLine,5, CE(sSigLine)); S(rSigLine,6, CE(sSigLine));
  M(rSigLine,0, rSigLine,2); M(rSigLine,4, rSigLine,6);

  // sig label row
  S(rSigLabel,0, C("ຜູ້ສະຫຼຸບ", sSigLabel));
  S(rSigLabel,1, CE(sSigLabel)); S(rSigLabel,2, CE(sSigLabel));
  S(rSigLabel,3, CE(sSigEmpty));
  S(rSigLabel,4, C("ຜູ້ກວດ", sSigLabel));
  S(rSigLabel,5, CE(sSigLabel)); S(rSigLabel,6, CE(sSigLabel));
  M(rSigLabel,0, rSigLabel,2); M(rSigLabel,4, rSigLabel,6);

  // ── Column widths ─────────────────────────────────────────────────────────
  ws["!cols"] = [
    {wch:  5.82},  // A ລຳດັບ
    {wch: 11.82},  // B ງວດທີ
    {wch: 16.82},  // C ລາງວັນ
    {wch: 16.82},  // D ໂຊກຊ້ອນໂຊກ
    {wch: 16.82},  // E ທຳນຽມ
    {wch: 16.82},  // F ໂຊກ Spin
    {wch: 16.82},  // G ອາກອນ 5%
  ];

  // ── Row heights ───────────────────────────────────────────────────────────
  ws["!rows"] = [
    {hpt:15.0},{hpt:15.0},{hpt:15.75},{hpt:15.0},          // rows 1-4  title
    {hpt:29.25},{hpt:28.5},                                  // rows 5-6  headers
    ...Array.from({length:totalDataRows}, ()=>({hpt:22.0})), // data rows
    {hpt:32.0},                                              // sum row
    {hpt:40.0},                                              // grand total
    ...Array.from({length:otherItems.length}, ()=>({hpt:26.0})), // other rows
    ...Array.from({length:7}, ()=>({hpt:15.0})),             // 7 spacer rows (ເດີມ 3)
    {hpt:28.0},                                              // sig line
    {hpt:20.0},                                              // sig label
  ];

  // ── Page setup: A4 portrait, fit to 1 page wide ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!pageSetup"] = {
    paperSize:   9,          // A4
    orientation: "portrait",
    fitToPage:   true,
    fitToWidth:  1,          // ໃຫ້ພໍດີ 1 ໜ້າ width
    fitToHeight: 0,          // ຄວາມສູງ auto
    scale:       100,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!margins"] = {
    left:   0.197, right:  0.197,
    top:    0.394, bottom: 0.394,
    header: 0.118, footer: 0.118,
  };

  // ── Print area ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!printHeader"] = "";

  ws["!merges"] = merges;
  ws["!ref"]    = XLSXStyle.utils.encode_range(
    { r:0, c:0 },
    { r:rSigLabel, c:LAST_COL },
  );
  return ws;
}

async function exportJdbReward(
  rows:       JdbRow[],
  taxItems:   JdbTaxRow[],
  otherItems: JdbOtherRow[],
  dateFrom:   string,
  dateTo:     string,
): Promise<void> {
  const dataRows    = rows.filter(r => String(r["ງວດ"]) !== "ລວມທັງໝົດ");
  const dateDisplay = dateFrom === dateTo
    ? fmtDate(dateFrom)
    : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  const ws = buildSheet(dateDisplay, dataRows, taxItems, otherItems);
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(
    wb, ws,
    (monthLabel(dateFrom) || "JDB Report").slice(0,31),
  );
  XLSXStyle.writeFile(wb, `JDB_Reward_${dateFrom||"all"}_to_${dateTo||"all"}.xlsx`);
}

async function fetchJdbTax5Rows(dateFrom: string, dateTo: string): Promise<JdbTaxRow[]> {
  const qs = new URLSearchParams({view:"jdb_tax5_items"});
  if (dateFrom) qs.set("date_from", dateFrom);
  if (dateTo)   qs.set("date_to",   dateTo);
  const res  = await fetch(`/api/oracle?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "ດຶງ JDB Tax5 ລົ້ມເຫຼວ");
  return Array.isArray(json.rows) ? json.rows : [];
}

async function fetchJdbOtherRows(dateFrom: string, dateTo: string): Promise<JdbOtherRow[]> {
  const qs = new URLSearchParams({view:"jdb_other_items"});
  if (dateFrom) qs.set("date_from", dateFrom);
  if (dateTo)   qs.set("date_to",   dateTo);
  const res  = await fetch(`/api/oracle?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "ດຶງ JDB Other Items ລົ້ມເຫຼວ");
  return Array.isArray(json.rows) ? json.rows : [];
}

// ══════════════════════════════════════════════════════════════════════════════
//  Print CSS
// ══════════════════════════════════════════════════════════════════════════════

const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 10mm 8mm 20mm 8mm; }

    @page {
      @bottom-center {
        content: "ໜ້າ " counter(page) " / " counter(pages);
        font-size: 9px;
        font-family: 'Phetsarath OT', 'Phetsarath', sans-serif;
        color: #000;
      }
    }

    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100%; overflow: visible; padding: 0; box-sizing: border-box; }
    .no-print { display: none !important; }

    * {
      font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important;
      color: #000 !important;
      box-shadow: none !important;
      text-shadow: none !important;
      border-radius: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-area div {
      border-radius: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
      background-color: #fff !important;
    }

    table {
      font-size: 7.5px !important;
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      box-shadow: none !important;
      background: #fff !important;
    }

    th, td {
      padding: 2px 3px !important;
      font-size: 7.5px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border: 1px solid #000 !important;
      color: #000 !important;
      background: #fff !important;
      background-color: #fff !important;
      box-shadow: none !important;
    }

    thead tr th, thead th {
      background: #d0d0d0 !important;
      background-color: #d0d0d0 !important;
      color: #000 !important;
      font-weight: bold !important;
      text-align: center !important;
      border: 1px solid #000 !important;
    }

    th.group-header {
      background: #bdd7ee !important;
      background-color: #bdd7ee !important;
    }

    tr.total-row td {
      background: #d0d0d0 !important;
      background-color: #d0d0d0 !important;
      font-weight: bold !important;
      border: 1px solid #000 !important;
    }

    tr.grand-total-row td {
      background: #bdd7ee !important;
      background-color: #bdd7ee !important;
      font-weight: bold !important;
      border: 2px solid #000 !important;
    }

    tr.other-row td {
      background: #fff2cc !important;
      background-color: #fff2cc !important;
      font-style: italic !important;
      border: 1px solid #000 !important;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
    .overflow-x-auto { overflow: visible !important; }

    .print-signature {
      display: flex !important;
      justify-content: space-around;
      margin-top: 20mm;
      page-break-inside: avoid;
    }
    .print-signature .sig-box { text-align: center; width: 160px; }
    .print-signature .sig-line {
      border-top: 1px solid #000 !important;
      margin-top: 15mm;
      padding-top: 4px;
      font-size: 10px;
    }
    .print-signature .sig-role { font-size: 9px; margin-top: 2px; }
  }
`;

// ══════════════════════════════════════════════════════════════════════════════
//  Component
// ══════════════════════════════════════════════════════════════════════════════

const isTotal = (row: JdbRow) => row["ງວດ"] === "ລວມທັງໝົດ";

export default function JdbRewardSummaryPage() {
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [rows,        setRows]        = useState<JdbRow[]>([]);
  const [taxItems,    setTaxItems]    = useState<JdbTaxRow[]>([]);
  const [otherItems,  setOtherItems]  = useState<JdbOtherRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [printTime,   setPrintTime]   = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({view:"jdb_reward_summary"});
      if (from) qs.set("date_from", from);
      if (to)   qs.set("date_to",   to);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
      const tax    = await fetchJdbTax5Rows(from, to);
      const others = await fetchJdbOtherRows(from, to);
      setTaxItems(tax);
      setOtherItems(others);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setHasSearched(true);
    fetchData(dateFrom, dateTo);
  };

  const handleClear = () => {
    setDateFrom(""); setDateTo("");
    setAppliedFrom(""); setAppliedTo("");
    setHasSearched(false);
    setRows([]); setTaxItems([]); setOtherItems([]); setError(null);
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportJdbReward(rows, taxItems, otherItems, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const allDataRows = useMemo(() => rows.filter(r => !isTotal(r)), [rows]);
  const totalRow    = useMemo(() => rows.find(r => isTotal(r)),    [rows]);

  const dataRows = useMemo(() => {
    const maxLen = Math.max(allDataRows.length, taxItems.length);
    return Array.from({length: maxLen}, (_, i) => ({
      row: allDataRows[i] ?? null,
      tx:  taxItems[i]    ?? null,
      idx: i,
    })).filter(({row, tx}) => {
      const hasRow = row ? !!row["ງວດ"] : false;
      const hasTx  = tx  ? tx.BANK_CR !== 0 : false;
      return hasRow || hasTx;
    });
  }, [allDataRows, taxItems]);

  const hasData   = hasSearched && (dataRows.length > 0 || otherItems.length > 0);
  const hasFilter = dateFrom || dateTo;

  const tax5Total = useMemo(() => taxItems.reduce((s,t) => s + t.BANK_CR, 0), [taxItems]);

  const parseN = (v: string | number | null | undefined) =>
    parseFloat(String(v ?? "0").replace(/,/g, "")) || 0;

  const grandTotal = useMemo(() => {
    if (!totalRow) return 0;
    return (
      parseN(totalRow["ລາງວັນ Sokxay"]) +
      parseN(totalRow["ທຳນຽມ"]) +
      parseN(totalRow["ໂຊກຊ້ອນໂຊກ"]) +
      parseN(totalRow["ໂຊກ Spin"])
    );
  }, [totalRow]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {minimumFractionDigits:0, maximumFractionDigits:0});

  const fmtVal = (v: string | number | null | undefined): string => {
    if (v == null || v === "") return "";
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    if (isNaN(n) || n === 0) return "";
    return fmt(n);
  };

  const TH  = "px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-orange-50 border border-black text-[10px]";
  const THG = "px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-100 border border-black text-[10px]";
  const TD  = "px-2 py-1.5 text-right font-mono border border-black text-[10px] whitespace-nowrap";
  const TDC = "px-2 py-1.5 text-center font-mono border border-black text-[10px]";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* ── Screen Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <BarChart3 size={18} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ສະຫຼຸບລາງວັນ JDB — JDB_STMT
              </h1>
              <p className="text-xs text-slate-400">ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນ ຈຳແນກຕາມງວດ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 transition"
                >
                  {exporting
                    ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</>
                    : <><FileSpreadsheet size={13} /> Export Excel</>}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
                >
                  <Printer size={13} /> ພິມ A4
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Filter ─────────────────────────────────────────────────────── */}
        <div className="no-print bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-orange-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈາກ (BANK_TXN_DATE)</label>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຫາ (BANK_TXN_DATE)</label>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 transition"
            >
              {loading
                ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <X size={12} /> ລ້າງ
              </button>
            )}
            {hasSearched && (
              <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
                {loading ? "ກໍາລັງດຶງ..." : `${allDataRows.length.toLocaleString()} ງວດ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print Header ───────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2">
          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-start"}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sokxay.png"
              alt="Company Logo"
              style={{height:"48px", width:"auto", objectFit:"contain"}}
            />
            <p style={{fontSize:"9px", color:"#888", margin:"2px 0 0 2px", whiteSpace:"nowrap"}}>
              ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            </p>
          </div>
        </div>

        {/* ── Print title ────────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2" style={{textAlign:"center"}}>
          <div style={{fontSize:"13px", fontWeight:"bold"}}>
            ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
          </div>
          <div style={{fontSize:"11px"}}>
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ
          </div>
          <h1 style={{fontSize:"14px", fontWeight:"bold", margin:"4px 0 0 0"}}>
            ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນ JDB
          </h1>
          {(appliedFrom || appliedTo) && (
            <div style={{marginTop:"3px", fontSize:"10px", color:"#555"}}>
              ວັນທີ: {appliedFrom || ""} ຫາ {appliedTo || ""}
            </div>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">
                ເລືອກວັນທີ ແລ້ວກົດ{" "}
                <span className="font-semibold text-orange-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}  rowSpan={2}>ລຳດັບ</th>
                    <th className={TH}  rowSpan={2}>ງວດທີ</th>
                    <th className={THG} colSpan={4}>ການຈ່າຍລາງວັນແອັບ Sokxay</th>
                    <th className={TH}  rowSpan={2}>ອາກອນ 5%</th>
                  </tr>
                  <tr>
                    <th className={TH}>ລາງວັນ</th>
                    <th className={TH}>ໂຊກຊ້ອນໂຊກ</th>
                    <th className={TH}>ທຳນຽມ</th>
                    <th className={TH}>ໂຊກ Spin</th>
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map(({row, tx}, i) => (
                    <tr key={i} className="hover:bg-orange-50">
                      <td className={TDC}>{i + 1}</td>
                      <td className={TDC + " text-orange-700 font-semibold"}>{row?.["ງວດ"] ?? ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ລາງວັນ Sokxay"])  : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ໂຊກຊ້ອນໂຊກ"])     : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ທຳນຽມ"])           : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ໂຊກ Spin"])        : ""}</td>
                      <td className={TD}>{tx  ? fmtVal(tx.BANK_CR)             : ""}</td>
                    </tr>
                  ))}

                  {/* SUM row */}
                  {totalRow && (
                    <tr className="total-row bg-gray-200 font-bold">
                      <td className={TDC + " bg-gray-200 font-bold"} colSpan={2}>ລວມທັງໝົດ</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ລາງວັນ Sokxay"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ໂຊກຊ້ອນໂຊກ"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ທຳນຽມ"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ໂຊກ Spin"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(tax5Total)}</td>
                    </tr>
                  )}

                  {/* Grand total row */}
                  {totalRow && grandTotal > 0 && (
                    <tr className="grand-total-row bg-blue-100 font-bold">
                      <td className="px-3 py-2 text-left font-bold border border-black text-[11px] bg-blue-100" colSpan={2}>
                        ລວມຈ່າຍທັງໝົດ
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold border border-black text-[11px] bg-blue-100" colSpan={5}>
                        {fmt(grandTotal)}
                      </td>
                    </tr>
                  )}

                  {/* Other TXN_TYPE rows */}
                  {otherItems.length > 0 && otherItems.map((oth, i) => (
                    <tr key={`other-${i}`} className="other-row bg-yellow-50 italic">
                      <td className={TDC + " bg-yellow-50 text-slate-400 text-[9px]"}></td>
                      <td
                        className="px-2 py-1.5 text-left border border-black text-[10px] bg-yellow-50 italic text-slate-600"
                        colSpan={5}
                      >
                        <span className="font-semibold text-amber-700 mr-1">[{oth.TXN_TYPE}]</span>
                        {oth.BANK_DESCRIPTION}
                        <span className="text-[9px] text-slate-400 ml-1">({oth.BANK_DATE})</span>
                      </td>
                      <td className={TD + " bg-yellow-50 font-semibold text-amber-800"}>
                        {fmtVal(oth.BANK_DR)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Signature (print only) ─────────────────────────────────────── */}
        {hasData && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສະຫຼຸບ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ກວດ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}