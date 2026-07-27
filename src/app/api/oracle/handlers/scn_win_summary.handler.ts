import { NextResponse } from "next/server";
import { VIEWS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

// ─── Account used for this report (O_SCN_BCEL_STMT / BCEL_ACCT) ───────────
const SCN_WIN_BCEL_ACCT = "0131100213190";

// Oracle DATE columns come back from oracledb as JS Date objects (not strings).
// Using String(date).slice(0,10) grabs "Tue Jun 30" instead of the actual date.
// Build "YYYY-MM-DD" from LOCAL date parts (not toISOString, which can shift
// the day across a UTC offset) so downstream fmtDate() on the client parses it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toYMD(value: any): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDateBinds(params: URLSearchParams) {
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const conditions: string[] = [`BCEL_ACCT = :bcelAcct`];
  const binds: Record<string, string> = { bcelAcct: SCN_WIN_BCEL_ACCT };

  if (dateFrom) {
    conditions.push("BCEL_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
    binds.dateFrom = dateFrom;
  }
  if (dateTo) {
    const dt = new Date(dateTo);
    dt.setDate(dt.getDate() + 1);
    conditions.push("BCEL_DATE < TO_DATE(:dateTo, 'YYYY-MM-DD')");
    binds.dateTo = dt.toISOString().slice(0, 10);
  }
  return { conditions, binds };
}

// ════════════════════════════════════════════════════════════════════════
//  ຕາຕະລາງ 1: ສະຫລຸບຈ່າຍລາງວັນ ຈຳແນກຕາມງວດ (ຄືກັນກັບ B4:I31 ໃນ Excel)
//   ລາງວັນຕົວຕົງ      = SCN LOTTERY PRIZE
//   ລາງວັນໂບນັດ       = SCN BONUS + SCN BONUS ADJUST
//   ຄ່າທຳນຽມຕົວຕົງ     = FEE_SCN LOTTERY PRIZE
//   ຄ່າທຳນຽມໂບນັດ      = FEE_SCN BONUS
//   ຄ່າທຳນຽມ ທ/ຄ      = BANK_FEE
//   ອາກອນ5%           = TAX SCN LOTTERY PRIZE (ຫັກໃນລະບົບ)
// ════════════════════════════════════════════════════════════════════════
export async function handleScnWinSummary(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildDateBinds(params);
  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const sqlMain = `
    SELECT t."ລ/ດ", t."ວັນທີ", t."ງວດ", t."ລາງວັນຕົວຕົງ", t."ລາງວັນໂບນັດ",
           t."ຄ່າທຳນຽມຕົວຕົງ", t."ຄ່າທຳນຽມໂບນັດ", t."ຄ່າທຳນຽມ ທ/ຄ", t."ອາກອນ5%", t.SORT_KEY
    FROM (
      SELECT
        CASE GROUPING(DRAWID) WHEN 1 THEN NULL ELSE ROW_NUMBER() OVER (ORDER BY MIN(BCEL_DATE)) END AS "ລ/ດ",
        CASE GROUPING(DRAWID) WHEN 1 THEN NULL ELSE MIN(BCEL_DATE) END AS "ວັນທີ",
        CASE GROUPING(DRAWID) WHEN 1 THEN 'ລວມ' ELSE TO_CHAR(DRAWID) END AS "ງວດ",
        SUM(CASE WHEN TXN_TYPE IN ('SCN LOTTERY PRIZE', 'SCNN LOTTERY PRIZE') THEN BCEL_DR ELSE 0 END) AS "ລາງວັນຕົວຕົງ",
        SUM(CASE WHEN TXN_TYPE IN ('SCN BONUS','SCN BONUS ADJUST') THEN BCEL_DR ELSE 0 END) AS "ລາງວັນໂບນັດ",
        SUM(CASE WHEN TXN_TYPE IN ('FEE_SCN LOTTERY PRIZE', 'FEE_SCNN LOTTERY PRIZE') THEN BCEL_DR ELSE 0 END) AS "ຄ່າທຳນຽມຕົວຕົງ",
        SUM(CASE WHEN TXN_TYPE IN ('FEE_SCN BONUS', 'FEE_SCNN BONUS') THEN BCEL_DR ELSE 0 END) AS "ຄ່າທຳນຽມໂບນັດ",
        SUM(CASE WHEN TXN_TYPE = 'BANK_FEE' THEN BCEL_DR ELSE 0 END) AS "ຄ່າທຳນຽມ ທ/ຄ",
        SUM(CASE WHEN TXN_TYPE = 'TAX SCN LOTTERY PRIZE' THEN BCEL_CR ELSE 0 END) AS "ອາກອນ5%",
        GROUPING(DRAWID) AS SORT_KEY
      FROM ${VIEWS.SCN_BCEL_STMT} ${whereClause}
      GROUP BY ROLLUP(DRAWID)
      ORDER BY GROUPING(DRAWID), MIN(BCEL_DATE)
    ) t`;

  const result = await conn.execute(sqlMain, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (result.rows ?? []).map((r: any) => ({
    "ລ/ດ": r["ລ/ດ"] != null ? Number(r["ລ/ດ"]) : null,
    ວັນທີ: toYMD(r["ວັນທີ"]),
    ງວດ: r["ງວດ"] ?? "",
    ລາງວັນຕົວຕົງ: Number(r["ລາງວັນຕົວຕົງ"] ?? 0),
    ລາງວັນໂບນັດ: Number(r["ລາງວັນໂບນັດ"] ?? 0),
    ຄ່າທຳນຽມຕົວຕົງ: Number(r["ຄ່າທຳນຽມຕົວຕົງ"] ?? 0),
    ຄ່າທຳນຽມໂບນັດ: Number(r["ຄ່າທຳນຽມໂບນັດ"] ?? 0),
    "ຄ່າທຳນຽມ ທ/ຄ": Number(r["ຄ່າທຳນຽມ ທ/ຄ"] ?? 0),
    "ອາກອນ5%": Number(r["ອາກອນ5%"] ?? 0),
  }));

  return NextResponse.json({ rows });
}

// ════════════════════════════════════════════════════════════════════════
//  ຕາຕະລາງ 2: ລາຍລະອຽດຕໍ່ງວດ — ລວມລາງວັນ / ອາກອນ / ຫລັງຫັກອາກອນ / ໂບນັດ / Total_Win
//  + ລາຍລະອຽດແຍກປະເພດໂບນັດ (matchwin2..invoice6) ຈາກ SCN_PORTAL_DATA
//  join: O_SCN_BCEL_STMT.LOTTO_BILL_NO = SCN_PORTAL_DATA.BILL_NUMBER
// ════════════════════════════════════════════════════════════════════════
export async function handleScnWinDrawDetail(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildDateBinds(params);
  const whereClause = conditions.join(" AND ");

  const sql = `
    SELECT
      s.DRAWID,
      MIN(s.BCEL_DATE) AS DRAW_DATE,
      SUM(p.TOTAL_REWARD)        AS TOTAL_REWARD,
      SUM(p.TAX_REWARD)          AS TAX_REWARD,
      SUM(p.REWARD_AFTER_TAX)    AS REWARD_AFTER_TAX,
      SUM(p.TOTAL_BONUS)         AS TOTAL_BONUS,
      SUM(p.MATCHWIN2)           AS MATCHWIN2,
      SUM(p.MATCHWIN3)           AS MATCHWIN3,
      SUM(p.ADJACENT2)           AS ADJACENT2,
      SUM(p.ADJACENT2FRONT)      AS ADJACENT2FRONT,
      SUM(p.ADJACENT3)           AS ADJACENT3,
      SUM(p.ADJACENT3FRONT)      AS ADJACENT3FRONT,
      SUM(p.ADJACENT4)           AS ADJACENT4,
      SUM(p.ADJACENT5)           AS ADJACENT5,
      SUM(p.ADJACENT6)           AS ADJACENT6,
      SUM(p.RANDOM3)             AS RANDOM3,
      SUM(p.RANDOM4)             AS RANDOM4,
      SUM(p.RANDOM5)             AS RANDOM5,
      SUM(p.RANDOM6)             AS RANDOM6,
      SUM(p.INVOICE2)            AS INVOICE2,
      SUM(p.INVOICE3)            AS INVOICE3,
      SUM(p.INVOICE4)            AS INVOICE4,
      SUM(p.INVOICE5)            AS INVOICE5,
      SUM(p.INVOICE6)            AS INVOICE6
    FROM (
      SELECT DISTINCT DRAWID, LOTTO_BILL_NO, BCEL_DATE
      FROM ${VIEWS.SCN_BCEL_STMT}
      WHERE ${whereClause}
    ) s
    JOIN ${VIEWS.SCN_PORTAL_DATA} p
      ON TO_CHAR(p.BILL_NUMBER) = TO_CHAR(s.LOTTO_BILL_NO)
    GROUP BY s.DRAWID
    ORDER BY MIN(s.BCEL_DATE) ASC`;

  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (result.rows ?? []).map((r: any) => ({
    DRAWID: String(r.DRAWID ?? ""),
    DRAW_DATE: toYMD(r.DRAW_DATE),
    TOTAL_REWARD: Number(r.TOTAL_REWARD ?? 0),
    TAX_REWARD: Number(r.TAX_REWARD ?? 0),
    REWARD_AFTER_TAX: Number(r.REWARD_AFTER_TAX ?? 0),
    TOTAL_BONUS: Number(r.TOTAL_BONUS ?? 0),
    MATCHWIN2: Number(r.MATCHWIN2 ?? 0),
    MATCHWIN3: Number(r.MATCHWIN3 ?? 0),
    ADJACENT2: Number(r.ADJACENT2 ?? 0),
    ADJACENT2FRONT: Number(r.ADJACENT2FRONT ?? 0),
    ADJACENT3: Number(r.ADJACENT3 ?? 0),
    ADJACENT3FRONT: Number(r.ADJACENT3FRONT ?? 0),
    ADJACENT4: Number(r.ADJACENT4 ?? 0),
    ADJACENT5: Number(r.ADJACENT5 ?? 0),
    ADJACENT6: Number(r.ADJACENT6 ?? 0),
    RANDOM3: Number(r.RANDOM3 ?? 0),
    RANDOM4: Number(r.RANDOM4 ?? 0),
    RANDOM5: Number(r.RANDOM5 ?? 0),
    RANDOM6: Number(r.RANDOM6 ?? 0),
    INVOICE2: Number(r.INVOICE2 ?? 0),
    INVOICE3: Number(r.INVOICE3 ?? 0),
    INVOICE4: Number(r.INVOICE4 ?? 0),
    INVOICE5: Number(r.INVOICE5 ?? 0),
    INVOICE6: Number(r.INVOICE6 ?? 0),
  }));

  return NextResponse.json({ rows });
}

// ════════════════════════════════════════════════════════════════════════
//  ອາກອນ5% ແຍກເປັນລາຍການຍ່ອຍ (ຄືກັນກັບ handleBcelTax5Items ໃນ bcel.handler.ts)
//  — ສະແດງແຕ່ລະລາຍການອາກອນຮຽງລົງມາຕາມວັນທີ/ງວດ ແທນທີ່ຈະເປັນຍອດລວມດຽວ
// ════════════════════════════════════════════════════════════════════════
export async function handleScnWinTax5Items(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildDateBinds(params);
  conditions.push(`TXN_TYPE = 'TAX SCN LOTTERY PRIZE'`);
  const sql = `
    SELECT TO_CHAR(BCEL_DATE, 'YYYY-MM-DD') AS BCEL_DATE, TO_CHAR(DRAWID) AS DRAWID, BCEL_CR
    FROM ${VIEWS.SCN_BCEL_STMT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY BCEL_DATE ASC, BCEL_CR DESC`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    rows: (result.rows ?? []).map((r: any) => ({
      BCEL_DATE: r.BCEL_DATE ?? "",
      DRAWID: r.DRAWID ?? "",
      BCEL_CR: Number(r.BCEL_CR ?? 0),
    })),
  });
}
