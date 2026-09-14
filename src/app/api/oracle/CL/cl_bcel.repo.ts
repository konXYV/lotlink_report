// src/app/api/oracle/CL/cl_bcel.repo.ts
// ─── Bank Reconciliation — CL_BCEL_STMT (ບໍລິສັດ CL) ─────────────────────────
// TXN_TYPE ທີ່ຮູ້ຈັກ (ຕາມ SELECT DISTINCT(TXN_TYPE) FROM CL_BCEL_STMT):
//   FTR, LOTTERY PRIZE, TAX Dog racing prize, CHARGE FEE, Pupatao prize,
//   FEE_Dog racing prize, Dog racing prize, TAX Pupatao prize, TRANSFER BY,
//   FEE_LOTTERY PRIZE, FEE_Pupatao prize
// TXN_TYPE ອື່ນທີ່ບໍ່ຢູ່ໃນລາຍການນີ້ຈະຖືກລວມເຂົ້າຄໍລຳ "ອື່ນໆ" ຕໍ່ວັນ (ຄືຮູບແບບ BCEL)
import { withClConnection } from "./cl.connection";

export interface ClReconciliationRow {
  ວັນທີ: string | null;
  ລວມໜີ້: string;
  ລວມມີ: string;
  ລາງວັນ: string; // LOTTERY PRIZE (Dr)
  ຄ່າທໍານຽມລາງວັນ: string; // FEE_LOTTERY PRIZE (Dr)
  "ລາງວັນ Dog racing": string; // Dog racing prize (Dr)
  "ຄ່າທໍານຽມ Dog racing": string; // FEE_Dog racing prize (Dr)
  "ອາກອນ Dog racing": string; // TAX Dog racing prize (Cr)
  "ລາງວັນ Pupatao": string; // Pupatao prize (Dr)
  "ຄ່າທໍານຽມ Pupatao": string; // FEE_Pupatao prize (Dr)
  "ອາກອນ Pupatao": string; // TAX Pupatao prize (Cr)
  "ໂອນເງິນ - ໜີ້": string; // TRANSFER BY / FTR (Dr)
  "ໂອນເງິນ - ມີ": string; // TRANSFER BY / FTR (Cr)
  "Bank Fee": string; // CHARGE FEE (Dr)
  ອື່ນໆ: string | null;
  ສ່ວນຕ່າງ: string;
}

// ─── Bank Reconciliation — ແຍກຕາມງວດ (DRAWID) ແທນວັນທີ, ແຕ່ຍັງ filter ຕາມ BANK_DATE ທີ່ເລືອກ
export interface ClReconciliationByDrawRow {
  ງວດ: string | null;
  ວັນທີ: string | null;
  ລວມໜີ້: string;
  ລວມມີ: string;
  ລາງວັນ: string;
  ຄ່າທໍານຽມລາງວັນ: string;
  "ລາງວັນ Dog racing": string;
  "ຄ່າທໍານຽມ Dog racing": string;
  "ອາກອນ Dog racing": string;
  "ລາງວັນ Pupatao": string;
  "ຄ່າທໍານຽມ Pupatao": string;
  "ອາກອນ Pupatao": string;
  "ໂອນເງິນ - ໜີ້": string;
  "ໂອນເງິນ - ມີ": string;
  "Bank Fee": string;
  ອື່ນໆ: string | null;
  ສ່ວນຕ່າງ: string;
}

const KNOWN_TYPES_SQL = `'FTR','LOTTERY PRIZE','FEE_LOTTERY PRIZE','Dog racing prize','FEE_Dog racing prize','TAX Dog racing prize','Pupatao prize','FEE_Pupatao prize','TAX Pupatao prize','TRANSFER BY','CHARGE FEE'`;

