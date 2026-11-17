// lib/ExportClLottoTax.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ຕາຕະລາງຄິດໄລ່ ອມພ + ອຄຊ — xlsx-js-style · 3 sheet: ສະຫລຸບ / ລາຍເດືອນ / ລາຍວັນ
// ════════════════════════════════════════════════════════════════════════════
import XLSXStyle, { type CellObject, type CellStyle, type WorkSheet } from "xlsx-js-style";
import {
  TAX_ITEMS,
  TAX_CODES,
  SVC_LABEL,
  buildMonthly,
  buildDaily,
  monthLabel,
  dayLabel,
  type DailyRow,
} from "./lottoTaxCalc";

const FONT = "Phetsarath OT";
const thin = { style: "thin", color: { rgb: "000000" } } as const;
const BORDER = { left: thin, right: thin, top: thin, bottom: thin };
const NUMFMT = "#,##0";

const sHead: CellStyle = {
  font: { name: FONT, bold: true, sz: 10 },
  fill: { patternType: "solid", fgColor: { rgb: "D9D9D9" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER,
};
const sTitle: CellStyle = {
  font: { name: FONT, bold: true, sz: 13 },
  alignment: { horizontal: "center", vertical: "center" },
};
const fillFor = (code: string): CellStyle["fill"] =>
  code === "D" || code === "F"
    ? { patternType: "solid", fgColor: { rgb: "FFFF00" } }
    : code === "G"
      ? { patternType: "solid", fgColor: { rgb: "B4C6E7" } }
      : undefined;
const sText = (code: string, center = false): CellStyle => ({
  font: { name: FONT, sz: 10, bold: code === "D" || code === "F" || code === "G" },
  fill: fillFor(code),
  alignment: { horizontal: center ? "center" : "left", vertical: "center" },
  border: BORDER,
});
const sNum = (code: string): CellStyle => ({
  font: { name: "Arial Narrow", sz: 10, bold: code === "D" || code === "F" || code === "G" },
  fill: fillFor(code),
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: NUMFMT,
  border: BORDER,
});

const txt = (v: string, s: CellStyle): CellObject => ({ t: "s", v, s });
const num = (v: number, s: CellStyle): CellObject => ({ t: "n", v: Math.round(v), s });

function put(ws: WorkSheet, r: number, c: number, cell: CellObject) {
  ws[XLSXStyle.utils.encode_cell({ r, c })] = cell;
}
function finish(ws: WorkSheet, rows: number, cols: number, widths: number[], merges: XLSXStyle.Range[]) {
  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows - 1, c: cols - 1 } });
  ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!merges"] = merges;
}
const merge = (r1: number, c1: number, r2: number, c2: number): XLSXStyle.Range => ({
  s: { r: r1, c: c1 },
  e: { r: r2, c: c2 },
});

// ── Sheet 1: ສະຫລຸບ  (ແຖວ A–G × [ລວມ, ໝານຳໂຊກ, ປູປາເຕົ້າ]) ──────────────────────
function sheetSummary(rows: DailyRow[], period: string): WorkSheet {
  const { dogTotal, pupTotal, grand } = buildMonthly(rows);
  const ws: WorkSheet = {};
  const cols = 6;
  put(ws, 0, 0, txt("ຕາຕະລາງຄິດໄລ່ ອາກອນມູນຄ່າເພີ່ມ ແລະ ອາກອນຊົມໃຊ້ — ສະຫລຸບ", sTitle));
  put(ws, 1, 0, txt(`ຈາກບໍລິການ "ນ້ອງໝານຳໂຊກ" ແລະ "ປູປາເຕົ້າມະຫາໂຊກ" · ${period}`, { ...sTitle, font: { name: FONT, sz: 10 } }));
  ["ລຳດັບ", "ເນື້ອໃນ", "ສູດຄິດໄລ່", "ຍອດລວມທັງໝົດ", SVC_LABEL.DOG, SVC_LABEL.PUP].forEach((h, c) =>
    put(ws, 3, c, txt(h, sHead)),
  );
  TAX_ITEMS.forEach((it, i) => {
    const r = 4 + i;
    put(ws, r, 0, txt(`[${it.code}]`, sText(it.code, true)));
    put(ws, r, 1, txt(it.label, sText(it.code)));
    put(ws, r, 2, txt(it.formula, sText(it.code)));
    put(ws, r, 3, num(grand[it.code], sNum(it.code)));
    put(ws, r, 4, num(dogTotal[it.code], sNum(it.code)));
    put(ws, r, 5, num(pupTotal[it.code], sNum(it.code)));
  });
  finish(ws, 4 + TAX_ITEMS.length, cols, [8, 38, 24, 22, 22, 22], [merge(0, 0, 0, cols - 1), merge(1, 0, 1, cols - 1)]);
  return ws;
}

