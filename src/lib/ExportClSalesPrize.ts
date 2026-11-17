// lib/ExportClSalesPrize.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານ ຍອດຂາຍ · ເງິນເຂົ້າບັນຊີ · ເງິນລາງວັນ (CL) — xlsx-js-style · 3 sheet
//    1) ລວມທັງໝົດ  — ທຸກງວດ + ສະຫລຸບຕາມກິດຈະກຳ (SUMIF)
//    2) ນ້ອງໝານຳໂຊກ
//    3) ປູປາເຕົ້າມະຫາໂຊກ
//  ຄ່າທຳນຽມ/ຫຼັງຫັກ/ສ່ວນຕ່າງ/ລວມ ເປັນ formula (ແກ້ອັດຕາຄ່າທຳນຽມໃນ cell B3 ໄດ້ໃນ Excel)
// ════════════════════════════════════════════════════════════════════════════
import XLSXStyle, { type CellObject, type CellStyle, type WorkSheet } from "xlsx-js-style";
import {
  SVC_LABEL,
  buildDrawRows,
  buildTotals,
  dayLabel,
  isOff,
  type SpRawRow,
  type SpUnassigned,
  type SvcFilter,
} from "./clSalesPrizeCore";

const FONT = "Phetsarath OT";
const thin = { style: "thin", color: { rgb: "000000" } } as const;
const BORDER = { left: thin, right: thin, top: thin, bottom: thin };

const fill = (rgb: string): CellStyle["fill"] => ({ patternType: "solid", fgColor: { rgb } });
const BG = { head: "D9D9D9", sales: "DDEBF7", prize: "E2EFDA", total: "BFBFBF" };

const sHead = (bg: string): CellStyle => ({
  font: { name: FONT, bold: true, sz: 10 },
  fill: fill(bg),
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER,
});
const sTitle = (sz = 13, bold = true): CellStyle => ({
  font: { name: FONT, bold, sz },
  alignment: { horizontal: "center", vertical: "center" },
});
const sText = (center = false, total = false): CellStyle => ({
  font: { name: FONT, sz: 10, bold: total },
  fill: total ? fill(BG.total) : undefined,
  alignment: { horizontal: center ? "center" : "left", vertical: "center" },
  border: BORDER,
});
const sNum = (total = false, bad = false): CellStyle => ({
  font: { name: "Arial Narrow", sz: 10, bold: total || bad, color: bad ? { rgb: "C00000" } : undefined },
  fill: total ? fill(BG.total) : bad ? fill("FCE4D6") : undefined,
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: "#,##0",
  border: BORDER,
});
const sPct: CellStyle = {
  font: { name: "Arial Narrow", sz: 10, bold: true },
  fill: fill("FFF2CC"),
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: "0.00%",
  border: BORDER,
};

const col = (c: number) => XLSXStyle.utils.encode_col(c);
const addr = (r: number, c: number) => XLSXStyle.utils.encode_cell({ r, c });
const txt = (v: string, s: CellStyle): CellObject => ({ t: "s", v, s });
const numv = (v: number, s: CellStyle): CellObject => ({ t: "n", v, s });
const fml = (f: string, v: number, s: CellStyle): CellObject => ({ t: "n", f, v, s });
const put = (ws: WorkSheet, r: number, c: number, cell: CellObject) => {
  ws[addr(r, c)] = cell;
};

const fmtDate = (d: string) => dayLabel(d);

