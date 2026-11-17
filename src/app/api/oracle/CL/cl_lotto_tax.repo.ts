// src/app/api/oracle/CL/cl_lotto_tax.repo.ts
// ─── ລາຍງານອາກອນ CL — ດຶງລະດັບ (ບໍລິການ, ງວດ, ວັນທີ) ຄັ້ງດຽວ; ເດືອນ/ວັນ/ສະຫລຸບ ລວມຝັ່ງ client ───
// ບໍລິການຈາກ 2 ຕົວເລກທຳອິດຂອງ DRAWID: 11 = ນ້ອງໝານຳໂຊກ (DOG) · 36 = ປູປາເຕົ້າມະຫາໂຊກ (PUP)
import { withClConnection } from "./cl.connection";
import { PRIZE_BAND_MAX, PRIZE_EXEMPT } from "@/lib/lottoPrizeTaxCalc";

export type LottoSvc = "DOG" | "PUP";
const SVC_CASE = (col: string) =>
  `CASE SUBSTR(TO_CHAR(${col}),1,2) WHEN '11' THEN 'DOG' WHEN '36' THEN 'PUP' END`;

function rangeBinds(dateFrom: string, dateTo: string) {
  // dateTo ເປັນວັນທີ່ລວມ (inclusive) → ໃຊ້ < dateTo + 1 ວັນ
  const to = new Date(dateTo);
  to.setDate(to.getDate() + 1);
  return { dateFrom, dateTo: to.toISOString().slice(0, 10) };
}

const OPT = { outFormat: 4002, fetchArraySize: 500 };

export interface ClVatRow {
  SVC: LottoSvc;
  DRAWID: string;
  DAY: string;
  A_SALES: number;
  B_PAID: number;
}

export async function getClLottoTaxRows(dateFrom: string, dateTo: string): Promise<ClVatRow[]> {
  const sql = `
    SELECT SVC, DRAWID, DAY, SUM(A_SALES) AS A_SALES, SUM(B_PAID) AS B_PAID
    FROM (
      SELECT ${SVC_CASE("s.DRAWID")} AS SVC, TO_CHAR(s.DRAWID) AS DRAWID,
             TO_CHAR(TRUNC(s.DRAWDATE),'YYYY-MM-DD') AS DAY,
             SUM(s.AMOUNT) AS A_SALES, 0 AS B_PAID
      FROM   CL_LOTTO_SELL s
      WHERE  s.DRAWDATE >= TO_DATE(:dateFrom,'YYYY-MM-DD')
      AND    s.DRAWDATE <  TO_DATE(:dateTo,'YYYY-MM-DD')
      AND    SUBSTR(TO_CHAR(s.DRAWID),1,2) IN ('11','36')
      GROUP  BY ${SVC_CASE("s.DRAWID")}, TO_CHAR(s.DRAWID), TO_CHAR(TRUNC(s.DRAWDATE),'YYYY-MM-DD')
      UNION ALL
      SELECT ${SVC_CASE("r.DRAWID")} AS SVC, TO_CHAR(r.DRAWID) AS DRAWID,
             TO_CHAR(TRUNC(r.DRAWDATE),'YYYY-MM-DD') AS DAY,
             0 AS A_SALES, SUM(r.WINAMOUNT) AS B_PAID
      FROM   CL_LOTTO_REWARD r
      WHERE  r.DRAWDATE >= TO_DATE(:dateFrom,'YYYY-MM-DD')
      AND    r.DRAWDATE <  TO_DATE(:dateTo,'YYYY-MM-DD')
      AND    SUBSTR(TO_CHAR(r.DRAWID),1,2) IN ('11','36')
      GROUP  BY ${SVC_CASE("r.DRAWID")}, TO_CHAR(r.DRAWID), TO_CHAR(TRUNC(r.DRAWDATE),'YYYY-MM-DD')
    )
    GROUP BY SVC, DRAWID, DAY
    ORDER BY DAY, DRAWID`;
  return withClConnection(async (conn) => {
    const res = await conn.execute(sql, rangeBinds(dateFrom, dateTo), OPT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res.rows as any[]) ?? []).map((r) => ({
      SVC: r.SVC as LottoSvc,
      DRAWID: String(r.DRAWID),
      DAY: String(r.DAY),
      A_SALES: Number(r.A_SALES ?? 0),
      B_PAID: Number(r.B_PAID ?? 0),
    }));
  });
}

