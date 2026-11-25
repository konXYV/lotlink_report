// lib/clStmtDailyCore.ts
// ─── ລາຍງານສະເຕັດເມັ້ນ ລວມຕາມສະກຸນເງິນ ແລະ ວັນທີ (ເລືອກເປັນເດືອນ ຫຼື ຊ່ວງ ຈາກ–ຫາ) ───────────────────────────────
// ແຕ່ລະວັນ ແຕ່ລະບັນຊີ:
//   ຍອດຍົກມາ/ເຫຼືອທ້າຍ ຫາຈາກ BANK_ENDING_BALANCE ແບບຕໍ່ໂສ້ (ເບິ່ງ stmt_daily.repo.ts) · ນັບຈຳນວນລາຍການ ໜີ້/ມີ ຈາກ CL_BCEL_STMT
//   ວັນທີ່ບັນຊີບໍ່ມີແຖວ → ຍົກຍອດຈາກວັນກ່ອນ (ຍົກມາ = ເຫຼືອທ້າຍ, ໜີ້/ມີ = 0)
// ແລ້ວລວມຕາມ CURENCY ຂອງ CL_BANK_ACCT
export const NO_CCY = "—";

export interface StmtDailyRow {
  BANK_ACCT: string; DAY: string;
  OPEN: number | null; CLOSE: number | null; // ຍອດຕົ້ນ/ທ້າຍວັນ (ຕໍ່ໂສ້ຈາກ BANK_ENDING_BALANCE)
  DR: number; CR: number; N_DR: number; N_CR: number; MULTI: number;
}
export interface StmtPriorRow { BANK_ACCT: string; PRIOR_BAL: number }
export interface StmtAcctRow { BANK_ACCT: string; BANK_ACCT_NAME: string | null; BANK_ID: string | null; CURENCY: string | null }
export interface StmtDailyApi { days: StmtDailyRow[]; prior: StmtPriorRow[]; accts: StmtAcctRow[] }

export interface Cell { open: number; dr: number; cr: number; close: number; brk: boolean }
export interface DayLine { date: string; cells: Record<string, Cell> }
export interface CcySummary {
  open: number; dr: number; cr: number; close: number;
  nDr: number; nCr: number; // ຈຳນວນລາຍການ ໜີ້ / ມີ ລວມທັງຊ່ວງ
  bad: boolean;
}
export interface StmtDailyResult {
  ccys: string[];
  lines: DayLine[];
  summary: Record<string, CcySummary>;
  multi: number; // ວັນ-ບັນຊີ ທີ່ຂໍ້ມູນຕໍ່ໂສ້ບໍ່ສອດຄ່ອງ/ຫາຍອດບໍ່ໄດ້
  breaks: number; // ວັນ-ບັນຊີ ທີ່ ຍອດຍົກມາ ≠ ຍອດເຫຼືອທ້າຍວັນກ່ອນ
  unknownAccts: string[]; // ບັນຊີທີ່ບໍ່ມີສະກຸນເງິນໃນ CL_BANK_ACCT
}

const EPS = 0.005;
const CCY_PRIORITY = ["LAK", "USD", "THB"];
const rank = (c: string) => {
  const i = CCY_PRIORITY.indexOf(c);
  return i >= 0 ? i : c === NO_CCY ? 999 : 100;
};
const pad = (n: number) => String(n).padStart(2, "0");

export const fmtInt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
export const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
export const dayLabel = (d: string) => {
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
};
const toIso = (d: Date) => d.toISOString().slice(0, 10);
/** ລາຍການວັນທີ 'YYYY-MM-DD' ຈາກ from ຫາ to (ລວມທັງສອງ) — ຄິດແບບ UTC */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  let t = Date.UTC(y, m - 1, d);
  const end = Date.parse(to);
  while (t <= end && out.length < 400) {
    out.push(toIso(new Date(t)));
    t += 86400000;
  }
  return out;
}
/** ເດືອນ 'YYYY-MM' → ວັນທີ 1 ຫາ ວັນສຸດທ້າຍ (ເດືອນປັດຈຸບັນ → ຮອດມື້ນີ້) */
export function monthBounds(month: string, now = new Date()): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cur = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const lastDay = month === cur ? now.getDate() : last;
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