function buildSheet(
  svc: SvcFilter,
  rows: SpRawRow[],
  rate: number,
  dateFrom: string,
  dateTo: string,
  unassigned: SpUnassigned,
): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const isAll = svc === "ALL";
  const o = isAll ? 1 : 0; // ຄໍລຳ "ກິດຈະກຳ" ສະເພາະ sheet ລວມ
  const c0 = 2 + o; // ຄໍລຳທຳອິດຂອງຕົວເລກ
  const C = {
    SALES: c0,
    SALES_APP: c0 + 1,
    SALES_POS: c0 + 2,
    POINT_APP: c0 + 3,
    SALES_CASH: c0 + 4,
    FEE: c0 + 5,
    NET: c0 + 6,
    BANK_IN: c0 + 7,
    DIFF_IN: c0 + 8,
    PRIZE: c0 + 9,
    PRIZE_APP: c0 + 10,
    PRIZE_POS: c0 + 11,
    PAID: c0 + 12,
    DIFF_PRIZE: c0 + 13,
  };
  const lastCol = C.DIFF_PRIZE;
  const title = isAll ? "ລວມທັງໝົດ" : SVC_LABEL[svc];

  // ── ຫົວເອກະສານ ──
  put(ws, 0, 0, txt(`ລາຍງານ ຍອດຂາຍ · ເງິນເຂົ້າບັນຊີ · ເງິນລາງວັນ — ${title}`, sTitle(14)));
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } });
  put(ws, 1, 0, txt(`ວັນທີ: ${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`, sTitle(10, false)));
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } });
  // B3 = ອັດຕາຄ່າທຳນຽມ (ຜູ້ໃຊ້ແກ້ໄດ້)
  put(ws, 2, 0, txt("ຄ່າທຳນຽມ", sText(true, false)));
  put(ws, 2, 1, numv(rate, sPct));
  const RATE = "$B$3";

  // ── ຫົວຕາຕະລາງ 2 ຊັ້ນ (ແຖວ 5-6) ──
  const H1 = 4;
  const H2 = 5;
  const heads: [number, string, string][] = [
    [0, "ງວດ", BG.head],
    [1, "ວັນທີ", BG.head],
  ];
  if (isAll) heads.push([2, "ກິດຈະກຳ", BG.head]);
  for (const [c, label, bg] of heads) {
    put(ws, H1, c, txt(label, sHead(bg)));
    put(ws, H2, c, txt("", sHead(bg)));
    merges.push({ s: { r: H1, c }, e: { r: H2, c } });
  }
  put(ws, H1, C.SALES, txt("ຍອດຂາຍ ທຽບ ເງິນເຂົ້າບັນຊີ (ຄິດສະເພາະ APP)", sHead(BG.sales)));
  for (let c = C.SALES + 1; c <= C.DIFF_IN; c++) put(ws, H1, c, txt("", sHead(BG.sales)));
  merges.push({ s: { r: H1, c: C.SALES }, e: { r: H1, c: C.DIFF_IN } });
  put(ws, H1, C.PRIZE, txt("ເງິນລາງວັນ ທຽບ ຈ່າຍອອກຈາກບັນຊີ (ຄິດສະເພາະ APP)", sHead(BG.prize)));
  for (let c = C.PRIZE + 1; c <= C.DIFF_PRIZE; c++) put(ws, H1, c, txt("", sHead(BG.prize)));
  merges.push({ s: { r: H1, c: C.PRIZE }, e: { r: H1, c: C.DIFF_PRIZE } });
  const sub: [number, string, string][] = [
    [C.SALES, "ຍອດຂາຍລວມ", BG.sales],
    [C.SALES_APP, "APP (0101001APP)", BG.sales],
    [C.SALES_POS, "POS", BG.sales],
    [C.POINT_APP, "ຄະແນນ (APP)", BG.sales],
    [C.SALES_CASH, "APP ຫຼັງຫັກຄະແນນ", BG.sales],
    [C.FEE, "ຄ່າທຳນຽມ (APP)", BG.sales],
    [C.NET, "ຫຼັງຫັກຄ່າທຳນຽມ", BG.sales],
    [C.BANK_IN, "ເງິນເຂົ້າບັນຊີຈິງ", BG.sales],
    [C.DIFF_IN, "ສ່ວນຕ່າງ", BG.sales],
    [C.PRIZE, "ລາງວັນລວມ", BG.prize],
    [C.PRIZE_APP, "APP", BG.prize],
    [C.PRIZE_POS, "POS", BG.prize],
    [C.PAID, "ຈ່າຍອອກຈາກບັນຊີ", BG.prize],
    [C.DIFF_PRIZE, "ສ່ວນຕ່າງ", BG.prize],
  ];
  for (const [c, label, bg] of sub) put(ws, H2, c, txt(label, sHead(bg)));

  // ── ແຖວຂໍ້ມູນ ──
  const draws = buildDrawRows(rows, svc, rate);
  const first = H2 + 1; // index (0-based)
  draws.forEach((d, i) => {
    const r = first + i;
    const x = r + 1; // ເລກແຖວ Excel (1-based)
    put(ws, r, 0, txt(d.DRAWID, sText(true)));
    put(ws, r, 1, txt(fmtDate(d.DAY), sText(true)));
    if (isAll) put(ws, r, 2, txt(SVC_LABEL[d.SVC], sText(false)));
    put(ws, r, C.SALES, numv(d.SALES, sNum()));
    put(ws, r, C.SALES_APP, numv(d.SALES_APP, sNum()));
    put(ws, r, C.POINT_APP, numv(d.POINT_APP, sNum()));
    put(ws, r, C.SALES_POS, fml(`${col(C.SALES)}${x}-${col(C.SALES_APP)}${x}`, d.c.SALES_POS, sNum()));
    put(ws, r, C.SALES_CASH, fml(`${col(C.SALES_APP)}${x}-${col(C.POINT_APP)}${x}`, d.c.SALES_CASH, sNum()));
    put(ws, r, C.FEE, fml(`${col(C.SALES_CASH)}${x}*${RATE}`, d.c.FEE, sNum()));
    put(ws, r, C.NET, fml(`${col(C.SALES_CASH)}${x}-${col(C.FEE)}${x}`, d.c.NET, sNum()));
    put(ws, r, C.BANK_IN, numv(d.BANK_IN, sNum()));
    put(
      ws,
      r,
      C.DIFF_IN,
      fml(`${col(C.BANK_IN)}${x}-${col(C.NET)}${x}`, d.c.DIFF_IN, sNum(false, isOff(d.c.DIFF_IN))),
    );
    put(ws, r, C.PRIZE, numv(d.PRIZE, sNum()));
    put(ws, r, C.PRIZE_APP, numv(d.PRIZE_APP, sNum()));
    put(ws, r, C.PRIZE_POS, fml(`${col(C.PRIZE)}${x}-${col(C.PRIZE_APP)}${x}`, d.c.PRIZE_POS, sNum()));
    put(ws, r, C.PAID, numv(d.BANK_PAID, sNum()));
    put(
      ws,
      r,
      C.DIFF_PRIZE,
      fml(`${col(C.PRIZE_APP)}${x}-${col(C.PAID)}${x}`, d.c.DIFF_PRIZE, sNum(false, isOff(d.c.DIFF_PRIZE))),
    );
  });

  // ── ແຖວລວມ ──
  const last = first + draws.length - 1; // index ແຖວຂໍ້ມູນສຸດທ້າຍ
  const tr = last + 1;
  const T = buildTotals(rows, rate)[svc];
  put(ws, tr, 0, txt(`ລວມ (${draws.length.toLocaleString()} ງວດ)`, sText(true, true)));
  for (let c = 1; c < c0; c++) put(ws, tr, c, txt("", sText(true, true)));
  merges.push({ s: { r: tr, c: 0 }, e: { r: tr, c: c0 - 1 } });
  const totalVals: Record<number, number> = {
    [C.SALES]: T.SALES,
    [C.SALES_APP]: T.SALES_APP,
    [C.SALES_POS]: T.SALES_POS,
    [C.POINT_APP]: T.POINT_APP,
    [C.SALES_CASH]: T.SALES_CASH,
    [C.FEE]: T.FEE,
    [C.NET]: T.NET,
    [C.BANK_IN]: T.BANK_IN,
    [C.DIFF_IN]: T.DIFF_IN,
    [C.PRIZE]: T.PRIZE,
    [C.PRIZE_APP]: T.PRIZE_APP,
    [C.PRIZE_POS]: T.PRIZE_POS,
    [C.PAID]: T.BANK_PAID,
    [C.DIFF_PRIZE]: T.DIFF_PRIZE,
  };
  for (let c = C.SALES; c <= lastCol; c++) {
    const rng = draws.length ? `SUM(${col(c)}${first + 1}:${col(c)}${last + 1})` : "0";
    put(ws, tr, c, fml(rng, totalVals[c], sNum(true)));
  }

  // ── ສະຫລຸບຕາມກິດຈະກຳ (ສະເພາະ sheet ລວມ) ──
  let endRow = tr;
  if (isAll) {
    const sr = tr + 2;
    put(ws, sr, 0, txt("ສະຫລຸບຕາມກິດຈະກຳ", { ...sText(false, true), fill: fill(BG.head) }));
    for (let c = 1; c < c0; c++) put(ws, sr, c, txt("", { ...sText(false, true), fill: fill(BG.head) }));
    merges.push({ s: { r: sr, c: 0 }, e: { r: sr, c: c0 - 1 } });
    const bySvc = buildTotals(rows, rate);
    const colRange = (c: number) => `${col(c)}$${first + 1}:${col(c)}$${last + 1}`;
    const svcRange = `$${col(2)}$${first + 1}:$${col(2)}$${last + 1}`;
    (["DOG", "PUP"] as const).forEach((s, i) => {
      const r = sr + 1 + i;
      put(ws, r, 0, txt(SVC_LABEL[s], sText(false)));
      for (let c = 1; c < c0; c++) put(ws, r, c, txt("", sText(false)));
      merges.push({ s: { r, c: 0 }, e: { r, c: c0 - 1 } });
      const tv = bySvc[s];
      const vals: Record<number, number> = {
        [C.SALES]: tv.SALES,
        [C.SALES_APP]: tv.SALES_APP,
        [C.SALES_POS]: tv.SALES_POS,
        [C.POINT_APP]: tv.POINT_APP,
        [C.SALES_CASH]: tv.SALES_CASH,
        [C.FEE]: tv.FEE,
        [C.NET]: tv.NET,
        [C.BANK_IN]: tv.BANK_IN,
        [C.DIFF_IN]: tv.DIFF_IN,
        [C.PRIZE]: tv.PRIZE,
        [C.PRIZE_APP]: tv.PRIZE_APP,
        [C.PRIZE_POS]: tv.PRIZE_POS,
        [C.PAID]: tv.BANK_PAID,
        [C.DIFF_PRIZE]: tv.DIFF_PRIZE,
      };
      for (let c = C.SALES; c <= lastCol; c++) {
        const f = draws.length
          ? `SUMIF(${svcRange},"${SVC_LABEL[s]}",${colRange(c)})`
          : "0";
        put(ws, r, c, fml(f, vals[c], sNum()));
      }
    });
    const gr = sr + 3;
    put(ws, gr, 0, txt("ລວມທັງໝົດ", sText(true, true)));
    for (let c = 1; c < c0; c++) put(ws, gr, c, txt("", sText(true, true)));
    merges.push({ s: { r: gr, c: 0 }, e: { r: gr, c: c0 - 1 } });
    for (let c = C.SALES; c <= lastCol; c++) {
      put(ws, gr, c, fml(`${col(c)}${sr + 2}+${col(c)}${sr + 3}`, totalVals[c], sNum(true)));
    }
    endRow = gr;

    if (isOff(unassigned.BANK_IN) || isOff(unassigned.BANK_PAID)) {
      const nr = gr + 2;
      put(
        ws,
        nr,
        0,
        txt(
          `ໝາຍເຫດ: ມີທຸລະກຳທະນາຄານທີ່ບໍ່ຖືກຜູກກັບງວດ (ບໍ່ຢູ່ໃນຕາຕະລາງ) — ເງິນເຂົ້າ ${Math.round(unassigned.BANK_IN).toLocaleString("en-US")} · ຈ່າຍລາງວັນ ${Math.round(unassigned.BANK_PAID).toLocaleString("en-US")}`,
          { font: { name: FONT, sz: 10, bold: true, color: { rgb: "C00000" } } },
        ),
      );
      endRow = nr;
    }
  }

  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: endRow, c: lastCol } });
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 11 },
    { wch: 11 },
    ...(isAll ? [{ wch: 20 }] : []),
    ...Array.from({ length: 14 }, () => ({ wch: 17 })),
  ];
  ws["!rows"] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 6 }, { hpt: 20 }, { hpt: 30 }];
  ws["!freeze"] = { xSplit: 0, ySplit: H2 + 1 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!pageSetup"] = { paperSize: 9, orientation: "landscape", fitToPage: 1, fitToWidth: 1, fitToHeight: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!sheetPr"] = { pageSetUpPr: { fitToPage: true } };
  return ws;
}

export async function exportClSalesPrize(
  rows: SpRawRow[],
  rate: number,
  dateFrom: string,
  dateTo: string,
  unassigned: SpUnassigned,
): Promise<void> {
  const wb = XLSXStyle.utils.book_new();
  const defs: [SvcFilter, string][] = [
    ["ALL", "ລວມທັງໝົດ"],
    ["DOG", SVC_LABEL.DOG],
    ["PUP", SVC_LABEL.PUP],
  ];
  for (const [svc, name] of defs) {
    XLSXStyle.utils.book_append_sheet(wb, buildSheet(svc, rows, rate, dateFrom, dateTo, unassigned), name);
  }
  XLSXStyle.writeFile(wb, `CL_Sales_Prize_Report_${dateFrom}_to_${dateTo}.xlsx`);
}
