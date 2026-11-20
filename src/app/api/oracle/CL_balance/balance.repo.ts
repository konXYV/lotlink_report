// src/app/api/oracle/CL_balance/balance.repo.ts
// ─── ຍອດຍົກມາ/ເຄື່ອນໄຫວ/ຍອດເຫຼືອທ້າຍ ຂອງແຕ່ລະບັນຊີ CL ───────────────────────────────
// CL_BCEL_STMT_SUM  JOIN  CL_BANK_ACCT (BANK_ID = ທະນາຄານ, CURENCY = ສະກຸນເງິນ)
// ບັນຊີທີ່ຢູ່ໃນ CL_BANK_ACCT ຈະອອກສະເໝີ (ເຖິງບໍ່ມີທຸລະກຳ) · ບັນຊີໃນ STMT_SUM ທີ່ບໍ່ຢູ່ໃນ CL_BANK_ACCT ກໍ່ອອກ (ບໍ່ມີສະກຸນເງິນ)
import { withClConnection } from "../CL/cl.connection";

const OPT = { outFormat: 4002, fetchArraySize: 200 };

/** dateTo ເປັນວັນທີ່ລວມ (inclusive) → ໃຊ້ < dateTo + 1 ວັນ (ຄິດແບບ UTC ກັນວັນເລື່ອນ) */
function nextDay(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10);
}

export interface ClBalanceRawRow {
  BANK_ACCT: string;
  BANK_ACCT_NAME: string | null;
  BANK_ID: string | null;
  CURENCY: string | null;
  OPEN_BAL: number | null;
  PRIOR_BAL: number | null;
  DR: number;
  CR: number;
  CLOSE_BAL: number | null;
  FIRST_DATE: string | null;
  LAST_DATE: string | null;
  CNT: number; // ຈຳນວນວັນທີ່ມີຂໍ້ມູນໃນຊ່ວງ
  MULTI: number; // ຈຳນວນວັນທີ່ SOLD/BALANCE ບໍ່ເທົ່າກັນລະຫວ່າງ TXN_TYPE
}

export async function getClBalanceRows(dateFrom: string, dateTo: string): Promise<ClBalanceRawRow[]> {
  const sql = `
    WITH D AS (
      -- ຍຸບເປັນ 1 ແຖວ / ບັນຊີ / ວັນ (ຕາຕະລາງມີຫຼາຍແຖວຕໍ່ວັນ ຕາມ TXN_TYPE)
      -- DR, CR = ລວມທຸກ TXN_TYPE · SOLD/BALANCE ຄວນເທົ່າກັນທຸກແຖວໃນວັນດຽວ (MULTI=1 ຖ້າບໍ່ເທົ່າ)
      SELECT TRIM(BANK_ACCT) AS BANK_ACCT,
             TRUNC(BANK_DATE) AS D,
             MIN(SOLD)    AS SOLD,
             MAX(BALANCE) AS BAL,
             NVL(SUM(DR),0) AS DR,
             NVL(SUM(CR),0) AS CR,
             CASE WHEN COUNT(DISTINCT SOLD) > 1 OR COUNT(DISTINCT BALANCE) > 1 THEN 1 ELSE 0 END AS MULTI
      FROM   CL_BCEL_STMT_SUM
      GROUP  BY TRIM(BANK_ACCT), TRUNC(BANK_DATE)
    ),
    IN_R AS (
      -- ໃນຊ່ວງ: SOLD ວັນທຳອິດ · ລວມ DR/CR · BALANCE ວັນສຸດທ້າຍ
      SELECT BANK_ACCT,
             MIN(SOLD) KEEP (DENSE_RANK FIRST ORDER BY D) AS OPEN_BAL,
             MAX(BAL)  KEEP (DENSE_RANK LAST  ORDER BY D) AS CLOSE_BAL,
             SUM(DR) AS DR,
             SUM(CR) AS CR,
             TO_CHAR(MIN(D),'YYYY-MM-DD') AS FIRST_DATE,
             TO_CHAR(MAX(D),'YYYY-MM-DD') AS LAST_DATE,
             COUNT(*)   AS CNT,
             SUM(MULTI) AS MULTI
      FROM   D
      WHERE  D >= TO_DATE(:dateFrom,'YYYY-MM-DD')
      AND    D <  TO_DATE(:dateTo,'YYYY-MM-DD')
      GROUP  BY BANK_ACCT
    ),
    PRV AS (
      -- ກ່ອນຊ່ວງ: BALANCE ວັນສຸດທ້າຍກ່ອນ dateFrom (ໃຊ້ເມື່ອບັນຊີບໍ່ມີທຸລະກຳໃນຊ່ວງ)
      SELECT BANK_ACCT,
             MAX(BAL) KEEP (DENSE_RANK LAST ORDER BY D) AS PRIOR_BAL
      FROM   D
      WHERE  D < TO_DATE(:dateFrom,'YYYY-MM-DD')
      GROUP  BY BANK_ACCT
    ),
    BASE AS (
      SELECT TRIM(BANK_ACCT) AS BANK_ACCT FROM CL_BANK_ACCT
      UNION SELECT BANK_ACCT FROM IN_R
      UNION SELECT BANK_ACCT FROM PRV
    )
    SELECT b.BANK_ACCT,
           a.BANK_ACCT_NAME, a.BANK_ID, a.CURENCY,
           i.OPEN_BAL, p.PRIOR_BAL,
           NVL(i.DR,0) AS DR, NVL(i.CR,0) AS CR,
           i.CLOSE_BAL, i.FIRST_DATE, i.LAST_DATE, NVL(i.CNT,0) AS CNT, NVL(i.MULTI,0) AS MULTI
    FROM   BASE b
    LEFT JOIN CL_BANK_ACCT a ON TRIM(a.BANK_ACCT) = b.BANK_ACCT
    LEFT JOIN IN_R  i ON i.BANK_ACCT = b.BANK_ACCT
    LEFT JOIN PRV p ON p.BANK_ACCT = b.BANK_ACCT
    ORDER  BY a.CURENCY, b.BANK_ACCT`;

  return withClConnection(async (conn) => {
    const res = await conn.execute(sql, { dateFrom, dateTo: nextDay(dateTo) }, OPT);
    const n = (v: unknown) => (v == null ? null : Number(v));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res.rows as any[]) ?? []).map((r) => ({
      BANK_ACCT: String(r.BANK_ACCT ?? "").trim(),
      BANK_ACCT_NAME: r.BANK_ACCT_NAME ?? null,
      BANK_ID: r.BANK_ID ?? null,
      CURENCY: r.CURENCY ?? null,
      OPEN_BAL: n(r.OPEN_BAL),
      PRIOR_BAL: n(r.PRIOR_BAL),
      DR: Number(r.DR ?? 0),
      CR: Number(r.CR ?? 0),
      CLOSE_BAL: n(r.CLOSE_BAL),
      FIRST_DATE: r.FIRST_DATE ?? null,
      LAST_DATE: r.LAST_DATE ?? null,
      CNT: Number(r.CNT ?? 0),
      MULTI: Number(r.MULTI ?? 0),
    }));
  });
}
