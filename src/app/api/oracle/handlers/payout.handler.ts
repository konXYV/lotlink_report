import { NextResponse } from "next/server";
import { VIEWS, ACCOUNTS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

// ─── Helper: build date/draw range binds ──────────────────────────────────
function buildRangeBinds(params: URLSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {};
  const clauses: string[] = [];
  const from     = params.get("from")      ?? "";
  const to       = params.get("to")        ?? "";
  const dateFrom = params.get("date_from") ?? "";
  const dateTo   = params.get("date_to")   ?? "";
  if (from)     { clauses.push("lr.DRAW_ID     >= :p_from");      binds.p_from     = from;     }
  if (to)       { clauses.push("lr.DRAW_ID     <= :p_to");        binds.p_to       = to;       }
  if (dateFrom) { clauses.push("lr.PAYOUT_DATE >= TO_DATE(:p_date_from, 'YYYY-MM-DD')"); binds.p_date_from = dateFrom; }
  if (dateTo)   { clauses.push("lr.PAYOUT_DATE <  TO_DATE(:p_date_to,   'YYYY-MM-DD') + 1"); binds.p_date_to   = dateTo;   }
  return { binds, clauses };
}

export async function handlePayoutDrawid(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { binds, clauses } = buildRangeBinds(params);

  const excludeUserRaw = params.get("exclude_user") ?? "";
  const excludeList = excludeUserRaw
    ? excludeUserRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (excludeList.length > 0) {
    clauses.push(
      `UPPER(lr.PAYOUT_USER) NOT IN (${excludeList.map((_, i) => `UPPER(:p_excl_${i})`).join(", ")})`,
    );
    excludeList.forEach((u, i) => { binds[`p_excl_${i}`] = u; });
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [mainRes, payersRes] = await Promise.all([
    conn.execute(
      `SELECT lr.DRAW_ID,
              SUM(lr.PAYOUT_REWARD_AMT) AS TOTAL_AMOUNT,
              COUNT(*)                  AS TOTAL_COUNT
       FROM ECOMMERCE2026.LOTLINK_PAYOUT lr ${where}
       GROUP BY lr.DRAW_ID ORDER BY lr.DRAW_ID ASC`,
      binds, OPT_OBJ,
    ),
    conn.execute(
      `SELECT DISTINCT lr.PAYOUT_USER,
              TO_CHAR(lr.PAYOUT_DATE, 'DD/MM/YYYY') AS PAYOUT_DATE
       FROM ECOMMERCE2026.LOTLINK_PAYOUT lr ${where}
       ORDER BY lr.PAYOUT_USER`,
      binds, OPT_OBJ,
    ),
  ]);

  return NextResponse.json({
    rows: mainRes.rows ?? [],
    payers: payersRes.rows ?? [],
    view: "LOTLINK_PAYOUT",
  });
}

export async function handlePayoutUsers(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { binds, clauses } = buildRangeBinds(params);
  clauses.unshift("1=1");
  const where = `WHERE ${clauses.join(" AND ")}`;

  const result = await conn.execute(
    `SELECT lr.PAYOUT_USER,
            SUM(lr.PAYOUT_REWARD_AMT) AS TOTAL_AMOUNT,
            COUNT(*)                  AS TOTAL_COUNT
     FROM ECOMMERCE2026.LOTLINK_PAYOUT lr ${where}
     GROUP BY lr.PAYOUT_USER ORDER BY lr.PAYOUT_USER`,
    binds, OPT_OBJ,
  );
  return NextResponse.json({ rows: result.rows ?? [], view: "LOTLINK_PAYOUT_USERS" });
}

export async function handleBcelRefund(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { BCEL_SORT_COLS } = await import("../config/constants");
  const tid      = params.get("tid")       ?? "";
  const ttTxn    = params.get("tt_txn")    ?? "";
  const dateFrom = params.get("date_from") ?? "";
  const dateTo   = params.get("date_to")   ?? "";
  const q        = params.get("q")         ?? "";
  const pageNum  = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
  const rawSort  = params.get("sortKey") ?? "TID";
  const sortKey  = BCEL_SORT_COLS.has(rawSort) ? rawSort : "TID";
  const sortDir  = params.get("sortDir") === "asc" ? "ASC" : "DESC";
  const offset   = (pageNum - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fb: Record<string, any> = {};
  const clauses: string[] = [];
  if (tid)      { clauses.push("TID      = :p_tid");      fb.p_tid      = tid;      }
  if (ttTxn)    { clauses.push("TT_TXN   = :p_tt_txn");   fb.p_tt_txn   = ttTxn;    }
  if (dateFrom) { clauses.push("TXN_DATE >= TO_DATE(:p_date_from, 'YYYY-MM-DD')"); fb.p_date_from = dateFrom; }
  if (dateTo)   { clauses.push("TXN_DATE <  TO_DATE(:p_date_to,   'YYYY-MM-DD') + 1"); fb.p_date_to = dateTo; }
  if (q)        { clauses.push("(TO_CHAR(TID) LIKE :p_q OR TO_CHAR(TT_TXN) LIKE :p_q)"); fb.p_q = `%${q}%`; }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [aggRes, dataRes] = await Promise.all([
    conn.execute(
      `SELECT COUNT(*) AS TOTAL, SUM(TT_TXN) AS TT_TXN, SUM(REFUND_AMT) AS REFUND_AMT FROM ${VIEWS.BCEL_REFUND} ${where}`,
      fb, OPT_OBJ,
    ),
    conn.execute(
      `SELECT * FROM ${VIEWS.BCEL_REFUND} ${where} ORDER BY ${sortKey} ${sortDir} OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`,
      { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ,
    ),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agg: any = aggRes.rows?.[0] ?? {};
  return NextResponse.json({
    rows: dataRes.rows ?? [],
    total: Number(agg.TOTAL ?? 0),
    page: pageNum, pageSize,
    totals: {
      TT_TXN:     Number(agg.TT_TXN     ?? 0),
      REFUND_AMT: Number(agg.REFUND_AMT ?? 0),
    },
  });
}

// ─── BCEL OnePay Refund variants ──────────────────────────────────────────
function bcelOnepayBaseClauses(params: URLSearchParams, byDraw: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = { p_acct: ACCOUNTS.BCEL_ONEPAY };
  const clauses = [`bs.BANK_ACCT = :p_acct`, `bs.TXN_TYPE  = 'Refund ONEPAY'`];
  if (byDraw) {
    const drawFrom = params.get("draw_from") ?? "";
    const drawTo   = params.get("draw_to")   ?? "";
    if (drawFrom) { clauses.push("es.TID >= :p_draw_from"); binds.p_draw_from = drawFrom; }
    if (drawTo)   { clauses.push("es.TID <= :p_draw_to");   binds.p_draw_to   = drawTo;   }
  } else {
    const dateFrom = params.get("date_from") ?? "";
    const dateTo   = params.get("date_to")   ?? "";
    if (dateFrom) { clauses.push("bs.BANK_DATE >= TO_DATE(:p_from,'YYYY-MM-DD')"); binds.p_from = dateFrom; }
    if (dateTo)   { clauses.push("bs.BANK_DATE <  TO_DATE(:p_to,'YYYY-MM-DD')+1"); binds.p_to   = dateTo;   }
  }
  return { binds, clauses };
}

const ONEPAY_JOIN = (BCEL_STMT: string, BCEL_ECOM_SCN: string, LOTLINK_BILL: string) =>
  `FROM ${BCEL_STMT} bs
   JOIN ${BCEL_ECOM_SCN} es ON es.TRANSACTION_ID = bs.REFERENCE_ID
   JOIN ${LOTLINK_BILL}   lb ON lb.BILLNUMBER     = es.MERCHANT_REFERENCE`;

export async function handleBcelOnepayRefundByDraw(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { binds, clauses } = bcelOnepayBaseClauses(params, true);
  const sql = `
    SELECT es.TID AS DRAWID, COUNT(*) AS TT_TXN, SUM(bs.BANK_DR) AS REFUND_AMT
    ${ONEPAY_JOIN(VIEWS.BCEL_STMT, VIEWS.BCEL_ECOM_SCN, VIEWS.LOTLINK_BILL)}
    WHERE ${clauses.join(" AND ")}
    GROUP BY es.TID ORDER BY es.TID`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ DRAWID: String(r.DRAWID ?? ""), TT_TXN: Number(r.TT_TXN ?? 0), REFUND_AMT: Number(r.REFUND_AMT ?? 0) })) });
}

export async function handleBcelOnepayRefundByDrawWithDates(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { binds, clauses } = bcelOnepayBaseClauses(params, true);
  const sql = `
    SELECT es.TID AS DRAWID, TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD') AS BANK_DATE, COUNT(*) AS TT_TXN, SUM(bs.BANK_DR) AS REFUND_AMT
    ${ONEPAY_JOIN(VIEWS.BCEL_STMT, VIEWS.BCEL_ECOM_SCN, VIEWS.LOTLINK_BILL)}
    WHERE ${clauses.join(" AND ")}
    GROUP BY es.TID, TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD')
    ORDER BY es.TID, TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD')`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ DRAWID: String(r.DRAWID ?? ""), BANK_DATE: String(r.BANK_DATE ?? ""), TT_TXN: Number(r.TT_TXN ?? 0), REFUND_AMT: Number(r.REFUND_AMT ?? 0) })) });
}

