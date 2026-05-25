// lib/ExportPayout.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານ ການຈ່າຍເງິນ — ສັງລວມຕາມງວດ (LOTLINK_PAYOUT)
//  xlsx-js-style@1.2.0
//
//  Layout:
//  R1     = ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ            (merged A:E)
//  R2     = ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ (merged A:E)
//  R3     = ໃບສະຫຼຸບລາຍງານຈ່າຍພຸດທໍາຍ ປະຈຳງວດທີ + dates  (merged A:E)
//  R4     = blank
//  R5     = Table header: ລໍາດັບ | ງວດທີ | ຈໍານວນຍອດ | ລວມຍອດເງິນ | ອາກອນ5%ໃຫ້ໃນລະບຽບ
//  R6+    = Data rows (DRAW_ID, TOTAL_COUNT, TOTAL_AMOUNT, empty)
//  RSum   = ລາຍຈ່າຍຕໍ່ຈຶ່ງ  (merged A:B, C=count, D=amount, E=empty)
//  RTax   = ອາກອນ 5%        (merged A:C, D="-",  E=empty)
//  RTotal = ລວມລາຍຈ່າຍໃຫ້ໃນລະບຽບ (merged A:C, D=amount, E=empty)
//  blank
//  RSig   = ເຊັນຜູ້ສະຫຼຸບ | ເຊັນຜູ້ຮັບທີ 2 | ເຊັນຜູ້ຮັບທີ 3
//  blank x2
//  RPayerTitle = "ລະບົບໃຫ້ໃໝ່"
//  RPayer+     = username | date1 | date2 | ...
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
    type CellObject,
    type CellStyle,
    type CellStyleColor,
    type BorderType,
    type WorkSheet,
  } from "xlsx-js-style";
  
  // ── Types ─────────────────────────────────────────────────────────────────────
  
  export interface PayoutDrawRow {
    DRAW_ID:      number;
    TOTAL_AMOUNT: number;
    TOTAL_COUNT:  number;
  }
  
  /** payerMap: { "username": ["2025-01-01", "2025-01-15", ...] } */
  export type PayerMap = Record<string, string[]>;
  
  // ── Constants ─────────────────────────────────────────────────────────────────
  
  const FONT      = "Phetsarath OT";
  const BG_HEADER = "9DC3E6";  // light blue — header row
  const BG_SUM    = "BDD7EE";  // lighter blue — ລາຍຈ່າຍຕໍ່ຈຶ່ງ & ລວມລາຍຈ່າຍ
  const LAST_COL  = 4;         // E (index 4) — main table
  
  // ── Border helpers ────────────────────────────────────────────────────────────
  
  type BSide = { color: CellStyleColor; style?: BorderType };
  
  const thin   = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
  const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
  const thick  = (): BSide => ({ style: "thick",  color: { rgb: "000000" } });
  
  const allThin  = (): CellStyle["border"] => ({ left:thin(), right:thin(), top:thin(), bottom:thin() });
  const medLeft  = (): CellStyle["border"] => ({ left:medium(), right:thin(), top:thin(), bottom:thin() });
  
  // ── Style builders ────────────────────────────────────────────────────────────
  
  function sTitle(sz = 12, bold = false): CellStyle {
    return {
      font:      { name: FONT, sz, bold },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  
  function sHeader(sz = 11): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz },
      fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border:    allThin(),
    };
  }
  
  function sData(align: "center" | "right" | "left" = "right", leftMed = false): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: align, vertical: "center" },
      numFmt:    "#,##0",
      border:    leftMed ? medLeft() : allThin(),
    };
  }
  
  function sDataText(align: "center" | "left" = "center"): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: align, vertical: "center" },
      border:    allThin(),
    };
  }
  
  function sSum(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_SUM } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "#,##0",
      border:    allThin(),
    };
  }
  
  function sSumLabel(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_SUM } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    allThin(),
    };
  }
  
  function sTotalLabel(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_SUM } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    { bottom: thick() },
    };
  }
  
  function sTotalValue(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_SUM } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "#,##0",
      border:    { bottom: thick() },
    };
  }
  
  function sSig(): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  
  function sPayerUser(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
  
  function sPayerDate(): CellStyle {
    return {
      font:      { name: FONT, sz: 11, color: { rgb: "1D4ED8" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
  
  function sPayerTitle(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
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
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  
  // ── Sheet builder ─────────────────────────────────────────────────────────────
  
  function buildSheet(
    dateDisplay: string,
    dataRows:    PayoutDrawRow[],
    payerMap:    PayerMap,
    printedBy:   string,
  ): WorkSheet {
    const ws: WorkSheet = {};
    const merges: XLSXStyle.Range[] = [];
  
    const S = (r: number, c: number, cl: CellObject) => {
      ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
    };
    const M = (r1: number, c1: number, r2: number, c2: number) => {
      merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    };
  
    // ── R1-R3: Title ──────────────────────────────────────────────────────────
    S(0, 0, C("ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",                             sTitle(13, false)));
    S(1, 0, C("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",             sTitle(12)));
    S(2, 0, C(`ໃບສະຫຼຸບລາຍງານຈ່າຍພຸດທໍາຍ ປະຈຳງວດທີ  ${dateDisplay}`,          sTitle(13, true)));
    M(0, 0, 0, LAST_COL);
    M(1, 0, 1, LAST_COL);
    M(2, 0, 2, LAST_COL);
  
    // ── R4: blank ─────────────────────────────────────────────────────────────
    S(3, 0, CE(sTitle()));
    M(3, 0, 3, LAST_COL);
  
    // ── R5: Table header ──────────────────────────────────────────────────────
    // A=ລໍາດັບ, B=ງວດທີ, C=ຈໍານວນຍອດ, D=ລວມຍອດເງິນ, E=ອາກອນ5%ໃຫ້ໃນລະບຽບ
    S(4, 0, C("ລໍາດັບ",               sHeader(11)));
    S(4, 1, C("ງວດທີ",                sHeader(12)));
    S(4, 2, C("ຈໍານວນຍອດ",            sHeader(11)));
    S(4, 3, C("ລວມຍອດເງິນ",           sHeader(11)));
    S(4, 4, C("ອາກອນ5%ໃຫ້ໃນລະບົບ",  sHeader(11)));
  
    // ── R6+: Data rows ────────────────────────────────────────────────────────
    let sumCount  = 0;
    let sumAmount = 0;
    for (const dr of dataRows) {
      sumCount  += Number(dr.TOTAL_COUNT  ?? 0);
      sumAmount += Number(dr.TOTAL_AMOUNT ?? 0);
    }
  
    for (let i = 0; i < dataRows.length; i++) {
      const r  = 5 + i;
      const dr = dataRows[i];
      S(r, 0, C(i + 1,          { font:{name:FONT,sz:11}, alignment:{horizontal:"center",vertical:"center"}, border:medLeft() }));
      S(r, 1, C(String(dr.DRAW_ID),    sDataText("center")));
      S(r, 2, C(Number(dr.TOTAL_COUNT  ?? 0), sData("center")));
      S(r, 3, C(Number(dr.TOTAL_AMOUNT ?? 0), sData("right")));
      S(r, 4, CE(sData("right")));
    }
  
    // ── ລາຍຈ່າຍຕໍ່ຈຶ່ງ (grandtotal sum) ──────────────────────────────────────
    const rSum = 5 + dataRows.length;
    S(rSum, 0, C("ລາຍຈ່າຍຕົວຈິງ", sSumLabel()));
    S(rSum, 1, CE(sSumLabel()));
    S(rSum, 2, C(sumCount,  sSum()));
    S(rSum, 3, C(sumAmount, sSum()));
    S(rSum, 4, CE(sSumLabel()));
    M(rSum, 0, rSum, 1);
  
    // ── ອາກອນ 5% ──────────────────────────────────────────────────────────────
    const rTax = rSum + 1;
    S(rTax, 0, C("ອາກອນ5%", sSumLabel()));
    S(rTax, 1, CE(sSumLabel()));
    S(rTax, 2, CE(sSumLabel()));
    S(rTax, 3, C("-", { font:{name:FONT,sz:11}, fill:{ patternType:"solid", fgColor:{ rgb: BG_SUM } }, alignment:{horizontal:"right",vertical:"center"}, border:allThin() }));
    S(rTax, 4, CE(sSumLabel()));
    M(rTax, 0, rTax, 2);
  
    // ── ລວມລາຍຈ່າຍໃຫ້ໃນລະບຽບ ────────────────────────────────────────────────
    const rTotal = rTax + 1;
    S(rTotal, 0, C("ລວມລາຍຈ່າຍໃຫ້ໃນລະບົບ", sTotalLabel()));
    S(rTotal, 1, CE(sTotalLabel()));
    S(rTotal, 2, CE(sTotalLabel()));
    S(rTotal, 3, C(sumAmount, sTotalValue()));
    S(rTotal, 4, CE(sTotalLabel()));
    M(rTotal, 0, rTotal, 2);
  
    // ── Signature row (+2 from total) ────────────────────────────────────────
    const rSig = rTotal + 2;
    S(rSig, 0, C("ເຊັນຜູ້ສະຫຼຸບ",   sSig()));
    S(rSig, 2, C("ເຊັນຜູ້ຮັບທີ 2", sSig()));
    S(rSig, 4, C("ເຊັນຜູ້ຮັບທີ 3", sSig()));
  
    // ── Printed-by info ───────────────────────────────────────────────────────
    if (printedBy) {
      const rPrinter = rSig + 1;
      S(rPrinter, 0, C(`ຜູ້ພິມ: ${printedBy}`, {
        font:      { name: FONT, sz: 9, color: { rgb: "555555" } },
        alignment: { horizontal: "left", vertical: "center" },
      }));
      M(rPrinter, 0, rPrinter, LAST_COL);
    }
  
    // ── ລະບົບໃຫ້ໃໝ່ — payer block ────────────────────────────────────────────
    const payerUsers = Object.keys(payerMap);
    if (payerUsers.length > 0) {
      const rPayerTitle = rSig + 3;
      S(rPayerTitle, 0, C("ລະບົບໃຫ້ໃໝ່", sPayerTitle()));
      M(rPayerTitle, 0, rPayerTitle, LAST_COL);
  
      payerUsers.forEach((user, idx) => {
        const r     = rPayerTitle + 1 + idx;
        const dates = payerMap[user] ?? [];
        // username in col A
        S(r, 0, C(user, sPayerUser()));
        // dates spread horizontally from col B
        dates.forEach((date, di) => {
          S(r, 1 + di, C(date, sPayerDate()));
        });
      });
    }
  
    // ── Column widths ─────────────────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 7.0  }, // A: ລໍາດັບ
      { wch: 12.0 }, // B: ງວດທີ
      { wch: 16.0 }, // C: ຈໍານວນຍອດ
      { wch: 20.0 }, // D: ລວມຍອດເງິນ
      { wch: 22.0 }, // E: ອາກອນ5%
    ];
  
    // ── Row heights ───────────────────────────────────────────────────────────
    ws["!rows"] = [
      { hpt: 18.0 }, // R1 title
      { hpt: 16.0 }, // R2 subtitle
      { hpt: 20.0 }, // R3 doc title
      { hpt: 10.0 }, // R4 blank
      { hpt: 30.0 }, // R5 header
      ...Array.from({ length: dataRows.length }, () => ({ hpt: 22.0 })),
      { hpt: 26.0 }, // ລາຍຈ່າຍຕໍ່ຈຶ່ງ
      { hpt: 22.0 }, // ອາກອນ 5%
      { hpt: 28.0 }, // ລວມລາຍຈ່າຍ
      { hpt: 16.0 }, // blank
      { hpt: 20.0 }, // sig
    ];
  
    // ── Merges + ref ──────────────────────────────────────────────────────────
    ws["!merges"] = merges;
  
    const lastUsedRow = payerUsers.length > 0
      ? (rSig + 3 + 1 + payerUsers.length)
      : rSig + 2;
    ws["!ref"] = XLSXStyle.utils.encode_range(
      { r: 0, c: 0 },
      { r: lastUsedRow, c: LAST_COL },
    );
  
    return ws;
  }
  
  // ── Public API ─────────────────────────────────────────────────────────────────
  
  /**
   * exportPayout
   *
   * @param rows        - filtered data rows (DRAW_ID, TOTAL_COUNT, TOTAL_AMOUNT)
   * @param payerMap    - { username: [date1, date2, ...] } grouped unique dates
   * @param dateFrom    - "YYYY-MM-DD" start date (for filename + title)
   * @param dateTo      - "YYYY-MM-DD" end date
   * @param printedBy   - display name of logged-in user (optional)
   */
  export async function exportPayout(
    rows:      PayoutDrawRow[],
    payerMap:  PayerMap,
    dateFrom:  string,
    dateTo:    string,
    printedBy  = "",
  ): Promise<void> {
    const dateDisplay = !dateFrom && !dateTo
      ? ""
      : dateFrom === dateTo
        ? fmtDate(dateFrom)
        : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  
    const ws = buildSheet(dateDisplay, rows, payerMap, printedBy);
    const wb = XLSXStyle.utils.book_new();
    const sheetName = `Payout ${dateFrom || "all"}`.slice(0, 31);
    XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
    XLSXStyle.writeFile(wb, `Payout_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`);
  }