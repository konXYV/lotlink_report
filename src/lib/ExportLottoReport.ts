// lib/ExportLottoReport.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານ CL (ອມພ/ອຄຊ ຫຼື ອາກອນເງິນລາງວັນ) — xlsx-js-style · 4 sheet: ສະຫລຸບ / ລາຍເດືອນ / ລາຍວັນ / ຕາມງວດ
// ════════════════════════════════════════════════════════════════════════════
import XLSXStyle, { type CellObject, type CellStyle, type WorkSheet } from "xlsx-js-style";
import {
  SVC_LABEL,
  buildMonthly,
  buildDaily,
  buildDraw,
  monthLabel,
  dayLabel,
  type RawRow,
  type ReportDef,
  type ReportItem,
} from "./lottoReportCore";

const FONT = "Phetsarath OT";
const thin = { style: "thin", color: { rgb: "000000" } } as const;
const BORDER = { left: thin, right: thin, top: thin, bottom: thin };

const sHead: CellStyle = {
  font: { name: FONT, bold: true, sz: 10 },
  fill: { patternType: "solid", fgColor: { rgb: "D9D9D9" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER,
};
const sTitle = (sz = 13, bold = true): CellStyle => ({
  font: { name: FONT, bold, sz },
  alignment: { horizontal: "center", vertical: "center" },
});
const fillOf = (it?: ReportItem, total = false): CellStyle["fill"] =>
  it?.highlight
    ? { patternType: "solid", fgColor: { rgb: "FFFF00" } }
    : it?.grand || total
      ? { patternType: "solid", fgColor: { rgb: "BFBFBF" } }
      : undefined;
const sText = (it?: ReportItem, center = false, total = false): CellStyle => ({
  font: { name: FONT, sz: 10, bold: !!(it?.highlight || it?.grand || total) },
  fill: fillOf(it, total),
  alignment: { horizontal: center ? "center" : "left", vertical: "center" },
  border: BORDER,
});
const sNum = (it?: ReportItem, total = false): CellStyle => ({
  font: { name: "Arial Narrow", sz: 10, bold: !!(it?.highlight || it?.grand || total) },
  fill: fillOf(it, total),
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: "#,##0",
  border: BORDER,
});

const txt = (v: string, s: CellStyle): CellObject => ({ t: "s", v, s });
const num = (v: number, s: CellStyle): CellObject => ({ t: "n", v: Math.round(v), s });
const put = (ws: WorkSheet, r: number, c: number, cell: CellObject) => {
  ws[XLSXStyle.utils.encode_cell({ r, c })] = cell;
};
const merge = (r1: number, c1: number, r2: number, c2: number): XLSXStyle.Range => ({
  s: { r: r1, c: c1 },
  e: { r: r2, c: c2 },
});
function finish(ws: WorkSheet, rows: number, cols: number, widths: number[], merges: XLSXStyle.Range[]) {
  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows - 1, c: cols - 1 } });
  ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!merges"] = merges;
}
function heading(ws: WorkSheet, def: ReportDef, sub: string, period: string, cols: number) {
  put(ws, 0, 0, txt(`${def.title} — ${sub}`, sTitle()));
  put(ws, 1, 0, txt(`ຈາກບໍລິການ "${SVC_LABEL.DOG}" ແລະ "${SVC_LABEL.PUP}" · ${period}`, sTitle(10, false)));
  return [merge(0, 0, 0, cols - 1), merge(1, 0, 1, cols - 1)];
}