function buildDateBinds(dateFrom?: string, dateTo?: string) {
  const conditions: string[] = [];
  const binds: Record<string, string> = {};
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

export async function getClBankReconciliation(
  dateFrom?: string,
  dateTo?: string,
): Promise<ClReconciliationRow[]> {
  const { conditions, binds } = buildDateBinds(dateFrom, dateTo);
  const mainWhere = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const othersWhere = conditions.length
    ? `AND ${conditions.join(" AND ")}`
    : "";

  return withClConnection(async (conn) => {
    // ── ໝາຍເຫດ: ບໍ່ໃສ່ schema prefix ເພາະ connect ດ້ວຍ user CL ເຊິ່ງເປັນເຈົ້າຂອງຕາຕະລາງນີ້ຢູ່ແລ້ວ
    const sqlMain = `
      SELECT
        TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS "ວັນທີ",
        TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'Dog racing prize'       THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_Dog racing prize'   THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'Pupatao prize'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_Pupatao prize'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'CHARGE FEE'             THEN BANK_DR ELSE 0 END)
        , 'FM9,999,999,999,990.00') AS "ລວມໜີ້",
        TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'TAX Dog racing prize'   THEN BANK_CR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'TAX Pupatao prize'      THEN BANK_CR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
        , 'FM9,999,999,999,990.00') AS "ລວມມີ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'        THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'    THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມລາງວັນ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'Dog racing prize'     THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ Dog racing",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_Dog racing prize' THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມ Dog racing",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX Dog racing prize' THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນ Dog racing",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'Pupatao prize'        THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ Pupatao",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_Pupatao prize'    THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມ Pupatao",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX Pupatao prize'    THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນ Pupatao",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR') THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂອນເງິນ - ໜີ້",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR') THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂອນເງິນ - ມີ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'CHARGE FEE'           THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "Bank Fee",
        TO_CHAR(
          (
              SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'Dog racing prize'       THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_Dog racing prize'   THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'Pupatao prize'          THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_Pupatao prize'      THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'CHARGE FEE'             THEN BANK_DR ELSE 0 END)
            - SUM(CASE WHEN TXN_TYPE = 'TAX Dog racing prize'   THEN BANK_CR ELSE 0 END)
            - SUM(CASE WHEN TXN_TYPE = 'TAX Pupatao prize'      THEN BANK_CR ELSE 0 END)
            - SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
          ) - (SUM(BANK_DR) - SUM(BANK_CR))
        , 'FM9,999,999,999,990.00') AS "ສ່ວນຕ່າງ"
      FROM CL_BCEL_STMT
      ${mainWhere}
      GROUP BY ROLLUP(BANK_DATE)
      ORDER BY GROUPING(BANK_DATE), BANK_DATE
    `;

    const sqlOthers = `
      SELECT TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS BD, TXN_TYPE,
             CASE WHEN SUM(BANK_DR) > 0 AND SUM(BANK_CR) = 0 THEN 'Dr'
                  WHEN SUM(BANK_CR) > 0 AND SUM(BANK_DR) = 0 THEN 'Cr'
                  ELSE 'Dr/Cr' END AS DIRECTION,
             ABS(SUM(BANK_DR) - SUM(BANK_CR)) AS AMT
      FROM CL_BCEL_STMT
      WHERE TXN_TYPE NOT IN (${KNOWN_TYPES_SQL}) ${othersWhere}
      GROUP BY BANK_DATE, TXN_TYPE
      ORDER BY BANK_DATE, TXN_TYPE
    `;

    // OUT_FORMAT_OBJECT = 4002 (ຄ່າຄົງທີ່ຂອງ node-oracledb, ຄືກັນກັບ LDB_recon_repo.ts)
    const OPT_OBJ = { outFormat: 4002, fetchArraySize: 200 };

    const [mainRes, othersRes] = await Promise.all([
      conn.execute(sqlMain, binds, OPT_OBJ),
      conn.execute(sqlOthers, binds, OPT_OBJ),
    ]);

    const othersMap: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((othersRes.rows as any[]) ?? []).forEach((o) => {
      const bd = String(o.BD ?? "");
      const txt = `${o.TXN_TYPE} (${o.DIRECTION}): ${Number(o.AMT).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      othersMap[bd] = othersMap[bd] ? `${othersMap[bd]} | ${txt}` : txt;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((mainRes.rows as any[]) ?? []).map((r) => ({
      ວັນທີ: r["ວັນທີ"] ?? null,
      ລວມໜີ້: r["ລວມໜີ້"] ?? "0.00",
      ລວມມີ: r["ລວມມີ"] ?? "0.00",
      ລາງວັນ: r["ລາງວັນ"] ?? "0.00",
      ຄ່າທໍານຽມລາງວັນ: r["ຄ່າທໍານຽມລາງວັນ"] ?? "0.00",
      "ລາງວັນ Dog racing": r["ລາງວັນ Dog racing"] ?? "0.00",
      "ຄ່າທໍານຽມ Dog racing": r["ຄ່າທໍານຽມ Dog racing"] ?? "0.00",
      "ອາກອນ Dog racing": r["ອາກອນ Dog racing"] ?? "0.00",
      "ລາງວັນ Pupatao": r["ລາງວັນ Pupatao"] ?? "0.00",
      "ຄ່າທໍານຽມ Pupatao": r["ຄ່າທໍານຽມ Pupatao"] ?? "0.00",
      "ອາກອນ Pupatao": r["ອາກອນ Pupatao"] ?? "0.00",
      "ໂອນເງິນ - ໜີ້": r["ໂອນເງິນ - ໜີ້"] ?? "0.00",
      "ໂອນເງິນ - ມີ": r["ໂອນເງິນ - ມີ"] ?? "0.00",
      "Bank Fee": r["Bank Fee"] ?? "0.00",
      ອື່ນໆ: r["ວັນທີ"] ? (othersMap[r["ວັນທີ"]] ?? null) : null,
      ສ່ວນຕ່າງ: r["ສ່ວນຕ່າງ"] ?? "0.00",
    }));
  });
}

// ─── ແຍກຕາມງວດ (DRAWID) — filter ຕາມ BANK_DATE ຄືເກົ່າ, ແຕ່ GROUP BY DRAWID ─────
// ໝາຍເຫດ: DRAWID ອາດ NULL ສຳລັບລາຍການທີ່ບໍ່ຜູກກັບງວດຫວຍ (ເຊັ່ນ CHARGE FEE, TRANSFER BY)
// ຈຶ່ງໃຊ້ NVL(DRAWID,'N/A') ເພື່ອບໍ່ໃຫ້ໄປປົນກັບແຖວລວມທັງໝົດ (ROLLUP) ເຊິ່ງ UI ໃຊ້ NULL ຕັດສິນ.
export async function getClBankReconciliationByDraw(
  dateFrom?: string,
  dateTo?: string,
): Promise<ClReconciliationByDrawRow[]> {
  const { conditions, binds } = buildDateBinds(dateFrom, dateTo);
  const mainWhere = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const othersWhere = conditions.length
    ? `AND ${conditions.join(" AND ")}`
    : "";

  return withClConnection(async (conn) => {
    const sqlMain = `
      SELECT
        NVL(DRAWID, 'N/A') AS "ງວດ",
        TO_CHAR(MIN(BANK_DATE), 'YYYY-MM-DD') AS "ວັນທີ_ຈາກ",
        TO_CHAR(MAX(BANK_DATE), 'YYYY-MM-DD') AS "ວັນທີ_ຫາ",
        TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'Dog racing prize'       THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_Dog racing prize'   THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'Pupatao prize'          THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'FEE_Pupatao prize'      THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'CHARGE FEE'             THEN BANK_DR ELSE 0 END)
        , 'FM9,999,999,999,990.00') AS "ລວມໜີ້",
        TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'TAX Dog racing prize'   THEN BANK_CR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE = 'TAX Pupatao prize'      THEN BANK_CR ELSE 0 END)
          + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
        , 'FM9,999,999,999,990.00') AS "ລວມມີ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'        THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'    THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມລາງວັນ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'Dog racing prize'     THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ Dog racing",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_Dog racing prize' THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມ Dog racing",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX Dog racing prize' THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນ Dog racing",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'Pupatao prize'        THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ລາງວັນ Pupatao",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_Pupatao prize'    THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ຄ່າທໍານຽມ Pupatao",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX Pupatao prize'    THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ອາກອນ Pupatao",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR') THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂອນເງິນ - ໜີ້",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR') THEN BANK_CR ELSE 0 END), 'FM9,999,999,999,990.00') AS "ໂອນເງິນ - ມີ",
        TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'CHARGE FEE'           THEN BANK_DR ELSE 0 END), 'FM9,999,999,999,990.00') AS "Bank Fee",
        TO_CHAR(
          (
              SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'Dog racing prize'       THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_Dog racing prize'   THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'Pupatao prize'          THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_Pupatao prize'      THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'CHARGE FEE'             THEN BANK_DR ELSE 0 END)
            - SUM(CASE WHEN TXN_TYPE = 'TAX Dog racing prize'   THEN BANK_CR ELSE 0 END)
            - SUM(CASE WHEN TXN_TYPE = 'TAX Pupatao prize'      THEN BANK_CR ELSE 0 END)
            - SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
          ) - (SUM(BANK_DR) - SUM(BANK_CR))
        , 'FM9,999,999,999,990.00') AS "ສ່ວນຕ່າງ"
      FROM CL_BCEL_STMT
      ${mainWhere}
      GROUP BY ROLLUP(NVL(DRAWID, 'N/A'))
      ORDER BY GROUPING(NVL(DRAWID, 'N/A')), NVL(DRAWID, 'N/A')
    `;

    const sqlOthers = `
      SELECT NVL(DRAWID, 'N/A') AS DID, TXN_TYPE,
             CASE WHEN SUM(BANK_DR) > 0 AND SUM(BANK_CR) = 0 THEN 'Dr'
                  WHEN SUM(BANK_CR) > 0 AND SUM(BANK_DR) = 0 THEN 'Cr'
                  ELSE 'Dr/Cr' END AS DIRECTION,
             ABS(SUM(BANK_DR) - SUM(BANK_CR)) AS AMT
      FROM CL_BCEL_STMT
      WHERE TXN_TYPE NOT IN (${KNOWN_TYPES_SQL}) ${othersWhere}
      GROUP BY NVL(DRAWID, 'N/A'), TXN_TYPE
      ORDER BY NVL(DRAWID, 'N/A'), TXN_TYPE
    `;

    const OPT_OBJ = { outFormat: 4002, fetchArraySize: 200 };

    const [mainRes, othersRes] = await Promise.all([
      conn.execute(sqlMain, binds, OPT_OBJ),
      conn.execute(sqlOthers, binds, OPT_OBJ),
    ]);

    const othersMap: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((othersRes.rows as any[]) ?? []).forEach((o) => {
      const did = String(o.DID ?? "");
      const txt = `${o.TXN_TYPE} (${o.DIRECTION}): ${Number(o.AMT).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      othersMap[did] = othersMap[did] ? `${othersMap[did]} | ${txt}` : txt;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((mainRes.rows as any[]) ?? []).map((r) => {
      const vFrom: string | null = r["ວັນທີ_ຈາກ"] ?? null;
      const vTo: string | null = r["ວັນທີ_ຫາ"] ?? null;
      const vanti =
        vFrom == null
          ? null
          : vFrom === vTo
            ? vFrom
            : `${vFrom} ~ ${vTo}`;
      return {
        ງວດ: r["ງວດ"] ?? null,
        ວັນທີ: vanti,
        ລວມໜີ້: r["ລວມໜີ້"] ?? "0.00",
        ລວມມີ: r["ລວມມີ"] ?? "0.00",
        ລາງວັນ: r["ລາງວັນ"] ?? "0.00",
        ຄ່າທໍານຽມລາງວັນ: r["ຄ່າທໍານຽມລາງວັນ"] ?? "0.00",
        "ລາງວັນ Dog racing": r["ລາງວັນ Dog racing"] ?? "0.00",
        "ຄ່າທໍານຽມ Dog racing": r["ຄ່າທໍານຽມ Dog racing"] ?? "0.00",
        "ອາກອນ Dog racing": r["ອາກອນ Dog racing"] ?? "0.00",
        "ລາງວັນ Pupatao": r["ລາງວັນ Pupatao"] ?? "0.00",
        "ຄ່າທໍານຽມ Pupatao": r["ຄ່າທໍານຽມ Pupatao"] ?? "0.00",
        "ອາກອນ Pupatao": r["ອາກອນ Pupatao"] ?? "0.00",
        "ໂອນເງິນ - ໜີ້": r["ໂອນເງິນ - ໜີ້"] ?? "0.00",
        "ໂອນເງິນ - ມີ": r["ໂອນເງິນ - ມີ"] ?? "0.00",
        "Bank Fee": r["Bank Fee"] ?? "0.00",
        ອື່ນໆ: r["ງວດ"] ? (othersMap[r["ງວດ"]] ?? null) : null,
        ສ່ວນຕ່າງ: r["ສ່ວນຕ່າງ"] ?? "0.00",
      };
    });
  });
}