// ── Sheet 2: ລາຍເດືອນ  (ຕາມຮູບຕົ້ນສະບັບ) ───────────────────────────────────────
function sheetMonthly(rows: DailyRow[], period: string): WorkSheet {
  const { months, byMonth, dogTotal, pupTotal, grand } = buildMonthly(rows);
  const ws: WorkSheet = {};
  const n = months.length;
  const svcWidth = n + 1; // ແຕ່ລະເດືອນ + ລວມທັງໝົດ
  const cols = 4 + svcWidth * 2;
  put(ws, 0, 0, txt("ຕາຕະລາງຄິດໄລ່ ອາກອນມູນຄ່າເພີ່ມ ແລະ ອາກອນຊົມໃຊ້ — ລາຍເດືອນ", sTitle));
  put(ws, 1, 0, txt(`ຈາກບໍລິການ "ນ້ອງໝານຳໂຊກ" ແລະ "ປູປາເຕົ້າມະຫາໂຊກ" · ${period}`, { ...sTitle, font: { name: FONT, sz: 10 } }));

  // header 2 ຊັ້ນ
  ["ລຳດັບ", "ເນື້ອໃນ", "ສູດຄິດໄລ່", "ຍອດລວມທັງໝົດ"].forEach((h, c) => {
    put(ws, 3, c, txt(h, sHead));
    put(ws, 4, c, txt("", sHead));
  });
  const merges = [merge(0, 0, 0, cols - 1), merge(1, 0, 1, cols - 1)];
  for (let c = 0; c < 4; c++) merges.push(merge(3, c, 4, c));
  (["DOG", "PUP"] as const).forEach((svc, si) => {
    const c0 = 4 + si * svcWidth;
    put(ws, 3, c0, txt(SVC_LABEL[svc], sHead));
    for (let k = 1; k < svcWidth; k++) put(ws, 3, c0 + k, txt("", sHead));
    merges.push(merge(3, c0, 3, c0 + svcWidth - 1));
    months.forEach((m, k) => put(ws, 4, c0 + k, txt(monthLabel(m), sHead)));
    put(ws, 4, c0 + n, txt("ລວມທັງໝົດ", sHead));
  });

  TAX_ITEMS.forEach((it, i) => {
    const r = 5 + i;
    put(ws, r, 0, txt(`[${it.code}]`, sText(it.code, true)));
    put(ws, r, 1, txt(it.label, sText(it.code)));
    put(ws, r, 2, txt(it.formula, sText(it.code)));
    put(ws, r, 3, num(grand[it.code], sNum(it.code)));
    (["DOG", "PUP"] as const).forEach((svc, si) => {
      const c0 = 4 + si * svcWidth;
      byMonth.forEach((m, k) => put(ws, r, c0 + k, num(m[svc][it.code], sNum(it.code))));
      put(ws, r, c0 + n, num((svc === "DOG" ? dogTotal : pupTotal)[it.code], sNum(it.code)));
    });
  });
  finish(ws, 5 + TAX_ITEMS.length, cols, [8, 38, 24, 22, ...Array(svcWidth * 2).fill(20)], merges);
  return ws;
}

