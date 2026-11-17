// lib/clXlsxCommon.ts
// ─── ສະໄຕ/ຕົວຊ່ວຍ ທີ່ໃຊ້ຮ່ວມກັນ ຂອງ Excel ລາຍງານຂາຍ + ລາຍງານຈ່າຍລາງວັນ ──────────────────────────
// ຮູບແບບຖອດຈາກໃບສະຫລຸບ Excel ຕົ້ນແບບ (3626-Sales / ໃບສະຫລຸບຈ່າຍລາງວັນ)
import XLSXStyle, { type CellObject, type CellStyle, type WorkSheet } from "xlsx-js-style";

export const FONT_HEAD = "Phetsarath OT";
export const FONT_NUM = "Arial Narrow";

// ຮູບແບບຕົວເລກບັນຊີ ທີ່ຕົ້ນແບບໃຊ້ (2 ຕຳແໜ່ງທົດສະນິຍົມ, 0 → "-")
export const NUM_A = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-';
export const NUM_B = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)';
export const DATE_FMT = "mm-dd-yy"; // ຮູບແບບວັນທີ່ໃນຕົ້ນແບບ (ຕາມ locale ຂອງ Excel)

// ສີ: ຕົ້ນແບບໃຊ້ theme color → ແປງເປັນ RGB ທີ່ຕົງກັນ
export const BG = {
  headSales: "E2EFDA", // accent6 (ຂຽວ) tint 0.8
  headPrize: "FFE699", // accent4 (ເຫຼືອງ) tint 0.6
  sub: "E7E6E6", // ແຖວລວມຍ່ອຍ (lt2)
  grand: "FFF2CC", // ແຖວລວມທັງໝົດ (accent4 tint 0.8)
};

const thin = { style: "thin", color: { rgb: "000000" } } as const;
export const BORDER = { left: thin, right: thin, top: thin, bottom: thin };
const fill = (rgb: string): CellStyle["fill"] => ({ patternType: "solid", fgColor: { rgb } });

export const sHead = (bg: string, o: { bold?: boolean; sz?: number; wrap?: boolean; color?: string; numFmt?: string } = {}): CellStyle => ({
  font: { name: FONT_HEAD, sz: o.sz ?? 11, bold: !!o.bold, color: o.color ? { rgb: o.color } : undefined },
  fill: fill(bg),
  alignment: { horizontal: "center", vertical: "center", wrapText: !!o.wrap },
  border: BORDER,
  numFmt: o.numFmt,
});
export const sTitle: CellStyle = {
  font: { name: FONT_NUM, sz: 12, bold: true },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDER,
};
/** ຕົວໜັງສື/ເລກລຳດັບ/ວັນທີ່ ໃນແຖວຂໍ້ມູນ (ຢູ່ກາງ) */
export const sCellC = (sz = 12, numFmt?: string): CellStyle => ({
  font: { name: FONT_NUM, sz },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDER,
  numFmt,
});
/** ຕົວເລກໃນແຖວຂໍ້ມູນ */
export const sCellN = (o: { fmt: string; sz?: number; bold?: boolean; center?: boolean; bad?: boolean }): CellStyle => ({
  font: { name: FONT_NUM, sz: o.sz ?? 12, bold: !!o.bold || !!o.bad, color: o.bad ? { rgb: "C00000" } : undefined },
  fill: o.bad ? fill("FCE4D6") : undefined,
  alignment: { horizontal: o.center ? "center" : undefined, vertical: "center" },
  border: BORDER,
  numFmt: o.fmt,
});
/** ແຖວລວມຍ່ອຍ (ສີເທົາ) */
export const sSub = (fmt: string): CellStyle => ({
  font: { name: FONT_NUM, sz: 11, bold: true },
  fill: fill(BG.sub),
  alignment: { vertical: "center" },
  numFmt: fmt,
});
/** ແຖວລວມທັງໝົດ (ສີເຫຼືອງອ່ອນ) */
export const sGrand: CellStyle = {
  font: { name: FONT_NUM, sz: 11, bold: true },
  fill: fill(BG.grand),
  alignment: { vertical: "center" },
  numFmt: NUM_B,
};

export const col = (c: number) => XLSXStyle.utils.encode_col(c);
export const addr = (r: number, c: number) => XLSXStyle.utils.encode_cell({ r, c });
export const txt = (v: string, s: CellStyle): CellObject => ({ t: "s", v, s });
export const numv = (v: number, s: CellStyle): CellObject => ({ t: "n", v, s });
export const fml = (f: string, v: number, s: CellStyle): CellObject => ({ t: "n", f, v, s });
// ຕ້ອງເປັນ string ຫວ່າງ (ບໍ່ແມ່ນ type "z") ບໍ່ດັ່ງນັ້ນສີພື້ນ/ເສັ້ນຂອບຂອງ cell ຫວ່າງຈະຫາຍ
export const blank = (s: CellStyle): CellObject => ({ t: "s", v: "", s });
export const put = (ws: WorkSheet, r: number, c: number, cell: CellObject) => {
  ws[addr(r, c)] = cell;
};

