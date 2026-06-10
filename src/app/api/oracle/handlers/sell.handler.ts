import { NextResponse } from "next/server";
import { VIEWS, SELL_SORT_COLS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

export async function handleSellOptions(conn: Conn, OPT_OBJ: OPT) {
  const [dr, dt, pb] = await Promise.all([
    conn.execute(`SELECT DISTINCT DRAWID    FROM ${VIEWS.SELL} WHERE DRAWID    IS NOT NULL ORDER BY DRAWID    DESC`, {}, OPT_OBJ),
    conn.execute(`SELECT DISTINCT DRAW_DATE FROM ${VIEWS.SELL} WHERE DRAW_DATE IS NOT NULL ORDER BY DRAW_DATE DESC`, {}, OPT_OBJ),
    conn.execute(`SELECT DISTINCT PAY_BY    FROM ${VIEWS.SELL} WHERE PAY_BY    IS NOT NULL ORDER BY PAY_BY`, {}, OPT_OBJ),
  ]);
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawids: dr.rows?.map((r: any) => r.DRAWID) ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dates:   dt.rows?.map((r: any) => r.DRAW_DATE) ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payBys:  pb.rows?.map((r: any) => r.PAY_BY) ?? [],
  });
}

export async function handleSell(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const drawid   = params.get("drawid") ?? "";
  const drawDate = params.get("draw_date") ?? "";
  const payBy    = params.get("pay_by") ?? "";
  const q        = params.get("q") ?? "";
  const pageNum  = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
  const rawSort  = params.get("sortKey") ?? "DRAW_DATE";
  const sortKey  = SELL_SORT_COLS.has(rawSort) ? rawSort : "DRAW_DATE";
  const sortDir  = params.get("sortDir") === "asc" ? "ASC" : "DESC";
  const offset   = (pageNum - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fb: Record<string, any> = {};
  const clauses: string[] = [];

  if (drawid)   { clauses.push("DRAWID    = :p_drawid");    fb.p_drawid   = drawid; }
  if (drawDate) { clauses.push("DRAW_DATE = :p_draw_date"); fb.p_draw_date = drawDate; }
  if (payBy)    { clauses.push("PAY_BY    = :p_pay_by");    fb.p_pay_by   = payBy; }
  if (q) {
    clauses.push("(LOTTO_BILL_NO LIKE :p_q OR OWNER LIKE :p_q OR PAY_BY LIKE :p_q OR DRAWID LIKE :p_q)");
    fb.p_q = `%${q}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const aggSql = `
    SELECT COUNT(*) AS TOTAL,
           SUM(BILL_AMT) AS BILL_AMT, SUM(PAYMENT_AMT) AS PAYMENT_AMT,
           SUM(DIFF_PAYMENT) AS DIFF_PAYMENT, SUM(SCN_PRO_AMT) AS SCN_PRO_AMT,
           SUM(SCN_COUPON_AMT) AS SCN_COUPON_AMT,
           SUM(DISCOUNT_15_PERCENT) AS DISCOUNT_15_PERCENT,
           SUM(DIFF_PRO) AS DIFF_PRO, SUM(COM_5_PERCENT) AS COM_5_PERCENT,
           SUM(FINAL_SCN_COM) AS FINAL_SCN_COM
    FROM ${VIEWS.SELL} ${where}`;

  const dataSql = `
    SELECT * FROM ${VIEWS.SELL} ${where}
    ORDER BY ${sortKey} ${sortDir}
    OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`;

  const [aggRes, dataRes] = await Promise.all([
    conn.execute(aggSql, fb, OPT_OBJ),
    conn.execute(dataSql, { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agg: any = aggRes.rows?.[0] ?? {};
  return NextResponse.json({
    rows: dataRes.rows ?? [],
    total: Number(agg.TOTAL ?? 0),
    page: pageNum,
    pageSize,
    totals: {
      BILL_AMT:            Number(agg.BILL_AMT ?? 0),
      PAYMENT_AMT:         Number(agg.PAYMENT_AMT ?? 0),
      DIFF_PAYMENT:        Number(agg.DIFF_PAYMENT ?? 0),
      SCN_PRO_AMT:         Number(agg.SCN_PRO_AMT ?? 0),
      SCN_COUPON_AMT:      Number(agg.SCN_COUPON_AMT ?? 0),
      DISCOUNT_15_PERCENT: Number(agg.DISCOUNT_15_PERCENT ?? 0),
      DIFF_PRO:            Number(agg.DIFF_PRO ?? 0),
      COM_5_PERCENT:       Number(agg.COM_5_PERCENT ?? 0),
      FINAL_SCN_COM:       Number(agg.FINAL_SCN_COM ?? 0),
    },
  });
}

export async function handleDrawid(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const from = params.get("from") ?? "";
  const to   = params.get("to")   ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {};
  const clauses: string[] = [];
  if (from) { clauses.push("DRAWID >= :p_from"); binds.p_from = from; }
  if (to)   { clauses.push("DRAWID <= :p_to");   binds.p_to   = to;   }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await conn.execute(
    `SELECT * FROM ${VIEWS.DRAWID} ${where} ORDER BY DRAWID DESC`,
    binds, OPT_OBJ,
  );
  return NextResponse.json({ rows: result.rows ?? [], view: VIEWS.DRAWID });
}

export async function handleMonth(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const from = params.get("month_from") ?? "";
  const to   = params.get("month_to")   ?? "";
  const q    = params.get("q")          ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {};
  const clauses: string[] = [];
  if (from) { clauses.push("MONTH >= :p_from"); binds.p_from = from; }
  if (to)   { clauses.push("MONTH <= :p_to");   binds.p_to   = to;   }
  if (q)    { clauses.push("(OWNER LIKE :p_q OR TO_CHAR(MONTH) LIKE :p_q)"); binds.p_q = `%${q}%`; }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await conn.execute(
    `SELECT * FROM ${VIEWS.MONTH} ${where} ORDER BY MONTH DESC`,
    binds, OPT_OBJ,
  );
  return NextResponse.json({ rows: result.rows ?? [], view: VIEWS.MONTH });
}

export async function handleRoundids(conn: Conn, OPT_OBJ: OPT) {
  const result = await conn.execute(
    `SELECT DISTINCT ROUNDID FROM ECOMMERCE2026.SCN_LOTTO ORDER BY ROUNDID DESC`,
    {}, OPT_OBJ,
  );
  return NextResponse.json({ rows: result.rows ?? [] });
}
