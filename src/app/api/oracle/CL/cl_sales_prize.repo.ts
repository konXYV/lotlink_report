// src/app/api/oracle/CL/cl_sales_prize.repo.ts
// ─── 2 ລາຍງານແຍກກັນ ຕາມງວດ (DRAWID) × ຜູ້ຂາຍ (USERNAME) ─────────────────────────────────────
//  1) ລາຍງານຂາຍ         (getClSalesByDraw)  : CL_LOTTO_SELL  ທຽບ ເງິນເຂົ້າບັນຊີ 0101300016617
//  2) ລາຍງານຈ່າຍລາງວັນ   (getClPrizeByDraw)  : CL_LOTTO_REWARD ທຽບ ເງິນຈ່າຍອອກ  0101300016635
// ກິດຈະກຳແຍກຈາກ 2 ຕົວທຳອິດຂອງ DRAWID: 11 = ນ້ອງໝານຳໂຊກ (DOG) · 36 = ປູປາເຕົ້າມະຫາໂຊກ (PUP)
//
// ການເລືອກງວດ: ເອົາງວດຈາກ CL_LOTTO_SELL ທີ່ DRAWDATE ຢູ່ໃນຊ່ວງ ເທົ່ານັ້ນ
// ແລ້ວໄປຊອກເງິນເຂົ້າ/ຈ່າຍອອກ/ລາງວັນ ຂອງງວດເຫຼົ່ານັ້ນຕາມ DRAWID ໂດຍບໍ່ຈຳກັດວັນທີ່ທະນາຄານ
// (ຂາຍ 31/10 ເງິນເຂົ້າ 1/11 ຫຼື ຂ້າມເດືອນ ກໍຍັງເຂົ້າງວດເດີມ).
//
// ຈ່າຍເງິນສົດ / ຈ່າຍຄະແນນ : USEPOINTFLAG = 1 ແມ່ນຈ່າຍດ້ວຍຄະແນນ (ບໍ່ມີເງິນເຂົ້າບັນຊີ) — ແຍກຈາກເງິນສົດ
// ເງິນເຂົ້າ / ຈ່າຍອອກ ຜ່ານບັນຊີ BCEL ເປັນຂອງ USERNAME = 0101001APP ເທົ່ານັ້ນ; ຜູ້ຂາຍອື່ນ (ເຊັ່ນ PDF) ສະແດງແຍກເປັນແຖວຂອງຕົນເອງ
import { withClConnection } from "./cl.connection";
import {
  ACCT_SALES_IN,
  ACCT_PRIZE_OUT,
  APP_USERNAME,
} from "@/lib/clSalesPrizeCore";

export const SALES_PRIZE_ACCOUNTS = {
  BANK_IN: ACCT_SALES_IN, // ບັນຊີຮັບເງິນຂາຍ (BCEL_ECOM_SokxayPLUS_SETTLE)
  BANK_OUT: ACCT_PRIZE_OUT, // ບັນຊີຈ່າຍເງິນລາງວັນ (Dog racing prize / Pupatao prize)
} as const;

export const SALES_PRIZE_TXN = {
  IN: "BCEL_ECOM_SokxayPLUS_SETTLE",
  OUT: ["Dog racing prize", "Pupatao prize"],
} as const;

// ຄ່າທຳນຽມຈ່າຍລາງວັນ (1.800/ທຸລະກຳ) ແລະ ອາກອນ 5% ຫັກຈາກຜູ້ຖືກລາງວັນ — ຢູ່ໃນບັນຊີຈ່າຍລາງວັນ BANK_OUT ຄືກັນ
export const PRIZE_FEE_TYPES = [
  "FEE_Dog racing prize",
  "FEE_Pupatao prize",
] as const; // ຖັນ BANK_DR (ຕັດອອກ)
export const PRIZE_TAX_TYPES = [
  "TAX Pupatao prize",
  "TAX Dog racing prize",
] as const; // ຖັນ BANK_CR (ເຂົ້າບັນຊີ)

export type SalesPrizeSvc = "DOG" | "PUP";

/** 1 ແຖວ = 1 ງວດ × 1 ຜູ້ຂາຍ (ທຸກງວດມີແຖວ APP ສະເໝີ ເຖິງຈະບໍ່ມີຍອດ) */
export interface ClSalesRow {
  SVC: SalesPrizeSvc;
  DRAWID: string;
  DAY: string; // YYYY-MM-DD ວັນທີ່ງວດ
  USERNAME: string;
  IS_APP: boolean;
  CASH: number; // ຈ່າຍເງິນສົດ (USEPOINTFLAG ≠ 1)
  POINT: number; // ຈ່າຍຄະແນນ (USEPOINTFLAG = 1)
  BANK_IN: number; // ເງິນເຂົ້າບັນຊີຈິງ (ສະເພາະແຖວ APP)
}

