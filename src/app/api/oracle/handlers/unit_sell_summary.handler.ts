import { NextResponse } from "next/server";
import { VIEWS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

// The in-app self-checkout channel. This is a POS_ID on LOTLINK_SELL_BY_USER
// (same value used elsewhere in this codebase, e.g. summary.handler.ts), and
// must NEVER be included in any of the 3 unit/province sell-summary reports.
const APP_POS_ID = "080821001APP";

type Variant = "nkl" | "province" | "toubee";
const VARIANTS: Variant[] = ["nkl", "province", "toubee"];

// One shared base query (LOTLINK_SELL_BY_USER joined to LOTLINK_UNIT),
// three different UNIT_NAME / POS_OWNER_PAYMENT filters — mirrors the 3
// queries supplied for toubee_unit_summary / withdraw_summary_by_province /
// nkl_unit_sell_summary exactly, including the two hardcoded END_DATE
// exclusions from the source queries.
function variantClause(variant: Variant): string {
  switch (variant) {
    // ນະຄອນຫລວງ ສະເພາະ SCN (nkl_unit_sell_summary)
    case "nkl":
      return `(u.UNIT_NAME LIKE '%VTE%' OR u.UNIT_NAME = 'SCN ຕຸບີ')`;
    // ຕ່າງແຂວງ SCN, ບໍ່ເອົາ POS-TouBee (withdraw_summary_by_province)
    case "province":
      return `u.UNIT_NAME NOT LIKE 'VTE%' AND u.UNIT_NAME <> 'SCN ຕຸບີ' AND u.POS_OWNER_PAYMENT <> 'POS-TouBee'`;
    // POS-TouBee ເທົ່ານັ້ນ (toubee_unit_summary)
    case "toubee":
      return `u.UNIT_NAME NOT LIKE 'VTE%' AND u.UNIT_NAME <> 'SCN ຕຸບີ' AND u.POS_OWNER_PAYMENT = 'POS-TouBee'`;
  }
}

export async function handleUnitSellSummary(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const variant = (params.get("variant") ?? "") as Variant;
  if (!VARIANTS.includes(variant)) {
    return NextResponse.json(
      { error: `variant ບໍ່ຖືກຕ້ອງ: "${variant}". ໃຊ້: ${VARIANTS.join(" | ")}` },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = { p_app: APP_POS_ID };
  const clauses = [
    "s.UNIT_ID <> '0821000'",
    "s.POS_ID <> :p_app", // 🔒 080821001APP must never appear in these reports
    variantClause(variant),
    "TRUNC(u.END_DATE) <> TO_DATE('2026-02-19', 'YYYY-MM-DD')",
    "TRUNC(u.END_DATE) <> TO_DATE('2026-05-24', 'YYYY-MM-DD')",
  ];

  const drawId = params.get("draw_id") ?? "";
  const date   = params.get("date")    ?? "";
  if (drawId) { clauses.push("s.DRAW_ID = :p_draw_id"); binds.p_draw_id = drawId; }
  if (date)   { clauses.push("TRUNC(s.DRAW_DATE) = TO_DATE(:p_date, 'YYYY-MM-DD')"); binds.p_date = date; }

  const where = `WHERE ${clauses.join("\n      AND ")}`;

  const sql = `
    SELECT u.UNIT_ID,
           u.UNIT_NAME,
           u.POS_OWNER_PAYMENT,
           SUM(s.SELL_TT) AS TOTAL_SELL_TT,
           SUM(s.WIN_TT)  AS TOTAL_WIN_TT,
           COUNT(*)       AS QTY
    FROM ${VIEWS.LOTLINK_SELL_BY_USER} s
    LEFT JOIN ${VIEWS.LOTLINK_UNIT} u ON u.UNIT_ID = s.UNIT_ID
    ${where}
    GROUP BY u.UNIT_ID, u.UNIT_NAME, u.POS_OWNER_PAYMENT
    ORDER BY u.UNIT_ID ASC, TOTAL_SELL_TT DESC`;

  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    rows: (result.rows ?? []).map((r: any) => ({
      UNIT_ID:            String(r.UNIT_ID ?? ""),
      UNIT_NAME:           String(r.UNIT_NAME ?? ""),
      POS_OWNER_PAYMENT:   String(r.POS_OWNER_PAYMENT ?? ""),
      TOTAL_SELL_TT:       Number(r.TOTAL_SELL_TT ?? 0),
      TOTAL_WIN_TT:        Number(r.TOTAL_WIN_TT ?? 0),
      QTY:                 Number(r.QTY ?? 0),
    })),
  });
}