export async function handleBcelOnepayRefundByDate(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { binds, clauses } = bcelOnepayBaseClauses(params, false);
  const sql = `
    SELECT TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD') AS BANK_DATE, COUNT(*) AS TT_TXN, SUM(bs.BANK_DR) AS REFUND_AMT
    ${ONEPAY_JOIN(VIEWS.BCEL_STMT, VIEWS.BCEL_ECOM_SCN, VIEWS.LOTLINK_BILL)}
    WHERE ${clauses.join(" AND ")}
    GROUP BY TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD')
    ORDER BY TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD')`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ BANK_DATE: String(r.BANK_DATE ?? ""), TT_TXN: Number(r.TT_TXN ?? 0), REFUND_AMT: Number(r.REFUND_AMT ?? 0) })) });
}

export async function handleBcelOnepayRefundByDateWithDraws(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const { binds, clauses } = bcelOnepayBaseClauses(params, false);
  const sql = `
    SELECT TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD') AS BANK_DATE, es.TID AS DRAWID, COUNT(*) AS TT_TXN, SUM(bs.BANK_DR) AS REFUND_AMT
    ${ONEPAY_JOIN(VIEWS.BCEL_STMT, VIEWS.BCEL_ECOM_SCN, VIEWS.LOTLINK_BILL)}
    WHERE ${clauses.join(" AND ")}
    GROUP BY TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD'), es.TID
    ORDER BY TO_CHAR(bs.BANK_DATE,'YYYY-MM-DD'), es.TID`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ rows: (result.rows ?? []).map((r: any) => ({ BANK_DATE: String(r.BANK_DATE ?? ""), DRAWID: String(r.DRAWID ?? ""), TT_TXN: Number(r.TT_TXN ?? 0), REFUND_AMT: Number(r.REFUND_AMT ?? 0) })) });
}
