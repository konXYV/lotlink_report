import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

/**
 * ລາຍງານຍອດຈ່າຍລາງວັນແຕ່ລະງວດ (LOTLINK_REWARD  ⟶  LOTLINK_PAYOUT)
 *
 *   - reward_agg  : ຍອດລາງວັນທີ່ຕ້ອງຈ່າຍ ຕໍ່ 1 ງວດ (GROUP BY DRAWID, DRAWDATE)
 *   - payout_agg  : ຍອດທີ່ຈ່າຍຈິງ ຕໍ່ 1 ງວດ, ອາດຈ່າຍຫລາຍວັນທີ (GROUP BY DRAW_ID, DRAW_DATE, PAYOUT_DATE)
 *   - JOIN ກັນຜ່ານ p.DRAW_DATE = r.DRAWDATE (ບໍ່ໃຊ້ DRAWID/DRAW_ID ເພາະ format ID ຄົນລະແບບກັນ
 *     ລະຫວ່າງ 2 ຕາຕະລາງ — DRAW_DATE ຄືກຸນແຈທີ່ໜ້າເຊື່ອຖືກວ່າ)
 *
 * ໜື່ງງວດ (1 ແຖວໃນ LOTLINK_REWARD) ສາມາດມີໄດ້ຫລາຍແຖວຈາກ LOTLINK_PAYOUT (ຫລາຍວັນທີ່ຈ່າຍ)
 * ດັ່ງນັ້ນ response ຈະສົ່ງອອກເປັນແຖວແບບ "flat" (1 ແຖວ = 1 ຄູ່ reward+payout_date)
 * ແລ້ວ frontend ຈະ group ຄືນຕາມ DRAWID ເພື່ອສະແດງເປັນ master(ງວດ)/detail(ວັນທີ່ຈ່າຍ)
 */
export async function handleRewardPayoutByDraw(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const from = params.get("from") ?? "";
  const to   = params.get("to")   ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {
    p_from: from ? from : null,
    p_to:   to   ? to   : null,
  };

  const sql = `
    WITH reward_agg AS (
      SELECT r.DRAWID,
             r.DRAWDATE,
             SUM(r.TOTAL_REWARD) AS REWARD_TOTAL,
             COUNT(*)            AS REWARD_COUNT
      FROM   ECOMMERCE2026.LOTLINK_REWARD r
      WHERE  (:p_from IS NULL OR r.DRAWID >= :p_from)
        AND  (:p_to   IS NULL OR r.DRAWID <= :p_to)
      GROUP  BY r.DRAWID, r.DRAWDATE
    ),
    tax_agg AS (
      -- ອາກອນ 5% ສະເພາະລາຍການ (ບິນ) ທີ່ຖືກລາງວັນ >= 50 ລ້ານ ຕໍ່ 1 ງວດ
      SELECT r.DRAWID,
             SUM(CASE WHEN r.TOTAL_REWARD >= 50000000 THEN (r.TOTAL_REWARD - 5000000) * 0.05 ELSE 0 END) AS TAX_TOTAL
      FROM   ECOMMERCE2026.LOTLINK_REWARD r
      WHERE  (:p_from IS NULL OR r.DRAWID >= :p_from)
        AND  (:p_to   IS NULL OR r.DRAWID <= :p_to)
      GROUP  BY r.DRAWID
    ),
    payout_agg AS (
      SELECT p.DRAW_ID,
             p.DRAW_DATE,
             p.PAYOUT_DATE,
             SUM(p.PAYOUT_REWARD_AMT) AS PAYOUT_TOTAL,
             COUNT(*)                 AS PAYOUT_COUNT
      FROM   ECOMMERCE2026.LOTLINK_PAYOUT p
      GROUP  BY p.DRAW_ID, p.DRAW_DATE, p.PAYOUT_DATE
    )
    SELECT
      r.DRAWID                              AS DRAWID,
      TO_CHAR(r.DRAWDATE, 'YYYY-MM-DD')     AS DRAWDATE,
      r.REWARD_TOTAL                        AS REWARD_TOTAL,
      r.REWARD_COUNT                        AS REWARD_COUNT,
      NVL(t.TAX_TOTAL, 0)                   AS TAX_TOTAL,
      p.DRAW_ID                             AS PAYOUT_DRAW_ID,
      TO_CHAR(p.PAYOUT_DATE, 'YYYY-MM-DD')  AS PAYOUT_DATE,
      p.PAYOUT_TOTAL                        AS PAYOUT_TOTAL,
      p.PAYOUT_COUNT                        AS PAYOUT_COUNT
    FROM reward_agg r
    LEFT JOIN tax_agg    t ON t.DRAWID = r.DRAWID
    LEFT JOIN payout_agg p ON p.DRAW_DATE = r.DRAWDATE
    ORDER BY r.DRAWID ASC, p.PAYOUT_DATE ASC`;

  const result = await conn.execute(sql, binds, { ...OPT_OBJ, fetchArraySize: 1000 });

  const rows = (result.rows ?? []).map((r: Record<string, unknown>) => ({
    DRAWID:          String(r.DRAWID ?? ""),
    DRAWDATE:        String(r.DRAWDATE ?? ""),
    REWARD_TOTAL:    Number(r.REWARD_TOTAL ?? 0),
    REWARD_COUNT:    Number(r.REWARD_COUNT ?? 0),
    TAX_TOTAL:       Number(r.TAX_TOTAL ?? 0),
    PAYOUT_DRAW_ID:  r.PAYOUT_DRAW_ID != null ? String(r.PAYOUT_DRAW_ID) : null,
    PAYOUT_DATE:     r.PAYOUT_DATE != null ? String(r.PAYOUT_DATE) : null,
    PAYOUT_TOTAL:    r.PAYOUT_TOTAL != null ? Number(r.PAYOUT_TOTAL) : 0,
    PAYOUT_COUNT:    r.PAYOUT_COUNT != null ? Number(r.PAYOUT_COUNT) : 0,
  }));

  return NextResponse.json({ rows, view: "REWARD_PAYOUT_BY_DRAW" });
}