// ── Sheet 3: ລາຍວັນ  (ແຖວ = ວັນ · ຄໍລຳ = A..G × [ລວມ, ໝານຳໂຊກ, ປູປາເຕົ້າ]) ──────
function sheetDaily(rows: DailyRow[], period: string): WorkSheet {
  const ws: WorkSheet = {};
  const groups = [
    { key: "ALL" as const, title: "ລວມທັງໝົດ" },
    { key: "DOG" as const, title: SVC_LABEL.DOG },
    { key: "PUP" as const, title: SVC_LABEL.PUP },
  ];
  const data = groups.map((g) => buildDaily(rows, g.key));
  const days = [...new Set(rows.map((r) => r.DAY))].sort();
  const cols = 1 + groups.length * TAX_CODES.length;
  put(ws, 0, 0, txt("ຕາຕະລາງຄິດໄລ່ ອາກອນມູນຄ່າເພີ່ມ ແລະ ອາກອນຊົມໃຊ້ — ລາຍວັນ", sTitle));
  put(ws, 1, 0, txt(period, { ...sTitle, font: { name: FONT, sz: 10 } }));
  put(ws, 3, 0, txt("ວັນທີ", sHead));
  put(ws, 4, 0, txt("", sHead));
  const merges = [merge(0, 0, 0, cols - 1), merge(1, 0, 1, cols - 1), merge(3, 0, 4, 0)];
  groups.forEach((g, gi) => {
    const c0 = 1 + gi * TAX_CODES.length;
    put(ws, 3, c0, txt(g.title, sHead));
    for (let k = 1; k < TAX_CODES.length; k++) put(ws, 3, c0 + k, txt("", sHead));
    merges.push(merge(3, c0, 3, c0 + TAX_CODES.length - 1));
    TAX_CODES.forEach((code, k) => {
      const it = TAX_ITEMS.find((t) => t.code === code)!;
      put(ws, 4, c0 + k, txt(`[${code}] ${it.label}`, sHead));
    });
  });
  days.forEach((d, i) => {
    const r = 5 + i;
    put(ws, r, 0, txt(dayLabel(d), sText("", true)));
    groups.forEach((_, gi) => {
      const v = data[gi].find((x) => x.day === d)?.v;
      TAX_CODES.forEach((code, k) => {
        put(ws, r, 1 + gi * TAX_CODES.length + k, num(v ? v[code] : 0, sNum("")));
      });
    });
  });
  // ແຖວລວມ
  const tr = 5 + days.length;
  put(ws, tr, 0, txt("ລວມ", sText("G", true)));
  groups.forEach((_, gi) => {
    TAX_CODES.forEach((code, k) => {
      const sum = data[gi].reduce((acc, x) => acc + x.v[code], 0);
      put(ws, tr, 1 + gi * TAX_CODES.length + k, num(sum, sNum("G")));
    });
  });
  finish(ws, tr + 1, cols, [12, ...Array(groups.length * TAX_CODES.length).fill(18)], merges);
  ws["!rows"] = [{}, {}, {}, {}, { hpt: 42 }];
  return ws;
}

export async function exportClLottoTax(rows: DailyRow[], dateFrom: string, dateTo: string) {
  const period = `ວັນທີ ${dayLabel(dateFrom)} ຫາ ${dayLabel(dateTo)}`;
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, sheetSummary(rows, period), "ສະຫລຸບ");
  XLSXStyle.utils.book_append_sheet(wb, sheetMonthly(rows, period), "ລາຍເດືອນ");
  XLSXStyle.utils.book_append_sheet(wb, sheetDaily(rows, period), "ລາຍວັນ");
  XLSXStyle.writeFile(wb, `CL_Lotto_Tax_${dateFrom}_to_${dateTo}.xlsx`);
}
