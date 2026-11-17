// lib/clSalesPrizeCore.ts
// ─── ແກນຄິດໄລ່ 2 ລາຍງານ (CL): ລາຍງານຂາຍ ແລະ ລາຍງານຈ່າຍລາງວັນ ─────────────────────────────────
// 1 ແຖວດິບ = 1 ງວດ × 1 ຜູ້ຂາຍ. ແຖວ APP (0101001APP) ຢູ່ບລັອກເທິງ, ຜູ້ຂາຍອື່ນ (ເຊັ່ນ PDF) ຢູ່ບລັອກລຸ່ມ
// ຄືກັບໃບສະຫລຸບ Excel: [ແຖວ APP] → ລວມ → [ແຖວຜູ້ຂາຍອື່ນ] → ລວມ → ລວມທັງໝົດ
import { SVC_LABEL, type Svc } from "./lottoReportCore";

export { SVC_LABEL };
export type { Svc };
export type SvcFilter = "ALL" | Svc;

export const ACCT_SALES_IN = "0101300016617"; // ບັນຊີຮັບເງິນຂາຍ
export const ACCT_PRIZE_OUT = "0101300016635"; // ບັນຊີຈ່າຍເງິນລາງວັນ
export const APP_USERNAME = "0101001APP"; // ຜູ້ຂາຍ APP — ເງິນເຂົ້າ/ຈ່າຍອອກຜ່ານບັນຊີ BCEL ເປັນຂອງ APP ເທົ່ານັ້ນ

/** ຄ່າທຳນຽມ gateway ຂອງຍອດຂາຍ (2%) */
export const DEFAULT_FEE_RATE = 0.02;
/** ຫົວຖັນ "ຄ່າທຳນຽມຈ່າຍລາງວັນ" — ຕົວເລກຈິງມາຈາກ CL_BCEL_STMT (FEE_Dog racing prize / FEE_LOTTERY PRIZE) */
export const PRIZE_FEE_LABEL = "1.800/ທຸລະກໍາ";

// ───────────────────────── ປະເພດຂໍ້ມູນ ─────────────────────────
interface RawBase {
  SVC: Svc;
  DRAWID: string;
  DAY: string; // YYYY-MM-DD
  USERNAME: string;
  IS_APP: boolean;
  CASH: number;
  POINT: number;
}
export interface SalesRaw extends RawBase {
  BANK_IN: number; // ສະເພາະແຖວ APP
}
export interface PrizeRaw extends RawBase {
  FEE: number; // ຄ່າທຳນຽມຈ່າຍລາງວັນ ຈາກທະນາຄານ (ສະເພາະແຖວ APP)
  BANK_PAID: number; // ສະເພາະແຖວ APP
  TAX: number; // ອາກອນ 5% ເຂົ້າບັນຊີ (ສະເພາະແຖວ APP)
}

export interface SalesCalc {
  CASH: number; // ຈ່າຍເງິນສົດ
  POINT: number; // ຈ່າຍຄະແນນ
  TOTAL: number; // ລວມມູນຄ່າຂາຍໄດ້ = CASH + POINT
  FEE: number; // ຄ່າທຳນຽມ = CASH × rate (ຄະແນນບໍ່ມີເງິນເຂົ້າ ຈຶ່ງບໍ່ຄິດ)
  NET: number; // ຍອດຂາຍຫຼັງຫັກຄ່າທຳນຽມ = CASH − FEE
  BANK_IN: number; // ເງິນເຂົ້າບັນຊີ
  DIFF: number; // ສ່ວນຕ່າງ = BANK_IN − NET
}
export interface PrizeCalc {
  CASH: number; // ຖືກຜ່ານຈ່າຍເງິນສົດ
  POINT: number; // ຖືກຜ່ານຈ່າຍຄະແນນ
  TOTAL: number; // ລວມມູນຄ່າຖືກລາງວັນ = CASH + POINT
  FEE: number; // ຄ່າທຳນຽມຈ່າຍລາງວັນ (ຈາກ CL_BCEL_STMT)
  PAID: number; // ຈ່າຍເງິນລາງວັນອອກຈາກບັນຊີ
  TAX: number; // ຮັບອາກອນ 5% ຫັກຈາກຜູ້ຖືກລາງວັນເຂົ້າບັນຊີ (ຈາກ CL_BCEL_STMT)
  DIFF: number; // ສ່ວນຕ່າງ = TOTAL − PAID
}

export const EMPTY_SALES: SalesCalc = { CASH: 0, POINT: 0, TOTAL: 0, FEE: 0, NET: 0, BANK_IN: 0, DIFF: 0 };
export const EMPTY_PRIZE: PrizeCalc = { CASH: 0, POINT: 0, TOTAL: 0, FEE: 0, PAID: 0, TAX: 0, DIFF: 0 };

// ───────────────────────── ແປງ JSON → ແຖວດິບ ─────────────────────────
const base = (o: Record<string, unknown>): RawBase => ({
  SVC: o.SVC as Svc,
  DRAWID: String(o.DRAWID ?? ""),
  DAY: String(o.DAY ?? ""),
  USERNAME: String(o.USERNAME ?? ""),
  IS_APP: Boolean(o.IS_APP),
  CASH: Number(o.CASH ?? 0),
  POINT: Number(o.POINT ?? 0),
});
export const toSalesRows = (json: unknown[]): SalesRaw[] =>
  json.map((r) => {
    const o = r as Record<string, unknown>;
    return { ...base(o), BANK_IN: Number(o.BANK_IN ?? 0) };
  });
