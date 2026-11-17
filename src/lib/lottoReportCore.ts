// lib/lottoReportCore.ts
// ─── ແກນກາງຂອງລາຍງານ CL (ອມພ/ອຄຊ ແລະ ອາກອນເງິນລາງວັນ) — 4 ຮູບແບບ: ສະຫລຸບ · ເດືອນ · ວັນ · ງວດ ───
// ຂໍ້ມູນດິບຄື 1 ແຖວຕໍ່ (ບໍລິການ, ງວດ, ວັນທີ). ທຸກຮູບແບບລວມມາຈາກຊຸດນີ້ຊຸດດຽວ.
export type Svc = "DOG" | "PUP";
export type SvcFilter = "ALL" | Svc;
export const SVC_LABEL: Record<Svc, string> = {
  DOG: "ນ້ອງໝານຳໂຊກ",
  PUP: "ປູປາເຕົ້າມະຫາໂຊກ",
};

export type Values = Record<string, number>;

export interface ReportItem {
  code: string;
  label: string;
  formula: string;
  highlight?: boolean; // ແຖວສີເຫຼືອງ
  grand?: boolean; // ແຖວສີເທົາ (ລວມສຸດທ້າຍ)
}

export interface ReportDef {
  id: string;
  title: string; // ຫົວຂໍ້ລາຍງານ
  apiView: string; // view ຂອງ /api/oracle/CL
  fileName: string; // ຊື່ໄຟລ໌ Excel
  baseKeys: string[]; // ຄໍລຳດິບຈາກ API ທີ່ "ລວມໄດ້"
  items: ReportItem[];
  /** ຄິດຄ່າທຸກ item ຈາກຜົນລວມຂອງຄໍລຳດິບໃນ 1 period */
  derive: (base: Values) => Values;
}

export interface RawRow {
  SVC: Svc;
  DRAWID: string;
  DAY: string; // YYYY-MM-DD
  base: Values;
}

/** ແປງ JSON ຈາກ API → RawRow (ຕາມ baseKeys ຂອງລາຍງານ) */
export function toRawRows(def: ReportDef, json: unknown[]): RawRow[] {
  return json.map((r) => {
    const o = r as Record<string, unknown>;
    const base: Values = {};
    for (const k of def.baseKeys) base[k] = Number(o[k] ?? 0);
    return { SVC: o.SVC as Svc, DRAWID: String(o.DRAWID ?? ""), DAY: String(o.DAY), base };
  });
}

const addBase = (acc: Values, add: Values, keys: string[]) => {
  for (const k of keys) acc[k] = (acc[k] ?? 0) + add[k];
};

function sumBaseOf(def: ReportDef, rows: RawRow[]): Values {
  const acc: Values = {};
  for (const k of def.baseKeys) acc[k] = 0;
  for (const r of rows) addBase(acc, r.base, def.baseKeys);
  return acc;
}

/** ລວມຄ່າທີ່ derive ແລ້ວຂອງຫຼາຍ period (ຄືກັບ PIVOT SUM ໃນ SQL ຕົ້ນສະບັບ) */
export function sumValues(def: ReportDef, list: Values[]): Values {
  const out: Values = {};
  for (const it of def.items) out[it.code] = 0;
  for (const v of list) for (const it of def.items) out[it.code] += v[it.code];
  return out;
}

const keep = (r: RawRow, svc: SvcFilter) => svc === "ALL" || r.SVC === svc;

/** ລາຍວັນ */
export function buildDaily(def: ReportDef, rows: RawRow[], svc: SvcFilter) {
  const groups = new Map<string, RawRow[]>();
  for (const r of rows) {
    if (!keep(r, svc)) continue;
    (groups.get(r.DAY) ?? groups.set(r.DAY, []).get(r.DAY)!).push(r);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, rs]) => ({ day, v: def.derive(sumBaseOf(def, rs)) }));
}

/** ຕາມງວດ — ງວດ + ວັນທີ (ວັນທີນ້ອຍສຸດຂອງງວດ ຖ້າງວດດຽວມີຫຼາຍວັນ) */
export function buildDraw(def: ReportDef, rows: RawRow[], svc: SvcFilter) {
  const groups = new Map<string, RawRow[]>();
  for (const r of rows) {
    if (!keep(r, svc)) continue;
    const key = `${r.SVC}|${r.DRAWID}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  return [...groups.values()]
    .map((rs) => ({
      drawId: rs[0].DRAWID,
      svc: rs[0].SVC,
      day: rs.map((x) => x.DAY).sort()[0],
      v: def.derive(sumBaseOf(def, rs)),
    }))
    .sort((a, b) => a.day.localeCompare(b.day) || a.drawId.localeCompare(b.drawId));
}

/** ລາຍເດືອນ + ສະຫລຸບ */
export function buildMonthly(def: ReportDef, rows: RawRow[]) {
  const months = [...new Set(rows.map((r) => r.DAY.slice(0, 7)))].sort();
  const at = (svc: Svc, mon: string) =>
    def.derive(sumBaseOf(def, rows.filter((r) => r.SVC === svc && r.DAY.startsWith(mon))));
  const byMonth = months.map((mon) => ({ mon, DOG: at("DOG", mon), PUP: at("PUP", mon) }));
  const dogTotal = sumValues(def, byMonth.map((m) => m.DOG));
  const pupTotal = sumValues(def, byMonth.map((m) => m.PUP));
  return { months, byMonth, dogTotal, pupTotal, grand: sumValues(def, [dogTotal, pupTotal]) };
}

export const fmtInt = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
export const monthLabel = (mon: string) => `${mon.slice(5, 7)}/${mon.slice(0, 4)}`;
export const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