export interface ClPrizeRow {
  SVC: LottoSvc;
  DRAWID: string;
  DAY: string;
  LOW_SUM: number; // ລວມລາງວັນໃບທີ່ <= 10ລ້ານ (ບໍ່ເສຍອາກອນ)
  MID_SUM: number; // ລວມລາງວັນໃບທີ່ > 10ລ້ານ ແລະ < 50ລ້ານ
  MID_CNT: number; // ຈຳນວນໃບ
  HIGH_SUM: number; // ລວມລາງວັນໃບທີ່ >= 50ລ້ານ
  HIGH_CNT: number;
}

// ໝາຍເຫດ: 1 ແຖວຂອງ CL_LOTTO_REWARD ຖືວ່າເປັນ 1 ໃບທີ່ຖືກ (ອາກອນຄິດຕໍ່ໃບ)
export async function getClLottoPrizeTaxRows(dateFrom: string, dateTo: string): Promise<ClPrizeRow[]> {
  const LOW = `r.WINAMOUNT <= ${PRIZE_EXEMPT}`;
  const MID = `r.WINAMOUNT > ${PRIZE_EXEMPT} AND r.WINAMOUNT < ${PRIZE_BAND_MAX}`;
  const HIGH = `r.WINAMOUNT >= ${PRIZE_BAND_MAX}`;
  const sql = `
    SELECT ${SVC_CASE("r.DRAWID")} AS SVC, TO_CHAR(r.DRAWID) AS DRAWID,
           TO_CHAR(TRUNC(r.DRAWDATE),'YYYY-MM-DD') AS DAY,
           NVL(SUM(CASE WHEN ${LOW}  THEN r.WINAMOUNT END),0) AS LOW_SUM,
           NVL(SUM(CASE WHEN ${MID}  THEN r.WINAMOUNT END),0) AS MID_SUM,
           COUNT(CASE WHEN ${MID}  THEN 1 END)                AS MID_CNT,
           NVL(SUM(CASE WHEN ${HIGH} THEN r.WINAMOUNT END),0) AS HIGH_SUM,
           COUNT(CASE WHEN ${HIGH} THEN 1 END)                AS HIGH_CNT
    FROM   CL_LOTTO_REWARD r
    WHERE  r.DRAWDATE >= TO_DATE(:dateFrom,'YYYY-MM-DD')
    AND    r.DRAWDATE <  TO_DATE(:dateTo,'YYYY-MM-DD')
    AND    SUBSTR(TO_CHAR(r.DRAWID),1,2) IN ('11','36')
    GROUP  BY ${SVC_CASE("r.DRAWID")}, TO_CHAR(r.DRAWID), TO_CHAR(TRUNC(r.DRAWDATE),'YYYY-MM-DD')
    ORDER  BY DAY, DRAWID`;
  return withClConnection(async (conn) => {
    const res = await conn.execute(sql, rangeBinds(dateFrom, dateTo), OPT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res.rows as any[]) ?? []).map((r) => ({
      SVC: r.SVC as LottoSvc,
      DRAWID: String(r.DRAWID),
      DAY: String(r.DAY),
      LOW_SUM: Number(r.LOW_SUM ?? 0),
      MID_SUM: Number(r.MID_SUM ?? 0),
      MID_CNT: Number(r.MID_CNT ?? 0),
      HIGH_SUM: Number(r.HIGH_SUM ?? 0),
      HIGH_CNT: Number(r.HIGH_CNT ?? 0),
    }));
  });
}