export const toPrizeRows = (json: unknown[]): PrizeRaw[] =>
  json.map((r) => {
    const o = r as Record<string, unknown>;
    return { ...base(o), FEE: Number(o.FEE ?? 0), BANK_PAID: Number(o.BANK_PAID ?? 0), TAX: Number(o.TAX ?? 0) };
  });

// ───────────────────────── ຄິດໄລ່ຕໍ່ແຖວ ─────────────────────────
/** ແຖວ APP: ມີຄ່າທຳນຽມ/ເງິນເຂົ້າ/ສ່ວນຕ່າງ · ແຖວຜູ້ຂາຍອື່ນ: ມີສະເພາະ ເງິນສົດ/ຄະແນນ/ລວມ */
export function calcSales(r: SalesRaw, rate: number): SalesCalc {
  const TOTAL = r.CASH + r.POINT;
  if (!r.IS_APP) return { ...EMPTY_SALES, CASH: r.CASH, POINT: r.POINT, TOTAL };
  const FEE = r.CASH * rate;
  const NET = r.CASH - FEE;
  return { CASH: r.CASH, POINT: r.POINT, TOTAL, FEE, NET, BANK_IN: r.BANK_IN, DIFF: r.BANK_IN - NET };
}
export function calcPrize(r: PrizeRaw): PrizeCalc {
  const TOTAL = r.CASH + r.POINT;
  if (!r.IS_APP) return { ...EMPTY_PRIZE, CASH: r.CASH, POINT: r.POINT, TOTAL };
  return {
    CASH: r.CASH,
    POINT: r.POINT,
    TOTAL,
    FEE: r.FEE,
    PAID: r.BANK_PAID,
    TAX: r.TAX,
    DIFF: TOTAL - r.BANK_PAID,
  };
}

function sumBy<T extends object>(empty: T, list: T[]): T {
  const t = { ...empty };
  for (const c of list) for (const k of Object.keys(t) as (keyof T)[]) (t[k] as number) += c[k] as number;
  return t;
}
export const sumSales = (l: SalesCalc[]) => sumBy(EMPTY_SALES, l);
export const sumPrize = (l: PrizeCalc[]) => sumBy(EMPTY_PRIZE, l);

// ───────────────────────── ຈັດບລັອກ (APP / ອື່ນໆ / ລວມທັງໝົດ) ─────────────────────────
export type Line<R, C> = R & { no: string; c: C };
export interface Block<R, C> {
  lines: Line<R, C>[];
  total: C;
}
export interface Sections<R, C> {
  app: Block<R, C>;
  other: Block<R, C>;
  grand: C;
}

const byDayDraw = (a: RawBase, b: RawBase) =>
  a.DAY.localeCompare(b.DAY) || a.DRAWID.localeCompare(b.DRAWID) || a.USERNAME.localeCompare(b.USERNAME);
const pad = (i: number) => String(i + 1).padStart(2, "0"); // ລຳດັບ: 01, 02, ... (ແຕ່ລະບລັອກເລີ່ມ 01 ໃໝ່)

function build<R extends RawBase, C>(
  rows: R[],
  svc: SvcFilter,
  calc: (r: R) => C,
  sum: (l: C[]) => C,
  keep: (c: C) => boolean,
  hideOther: boolean,
): Sections<R, C> {
  const pick = (isApp: boolean) =>
    rows
      .filter((r) => (svc === "ALL" || r.SVC === svc) && r.IS_APP === isApp)
      .sort(byDayDraw)
      .map((r) => ({ ...r, c: calc(r) }))
      .filter((l) => (isApp ? keep(l.c) : !hideOther))
      .map((l, i) => ({ ...l, no: pad(i) }));
  const app = pick(true);
  const other = pick(false);
  const appT = sum(app.map((l) => l.c));
  const otherT = sum(other.map((l) => l.c));
  return {
    app: { lines: app, total: appT },
    other: { lines: other, total: otherT },
    grand: sum([appT, otherT]),
  };
}

/** onlyDiff = ສະແດງສະເພາະງວດ (ແຖວ APP) ທີ່ມີສ່ວນຕ່າງ ≠ 0 */
export const buildSales = (rows: SalesRaw[], svc: SvcFilter, rate: number, onlyDiff = false) =>
  build(rows, svc, (r) => calcSales(r, rate), sumSales, (c) => !onlyDiff || isOff(c.DIFF), onlyDiff);
export const buildPrize = (rows: PrizeRaw[], svc: SvcFilter, onlyDiff = false) =>
  build(rows, svc, (r) => calcPrize(r), sumPrize, (c) => !onlyDiff || isOff(c.DIFF), onlyDiff);

/** ຈັດກຸ່ມຕາມ 4 ຕົວທຳອິດຂອງ DRAWID (ເຊັ່ນ 3626 = PUP ປີ 26) — 1 ກຸ່ມ = 1 sheet ໃນ Excel */
export function groupByPrefix<R extends { DRAWID: string }>(rows: R[]): [string, R[]][] {
  const m = new Map<string, R[]>();
  for (const r of rows) {
    const k = r.DRAWID.slice(0, 4);
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// ───────────────────────── ຕົວຊ່ວຍສະແດງຜົນ ─────────────────────────
/** ສ່ວນຕ່າງ ≠ 0 (ຕ້ອງກວດ). ຍອມຮັບເສດ < 0.5 ກີບ */
export const isOff = (n: number) => Math.abs(n) >= 0.5;

/** ຮູບແບບ Excel ບັນຊີ: 1,234.00 · 0 ສະແດງ "-" */
export const fmt2 = (n: number) => {
  const r = Math.round(n * 100) / 100;
  if (r === 0) return "-";
  return r.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const dayLabel = (d: string) =>
  d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—";
