// src/app/api/oracle/CL_tax_monthly/tax_monthly.repo.ts
// ─── ຕາຕະລາງຄິດໄລ່ ອມພ, ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ — ດຶງ "ຍອດຂາຍ" ແລະ "ຍອດຈ່າຍເງິນລາງວັນ" ຂອງ 1 ເດືອນ ───
//  ຍອດຂາຍ         = SUM(CL_LOTTO_SELL.AMOUNT)       ຕາມ DRAWDATE ໃນເດືອນ
//  ຍອດຈ່າຍລາງວັນ = SUM(CL_LOTTO_REWARD.WINAMOUNT)  ຕາມ DRAWDATE ໃນເດືອນ
//  (ແຫຼ່ງຂໍ້ມູນ/ນິຍາມດຽວກັບ ລາຍງານອາກອນ CL ເດີມ — ແຕ່ໄຟລ໌ນີ້ແຍກຕ່າງຫາກ, read-only SELECT)
//  ກິດຈະກຳ ຈາກ 2 ຕົວທຳອິດຂອງ DRAWID: 11 = ນ້ອງໝານຳໂຊກ (DOG) · 36 = ປູປາເຕົ້າມະຫາໂຊກ (PUP)
import { withClConnection } from "../CL/cl.connection";

export type TaxSvc = "DOG" | "PUP";
export interface TaxMonthlyRaw {
  DOG: { sales: number; paid: number };
  PUP: { sales: number; paid: number };
}

const OPT = { outFormat: 4002 };
const SVC_CASE = (col: string) =>
  `CASE SUBSTR(TO_CHAR(${col}),1,2) WHEN '11' THEN 'DOG' WHEN '36' THEN 'PUP' END`;

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthBinds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { dateFrom: `${month}-01`, dateTo: next };
}

export async function getClTaxMonthly(month: string): Promise<TaxMonthlyRaw> {
  const binds = monthBinds(month);
  const sqlSales = `
    SELECT ${SVC_CASE("DRAWID")} AS SVC, NVL(SUM(AMOUNT),0) AS V
      FROM CL_LOTTO_SELL
     WHERE DRAWDATE >= TO_DATE(:dateFrom,'YYYY-MM-DD') AND DRAWDATE < TO_DATE(:dateTo,'YYYY-MM-DD')
       AND SUBSTR(TO_CHAR(DRAWID),1,2) IN ('11','36')
     GROUP BY ${SVC_CASE("DRAWID")}`;
  const sqlPaid = `
    SELECT ${SVC_CASE("DRAWID")} AS SVC, NVL(SUM(WINAMOUNT),0) AS V
      FROM CL_LOTTO_REWARD
     WHERE DRAWDATE >= TO_DATE(:dateFrom,'YYYY-MM-DD') AND DRAWDATE < TO_DATE(:dateTo,'YYYY-MM-DD')
       AND SUBSTR(TO_CHAR(DRAWID),1,2) IN ('11','36')
     GROUP BY ${SVC_CASE("DRAWID")}`;

  return withClConnection(async (conn) => {
    const out: TaxMonthlyRaw = { DOG: { sales: 0, paid: 0 }, PUP: { sales: 0, paid: 0 } };
    const s = await conn.execute(sqlSales, binds, OPT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (s.rows as any[]) ?? []) if (r.SVC in out) out[r.SVC as TaxSvc].sales = Number(r.V ?? 0);
    const p = await conn.execute(sqlPaid, binds, OPT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (p.rows as any[]) ?? []) if (r.SVC in out) out[r.SVC as TaxSvc].paid = Number(r.V ?? 0);
    return out;
  });
}
