// lib/clBalanceCore.ts
// ─── ລາຍງານຍອດຍົກມາ (CL) — ແຍກຕາມສະກຸນເງິນ ແລະ ເລກບັນຊີ ─────────────────────────────
// ແຫຼ່ງຂໍ້ມູນ: CL_BCEL_STMT_SUM (BANK_ACCT, BANK_DATE, SOLD, DR, CR, BALANCE)
//   ຍອດຍົກມາ   = SOLD ຂອງວັນທຳອິດໃນຊ່ວງ  (ຖ້າບໍ່ມີທຸລະກຳໃນຊ່ວງ → BALANCE ວັນສຸດທ້າຍກ່ອນຊ່ວງ)
//   ຍອດເຫຼືອທ້າຍ = BALANCE ຂອງວັນສຸດທ້າຍໃນຊ່ວງ  (ຖ້າບໍ່ມີທຸລະກຳໃນຊ່ວງ → ເທົ່າຍອດຍົກມາ)
// ສະກຸນເງິນ/ທະນາຄານ ມາຈາກຕາຕະລາງ CL_BANK_ACCT (CURENCY, BANK_ID) — ບໍ່ hardcode ແລ້ວ
export type Ccy = string;
export const NO_CCY = "—"; // ບັນຊີທີ່ບໍ່ມີໃນ CL_BANK_ACCT ຫຼື CURENCY ຫວ່າງ

const CCY_PRIORITY = ["LAK", "USD", "THB"];
const CCY_NAME: Record<string, string> = { LAK: "ກີບ", USD: "ໂດລາ", THB: "ບາດ" };
export const ccyTitle = (ccy: string) =>
  ccy === NO_CCY ? "ບັນຊີທີ່ຍັງບໍ່ມີສະກຸນເງິນໃນ CL_BANK_ACCT" : `ບັນຊີສະກຸນເງິນ${CCY_NAME[ccy] ?? ""} - ${ccy}`;
const ccyRank = (c: string) => {
  const i = CCY_PRIORITY.indexOf(c);
  return i >= 0 ? i : c === NO_CCY ? 999 : 100;
};

/** ແຖວດິບຈາກ API (1 ແຖວ / 1 ບັນຊີ) */
export interface BalanceRaw {
  BANK_ACCT: string;
  BANK_ACCT_NAME: string | null;
  BANK_ID: string | null;
  CURENCY: string | null;
  OPEN_BAL: number | null; // SOLD ວັນທຳອິດໃນຊ່ວງ
  PRIOR_BAL: number | null; // BALANCE ວັນສຸດທ້າຍກ່ອນຊ່ວງ
  DR: number;
  CR: number;
  CLOSE_BAL: number | null; // BALANCE ວັນສຸດທ້າຍໃນຊ່ວງ
  FIRST_DATE: string | null;
  LAST_DATE: string | null;
  CNT: number; // ຈຳນວນວັນທີ່ມີຂໍ້ມູນ
  MULTI: number; // ວັນທີ່ SOLD/BALANCE ບໍ່ເທົ່າກັນລະຫວ່າງ TXN_TYPE
}

export interface BalanceLine {
  no: number;
  acct: string;
  ccy: Ccy;
  bank: string; // BANK_ID
  note: string; // BANK_ACCT_NAME
  open: number;
  dr: number;
  cr: number;
  close: number;
  hasMove: boolean; // ມີຂໍ້ມູນໃນຊ່ວງບໍ່
  diff: number; // ຍອດຍົກມາ − ໜີ້ + ມີ − ຍອດເຫຼືອທ້າຍ (ຄວນເປັນ 0)
  firstDate: string | null;
  lastDate: string | null;
}

export interface BalanceSection {
  ccy: Ccy;
  title: string;
  lines: BalanceLine[];
  total: { open: number; dr: number; cr: number; close: number };
}

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const nn = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v));

export const isOff = (n: number) => Math.abs(n) >= 0.005;
export const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
export const dayLabel = (d: string | null) => {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  return y && m && dd ? `${dd}/${m}/${y}` : d;
};

export function toBalanceRows(raw: unknown[]): BalanceRaw[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (raw as any[]).map((r) => ({
    BANK_ACCT: String(r.BANK_ACCT ?? "").trim(),
    BANK_ACCT_NAME: r.BANK_ACCT_NAME ? String(r.BANK_ACCT_NAME) : null,
    BANK_ID: r.BANK_ID ? String(r.BANK_ID) : null,
    CURENCY: r.CURENCY ? String(r.CURENCY) : null,
    OPEN_BAL: nn(r.OPEN_BAL),
    PRIOR_BAL: nn(r.PRIOR_BAL),
    DR: num(r.DR),
    CR: num(r.CR),
    CLOSE_BAL: nn(r.CLOSE_BAL),
    FIRST_DATE: r.FIRST_DATE ? String(r.FIRST_DATE) : null,
    LAST_DATE: r.LAST_DATE ? String(r.LAST_DATE) : null,
    CNT: num(r.CNT),
    MULTI: num(r.MULTI),
  }));
}

const ccyKey = (r: BalanceRaw) => (r.CURENCY ?? "").trim().toUpperCase() || NO_CCY;

/** ສ້າງຕາຕະລາງແຍກສະກຸນເງິນ (ຈາກ CL_BANK_ACCT.CURENCY) — ບັນຊີທີ່ຢູ່ໃນ CL_BANK_ACCT ຈະອອກສະເໝີ */
export function buildBalance(rows: BalanceRaw[]): BalanceSection[] {
  const ccys = [...new Set(rows.map(ccyKey))].sort(
    (a, b) => ccyRank(a) - ccyRank(b) || a.localeCompare(b),
  );
  let no = 0;
  const sections: BalanceSection[] = [];
  for (const ccy of ccys) {
    const lines: BalanceLine[] = [];
    for (const r of rows.filter((x) => ccyKey(x) === ccy).sort((a, b) => a.BANK_ACCT.localeCompare(b.BANK_ACCT))) {
      const hasMove = r.CNT > 0;
      const open = hasMove ? (r.OPEN_BAL ?? r.PRIOR_BAL ?? 0) : (r.PRIOR_BAL ?? 0);
      const close = hasMove ? (r.CLOSE_BAL ?? open) : open;
      lines.push({
        no: ++no,
        acct: r.BANK_ACCT,
        ccy,
        bank: r.BANK_ID ?? "",
        note: r.BANK_ACCT_NAME ?? "",
        open,
        dr: r.DR,
        cr: r.CR,
        close,
        hasMove,
        diff: open - r.DR + r.CR - close,
        firstDate: r.FIRST_DATE,
        lastDate: r.LAST_DATE,
      });
    }
    const sum = (k: "open" | "dr" | "cr" | "close") => lines.reduce((a, l) => a + l[k], 0);
    sections.push({
      ccy,
      title: ccyTitle(ccy),
      lines,
      total: { open: sum("open"), dr: sum("dr"), cr: sum("cr"), close: sum("close") },
    });
  }
  return sections;
}