export interface ClPrizeRow {
  SVC: SalesPrizeSvc;
  DRAWID: string;
  DAY: string;
  USERNAME: string;
  IS_APP: boolean;
  CASH: number; // ຖືກຜ່ານຈ່າຍເງິນສົດ
  POINT: number; // ຖືກຜ່ານຈ່າຍຄະແນນ
  FEE: number; // ຄ່າທຳນຽມຈ່າຍລາງວັນ (TXN_TYPE FEE_...) — ສະເພາະແຖວ APP
  BANK_PAID: number; // ເງິນລາງວັນຈ່າຍອອກຈາກບັນຊີ (ສະເພາະແຖວ APP)
  TAX: number; // ອາກອນ 5% ຫັກຈາກຜູ້ຖືກລາງວັນເຂົ້າບັນຊີ (TXN_TYPE TAX ...) — ສະເພາະແຖວ APP
}

const OPT = { outFormat: 4002, fetchArraySize: 500 };
const SVC_PREFIX = `('11','36')`;
const typesSql = (a: readonly string[]) => a.map((t) => `'${t}'`).join(",");
const OUT_TYPES_SQL = SALES_PRIZE_TXN.OUT.map((t) => `'${t}'`).join(",");

const IS_APP = `TRIM(UPPER(USERNAME)) = :appUser`;
const IS_POINT = `NVL(USEPOINTFLAG,0) = 1`;
const BANK_IN_COND = `BANK_ACCT = :acctIn AND TXN_TYPE = :txnIn`;
const BANK_OUT_COND = `BANK_ACCT = :acctOut AND TXN_TYPE IN (${OUT_TYPES_SQL})`;
const rng = (col: string) =>
  `${col} >= TO_DATE(:dateFrom,'YYYY-MM-DD') AND ${col} < TO_DATE(:dateTo,'YYYY-MM-DD')`;

/** dateTo ເປັນວັນທີ່ລວມ (inclusive) → ໃຊ້ < dateTo + 1 ວັນ */
function rangeBinds(dateFrom: string, dateTo: string) {
  const to = new Date(dateTo);
  to.setDate(to.getDate() + 1);
  return { dateFrom, dateTo: to.toISOString().slice(0, 10) };
}

// ງວດ = ທຸກງວດໃນ CL_LOTTO_SELL ທີ່ DRAWDATE ຢູ່ໃນຊ່ວງ (ເລືອກຈາກຕາຕະລາງຂາຍຢ່າງດຽວ) + ວັນທີ່ງວດ
const IDS_CTE = `
    ids AS (
      SELECT TO_CHAR(DRAWID) AS DRAWID FROM CL_LOTTO_SELL
       WHERE ${rng("DRAWDATE")} AND SUBSTR(TO_CHAR(DRAWID),1,2) IN ${SVC_PREFIX}
       GROUP BY TO_CHAR(DRAWID)
    ),
    dd AS (
      SELECT TO_CHAR(DRAWID) AS DRAWID, MIN(TRUNC(DRAWDATE)) AS D FROM CL_LOTTO_SELL
       WHERE TO_CHAR(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TO_CHAR(DRAWID)
    )`;

const svcOf = (id: string): SalesPrizeSvc =>
  id.startsWith("11") ? "DOG" : "PUP";

