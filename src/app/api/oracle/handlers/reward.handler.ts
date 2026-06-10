import { NextResponse } from "next/server";
import { VIEWS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

export async function handleReward(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const drawid   = params.get("drawid")  ?? "";
  const channel  = params.get("channel") ?? "";
  const owner    = params.get("owner")   ?? "";
  const q        = params.get("q")       ?? "";
  const pageNum  = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
  const offset   = (pageNum - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fb: Record<string, any> = {};
  const clauses: string[] = [];
  if (drawid)  { clauses.push("DRAWID  = :p_drawid");  fb.p_drawid  = drawid;  }
  if (channel) { clauses.push("CHANNEL = :p_channel"); fb.p_channel = channel; }
  if (owner)   { clauses.push("OWNER   = :p_owner");   fb.p_owner   = owner;   }
  if (q) {
    clauses.push("(BILLNUMBER LIKE :p_q OR TRANSACTION_NO LIKE :p_q OR WIN_NUMBER LIKE :p_q OR OWNER LIKE :p_q OR CHANNEL LIKE :p_q)");
    fb.p_q = `%${q}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const aggSql = `
    SELECT COUNT(*) AS TOTAL,
           SUM(LOTLINK_REWARD) AS LOTLINK_REWARD,
           SUM(LOTLINK_REWARD_AFTER_TAX) AS LOTLINK_REWARD_AFTER_TAX,
           SUM(LOTLINK_TAX_REWARD) AS LOTLINK_TAX_REWARD,
           SUM(TT_PAID_REAWRD) AS TT_PAID_REAWRD,
           SUM(SOKXAY_PRO) AS SOKXAY_PRO,
           SUM(SCN_PRO) AS SCN_PRO
    FROM ${VIEWS.REWARD} ${where}`;

  const dataSql = `
    SELECT * FROM ${VIEWS.REWARD} ${where}
    ORDER BY DRAWID DESC, DRAW_DATE DESC
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
    page: pageNum, pageSize,
    totals: {
      LOTLINK_REWARD:           Number(agg.LOTLINK_REWARD ?? 0),
      LOTLINK_REWARD_AFTER_TAX: Number(agg.LOTLINK_REWARD_AFTER_TAX ?? 0),
      LOTLINK_TAX_REWARD:       Number(agg.LOTLINK_TAX_REWARD ?? 0),
      TT_PAID_REAWRD:           Number(agg.TT_PAID_REAWRD ?? 0),
      SOKXAY_PRO:               Number(agg.SOKXAY_PRO ?? 0),
      SCN_PRO:                  Number(agg.SCN_PRO ?? 0),
    },
  });
}

export async function handleRewardDrawid(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const from = params.get("from") ?? "";
  const to   = params.get("to")   ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {};
  const clauses: string[] = [];
  if (from) { clauses.push("DRAWID >= :p_from"); binds.p_from = from; }
  if (to)   { clauses.push("DRAWID <= :p_to");   binds.p_to   = to;   }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await conn.execute(
    `SELECT * FROM ${VIEWS.REWARD_DRAWID} ${where} ORDER BY DRAWID DESC`,
    binds, OPT_OBJ,
  );
  return NextResponse.json({ rows: result.rows ?? [], view: VIEWS.REWARD_DRAWID });
}

export async function handleRewardChannel(conn: Conn, OPT_OBJ: OPT, params: URLSearchParams) {
  const from    = params.get("from")    ?? "";
  const to      = params.get("to")      ?? "";
  const channel = params.get("channel") ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {};
  const clauses: string[] = [];
  if (from)    { clauses.push("DRAWID  >= :p_from");    binds.p_from    = from;    }
  if (to)      { clauses.push("DRAWID  <= :p_to");      binds.p_to      = to;      }
  if (channel) { clauses.push("CHANNEL  = :p_channel"); binds.p_channel = channel; }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await conn.execute(
    `SELECT * FROM ${VIEWS.REWARD_CHANNEL} ${where} ORDER BY DRAWID DESC, CHANNEL`,
    binds, OPT_OBJ,
  );
  return NextResponse.json({ rows: result.rows ?? [], view: VIEWS.REWARD_CHANNEL });
}
