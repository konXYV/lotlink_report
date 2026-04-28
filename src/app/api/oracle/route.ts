// src/app/api/oracle/route.ts
import { NextRequest, NextResponse } from "next/server";

const ORA_CONFIG = {
  host:     process.env.ORACLE_HOST     ?? "172.22.7.41",
  port:     Number(process.env.ORACLE_PORT ?? "1521"),
  sid:      process.env.ORACLE_SID      ?? "centralrptde",
  user:     process.env.ORACLE_USER     ?? "ECOMMERCE2026",
  password: process.env.ORACLE_PASSWORD ?? "splususer12",
};

const SELL_VIEW           = "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL";
const DRAWID_VIEW         = "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL_DRAWID";
const MONTH_VIEW          = "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL_MONTH";
const REWARD_VIEW         = "ECOMMERCE2026.APP_V_SCN_REWARD";
const REWARD_DRAWID_VIEW  = "ECOMMERCE2026.APP_V_SCN_REWARD_DRAWID";
const REWARD_CHANNEL_VIEW = "ECOMMERCE2026.APP_V_SCN_REWARD_DRAWID_CHANEL";

/** Column whitelist ກັນ SQL injection ສຳລັບ ORDER BY dynamic */
const SELL_SORT_COLS = new Set([
  "LOTTO_BILL_NO", "DRAWID", "DRAW_DATE", "PAY_BY", "OWNER",
  "BILL_AMT", "PAYMENT_AMT", "DIFF_PAYMENT", "SCN_PRO_AMT",
  "SCN_COUPON_AMT", "DISCOUNT_15_PERCENT", "DIFF_PRO",
  "COM_5_PERCENT", "FINAL_SCN_COM",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;
async function getOracleDb() {
  if (_db) return _db;
  const mod = await import("oracledb");
  _db = mod.default ?? mod;
  return _db;
}

export async function GET(req: NextRequest) {
  const params  = new URL(req.url).searchParams;
  const viewKey = params.get("view") ?? "";

  const validViews = ["sell", "sell_options", "drawid", "month", "roundids", "reward", "reward_drawid", "reward_channel"];
  if (!validViews.includes(viewKey)) {
    return NextResponse.json(
      { error: `view ບໍ່ຖືກຕ້ອງ: "${viewKey}". ໃຊ້: ${validViews.join(" | ")}` },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connection: any;
  try {
    const oracledb = await getOracleDb();
    const OPT_OBJ  = { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 };

    connection = await oracledb.getConnection({
      connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${ORA_CONFIG.host})(PORT=${ORA_CONFIG.port}))(CONNECT_DATA=(SID=${ORA_CONFIG.sid})))`,
      user:     ORA_CONFIG.user,
      password: ORA_CONFIG.password,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // sell_options — distinct values ສຳລັບ dropdown (3 queries parallel, ໄວຫຼາຍ)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "sell_options") {
      const [dr, dt, pb] = await Promise.all([
        connection.execute(
          `SELECT DISTINCT DRAWID    FROM ${SELL_VIEW} WHERE DRAWID    IS NOT NULL ORDER BY DRAWID    DESC`,
          {}, OPT_OBJ,
        ),
        connection.execute(
          `SELECT DISTINCT DRAW_DATE FROM ${SELL_VIEW} WHERE DRAW_DATE IS NOT NULL ORDER BY DRAW_DATE DESC`,
          {}, OPT_OBJ,
        ),
        connection.execute(
          `SELECT DISTINCT PAY_BY    FROM ${SELL_VIEW} WHERE PAY_BY    IS NOT NULL ORDER BY PAY_BY`,
          {}, OPT_OBJ,
        ),
      ]);
      return NextResponse.json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        drawids: dr.rows?.map((r: any) => r.DRAWID)    ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dates:   dt.rows?.map((r: any) => r.DRAW_DATE) ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payBys:  pb.rows?.map((r: any) => r.PAY_BY)    ?? [],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // sell — server-side filter + sort + pagination + aggregate totals
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "sell") {
      const drawid   = params.get("drawid")    ?? "";
      const drawDate = params.get("draw_date") ?? "";
      const payBy    = params.get("pay_by")    ?? "";
      const q        = params.get("q")         ?? "";
      const pageNum  = Math.max(1, parseInt(params.get("page")     ?? "1", 10));
      const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
      const rawSort  = params.get("sortKey") ?? "DRAW_DATE";
      const sortKey  = SELL_SORT_COLS.has(rawSort) ? rawSort : "DRAW_DATE";
      const sortDir  = params.get("sortDir") === "asc" ? "ASC" : "DESC";
      const offset   = (pageNum - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fb: Record<string, any> = {};
      const clauses: string[] = [];

      if (drawid)   { clauses.push("DRAWID    = :p_drawid");    fb.p_drawid    = drawid; }
      if (drawDate) { clauses.push("DRAW_DATE = :p_draw_date"); fb.p_draw_date = drawDate; }
      if (payBy)    { clauses.push("PAY_BY    = :p_pay_by");    fb.p_pay_by    = payBy; }
      if (q) {
        // ໃຊ້ bind variable ດຽວ :p_q ຊ້ຳໄດ້ໃນ Oracle named binds
        clauses.push(
          "(LOTTO_BILL_NO LIKE :p_q OR OWNER LIKE :p_q OR PAY_BY LIKE :p_q OR DRAWID LIKE :p_q)",
        );
        fb.p_q = `%${q}%`;
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      // Aggregate (COUNT + SUM) — ໃຊ້ filter binds ດຽວກັນ, ບໍ່ຕ້ອງ pagination
      const aggSql = `
        SELECT COUNT(*)                  AS TOTAL,
               SUM(BILL_AMT)             AS BILL_AMT,
               SUM(PAYMENT_AMT)          AS PAYMENT_AMT,
               SUM(DIFF_PAYMENT)         AS DIFF_PAYMENT,
               SUM(SCN_PRO_AMT)          AS SCN_PRO_AMT,
               SUM(SCN_COUPON_AMT)       AS SCN_COUPON_AMT,
               SUM(DISCOUNT_15_PERCENT)  AS DISCOUNT_15_PERCENT,
               SUM(DIFF_PRO)             AS DIFF_PRO,
               SUM(COM_5_PERCENT)        AS COM_5_PERCENT,
               SUM(FINAL_SCN_COM)        AS FINAL_SCN_COM
        FROM ${SELL_VIEW} ${where}`;

      // Data page — Oracle 12c+ OFFSET…FETCH syntax
      const dataSql = `
        SELECT * FROM ${SELL_VIEW} ${where}
        ORDER BY ${sortKey} ${sortDir}
        OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`;

      // Run both queries in parallel
      const [aggRes, dataRes] = await Promise.all([
        connection.execute(aggSql, fb, OPT_OBJ),
        connection.execute(dataSql, { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg: any = aggRes.rows?.[0] ?? {};
      return NextResponse.json({
        rows:     dataRes.rows ?? [],
        total:    Number(agg.TOTAL            ?? 0),
        page:     pageNum,
        pageSize,
        totals: {
          BILL_AMT:            Number(agg.BILL_AMT            ?? 0),
          PAYMENT_AMT:         Number(agg.PAYMENT_AMT         ?? 0),
          DIFF_PAYMENT:        Number(agg.DIFF_PAYMENT        ?? 0),
          SCN_PRO_AMT:         Number(agg.SCN_PRO_AMT         ?? 0),
          SCN_COUPON_AMT:      Number(agg.SCN_COUPON_AMT      ?? 0),
          DISCOUNT_15_PERCENT: Number(agg.DISCOUNT_15_PERCENT ?? 0),
          DIFF_PRO:            Number(agg.DIFF_PRO            ?? 0),
          COM_5_PERCENT:       Number(agg.COM_5_PERCENT       ?? 0),
          FINAL_SCN_COM:       Number(agg.FINAL_SCN_COM       ?? 0),
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // drawid — ກອງດ້ວຍ from/to range
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "drawid") {
      const from = params.get("from") ?? "";
      const to   = params.get("to")   ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from) { clauses.push("DRAWID >= :p_from"); binds.p_from = from; }
      if (to)   { clauses.push("DRAWID <= :p_to");   binds.p_to   = to; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(
        `SELECT * FROM ${DRAWID_VIEW} ${where} ORDER BY DRAWID DESC`,
        binds, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [], view: DRAWID_VIEW });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // month / roundids — unchanged
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "month") {
      const from = params.get("month_from") ?? "";
      const to   = params.get("month_to")   ?? "";
      const q    = params.get("q")           ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from) { clauses.push("MONTH >= :p_from"); binds.p_from = from; }
      if (to)   { clauses.push("MONTH <= :p_to");   binds.p_to   = to; }
      if (q)    { clauses.push("(OWNER LIKE :p_q OR TO_CHAR(MONTH) LIKE :p_q)"); binds.p_q = `%${q}%`; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(`SELECT * FROM ${MONTH_VIEW} ${where} ORDER BY MONTH DESC`, binds, OPT_OBJ);
      return NextResponse.json({ rows: result.rows ?? [], view: MONTH_VIEW });
    }

    if (viewKey === "roundids") {
      const result = await connection.execute(
        `SELECT DISTINCT ROUNDID FROM ECOMMERCE2026.SCN_LOTTO ORDER BY ROUNDID DESC`,
        {}, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [] });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // reward — ລາຍລະອຽດ reward ແຕ່ລະລາຍການ (server-side filter + pagination)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "reward") {
      const drawid  = params.get("drawid")  ?? "";
      const channel = params.get("channel") ?? "";
      const owner   = params.get("owner")   ?? "";
      const q       = params.get("q")       ?? "";
      const pageNum  = Math.max(1, parseInt(params.get("page")     ?? "1",   10));
      const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
      const offset   = (pageNum - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fb: Record<string, any> = {};
      const clauses: string[] = [];
      if (drawid)  { clauses.push("DRAWID  = :p_drawid");  fb.p_drawid  = drawid; }
      if (channel) { clauses.push("CHANNEL = :p_channel"); fb.p_channel = channel; }
      if (owner)   { clauses.push("OWNER   = :p_owner");   fb.p_owner   = owner; }
      if (q) {
        clauses.push("(BILLNUMBER LIKE :p_q OR TRANSACTION_NO LIKE :p_q OR WIN_NUMBER LIKE :p_q OR OWNER LIKE :p_q OR CHANNEL LIKE :p_q)");
        fb.p_q = `%${q}%`;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const aggSql = `
        SELECT COUNT(*) AS TOTAL,
               SUM(LOTLINK_REWARD)          AS LOTLINK_REWARD,
               SUM(LOTLINK_REWARD_AFTER_TAX) AS LOTLINK_REWARD_AFTER_TAX,
               SUM(LOTLINK_TAX_REWARD)       AS LOTLINK_TAX_REWARD,
               SUM(TT_PAID_REAWRD)           AS TT_PAID_REAWRD,
               SUM(SOKXAY_PRO)               AS SOKXAY_PRO,
               SUM(SCN_PRO)                  AS SCN_PRO
        FROM ${REWARD_VIEW} ${where}`;

      const dataSql = `
        SELECT * FROM ${REWARD_VIEW} ${where}
        ORDER BY DRAWID DESC, DRAW_DATE DESC
        OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`;

      const [aggRes, dataRes] = await Promise.all([
        connection.execute(aggSql, fb, OPT_OBJ),
        connection.execute(dataSql, { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg: any = aggRes.rows?.[0] ?? {};
      return NextResponse.json({
        rows: dataRes.rows ?? [],
        total: Number(agg.TOTAL ?? 0),
        page: pageNum, pageSize,
        totals: {
          LOTLINK_REWARD:           Number(agg.LOTLINK_REWARD           ?? 0),
          LOTLINK_REWARD_AFTER_TAX: Number(agg.LOTLINK_REWARD_AFTER_TAX ?? 0),
          LOTLINK_TAX_REWARD:       Number(agg.LOTLINK_TAX_REWARD       ?? 0),
          TT_PAID_REAWRD:           Number(agg.TT_PAID_REAWRD           ?? 0),
          SOKXAY_PRO:               Number(agg.SOKXAY_PRO               ?? 0),
          SCN_PRO:                  Number(agg.SCN_PRO                  ?? 0),
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // reward_drawid — ສັງລວມ reward ຕາມ DRAWID (filter by drawid range)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "reward_drawid") {
      const from = params.get("from") ?? "";
      const to   = params.get("to")   ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from) { clauses.push("DRAWID >= :p_from"); binds.p_from = from; }
      if (to)   { clauses.push("DRAWID <= :p_to");   binds.p_to   = to; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(
        `SELECT * FROM ${REWARD_DRAWID_VIEW} ${where} ORDER BY DRAWID DESC`,
        binds, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [], view: REWARD_DRAWID_VIEW });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // reward_channel — ສັງລວມ reward ຕາມ DRAWID + CHANNEL (filter by drawid range)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "reward_channel") {
      const from    = params.get("from")    ?? "";
      const to      = params.get("to")      ?? "";
      const channel = params.get("channel") ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from)    { clauses.push("DRAWID  >= :p_from");    binds.p_from    = from; }
      if (to)      { clauses.push("DRAWID  <= :p_to");      binds.p_to      = to; }
      if (channel) { clauses.push("CHANNEL  = :p_channel"); binds.p_channel = channel; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(
        `SELECT * FROM ${REWARD_CHANNEL_VIEW} ${where} ORDER BY DRAWID DESC, CHANNEL`,
        binds, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [], view: REWARD_CHANNEL_VIEW });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Oracle API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}