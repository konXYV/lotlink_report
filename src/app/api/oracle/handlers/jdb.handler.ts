import { NextResponse } from "next/server";
import { VIEWS, ACCOUNTS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

function buildJdbDateBinds(
  params: URLSearchParams,
  acctKey: keyof typeof ACCOUNTS = "JDB",
) {
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const conditions: string[] = [`BANK_ACCT = :jdbAcct`];
  const binds: Record<string, string> = { jdbAcct: ACCOUNTS[acctKey] };
  if (dateFrom) {
    conditions.push("TRUNC(BANK_TXN_DATE) >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
    binds.dateFrom = dateFrom;
  }
  if (dateTo) {
    const dt = new Date(dateTo);
    dt.setDate(dt.getDate() + 1);
    conditions.push("TRUNC(BANK_TXN_DATE) < TO_DATE(:dateTo, 'YYYY-MM-DD')");
    binds.dateTo = dt.toISOString().slice(0, 10);
  }
  return { conditions, binds };
}

export async function handleJdbRewardSummary(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildJdbDateBinds(params);
  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT
      CASE GROUPING(DRAWID) WHEN 1 THEN 'ລວມທັງໝົດ' ELSE TO_CHAR(DRAWID) END AS "ງວດ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE'     THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990') AS "ລາງວັນ Sokxay",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_PRICE' THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990') AS "ທຳນຽມ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRO'       THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990') AS "ໂຊກຊ້ອນໂຊກ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_SPIN'      THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990') AS "ໂຊກ Spin",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCN_PRICE'       THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990') AS "ລາງວັນ SCN",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCN_PRO'         THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990') AS "ໂຊກຊ້ອນໂຊກ SCN"
    FROM ${VIEWS.JDB_STMT} ${whereClause}
    GROUP BY ROLLUP(DRAWID)
    ORDER BY GROUPING(DRAWID), DRAWID`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    rows: (result.rows ?? []).map((r: any) => ({
      ງວດ: r["ງວດ"] ?? "",
      "ລາງວັນ Sokxay": r["ລາງວັນ Sokxay"] ?? "0",
      ທຳນຽມ: r["ທຳນຽມ"] ?? "0",
      ໂຊກຊ້ອນໂຊກ: r["ໂຊກຊ້ອນໂຊກ"] ?? "0",
      "ໂຊກ Spin": r["ໂຊກ Spin"] ?? "0",
      "ລາງວັນ SCN": r["ລາງວັນ SCN"] ?? "0",
      "ໂຊກຊ້ອນໂຊກ SCN": r["ໂຊກຊ້ອນໂຊກ SCN"] ?? "0",
    })),
  });
}

export async function handleJdbTax5Items(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildJdbDateBinds(params);
  conditions.push(`TXN_TYPE = 'SPLUS_PRICE_TAX'`);
  const sql = `
    SELECT TO_CHAR(BANK_TXN_DATE, 'YYYY-MM-DD') AS BANK_DATE, TO_CHAR(DRAWID) AS DRAWID, BANK_CR
    FROM ${VIEWS.JDB_STMT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY BANK_TXN_DATE ASC, BANK_CR DESC`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    rows: (result.rows ?? []).map((r: any) => ({
      BANK_DATE: r.BANK_DATE ?? "",
      DRAWID: r.DRAWID ?? "",
      BANK_CR: Number(r.BANK_CR ?? 0),
    })),
  });
}

export async function handleJdbOtherItems(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildJdbDateBinds(params);
  const knownTypes = `'SPLUS_PRICE','FEE_SPLUS_PRICE','SPLUS_PRO','SPLUS_SPIN','SCN_PRICE','SCN_PRO','SPLUS_PRICE_TAX'`;
  conditions.push(`TXN_TYPE NOT IN (${knownTypes})`);
  const sql = `
    SELECT TO_CHAR(BANK_TXN_DATE, 'YYYY-MM-DD') AS BANK_DATE, TXN_TYPE, BANK_DESCRIPTION, BANK_DR
    FROM ${VIEWS.JDB_STMT}
    WHERE ${conditions.join(" AND ")} AND BANK_DR > 0
    ORDER BY BANK_TXN_DATE ASC, TXN_TYPE, BANK_DESCRIPTION`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    rows: (result.rows ?? []).map((r: any) => ({
      BANK_DATE: r.BANK_DATE ?? "",
      TXN_TYPE: r.TXN_TYPE ?? "",
      BANK_DESCRIPTION: r.BANK_DESCRIPTION ?? "",
      BANK_DR: Number(r.BANK_DR ?? 0),
    })),
  });
}

export async function handleJdbBankReconciliation(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const acctParam = params.get("acct") ?? ACCOUNTS.JDB;
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";

  const conditions: string[] = [`BANK_ACCT = :acct`];
  const binds: Record<string, string> = { acct: acctParam };
  if (dateFrom) {
    conditions.push("TRUNC(BANK_TXN_DATE) >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
    binds.dateFrom = dateFrom;
  }
  if (dateTo) {
    const dt = new Date(dateTo);
    dt.setDate(dt.getDate() + 1);
    conditions.push("TRUNC(BANK_TXN_DATE) < TO_DATE(:dateTo, 'YYYY-MM-DD')");
    binds.dateTo = dt.toISOString().slice(0, 10);
  }

  const mainWhere = `WHERE ${conditions.join(" AND ")}`;
  const knownTypes = `'SPLUS_PRICE','FEE_SPLUS_PRICE','SPLUS_PRO','SPLUS_REFUND','FEE_SPLUS_REFUND','LOTTO_SELL','TRANSFER','ATT','IBANK_FEE','FTR_FEE','TRANSFER FEE','FEE_JDB_LOTTO_SETTL','SAVING_INTEREST','SPLUS_PRICE_TAX'`;

  const sqlMain = `
    SELECT
      TO_CHAR(TRUNC(BANK_TXN_DATE), 'YYYY-MM-DD') AS "ວັນທີ",
      TO_CHAR(SUM(BANK_DR), 'FM9,999,999,999,990.00') AS "ລວມໜີ້",
      TO_CHAR(SUM(BANK_CR), 'FM9,999,999,999,990.00') AS "ລວມມີ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE'      THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "SPLUS_PRICE",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_PRICE'  THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "FEE_SPLUS_PRICE",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRO'        THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "SPLUS_PRO",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_REFUND'     THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "SPLUS_REFUND",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_REFUND' THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "FEE_SPLUS_REFUND",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTO_SELL'       THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "LOTTO_SELL",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TRANSFER'         THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "TRANSFER",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TRANSFER'         THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "TRANSFER_CR",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'ATT'                   THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ATT",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'IBANK_FEE'             THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "IBANK_FEE",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FTR_FEE'              THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "FTR_FEE",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TRANSFER FEE'         THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "TRANSFER_FEE",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_JDB_LOTTO_SETTL' THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "FEE_JDB_LOTTO_SETTL",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SAVING_INTEREST' THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "SAVING_INTEREST",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE_TAX' THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "SPLUS_PRICE_TAX",
      TO_CHAR(
        (
            SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE'           THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_PRICE'       THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRO'             THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'SPLUS_REFUND'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_REFUND'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'TRANSFER'              THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'ATT'                   THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'IBANK_FEE'             THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FTR_FEE'              THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'TRANSFER FEE'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_JDB_LOTTO_SETTL'  THEN BANK_DR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE = 'LOTTO_SELL'            THEN BANK_CR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE = 'TRANSFER'              THEN BANK_CR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE = 'SAVING_INTEREST'       THEN BANK_CR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE_TAX'       THEN BANK_CR ELSE 0 END)
        ) - (SUM(BANK_DR) - SUM(BANK_CR))
      , 'FM9,999,999,999,990.00') AS "ສ່ວນຕ່າງ"
    FROM ${VIEWS.JDB_STMT} ${mainWhere}
    GROUP BY ROLLUP(TRUNC(BANK_TXN_DATE))
    ORDER BY GROUPING(TRUNC(BANK_TXN_DATE)), TRUNC(BANK_TXN_DATE)`;

  const sqlOthers = `
    SELECT TO_CHAR(TRUNC(BANK_TXN_DATE), 'YYYY-MM-DD') AS BD, TXN_TYPE,
           CASE WHEN SUM(BANK_DR) > 0 AND SUM(BANK_CR) = 0 THEN 'Dr'
                WHEN SUM(BANK_CR) > 0 AND SUM(BANK_DR) = 0 THEN 'Cr'
                ELSE 'Dr/Cr' END AS DIRECTION,
           ABS(SUM(BANK_DR) - SUM(BANK_CR)) AS AMT
    FROM ${VIEWS.JDB_STMT}
    WHERE ${[...conditions, `TXN_TYPE NOT IN (${knownTypes})`].join(" AND ")}
    GROUP BY TRUNC(BANK_TXN_DATE), TXN_TYPE
    ORDER BY TRUNC(BANK_TXN_DATE), TXN_TYPE`;

  const [mainRes, othersRes] = await Promise.all([
    conn.execute(sqlMain, binds, OPT_OBJ),
    conn.execute(sqlOthers, binds, OPT_OBJ),
  ]);

  const othersMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (othersRes.rows ?? []).forEach((o: any) => {
    const bd = String(o.BD ?? "");
    const txt = `${o.TXN_TYPE} (${o.DIRECTION}): ${Number(o.AMT).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    othersMap[bd] = othersMap[bd] ? `${othersMap[bd]} | ${txt}` : txt;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (mainRes.rows ?? []).map((r: any) => ({
    ວັນທີ: r["ວັນທີ"] ?? null,
    ລວມໜີ້: r["ລວມໜີ້"] ?? "0.00",
    ລວມມີ: r["ລວມມີ"] ?? "0.00",
    SPLUS_PRICE: r["SPLUS_PRICE"] ?? "0.00",
    FEE_SPLUS_PRICE: r["FEE_SPLUS_PRICE"] ?? "0.00",
    SPLUS_PRO: r["SPLUS_PRO"] ?? "0.00",
    SPLUS_REFUND: r["SPLUS_REFUND"] ?? "0.00",
    FEE_SPLUS_REFUND: r["FEE_SPLUS_REFUND"] ?? "0.00",
    LOTTO_SELL: r["LOTTO_SELL"] ?? "0.00",
    TRANSFER: r["TRANSFER"] ?? "0.00",
    TRANSFER_CR: r["TRANSFER_CR"] ?? "0.00",
    ATT: r["ATT"] ?? "0.00",
    IBANK_FEE: r["IBANK_FEE"] ?? "0.00",
    FTR_FEE: r["FTR_FEE"] ?? "0.00",
    TRANSFER_FEE: r["TRANSFER_FEE"] ?? "0.00",
    FEE_JDB_LOTTO_SETTL: r["FEE_JDB_LOTTO_SETTL"] ?? "0.00",
    SAVING_INTEREST: r["SAVING_INTEREST"] ?? "0.00",
    SPLUS_PRICE_TAX: r["SPLUS_PRICE_TAX"] ?? "0.00",
    ອື່ນໆ: r["ວັນທີ"] ? (othersMap[r["ວັນທີ"]] ?? null) : null,
    ສ່ວນຕ່າງ: r["ສ່ວນຕ່າງ"] ?? "0.00",
  }));
  return NextResponse.json({ rows });
}

export async function handleJdbSellReconciliation(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const drawFrom = params.get("draw_from") ?? "";
  const drawTo = params.get("draw_to") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {
    p_acct: ACCOUNTS.JDB_3180,
    p_txn_sell: "LOTTO_SELL",
    p_txn_refund: "SPLUS_REFUND",
    p_dealerid: "080821001APP",
  };

  const drawClauses: string[] = [];
  if (drawFrom) {
    drawClauses.push("TO_CHAR(a.DRAWID) >= TO_CHAR(:p_draw_from)");
    binds.p_draw_from = drawFrom;
  }
  if (drawTo) {
    drawClauses.push("TO_CHAR(a.DRAWID) <= TO_CHAR(:p_draw_to)");
    binds.p_draw_to = drawTo;
  }
  const drawWhere = drawClauses.length
    ? "AND " + drawClauses.join(" AND ")
    : "";

  const sql = `
    SELECT q.*, (q.REAL_STMT - q.AFTERDISCOUNT - q.REFUND_AMOUNT) AS DIFF
    FROM (
      SELECT
        base.DRAWID, base.DRAWDATE, base.A_YODKHAI,
        (base.A_YODKHAI - NVL(b.TOTAL_BANK_CR, 0))                AS DISCUSPOINT,
        NVL(r.TOTAL_REFUND, 0)                                      AS REFUND_AMOUNT,
        (NVL(b.TOTAL_BANK_CR, 0) - NVL(r.TOTAL_REFUND, 0))        AS AFTERDISCOUNT,
        (NVL(b.TOTAL_BANK_CR, 0) - NVL(r.TOTAL_REFUND, 0)) * 0.01 AS FEE_ONE_PERCENT,
        (NVL(b.TOTAL_BANK_CR, 0) - NVL(r.TOTAL_REFUND, 0)) * 0.99 AS AFTER_DISCUS_ALL,
        NVL(b.TOTAL_BANK_CR, 0)                                     AS REAL_STMT
      FROM (
        SELECT a.DRAWID, MAX(a.DRAW_DATE) AS DRAWDATE,
               SUM(a.TOTALSALE) AS A_YODKHAI
        FROM LOTLINK_BILL a
        WHERE a.DEALERID = :p_dealerid
          AND LENGTH(a.CLIENTREFNO) < 25
          AND EXISTS (
            SELECT 1 FROM ${VIEWS.JDB_STMT} s
            WHERE s.BANK_ACCT = :p_acct AND s.TXN_TYPE = :p_txn_sell
              AND TO_CHAR(s.DRAWID) = TO_CHAR(a.DRAWID)
              AND TO_CHAR(s.LOTTO_BILL_NO) = TO_CHAR(a.BILLNUMBER)
          )
          ${drawWhere}
        GROUP BY a.DRAWID
      ) base
      INNER JOIN (
        SELECT TO_CHAR(DRAWID) AS DRAWID, SUM(BANK_CR) AS TOTAL_BANK_CR
        FROM ${VIEWS.JDB_STMT}
        WHERE BANK_ACCT = :p_acct AND TXN_TYPE = :p_txn_sell
        GROUP BY DRAWID
      ) b ON b.DRAWID = TO_CHAR(base.DRAWID)
      LEFT JOIN (
        SELECT TO_CHAR(DRAWID) AS DRAWID, SUM(BANK_DR) AS TOTAL_REFUND
        FROM ${VIEWS.JDB_STMT}
        WHERE BANK_ACCT = :p_acct AND TXN_TYPE = :p_txn_refund
        GROUP BY DRAWID
      ) r ON r.DRAWID = TO_CHAR(base.DRAWID)
    ) q
    ORDER BY q.DRAWID ASC`;

  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (result.rows ?? []).map((r: any) => ({
    DRAWDATE:
      r.DRAWDATE != null
        ? r.DRAWDATE instanceof Date
          ? r.DRAWDATE.toLocaleDateString("en-GB")
          : String(r.DRAWDATE)
        : null,
    DRAWID: r.DRAWID != null ? String(r.DRAWID) : "",
    A_YODKHAI: r.A_YODKHAI ?? "0.00",
    DISCUSPOINT: r.DISCUSPOINT ?? "0.00",
    REFUND_AMOUNT: r.REFUND_AMOUNT ?? "0.00",
    AFTERDISCOUNT: r.AFTERDISCOUNT ?? "0.00",
    FEE_ONE_PERCENT: r.FEE_ONE_PERCENT ?? "0.00",
    AFTER_DISCUS_ALL: r.AFTER_DISCUS_ALL ?? "0.00",
    REAL_STMT: r.REAL_STMT ?? "0.00",
    DIFF: r.DIFF ?? "0.00",
  }));
  return NextResponse.json({ rows });
}
