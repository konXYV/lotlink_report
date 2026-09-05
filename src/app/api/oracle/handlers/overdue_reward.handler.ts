import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

/**
 * ລາຍງານ ລາງວັນຄ້າງຈ່າຍ — ງວດອອກແລ້ວເກີນ 15 ວັນ ແຕ່ຍັງບໍ່ພົບລາຍການຈ່າຍ
 * (LOTLINK_REWARD ⟶ NOT EXISTS ⟶ LOTLINK_PAYOUT, match ຜ່ານ LOTTO_BILL_NO
 *  ທີ່ຖືກ normalize ດ້ວຍ REGEXP_REPLACE ເອົາສະເພາະ A-Z0-9 ອອກມາປຽບທຽບ)
 *
 * ຕົວກອງທາງເລືອກ (optional): from/to = ຊ່ວງງວດທີ (DRAWID), days = ຈຳນວນວັນ
 * ນັບແຕ່ວັນອອກງວດ (default 15, ຄືເງື່ອນໄຂເດີມ)
 */
export async function handleOverdueUnpaidReward(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const from = params.get("from") ?? "";
  const to   = params.get("to")   ?? "";
  const daysRaw = params.get("days") ?? "15";
  const days = Number.isFinite(Number(daysRaw)) && Number(daysRaw) > 0 ? Number(daysRaw) : 15;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = { p_days: days };
  const clauses: string[] = [
    "r.LOTTO_BILL_NO IS NOT NULL",
    "r.DRAWDATE <= TRUNC(SYSDATE) - :p_days",
  ];
  if (from) { clauses.push("r.DRAWID >= :p_from"); binds.p_from = from; }
  if (to)   { clauses.push("r.DRAWID <= :p_to");   binds.p_to   = to;   }

  const where = clauses.join("\n        AND  ");

  const sql = `
    SELECT TO_CHAR(r.DRAWID)                          AS DRAWID,
           TO_CHAR(r.DRAWDATE, 'YYYY-MM-DD HH24:MI:SS') AS DRAWDATE,
           r.LOTTO_BILL_NO                             AS LOTTO_BILL_NO,
           r.TOTAL_REWARD                              AS TOTAL_REWARD,
           CASE
               WHEN r.SELL_USER = '080821001APP' THEN 'APP'
               ELSE 'POS'
           END                                          AS SELL_USER
    FROM   ECOMMERCE2026.LOTLINK_REWARD r
    WHERE  ${where}
    AND    NOT EXISTS (
               SELECT 1
               FROM   ECOMMERCE2026.LOTLINK_PAYOUT p
               WHERE  REGEXP_REPLACE(p.PAYOUT_LOTTO_BILL_NO, '[^A-Z0-9]', '')
                      = REGEXP_REPLACE(r.LOTTO_BILL_NO, '[^A-Z0-9]', '')
           )
    ORDER BY r.DRAWDATE, r.LOTTO_BILL_NO`;

  const result = await conn.execute(sql, binds, { ...OPT_OBJ, fetchArraySize: 1000 });

  const rows = (result.rows ?? []).map((r: Record<string, unknown>) => ({
    DRAWID:        String(r.DRAWID ?? ""),
    DRAWDATE:      String(r.DRAWDATE ?? ""),
    LOTTO_BILL_NO: String(r.LOTTO_BILL_NO ?? ""),
    TOTAL_REWARD:  Number(r.TOTAL_REWARD ?? 0),
    SELL_USER:     String(r.SELL_USER ?? ""),
  }));

  const totals = {
    COUNT:        rows.length,
    TOTAL_REWARD: rows.reduce((s, r) => s + r.TOTAL_REWARD, 0),
  };

  return NextResponse.json({ rows, totals, days, view: "OVERDUE_UNPAID_REWARD" });
}
