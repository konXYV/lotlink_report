import { NextResponse } from "next/server";
import { ACCOUNTS, VIEWS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

// ════════════════════════════════════════════════════════════════════════
//  ລາຍງານ ສົມທຽບລາງວັນ SCN (Lotlink / Portal / BCEL Statement) ຈຳແນກຕາມງວດ
//   - LOTLINK_BILL_SCN      → ງວດ, ວັນທີ
//   - LOTLINK_REWARD_SCN    → ຍອດຖືກລາງວັນລະບົບ Lotlink
//   - SCN_PORTAL_DATA       → ລາງວັນຕົງ + ລາງວັນໂປໂມຊັນ
//   - O_SCN_BCEL_STMT       → ຈ່າຍລາງວັນ Statement + ອາກອນ 5%
// ════════════════════════════════════════════════════════════════════════

export interface ScnLotlinkRewardReconRow {
  DRAW_ID: string;
  DRAW_DATE: string | null;
  LOTLINK_WIN_AMT: number;
  DIRECT_REWARD_AMT: number;
  PROMOTION_REWARD_AMT: number;
  TOTAL_REWARD_AMT: number;
  TAX_5PCT_AMT: number;
  REWARD_AND_TAX: number;
  BCEL_PAYOUT_AMT: number;
  PAYOUT_DIFF: number;
}

// safe numeric cast: DRAWID may be blank / non-numeric on shared tables
function safeNum(col: string): string {
  return `CASE WHEN REGEXP_LIKE(TRIM(${col}), '^[0-9]+$') THEN TO_NUMBER(TRIM(${col})) END`;
}

function toYMD(value: unknown): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function handleScnLotlinkRewardRecon(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const drawFrom = params.get("draw_from") ?? "";
  const drawTo = params.get("draw_to") ?? "";
  const binds = {
    drawFrom: drawFrom ? Number(drawFrom) : null,
    drawTo: drawTo ? Number(drawTo) : null,
  };

  const sql = `
    WITH bcel_agg AS (
      SELECT
        LOTTO_BILL_NO,
        SUM(CASE
              WHEN TXN_TYPE IN ('SCN BONUS ADJUST', 'SCN LOTTERY PRIZE', 'SCN BONUS', 'SCNN LOTTERY PRIZE', 'SCNBONUS')
              THEN BCEL_DR ELSE 0
            END) AS BCEL_PAYOUT_AMT,
        SUM(CASE
              WHEN TXN_TYPE = 'TAX SCN LOTTERY PRIZE'
              THEN BCEL_CR ELSE 0
            END) AS TAX_5PCT_AMT
      FROM ${VIEWS.SCN_BCEL_STMT}
      WHERE BCEL_ACCT = '${ACCOUNTS.BCEL_SCN_REWARD}'
        AND TXN_TYPE IN ('SCN BONUS ADJUST', 'SCN LOTTERY PRIZE', 'SCN BONUS', 'TAX SCN LOTTERY PRIZE', 'SCNN LOTTERY PRIZE', 'SCNBONUS')
      GROUP BY LOTTO_BILL_NO
    ),
    lotlink_agg AS (
      SELECT
        LOTTO_BILL_NO,
        SUM(NVL(TOTAL_REWARD, 0)) AS LOTLINK_WIN_AMT
      FROM ${VIEWS.LOTLINK_REWARD_SCN}
      GROUP BY LOTTO_BILL_NO
    ),
    portal_agg AS (
      SELECT
        BILL_NUMBER,
        SUM(NVL(TOTAL_REWARD, 0)) AS DIRECT_REWARD_AMT,
        SUM(NVL(TOTAL_BONUS, 0))  AS PROMOTION_REWARD_AMT
      FROM ${VIEWS.SCN_PORTAL_DATA}
      GROUP BY BILL_NUMBER
    )
    SELECT
      b.DRAWID                                   AS DRAW_ID,
      MIN(b.DRAW_DATE)                           AS DRAW_DATE,
      SUM(NVL(l.LOTLINK_WIN_AMT, 0))             AS LOTLINK_WIN_AMT,
      SUM(NVL(p.DIRECT_REWARD_AMT, 0))           AS DIRECT_REWARD_AMT,
      SUM(NVL(p.PROMOTION_REWARD_AMT, 0))        AS PROMOTION_REWARD_AMT,
      SUM(NVL(p.DIRECT_REWARD_AMT, 0)) + SUM(NVL(p.PROMOTION_REWARD_AMT, 0))
                                                 AS TOTAL_REWARD_AMT,
      SUM(NVL(bc.TAX_5PCT_AMT, 0))               AS TAX_5PCT_AMT,
      (SUM(NVL(p.DIRECT_REWARD_AMT, 0)) + SUM(NVL(p.PROMOTION_REWARD_AMT, 0)))
        + SUM(NVL(bc.TAX_5PCT_AMT, 0))           AS REWARD_AND_TAX,
      SUM(NVL(bc.BCEL_PAYOUT_AMT, 0))            AS BCEL_PAYOUT_AMT,
      (SUM(NVL(p.DIRECT_REWARD_AMT, 0)) + SUM(NVL(p.PROMOTION_REWARD_AMT, 0)))
        - SUM(NVL(bc.BCEL_PAYOUT_AMT, 0))        AS PAYOUT_DIFF
    FROM ${VIEWS.LOTLINK_BILL_SCN} b
    LEFT JOIN bcel_agg    bc ON b.BILLNUMBER = bc.LOTTO_BILL_NO
    LEFT JOIN lotlink_agg l  ON b.BILLNUMBER = l.LOTTO_BILL_NO
    LEFT JOIN portal_agg  p  ON b.BILLNUMBER = p.BILL_NUMBER
    WHERE (:drawFrom IS NULL OR ${safeNum("b.DRAWID")} >= :drawFrom)
      AND (:drawTo   IS NULL OR ${safeNum("b.DRAWID")} <= :drawTo)
    GROUP BY b.DRAWID
    ORDER BY ${safeNum("b.DRAWID")} ASC`;

  const res = await conn.execute(sql, binds, OPT_OBJ);
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: (res.rows ?? []).map((r: any) => ({
      DRAW_ID: String(r.DRAW_ID ?? ""),
      DRAW_DATE: toYMD(r.DRAW_DATE),
      LOTLINK_WIN_AMT: Number(r.LOTLINK_WIN_AMT ?? 0),
      DIRECT_REWARD_AMT: Number(r.DIRECT_REWARD_AMT ?? 0),
      PROMOTION_REWARD_AMT: Number(r.PROMOTION_REWARD_AMT ?? 0),
      TOTAL_REWARD_AMT: Number(r.TOTAL_REWARD_AMT ?? 0),
      TAX_5PCT_AMT: Number(r.TAX_5PCT_AMT ?? 0),
      REWARD_AND_TAX: Number(r.REWARD_AND_TAX ?? 0),
      BCEL_PAYOUT_AMT: Number(r.BCEL_PAYOUT_AMT ?? 0),
      PAYOUT_DIFF: Number(r.PAYOUT_DIFF ?? 0),
    })),
  });
}
