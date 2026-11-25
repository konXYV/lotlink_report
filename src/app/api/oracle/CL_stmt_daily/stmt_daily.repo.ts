// src/app/api/oracle/CL_stmt_daily/stmt_daily.repo.ts
// ─── ຂໍ້ມູນລາຍວັນຂອງແຕ່ລະບັນຊີ ໃນຊ່ວງວັນທີ່ເລືອກ (ເດືອນ ຫຼື ຈາກ–ຫາ) ─────────────────────────────
// ແຫຼ່ງ: CL_BCEL_STMT (ຕາຕະລາງລາຍການຍ່ອຍ — ນັບຈຳນວນລາຍການໄດ້)  +  CL_BANK_ACCT (CURENCY, BANK_ID)
// ໃຊ້ pool CL ເດີມ — ບໍ່ແກ້ໄຟລ໌ເດີມ
//
// ຍອດຕົ້ນ/ທ້າຍວັນ ຫາຈາກ BANK_ENDING_BALANCE ແບບ "ຕໍ່ໂສ້" ໂດຍບໍ່ຕ້ອງອີງລຳດັບແຖວ:
//   ແຕ່ລະລາຍການ: ຍອດຫຼັງ E = BANK_ENDING_BALANCE · ຍອດກ່ອນ P = E + DR − CR
//   ຍອດຕົ້ນວັນ = ຄ່າ P ທີ່ບໍ່ມີ E ຂອງລາຍການອື່ນມາຈັບຄູ່ · ຍອດທ້າຍວັນ = ຄ່າ E ທີ່ບໍ່ມີ P ຂອງລາຍການອື່ນມາຈັບຄູ່
//   (ນັບແບບ multiset: +1 ຕໍ່ E, −1 ຕໍ່ P → ຄ່າທີ່ເຫຼືອ > 0 = ຍອດທ້າຍ, < 0 = ຍອດຕົ້ນ)
import { withClConnection } from "../CL/cl.connection";

const OPT = { outFormat: 4002, fetchArraySize: 500 };
const LOOKBACK_DAYS = 120; // ຍ້ອນຫຼັງຫາ "ຍອດກ່ອນຊ່ວງ" (ຖ້າບໍ່ພົບ ໃຊ້ຍອດຕົ້ນຂອງລາຍການທຳອິດໃນຊ່ວງ)

/** dateTo ເປັນວັນທີ່ລວມ (inclusive) → ໃຊ້ < dateTo + 1 ວັນ (ຄິດແບບ UTC ກັນວັນເລື່ອນ) */
export function nextDay(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10);
}

export interface StmtDailyRow {
  BANK_ACCT: string;
  DAY: string;
  OPEN: number | null; // ຍອດຕົ້ນວັນ (ຕໍ່ໂສ້)
  CLOSE: number | null; // ຍອດທ້າຍວັນ (ຕໍ່ໂສ້)
  DR: number; // ລວມເງິນ ໜີ້
  CR: number; // ລວມເງິນ ມີ
  N_DR: number; // ຈຳນວນລາຍການ ໜີ້
  N_CR: number; // ຈຳນວນລາຍການ ມີ
  MULTI: number; // 1 = ຂໍ້ມູນຕໍ່ໂສ້ບໍ່ສອດຄ່ອງ
}
export interface StmtPriorRow { BANK_ACCT: string; PRIOR_BAL: number }
export interface StmtAcctRow { BANK_ACCT: string; BANK_ACCT_NAME: string | null; BANK_ID: string | null; CURENCY: string | null }