// ── ສະຫລຸບ ─────────────────────────────────────────────────────────────────
function sheetSummary(def: ReportDef, rows: RawRow[], period: string): WorkSheet {
  const { dogTotal, pupTotal, grand } = buildMonthly(def, rows);
  const ws: WorkSheet = {};
  const cols = 6;
  const merges = heading(ws, def, "ສະຫລຸບ", period, cols);
  ["ລຳດັບ", "ເນື້ອໃນ", "ສູດຄິດໄລ່", "ຍອດລວມທັງໝົດ", SVC_LABEL.DOG, SVC_LABEL.PUP].forEach((h, c) =>
    put(ws, 3, c, txt(h, sHead)),
  );
  def.items.forEach((it, i) => {
    const r = 4 + i;
    put(ws, r, 0, txt(`[${it.code}]`, sText(it, true)));
    put(ws, r, 1, txt(it.label, sText(it)));
    put(ws, r, 2, txt(it.formula, sText(it)));
    put(ws, r, 3, num(grand[it.code], sNum(it)));
    put(ws, r, 4, num(dogTotal[it.code], sNum(it)));
    put(ws, r, 5, num(pupTotal[it.code], sNum(it)));
  });
  finish(ws, 4 + def.items.length, cols, [8, 40, 24, 22, 22, 22], merges);
  return ws;
}

// ── ລາຍເດືອນ ───────────────────────────────────────────────────────────────
function sheetMonthly(def: ReportDef, rows: RawRow[], period: string): WorkSheet {
  const { months, byMonth, dogTotal, pupTotal, grand } = buildMonthly(def, rows);
  const ws: WorkSheet = {};
  const n = months.length;
  const w = n + 1;
  const cols = 4 + w * 2;
  const merges = heading(ws, def, "ລາຍເດືອນ", period, cols);
  ["ລຳດັບ", "ເນື້ອໃນ", "ສູດຄິດໄລ່", "ຍອດລວມທັງໝົດ"].forEach((h, c) => {
    put(ws, 3, c, txt(h, sHead));
    put(ws, 4, c, txt("", sHead));
    merges.push(merge(3, c, 4, c));
  });
  (["DOG", "PUP"] as const).forEach((svc, si) => {
    const c0 = 4 + si * w;
    put(ws, 3, c0, txt(SVC_LABEL[svc], sHead));
    for (let k = 1; k < w; k++) put(ws, 3, c0 + k, txt("", sHead));
    merges.push(merge(3, c0, 3, c0 + w - 1));
    months.forEach((m, k) => put(ws, 4, c0 + k, txt(monthLabel(m), sHead)));
    put(ws, 4, c0 + n, txt("ລວມທັງໝົດ", sHead));
  });
  def.items.forEach((it, i) => {
    const r = 5 + i;
    put(ws, r, 0, txt(`[${it.code}]`, sText(it, true)));
    put(ws, r, 1, txt(it.label, sText(it)));
    put(ws, r, 2, txt(it.formula, sText(it)));
    put(ws, r, 3, num(grand[it.code], sNum(it)));
    (["DOG", "PUP"] as const).forEach((svc, si) => {
      const c0 = 4 + si * w;
      byMonth.forEach((m, k) => put(ws, r, c0 + k, num(m[svc][it.code], sNum(it))));
      put(ws, r, c0 + n, num((svc === "DOG" ? dogTotal : pupTotal)[it.code], sNum(it)));
    });
  });
  finish(ws, 5 + def.items.length, cols, [8, 40, 24, 22, ...Array(w * 2).fill(20)], merges);
  return ws;
}