// ════════════════════════════ ລາຍງານຂາຍ ════════════════════════════
export async function getClSalesByDraw(
  dateFrom: string,
  dateTo: string,
): Promise<{ rows: ClSalesRow[]; unassigned: { BANK_IN: number } }> {
  const rb = rangeBinds(dateFrom, dateTo);
  const mainBinds = {
    ...rb,
    acctIn: ACCT_SALES_IN,
    txnIn: SALES_PRIZE_TXN.IN,
    appUser: APP_USERNAME,
  };
  // node-oracledb ຈະ error ຖ້າ bind ເກີນ → query ນີ້ໃຊ້ສະເພາະ 4 ຕົວນີ້
  const unBinds = { ...rb, acctIn: ACCT_SALES_IN, txnIn: SALES_PRIZE_TXN.IN };

  const sqlMain = `
    WITH ${IDS_CTE},
    sel AS (
      SELECT TO_CHAR(DRAWID) AS DRAWID, NVL(TRIM(USERNAME),'-') AS UN,
             MAX(CASE WHEN ${IS_APP} THEN 1 ELSE 0 END) AS IS_APP,
             SUM(CASE WHEN ${IS_POINT} THEN 0 ELSE NVL(AMOUNT,0) END) AS CASH,
             SUM(CASE WHEN ${IS_POINT} THEN NVL(AMOUNT,0) ELSE 0 END) AS PT
        FROM CL_LOTTO_SELL
       WHERE TO_CHAR(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TO_CHAR(DRAWID), NVL(TRIM(USERNAME),'-')
    ),
    bin AS (
      SELECT TRIM(DRAWID) AS DRAWID, SUM(NVL(BANK_CR,0)) AS A
        FROM CL_BCEL_STMT
       WHERE ${BANK_IN_COND} AND TRIM(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TRIM(DRAWID)
    )
    -- ແຖວ APP: ມີທຸກງວດ (ເງິນເຂົ້າບັນຊີເປັນຂອງ APP)
    SELECT d.DRAWID, TO_CHAR(d.D,'YYYY-MM-DD') AS DAY, :appUser AS UN, 1 AS IS_APP,
           NVL(s.CASH,0) AS CASH, NVL(s.PT,0) AS PT, NVL(b.A,0) AS BANK_IN
      FROM dd d
      LEFT JOIN sel s ON s.DRAWID = d.DRAWID AND s.IS_APP = 1
      LEFT JOIN bin b ON b.DRAWID = d.DRAWID
    UNION ALL
    -- ແຖວຜູ້ຂາຍອື່ນ (ເຊັ່ນ PDF)
    SELECT s.DRAWID, TO_CHAR(d.D,'YYYY-MM-DD'), s.UN, 0, s.CASH, s.PT, 0
      FROM sel s JOIN dd d ON d.DRAWID = s.DRAWID
     WHERE s.IS_APP = 0
     ORDER BY 2, 1, 3`;

  // ເງິນເຂົ້າທີ່ບໍ່ຖືກຜູກກັບງວດ — ສະແດງເຕືອນໃນໜ້າ ເພື່ອບໍ່ໃຫ້ເງິນຫາຍເງົ້າຈາກຜົນລວມ
  const sqlUnassigned = `
    SELECT NVL(SUM(NVL(BANK_CR,0)),0) AS BANK_IN
      FROM CL_BCEL_STMT
     WHERE ${rng("BANK_DATE")} AND ${BANK_IN_COND}
       AND NVL(SUBSTR(TRIM(DRAWID),1,2),'--') NOT IN ${SVC_PREFIX}`;

  return withClConnection(async (conn) => {
    const [mainRes, unRes] = await Promise.all([
      conn.execute(sqlMain, mainBinds, OPT),
      conn.execute(sqlUnassigned, unBinds, OPT),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: ClSalesRow[] = ((mainRes.rows as any[]) ?? []).map((r) => ({
      SVC: svcOf(String(r.DRAWID)),
      DRAWID: String(r.DRAWID),
      DAY: String(r.DAY ?? ""),
      USERNAME: String(r.UN ?? ""),
      IS_APP: Number(r.IS_APP) === 1,
      CASH: Number(r.CASH ?? 0),
      POINT: Number(r.PT ?? 0),
      BANK_IN: Number(r.BANK_IN ?? 0),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = ((unRes.rows as any[]) ?? [])[0] ?? {};
    return { rows, unassigned: { BANK_IN: Number(u.BANK_IN ?? 0) } };
  });
}

// ════════════════════════════ ລາຍງານຈ່າຍລາງວັນ ════════════════════════════
// ໝາຍເຫດ: ສົມມຸດ CL_LOTTO_REWARD ມີຄໍລຳ USEPOINTFLAG ຄືກັບ CL_LOTTO_SELL (ຖືກຜ່ານເງິນສົດ / ຄະແນນ)
export async function getClPrizeByDraw(
  dateFrom: string,
  dateTo: string,
): Promise<{ rows: ClPrizeRow[]; unassigned: { BANK_PAID: number } }> {
  const rb = rangeBinds(dateFrom, dateTo);
  const mainBinds = { ...rb, acctOut: ACCT_PRIZE_OUT, appUser: APP_USERNAME };
  const unBinds = { ...rb, acctOut: ACCT_PRIZE_OUT };

  const sqlMain = `
    WITH ${IDS_CTE},
    rwd AS (
      SELECT TO_CHAR(DRAWID) AS DRAWID, NVL(TRIM(USERNAME),'-') AS UN,
             MAX(CASE WHEN ${IS_APP} THEN 1 ELSE 0 END) AS IS_APP,
             SUM(CASE WHEN ${IS_POINT} THEN 0 ELSE NVL(WINAMOUNT,0) END) AS CASH,
             SUM(CASE WHEN ${IS_POINT} THEN NVL(WINAMOUNT,0) ELSE 0 END) AS PT
        FROM CL_LOTTO_REWARD
       WHERE TO_CHAR(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TO_CHAR(DRAWID), NVL(TRIM(USERNAME),'-')
    ),
    bout AS (
      SELECT TRIM(DRAWID) AS DRAWID, SUM(NVL(BANK_DR,0)) AS A
        FROM CL_BCEL_STMT
       WHERE ${BANK_OUT_COND} AND TRIM(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TRIM(DRAWID)
    ),
    bfee AS (
      SELECT TRIM(DRAWID) AS DRAWID, SUM(NVL(BANK_DR,0)) AS A
        FROM CL_BCEL_STMT
       WHERE BANK_ACCT = :acctOut AND TXN_TYPE IN (${typesSql(PRIZE_FEE_TYPES)})
         AND TRIM(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TRIM(DRAWID)
    ),
    btax AS (
      SELECT TRIM(DRAWID) AS DRAWID, SUM(NVL(BANK_CR,0)) AS A
        FROM CL_BCEL_STMT
       WHERE BANK_ACCT = :acctOut AND TXN_TYPE IN (${typesSql(PRIZE_TAX_TYPES)})
         AND TRIM(DRAWID) IN (SELECT DRAWID FROM ids)
       GROUP BY TRIM(DRAWID)
    )
    SELECT d.DRAWID, TO_CHAR(d.D,'YYYY-MM-DD') AS DAY, :appUser AS UN, 1 AS IS_APP,
           NVL(r.CASH,0) AS CASH, NVL(r.PT,0) AS PT, NVL(f.A,0) AS FEE, NVL(b.A,0) AS BANK_PAID, NVL(x.A,0) AS TAX
      FROM dd d
      LEFT JOIN rwd r ON r.DRAWID = d.DRAWID AND r.IS_APP = 1
      LEFT JOIN bout b ON b.DRAWID = d.DRAWID
      LEFT JOIN bfee f ON f.DRAWID = d.DRAWID
      LEFT JOIN btax x ON x.DRAWID = d.DRAWID
    UNION ALL
    SELECT r.DRAWID, TO_CHAR(d.D,'YYYY-MM-DD'), r.UN, 0, r.CASH, r.PT, 0, 0, 0
      FROM rwd r JOIN dd d ON d.DRAWID = r.DRAWID
     WHERE r.IS_APP = 0
     ORDER BY 2, 1, 3`;

  const sqlUnassigned = `
    SELECT NVL(SUM(NVL(BANK_DR,0)),0) AS BANK_PAID
      FROM CL_BCEL_STMT
     WHERE ${rng("BANK_DATE")} AND ${BANK_OUT_COND}
       AND NVL(SUBSTR(TRIM(DRAWID),1,2),'--') NOT IN ${SVC_PREFIX}`;

  return withClConnection(async (conn) => {
    const [mainRes, unRes] = await Promise.all([
      conn.execute(sqlMain, mainBinds, OPT),
      conn.execute(sqlUnassigned, unBinds, OPT),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: ClPrizeRow[] = ((mainRes.rows as any[]) ?? []).map((r) => ({
      SVC: svcOf(String(r.DRAWID)),
      DRAWID: String(r.DRAWID),
      DAY: String(r.DAY ?? ""),
      USERNAME: String(r.UN ?? ""),
      IS_APP: Number(r.IS_APP) === 1,
      CASH: Number(r.CASH ?? 0),
      POINT: Number(r.PT ?? 0),
      FEE: Number(r.FEE ?? 0),
      BANK_PAID: Number(r.BANK_PAID ?? 0),
      TAX: Number(r.TAX ?? 0),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = ((unRes.rows as any[]) ?? [])[0] ?? {};
    return { rows, unassigned: { BANK_PAID: Number(u.BANK_PAID ?? 0) } };
  });
}
