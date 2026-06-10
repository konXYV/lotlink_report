import { NextResponse } from "next/server";
import { VIEWS, ACCOUNTS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

function buildLdbDateBinds(params: URLSearchParams) {
  const dateFrom = params.get("date_from") ?? "";
  const dateTo   = params.get("date_to")   ?? "";
  const conditions: string[] = [`ACCT_NO = :ldbAcct`];
  const binds: Record<string, string> = { ldbAcct: ACCOUNTS.LDB };
  if (dateFrom) { conditions.push("DATE_TIME >= TO_DATE(:dateFrom, 'YYYY-MM-DD')"); binds.dateFrom = dateFrom; }
  if (dateTo) {
    const dt = new Date(dateTo);
    dt.setDate(dt.getDate() + 1);
    conditions.push("DATE_TIME < TO_DATE(:dateTo, 'YYYY-MM-DD')");
    binds.dateTo = dt.toISOString().slice(0, 10);
  }
  return { conditions, binds };
}

export async function handleLdbRewardSummary(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { conditions, binds } = buildLdbDateBinds(params);
  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT t."ງວດ", t."ຈຳນວນລາງວັນ Sokxay", t."ໂຊກຊ້ອນໂຊກ", t."Spin",
           t."ລາງວັນ SCN", t."LDB_FEE_REWARD_FTR", t."FTR", t."FTR_FEE",
           t."LDB_FEE_DEEPLINK", t."LDB_FEE_LOTTO_SELL", t."ລວມຫນີ້ທັງໝົດ",
           t."ລວມມີທັງໝົດ", t."ອາກອນ5%"
    FROM (
      SELECT
        CASE GROUPING(DRAWID) WHEN 1 THEN 'ລວມທັງໝົດ' ELSE DRAWID END AS "ງວດ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SOKXAY_REWARD'     THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "ຈຳນວນລາງວັນ Sokxay",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SOKXAY_BONUS'      THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "ໂຊກຊ້ອນໂຊກ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SOKXAY_SPIN'       THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "Spin",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCN_REWARD'        THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "ລາງວັນ SCN",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LDB_FEE_REWARD_FTR' THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "LDB_FEE_REWARD_FTR",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FTR'               THEN DEPOSIT  ELSE 0 END), 'FM9,999,999,999,990') AS "FTR",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FTR_FEE'           THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "FTR_FEE",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LDB_FEE_DEEPLINK'  THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "LDB_FEE_DEEPLINK",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LDB_FEE_LOTTO_SELL' THEN (WITHDRAW + DEPOSIT) ELSE 0 END), 'FM9,999,999,999,990') AS "LDB_FEE_LOTTO_SELL",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SOKXAY_TAX_REWARD' THEN DEPOSIT  ELSE 0 END), 'FM9,999,999,999,990') AS "ອາກອນ5%",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('SOKXAY_REWARD','SOKXAY_BONUS','SOKXAY_SPIN','LDB_FEE_REWARD_FTR','FTR_FEE','LDB_FEE_LOTTO_SELL','FTR','LDB_FEE_DEEPLINK','SCN_REWARD') THEN WITHDRAW ELSE 0 END), 'FM9,999,999,999,990') AS "ລວມຫນີ້ທັງໝົດ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('SOKXAY_TAX_REWARD','FTR') THEN DEPOSIT ELSE 0 END), 'FM9,999,999,999,990') AS "ລວມມີທັງໝົດ",
        GROUPING(DRAWID) AS GRP_FLAG
      FROM ${VIEWS.LDB_STMT} ${whereClause}
      GROUP BY ROLLUP(DRAWID)
      ORDER BY GROUPING(DRAWID), DRAWID
    ) t`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ ງວດ: r["ງວດ"] ?? "", "ຈຳນວນລາງວັນ Sokxay": r["ຈຳນວນລາງວັນ Sokxay"] ?? "0", ໂຊກຊ້ອນໂຊກ: r["ໂຊກຊ້ອນໂຊກ"] ?? "0", Spin: r["Spin"] ?? "0", "ລາງວັນ SCN": r["ລາງວັນ SCN"] ?? "0", LDB_FEE_REWARD_FTR: r["LDB_FEE_REWARD_FTR"] ?? "0", FTR: r["FTR"] ?? "0", FTR_FEE: r["FTR_FEE"] ?? "0", LDB_FEE_DEEPLINK: r["LDB_FEE_DEEPLINK"] ?? "0", LDB_FEE_LOTTO_SELL: r["LDB_FEE_LOTTO_SELL"] ?? "0", ລວມຫນີ້ທັງໝົດ: r["ລວມຫນີ້ທັງໝົດ"] ?? "0", ລວມມີທັງໝົດ: r["ລວມມີທັງໝົດ"] ?? "0", "ອາກອນ5%": r["ອາກອນ5%"] ?? "0" })) });
}

export async function handleLdbTaxRewardItems(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { conditions, binds } = buildLdbDateBinds(params);
  conditions.push(`TXN_TYPE = 'SOKXAY_TAX_REWARD'`);
  const sql = `
    SELECT TO_CHAR(DATE_TIME, 'YYYY-MM-DD') AS DATE_TIME, TO_CHAR(DRAWID) AS DRAWID, DEPOSIT
    FROM ${VIEWS.LDB_STMT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY DATE_TIME ASC, DEPOSIT DESC`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ DATE_TIME: r.DATE_TIME ?? "", DRAWID: r.DRAWID ?? "", DEPOSIT: Number(r.DEPOSIT ?? 0) })) });
}

export async function handleLdbOtherItems(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { conditions, binds } = buildLdbDateBinds(params);
  const knownTypes = `'SOKXAY_REWARD','SOKXAY_BONUS','SOKXAY_SPIN','SCN_REWARD','LDB_FEE_REWARD_FTR','FTR','FTR_FEE','LDB_FEE_DEEPLINK','LDB_FEE_LOTTO_SELL','SOKXAY_TAX_REWARD'`;
  conditions.push(`TXN_TYPE NOT IN (${knownTypes})`);
  const sql = `
    SELECT TO_CHAR(DATE_TIME, 'YYYY-MM-DD') AS DATE_TIME, TXN_TYPE, LDB_REF, WITHDRAW
    FROM ${VIEWS.LDB_STMT}
    WHERE ${conditions.join(" AND ")} AND WITHDRAW > 0
    ORDER BY DATE_TIME ASC, TXN_TYPE, LDB_REF`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ DATE_TIME: r.DATE_TIME ?? "", TXN_TYPE: r.TXN_TYPE ?? "", LDB_REF: r.LDB_REF ?? "", WITHDRAW: Number(r.WITHDRAW ?? 0) })) });
}