// ── ລາຍວັນ: ແຖວ = ວັນ · ກຸ່ມຄໍລຳ = [ລວມ, ໝານຳໂຊກ, ປູປາເຕົ້າ] × items ─────────────
function sheetDaily(def: ReportDef, rows: RawRow[], period: string): WorkSheet {
  const ws: WorkSheet = {};
  const groups = [
    { key: "ALL" as const, title: "ລວມທັງໝົດ" },
    { key: "DOG" as const, title: SVC_LABEL.DOG },
    { key: "PUP" as const, title: SVC_LABEL.PUP },
  ];
  const k = def.items.length;
  const data = groups.map((g) => buildDaily(def, rows, g.key));
  const days = [...new Set(rows.map((r) => r.DAY))].sort();
  const cols = 1 + groups.length * k;
  const merges = heading(ws, def, "ລາຍວັນ", period, cols);
  put(ws, 3, 0, txt("ວັນທີ", sHead));
  put(ws, 4, 0, txt("", sHead));
  merges.push(merge(3, 0, 4, 0));
  groups.forEach((g, gi) => {
    const c0 = 1 + gi * k;
    put(ws, 3, c0, txt(g.title, sHead));
    for (let i = 1; i < k; i++) put(ws, 3, c0 + i, txt("", sHead));
    merges.push(merge(3, c0, 3, c0 + k - 1));
    def.items.forEach((it, i) => put(ws, 4, c0 + i, txt(`[${it.code}] ${it.label}`, sHead)));
  });
  days.forEach((d, i) => {
    const r = 5 + i;
    put(ws, r, 0, txt(dayLabel(d), sText(undefined, true)));
    groups.forEach((_, gi) => {
      const v = data[gi].find((x) => x.day === d)?.v;
      def.items.forEach((it, j) => put(ws, r, 1 + gi * k + j, num(v ? v[it.code] : 0, sNum())));
    });
  });
  const tr = 5 + days.length;
  put(ws, tr, 0, txt("ລວມ", sText(undefined, true, true)));
  groups.forEach((_, gi) =>
    def.items.forEach((it, j) =>
      put(ws, tr, 1 + gi * k + j, num(data[gi].reduce((a, x) => a + x.v[it.code], 0), sNum(undefined, true))),
    ),
  );
  finish(ws, tr + 1, cols, [12, ...Array(groups.length * k).fill(18)], merges);
  ws["!rows"] = [{}, {}, {}, {}, { hpt: 44 }];
  return ws;
}

// ── ຕາມງວດ: ງວດ | ວັນທີ | ບໍລິການ | items ───────────────────────────────────
function sheetDraw(def: ReportDef, rows: RawRow[], period: string): WorkSheet {
  const ws: WorkSheet = {};
  const list = buildDraw(def, rows, "ALL");
  const k = def.items.length;
  const cols = 3 + k;
  const merges = heading(ws, def, "ຕາມງວດ", period, cols);
  ["ງວດ", "ວັນທີ", "ບໍລິການ"].forEach((h, c) => put(ws, 3, c, txt(h, sHead)));
  def.items.forEach((it, i) => put(ws, 3, 3 + i, txt(`[${it.code}] ${it.label}`, sHead)));
  list.forEach((d, i) => {
    const r = 4 + i;
    put(ws, r, 0, txt(d.drawId, sText(undefined, true)));
    put(ws, r, 1, txt(dayLabel(d.day), sText(undefined, true)));
    put(ws, r, 2, txt(SVC_LABEL[d.svc], sText()));
    def.items.forEach((it, j) => put(ws, r, 3 + j, num(d.v[it.code], sNum())));
  });
  const tr = 4 + list.length;
  put(ws, tr, 0, txt("ລວມ", sText(undefined, true, true)));
  put(ws, tr, 1, txt("", sText(undefined, true, true)));
  put(ws, tr, 2, txt("", sText(undefined, true, true)));
  def.items.forEach((it, j) =>
    put(ws, tr, 3 + j, num(list.reduce((a, x) => a + x.v[it.code], 0), sNum(undefined, true))),
  );
  merges.push(merge(tr, 0, tr, 2));
  finish(ws, tr + 1, cols, [12, 12, 22, ...Array(k).fill(20)], merges);
  ws["!rows"] = [{}, {}, {}, { hpt: 44 }];
  return ws;
}

export async function exportLottoReport(def: ReportDef, rows: RawRow[], dateFrom: string, dateTo: string) {
  const period = `ວັນທີ ${dayLabel(dateFrom)} ຫາ ${dayLabel(dateTo)}`;
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, sheetSummary(def, rows, period), "ສະຫລຸບ");
  XLSXStyle.utils.book_append_sheet(wb, sheetMonthly(def, rows, period), "ລາຍເດືອນ");
  XLSXStyle.utils.book_append_sheet(wb, sheetDaily(def, rows, period), "ລາຍວັນ");
  XLSXStyle.utils.book_append_sheet(wb, sheetDraw(def, rows, period), "ຕາມງວດ");
  XLSXStyle.writeFile(wb, `${def.fileName}_${dateFrom}_to_${dateTo}.xlsx`);
}
