import { NextResponse } from "next/server";
import { VIEWS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

// ════════════════════════════════════════════════════════════════════════
//  ລາຍງານ ຈ່າຍລາງວັນ Quota SCN / SOKXAY ຜ່ານ BCEL — ຈຳແນກຕາມງວດ (DRAW_ID)
//  ອີງຕາມ 2 query ຕົ້ນສະບັບ (QUOTA-SCN / QUOTA-SOKXAY) ຈາກ SCN_PORTAL_DATA
//  quota=SCN     → WHERE QUOTA = 'SCN'
//  quota=SOKXAY  → WHERE QUOTA LIKE '%XAY%'
// ════════════════════════════════════════════════════════════════════════
export async function handleScnRewardQuota(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const quotaParam = (params.get("quota") ?? "SCN").toUpperCase();
  const channel    = params.get("channel") ?? "BCEL";
  const dateFrom   = params.get("date_from") ?? "";
  const dateTo     = params.get("date_to") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = { p_channel: channel };
  const conditions: string[] = ["PAYMENT_CHANNEL = :p_channel"];

  if (quotaParam === "SOKXAY") {
    conditions.push("QUOTA LIKE '%XAY%'");
  } else {
    conditions.push("QUOTA = :p_quota");
    binds.p_quota = "SCN";
  }

  if (dateFrom) {
    conditions.push("TRUNC(DRAW_DATE) >= TO_DATE(:p_from, 'YYYY-MM-DD')");
    binds.p_from = dateFrom;
  }
  if (dateTo) {
    // exclusive upper bound: next day after date_to
    const dt = new Date(dateTo);
    dt.setDate(dt.getDate() + 1);
    conditions.push("TRUNC(DRAW_DATE) < TO_DATE(:p_to, 'YYYY-MM-DD')");
    binds.p_to = dt.toISOString().slice(0, 10);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const sql = `
    SELECT
        MAX(DRAW_DATE) DRAW_DATE,
        DRAW_ID,
        MAX(QUOTA) QUOTA,
        MAX(PAYMENT_CHANNEL) PAYMENT_CHANNEL,
        SUM(AMOUNT) AMOUNT,
        SUM(POINT_USE) POINT_USE,
        SUM(DISCOUNT) DISCOUNT,
        SUM(AFTER_DISCOUNT) AFTER_DISCOUNT,
        SUM(RECON) RECON,
        SUM(Total_Reward) TOTAL_REWARD,
        SUM(Tax_Reward) TAX_REWARD,
        SUM(Reward_After_Tax) REWARD_AFTER_TAX,
        SUM(Total_Bonus) TOTAL_BONUS,
        SUM(TOTAL_WIN) TOTAL_WIN,
        SUM(matchwin2) MATCHWIN2,
        SUM(matchwin3) MATCHWIN3,
        SUM(adjacent2) ADJACENT2,
        SUM(adjacent2front) ADJACENT2FRONT,
        SUM(adjacent3) ADJACENT3,
        SUM(adjacent3front) ADJACENT3FRONT,
        SUM(adjacent4) ADJACENT4,
        SUM(adjacent5) ADJACENT5,
        SUM(adjacent6) ADJACENT6,
        SUM(random3) RANDOM3,
        SUM(random4) RANDOM4,
        SUM(random5) RANDOM5,
        SUM(random6) RANDOM6,
        SUM(invoice2) INVOICE2,
        SUM(invoice3) INVOICE3,
        SUM(invoice4) INVOICE4,
        SUM(invoice5) INVOICE5,
        SUM(invoice6) INVOICE6
    FROM
        ${VIEWS.SCN_PORTAL_DATA}
    ${where}
    GROUP BY DRAW_ID
    ORDER BY DRAW_ID ASC`;

  const result = await conn.execute(sql, binds, OPT_OBJ);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (result.rows ?? []).map((r: any) => ({
    DRAW_DATE:        r.DRAW_DATE ?? null,
    DRAW_ID:          String(r.DRAW_ID ?? ""),
    QUOTA:            r.QUOTA ?? "",
    PAYMENT_CHANNEL:  r.PAYMENT_CHANNEL ?? "",
    AMOUNT:           Number(r.AMOUNT ?? 0),
    POINT_USE:        Number(r.POINT_USE ?? 0),
    DISCOUNT:         Number(r.DISCOUNT ?? 0),
    AFTER_DISCOUNT:   Number(r.AFTER_DISCOUNT ?? 0),
    RECON:            Number(r.RECON ?? 0),
    TOTAL_REWARD:     Number(r.TOTAL_REWARD ?? 0),
    TAX_REWARD:       Number(r.TAX_REWARD ?? 0),
    REWARD_AFTER_TAX: Number(r.REWARD_AFTER_TAX ?? 0),
    TOTAL_BONUS:      Number(r.TOTAL_BONUS ?? 0),
    TOTAL_WIN:        Number(r.TOTAL_WIN ?? 0),
    MATCHWIN2:        Number(r.MATCHWIN2 ?? 0),
    MATCHWIN3:        Number(r.MATCHWIN3 ?? 0),
    ADJACENT2:        Number(r.ADJACENT2 ?? 0),
    ADJACENT2FRONT:   Number(r.ADJACENT2FRONT ?? 0),
    ADJACENT3:        Number(r.ADJACENT3 ?? 0),
    ADJACENT3FRONT:   Number(r.ADJACENT3FRONT ?? 0),
    ADJACENT4:        Number(r.ADJACENT4 ?? 0),
    ADJACENT5:        Number(r.ADJACENT5 ?? 0),
    ADJACENT6:        Number(r.ADJACENT6 ?? 0),
    RANDOM3:          Number(r.RANDOM3 ?? 0),
    RANDOM4:          Number(r.RANDOM4 ?? 0),
    RANDOM5:          Number(r.RANDOM5 ?? 0),
    RANDOM6:          Number(r.RANDOM6 ?? 0),
    INVOICE2:         Number(r.INVOICE2 ?? 0),
    INVOICE3:         Number(r.INVOICE3 ?? 0),
    INVOICE4:         Number(r.INVOICE4 ?? 0),
    INVOICE5:         Number(r.INVOICE5 ?? 0),
    INVOICE6:         Number(r.INVOICE6 ?? 0),
  }));

  return NextResponse.json({ rows, quota: quotaParam });
}