export function buildStmtDaily(api: StmtDailyApi, dates: string[]): StmtDailyResult {
  const ccyOfAcct = new Map<string, string>();
  for (const a of api.accts) ccyOfAcct.set(a.BANK_ACCT, (a.CURENCY ?? "").trim().toUpperCase() || NO_CCY);

  const byAcct = new Map<string, Map<string, StmtDailyRow>>();
  for (const r of api.days) {
    if (!byAcct.has(r.BANK_ACCT)) byAcct.set(r.BANK_ACCT, new Map());
    byAcct.get(r.BANK_ACCT)!.set(r.DAY, r);
  }
  const priorOf = new Map(api.prior.map((p) => [p.BANK_ACCT, p.PRIOR_BAL] as const));

  // ບັນຊີທີ່ໃຊ້: ທຸກບັນຊີໃນ CL_BANK_ACCT + ບັນຊີທີ່ມີຂໍ້ມູນ/ຍອດກ່ອນໜ້າ ແຕ່ບໍ່ຢູ່ໃນ CL_BANK_ACCT
  const accts = new Set<string>([...ccyOfAcct.keys(), ...byAcct.keys(), ...priorOf.keys()]);
  const unknownAccts = [...accts].filter((a) => !ccyOfAcct.has(a) || ccyOfAcct.get(a) === NO_CCY).sort();
  const ccyOf = (a: string) => ccyOfAcct.get(a) ?? NO_CCY;

  const ccySet = new Set<string>();
  for (const a of accts) ccySet.add(ccyOf(a));
  const ccys = [...ccySet].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  const lines: DayLine[] = dates.map((date) => ({
    date,
    cells: Object.fromEntries(ccys.map((c) => [c, { open: 0, dr: 0, cr: 0, close: 0, brk: false }])),
  }));
  const cnt: Record<string, { nDr: number; nCr: number }> = Object.fromEntries(ccys.map((c) => [c, { nDr: 0, nCr: 0 }]));

  // ຍອດຕົ້ນ/ທ້າຍ ຄິດແບບ "ຍົກຍອດ" (roll-forward) ຈາກຍອດເລີ່ມຕົ້ນ ແລະ ລວມ ໜີ້/ມີ ແຕ່ລະວັນ:
  //   ຍອດຍົກມາ(ມື້ນີ້) = ຍອດເຫຼືອທ້າຍ(ມື້ວານ) · ຍອດເຫຼືອທ້າຍ = ຍອດຍົກມາ + ມີ − ໜີ້
  // BANK_ENDING_BALANCE ໃຊ້ສະເພາະເປັນ "ຍອດເລີ່ມຕົ້ນ" ຂອງຊ່ວງເທົ່ານັ້ນ — ບໍ່ໃຊ້ເປັນຍອດທ້າຍຂອງແຕ່ລະວັນ
  // (ຄ່າໃນຕາຕະລາງມີເສດ ເຊັ່ນ .24 → .20 ແລະ ບາງມື້ຕໍ່ໂສ້ຜິດ ເຮັດໃຫ້ຍອດຜິດ ແລະ ຜິດຕໍ່ເນື່ອງທຸກມື້ຕໍ່ໄປ)
  let multi = 0;
  const breaks = 0;
  for (const acct of accts) {
    const rows = byAcct.get(acct);
    const ccy = ccyOf(acct);
    // ຍອດເລີ່ມຕົ້ນ: ຍອດກ່ອນຊ່ວງ ຖ້າບໍ່ມີ → ຍອດຕົ້ນຂອງລາຍການທຳອິດໃນຊ່ວງ (ຄິດຈາກ CLOSE − (ມີ−ໜີ້) ຖ້າບໍ່ມີ OPEN)
    let prev: number | null = priorOf.get(acct) ?? null;
    if (prev == null && rows) {
      const first = dates.map((d) => rows.get(d)).find((r) => r && (r.OPEN != null || r.CLOSE != null));
      if (first) {
        prev = first.OPEN != null ? first.OPEN : (first.CLOSE as number) - (first.CR - first.DR);
        if (first.OPEN == null || first.MULTI) multi++;
      } else if (rows.size) multi++; // ມີລາຍການ ແຕ່ຫາຍອດເລີ່ມຕົ້ນບໍ່ໄດ້
    }
    let bal = prev ?? 0;
    lines.forEach((ln) => {
      const r = rows?.get(ln.date);
      const cell = ln.cells[ccy];
      cell.open += bal;
      if (r) {
        bal = bal + r.CR - r.DR;
        cell.dr += r.DR; cell.cr += r.CR;
        cnt[ccy].nDr += r.N_DR; cnt[ccy].nCr += r.N_CR;
      }
      cell.close += bal;
    });
  }

  const summary: Record<string, CcySummary> = {};
  for (const c of ccys) {
    const open = lines.length ? lines[0].cells[c].open : 0;
    const close = lines.length ? lines[lines.length - 1].cells[c].close : 0;
    const dr = lines.reduce((a, l) => a + l.cells[c].dr, 0);
    const cr = lines.reduce((a, l) => a + l.cells[c].cr, 0);
    summary[c] = { open, dr, cr, close, nDr: cnt[c].nDr, nCr: cnt[c].nCr, bad: Math.abs(open - dr + cr - close) >= EPS };
  }
  return { ccys, lines, summary, multi, breaks, unknownAccts };
}