/** 'YYYY-MM-DD' → serial ຂອງ Excel (ເປັນຕົວເລກ + ຮູບແບບວັນທີ່ ຄືກັບຕົ້ນແບບ) */
export function dateCell(d: string, s: CellStyle): CellObject {
  const [y, m, dd] = d.split("-").map(Number);
  if (!y || !m || !dd) return txt(d, s);
  return { t: "n", v: Date.UTC(y, m - 1, dd) / 86400000 + 25569, s };
}

/** ສະໄຕພື້ນຖານທຸກ cell ໃນໄລຍະ (ໃຫ້ cell ທີ່ merge ມີເສັ້ນຂອບຄົບ) */
export function fillRange(ws: WorkSheet, r0: number, c0: number, r1: number, c1: number, make: () => CellObject) {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!ws[addr(r, c)]) put(ws, r, c, make());
}

/** ຊື່ sheet ຕ້ອງ ≤ 31 ຕົວ ແລະ ບໍ່ມີ \ / ? * [ ] : */
/** ຄວາມກວ້າງຄໍລຳ (ຫົວໜ່ວຍ Excel) — ຫັກ 0.8 ເພາະ SheetJS ບວກ padding ເພີ່ມ */
export const colWidths = (w: number[]) => w.map((x) => ({ wch: x - 0.8 }));

export const sheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);

/** ຕຳແໜ່ງລາຍເຊັນ 4 ຊ່ອງ (ໃຊ້ຮ່ວມກັນ Excel + ໜ້າເວັບ) */
export const SIGNERS = ["ຜູ້ອຳນວຍການ", "ຫົວໜ້າພະແນກ ບັນຊີ-ການເງິນ", "ຫົວໜ້າສາຍງານ", "ຜູ້ສະຫຼຸບ ແລະ ຕິດຕາມ"] as const;

/** ເພີ່ມບລັອກລາຍເຊັນ 4 ຊ່ອງ ລຸ່ມຕາຕະລາງ (ຊ່ອງຕາມຄໍລຳ A..LAST) — ສົ່ງຄືນແຖວສຸດທ້າຍ */
export function addSignatures(ws: WorkSheet, merges: XLSXStyle.Range[], startRow: number, last: number): number {
  const per = Math.ceil((last + 1) / 4);
  const style: CellStyle = {
    font: { name: FONT_HEAD, sz: 11, bold: true, underline: true },
    alignment: { horizontal: "center", vertical: "center" },
  };
  SIGNERS.forEach((label, i) => {
    const c0 = i * per;
    const c1 = Math.min(last, c0 + per - 1);
    if (c0 > last) return;
    put(ws, startRow, c0, txt(label, style));
    for (let c = c0 + 1; c <= c1; c++) put(ws, startRow, c, { t: "s", v: "", s: style });
    merges.push({ s: { r: startRow, c: c0 }, e: { r: startRow, c: c1 } });
  });
  return startRow + 4; // ເຫຼືອ 3 ແຖວຫວ່າງ ສຳລັບເຊັນຊື່
}

/** ທຸກ cell: ມີຕົວອັກສອນລາວ → Phetsarath OT · ຕົວເລກ/ລະຫັດລ້ວນ → Arial Narrow (ຮັກສາຂະໜາດ/ສີ/ຂອບເດີມ) */
const LAO = /[\u0E80-\u0EFF]/;
export function applyFonts(ws: WorkSheet) {
  for (const k of Object.keys(ws)) {
    if (k.startsWith("!")) continue;
    const c = ws[k] as CellObject;
    if (!c || !c.s) continue;
    const isLao = typeof c.v === "string" && LAO.test(c.v);
    c.s = { ...c.s, font: { ...(c.s.font ?? {}), name: isLao ? FONT_HEAD : FONT_NUM } };
  }
}

/** CSS ໜ້າເວັບ/ພິມ: ຕົວລາວ = Phetsarath OT, ຕົວເລກ = Arial Narrow (ແຍກດ້ວຍ unicode-range) */
export const FONT_CSS = `
  @font-face { font-family: "CLMix"; src: local("Arial Narrow"), local("ArialNarrow"), local("Arial"); unicode-range: U+0020-007E; }
  @font-face { font-family: "CLMix"; src: local("Phetsarath OT"), local("Phetsarath"); unicode-range: U+0E80-0EFF; }
  .cl-font, .cl-font * { font-family: "CLMix", "Phetsarath OT", "Phetsarath", "Arial Narrow", sans-serif !important; }
`;

export const saveBook = (wb: XLSXStyle.WorkBook, file: string) => XLSXStyle.writeFile(wb, file);
export { XLSXStyle };
export type { WorkSheet, CellObject, CellStyle };
