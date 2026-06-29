import { NextResponse } from "next/server";
import { VIEWS, ACCOUNTS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

function buildBcelDateBinds(params: URLSearchParams) {
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const conditions: string[] = [`BANK_ACCT = :bcelAcct`];
  const binds: Record<string, string> = { bcelAcct: ACCOUNTS.BCEL };

  if (dateFrom) {
    conditions.push("BANK_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
    binds.dateFrom = dateFrom;
  }
  if (dateTo) {
    const dt = new Date(dateTo);
    dt.setDate(dt.getDate() + 1);
    conditions.push("BANK_DATE < TO_DATE(:dateTo, 'YYYY-MM-DD')");
    binds.dateTo = dt.toISOString().slice(0, 10);
  }
  return { conditions, binds };
}

export async function handleBcelRewardSummary(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildBcelDateBinds(params);
  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const taxConditions = [
    `TXN_TYPE IN ('TAX LOTTERY PRIZE','TAX SCN LOTTERY PRIZE')`,
    ...conditions,
  ];

  const sqlMain = `
    SELECT t."ງວດ", t."ລາງວັນ", t."ໂຊກຊ້ອນໂຊກ", t."ຄ່າທຳນຽມ",
           t."ໂຊກ Spin", t."ຄ່າທຳນຽມ_SPIN", t."ລາງວັນ SCN",
           t."ໂຊກຊ້ອນໂຊກ SCN", t."ຄ່າທຳນຽມ SCN", t."ອາກອນ SCN 5%"
    FROM (
      SELECT
        CASE GROUPING(DRAWID) WHEN 1 THEN 'ລວມທັງໝົດ' ELSE TO_CHAR(DRAWID) END AS "ງວດ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'           THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'                THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'       THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທຳນຽມ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'           THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂຊກ Spin",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'       THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທຳນຽມ_SPIN",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCN LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ SCN",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE in ('SCN BONUS','SCN BONUS ADJUST')              THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ SCN",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SCN LOTTERY PRIZE'  THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທຳນຽມ SCN",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX SCN LOTTERY PRIZE'   THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນ SCN 5%"
      FROM ${VIEWS.BCEL_STMT} ${whereClause}
      GROUP BY ROLLUP(DRAWID)
      ORDER BY GROUPING(DRAWID), DRAWID
    ) t`;

  const sqlTax = `
    SELECT TO_CHAR(SUM(BANK_CR), 'FM9,999,999,999,990.00') AS TAX_TOTAL
    FROM ${VIEWS.BCEL_STMT}
    WHERE ${taxConditions.join(" AND ")}`;

  const [mainRes, taxRes] = await Promise.all([
    conn.execute(sqlMain, binds, OPT_OBJ),
    conn.execute(sqlTax, binds, OPT_OBJ),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taxTotal: string = (taxRes.rows?.[0] as any)?.TAX_TOTAL ?? "0.00";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (mainRes.rows ?? []).map((r: any) => ({
    ງວດ: r["ງວດ"] ?? "",
    ລາງວັນ: r["ລາງວັນ"] ?? "0.00",
    ໂຊກຊ້ອນໂຊກ: r["ໂຊກຊ້ອນໂຊກ"] ?? "0.00",
    ຄ່າທຳນຽມ: r["ຄ່າທຳນຽມ"] ?? "0.00",
    "ໂຊກ Spin": r["ໂຊກ Spin"] ?? "0.00",
    ຄ່າທຳນຽມ_SPIN: r["ຄ່າທຳນຽມ_SPIN"] ?? "0.00",
    "ລາງວັນ SCN": r["ລາງວັນ SCN"] ?? "0.00",
    "ໂຊກຊ້ອນໂຊກ SCN": r["ໂຊກຊ້ອນໂຊກ SCN"] ?? "0.00",
    "ຄ່າທຳນຽມ SCN": r["ຄ່າທຳນຽມ SCN"] ?? "0.00",
    "ອາກອນ SCN 5%": r["ອາກອນ SCN 5%"] ?? "0.00",
    "ອາກອນ5%": taxTotal,
  }));
  return NextResponse.json({ rows, taxTotal });
}

export async function handleBcelTax5Items(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildBcelDateBinds(params);
  conditions.push(`TXN_TYPE IN ('TAX LOTTERY PRIZE','TAX SCN LOTTERY PRIZE')`);
  const sql = `
    SELECT TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS BANK_DATE, TO_CHAR(DRAWID) AS DRAWID, BANK_CR
    FROM ${VIEWS.BCEL_STMT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY BANK_DATE ASC, BANK_CR DESC`;
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

export async function handleBcelOtherItems(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildBcelDateBinds(params);
  const knownTypes = `'LOTTERY PRIZE','SPLUSPRO','FEE_LOTTERY PRIZE','SPLUSPRO_SPIN','FEE_SPLUSPRO_SPIN','TAX LOTTERY PRIZE','TAX SCN LOTTERY PRIZE','SCN LOTTERY PRIZE','SCN BONUS','FEE_SCN LOTTERY PRIZE','TRANSFER BY','FTR','SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE'`;
  conditions.push(`TXN_TYPE NOT IN (${knownTypes})`);
  const sql = `
    SELECT TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS BANK_DATE, TXN_TYPE, BANK_DR
    FROM ${VIEWS.BCEL_STMT}
    WHERE ${conditions.join(" AND ")} AND BANK_DR > 0
    ORDER BY BANK_DATE ASC, TXN_TYPE`;
  const result = await conn.execute(sql, binds, OPT_OBJ);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    rows: (result.rows ?? []).map((r: any) => ({
      BANK_DATE: r.BANK_DATE ?? "",
      TXN_TYPE: r.TXN_TYPE ?? "",
      BANK_DR: Number(r.BANK_DR ?? 0),
    })),
  });
}

export async function handleBankReconciliation(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const { conditions, binds } = buildBcelDateBinds(params);
  const mainWhere = `WHERE ${conditions.join(" AND ")}`;
  // ── ເພີ່ມ SCN BONUS ແລະ TAX SCN LOTTERY PRIZE ເຂົ້າໃນ knownTypes ──
  const knownTypes = `'LOTTERY PRIZE','SPLUSPRO','SCN LOTTERY PRIZE','SCN BONUS','SPLUSPRO_SPIN','TAX LOTTERY PRIZE','TAX SCN LOTTERY PRIZE','FEE_LOTTERY PRIZE','FEE_SCN LOTTERY PRIZE','FEE_SPLUSPRO_SPIN','TRANSFER BY','FTR','SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE'`;

  const sqlMain = `
    SELECT
      TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS "ວັນທີ",
      TO_CHAR(
          SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'               THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'SCN LOTTERY PRIZE'     THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'SCN BONUS'             THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'          THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'FEE_SCN LOTTERY PRIZE' THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE IN ('SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE') THEN BANK_DR ELSE 0 END)
      , 'FM9,999,999,999,990.00') AS "ລວມໜີ້",
      TO_CHAR(
          SUM(CASE WHEN TXN_TYPE = 'TAX LOTTERY PRIZE'      THEN BANK_CR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE = 'TAX SCN LOTTERY PRIZE'  THEN BANK_CR ELSE 0 END)
        + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
      , 'FM9,999,999,999,990.00') AS "ລວມມີ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ Sokxay",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'               THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'          THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ວົງລໍ້ໂຊກໄຊ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX LOTTERY PRIZE'      THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນລາງວັນ ໂຊກໄຊ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCN LOTTERY PRIZE'     THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ SCN",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SCN LOTTERY PRIZE' THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCN BONUS'             THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ SCN",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX SCN LOTTERY PRIZE'  THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນ SCN",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ການໂອນເງິນ - ໜີ້",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ການໂອນເງິນ - ມີ",
      TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE') THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "Bank Fee",
      TO_CHAR(
        (
            SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'               THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'SCN LOTTERY PRIZE'     THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'SCN BONUS'             THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_SCN LOTTERY PRIZE' THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE IN ('SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE') THEN BANK_DR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE = 'TAX LOTTERY PRIZE'      THEN BANK_CR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE = 'TAX SCN LOTTERY PRIZE'  THEN BANK_CR ELSE 0 END)
          - SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
        ) - (SUM(BANK_DR) - SUM(BANK_CR))
      , 'FM9,999,999,999,990.00') AS "ສ່ວນຕ່າງ"
    FROM ECOMMERCE2026.BCEL_STMT
    ${mainWhere}
    GROUP BY ROLLUP(BANK_DATE)
    ORDER BY GROUPING(BANK_DATE), BANK_DATE`;

  const othersWhere =
    conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
  const sqlOthers = `
    SELECT TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS BD, TXN_TYPE,
           CASE WHEN SUM(BANK_DR) > 0 AND SUM(BANK_CR) = 0 THEN 'Dr'
                WHEN SUM(BANK_CR) > 0 AND SUM(BANK_DR) = 0 THEN 'Cr'
                ELSE 'Dr/Cr' END AS DIRECTION,
           ABS(SUM(BANK_DR) - SUM(BANK_CR)) AS AMT
    FROM ECOMMERCE2026.BCEL_STMT
    WHERE TXN_TYPE NOT IN (${knownTypes}) ${othersWhere}
    GROUP BY BANK_DATE, TXN_TYPE
    ORDER BY BANK_DATE, TXN_TYPE`;

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
    "ລາງວັນ Sokxay": r["ລາງວັນ Sokxay"] ?? "0.00",
    ໂຊກຊ້ອນໂຊກ: r["ໂຊກຊ້ອນໂຊກ"] ?? "0.00",
    "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ": r["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ"] ?? "0.00",
    ວົງລໍ້ໂຊກໄຊ: r["ວົງລໍ້ໂຊກໄຊ"] ?? "0.00",
    "ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ":
      r["ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ"] ?? "0.00",
    "ອາກອນລາງວັນ ໂຊກໄຊ": r["ອາກອນລາງວັນ ໂຊກໄຊ"] ?? "0.00",
    "ລາງວັນ SCN": r["ລາງວັນ SCN"] ?? "0.00",
    "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN": r["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN"] ?? "0.00",
    // ── ໃໝ່ ──
    "ໂຊກຊ້ອນໂຊກ SCN": r["ໂຊກຊ້ອນໂຊກ SCN"] ?? "0.00",
    "ອາກອນ SCN": r["ອາກອນ SCN"] ?? "0.00",
    // ── ──────
    "ການໂອນເງິນ - ໜີ້": r["ການໂອນເງິນ - ໜີ້"] ?? "0.00",
    "ການໂອນເງິນ - ມີ": r["ການໂອນເງິນ - ມີ"] ?? "0.00",
    "Bank Fee": r["Bank Fee"] ?? "0.00",
    ອື່ນໆ: r["ວັນທີ"] ? (othersMap[r["ວັນທີ"]] ?? null) : null,
    ສ່ວນຕ່າງ: r["ສ່ວນຕ່າງ"] ?? "0.00",
  }));
  return NextResponse.json({ rows });
}