export async function getClStmtDaily(dateFrom: string, dateTo: string) {
  const to = nextDay(dateTo);
  const n = (v: unknown) => Number(v ?? 0);
  const nn = (v: unknown) => (v == null ? null : Number(v));

  const sql = `
    WITH T AS (
      SELECT TRIM(BANK_ACCT) AS BANK_ACCT,
             TRUNC(BANK_DATE) AS D,
             NVL(BANK_DR,0)   AS DR,
             NVL(BANK_CR,0)   AS CR,
             BANK_ENDING_BALANCE AS E,
             BANK_ENDING_BALANCE + NVL(BANK_DR,0) - NVL(BANK_CR,0) AS P
      FROM   CL_BCEL_STMT
      WHERE  BANK_DATE >= TO_DATE(:dFrom,'YYYY-MM-DD') - :lookback
      AND    BANK_DATE <  TO_DATE(:dTo,'YYYY-MM-DD')
    ),
    DAYAGG AS (
      SELECT BANK_ACCT, D,
             SUM(DR) AS DR, SUM(CR) AS CR,
             SUM(CASE WHEN DR > 0 THEN 1 ELSE 0 END) AS N_DR,
             SUM(CASE WHEN CR > 0 THEN 1 ELSE 0 END) AS N_CR
      FROM   T
      GROUP  BY BANK_ACCT, D
    ),
    V AS (
      SELECT BANK_ACCT, D, E AS VAL,  1 AS W FROM T WHERE E IS NOT NULL
      UNION ALL
      SELECT BANK_ACCT, D, P AS VAL, -1 AS W FROM T WHERE E IS NOT NULL
    ),
    N AS (
      SELECT BANK_ACCT, D, VAL, SUM(W) AS S
      FROM   V
      GROUP  BY BANK_ACCT, D, VAL
      HAVING SUM(W) <> 0
    ),
    BAL AS (
      SELECT BANK_ACCT, D,
             MAX(CASE WHEN S > 0 THEN VAL END) AS CLOSE_BAL,
             MAX(CASE WHEN S < 0 THEN VAL END) AS OPEN_BAL,
             COUNT(CASE WHEN S > 0 THEN 1 END) AS N_POS,
             COUNT(CASE WHEN S < 0 THEN 1 END) AS N_NEG
      FROM   N
      GROUP  BY BANK_ACCT, D
    )
    SELECT a.BANK_ACCT, TO_CHAR(a.D,'YYYY-MM-DD') AS DAY,
           a.DR, a.CR, a.N_DR, a.N_CR,
           b.OPEN_BAL, b.CLOSE_BAL,
           CASE WHEN b.N_POS > 1 OR b.N_NEG > 1 THEN 1 ELSE 0 END AS MULTI
    FROM   DAYAGG a
    LEFT JOIN BAL b ON b.BANK_ACCT = a.BANK_ACCT AND b.D = a.D
    ORDER  BY a.BANK_ACCT, a.D`;

  return withClConnection(async (conn) => {
    const dayRes = await conn.execute(sql, { dFrom: dateFrom, dTo: to, lookback: LOOKBACK_DAYS }, OPT);
    const acctRes = await conn.execute(
      `SELECT TRIM(BANK_ACCT) AS BANK_ACCT, BANK_ACCT_NAME, BANK_ID, CURENCY FROM CL_BANK_ACCT ORDER BY BANK_ACCT`,
      {},
      OPT,
    );

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const all: StmtDailyRow[] = ((dayRes.rows as any[]) ?? []).map((r) => ({
      BANK_ACCT: String(r.BANK_ACCT ?? "").trim(),
      DAY: String(r.DAY),
      OPEN: nn(r.OPEN_BAL),
      CLOSE: nn(r.CLOSE_BAL),
      DR: n(r.DR),
      CR: n(r.CR),
      N_DR: n(r.N_DR),
      N_CR: n(r.N_CR),
      MULTI: n(r.MULTI),
    }));
    const accts: StmtAcctRow[] = ((acctRes.rows as any[]) ?? []).map((r) => ({
      BANK_ACCT: String(r.BANK_ACCT ?? "").trim(), BANK_ACCT_NAME: r.BANK_ACCT_NAME ?? null, BANK_ID: r.BANK_ID ?? null, CURENCY: r.CURENCY ?? null,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // ແຍກ: ໃນຊ່ວງ → days · ກ່ອນຊ່ວງ → prior (ຍອດທ້າຍຂອງວັນສຸດທ້າຍທີ່ຍອດປ່ຽນ; ວັນທີ່ໜີ້=ມີ ຍອດບໍ່ປ່ຽນ ຈຶ່ງຂ້າມໄດ້)
    const days = all.filter((r) => r.DAY >= dateFrom);
    const priorMap = new Map<string, number>();
    for (const r of all) {
      if (r.DAY < dateFrom && r.CLOSE != null) priorMap.set(r.BANK_ACCT, r.CLOSE); // ລຽງຕາມວັນ → ຄ່າສຸດທ້າຍທັບ
    }
    const prior: StmtPriorRow[] = [...priorMap].map(([BANK_ACCT, PRIOR_BAL]) => ({ BANK_ACCT, PRIOR_BAL }));
    return { days, prior, accts };
  });
}
