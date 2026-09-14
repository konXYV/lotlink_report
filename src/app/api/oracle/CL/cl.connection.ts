// src/app/api/oracle/CL/cl.connection.ts
// ─── Dedicated Oracle connection pool for CL company (ແຍກ server ຕ່າງຫາກ) ───
// ໝາຍເຫດ: DB ຂອງ CL ຢູ່ຄົນລະເຄື່ອງກັບ pool ຫຼັກ (Connect_db.ts / lib/db.ts)
// ດັ່ງນັ້ນຕ້ອງໃຊ້ pool ແຍກຕ່າງຫາກ ແລະ env var ຄົນລະຊື່ (ຄໍານຳໜ້າ CL_)
// ເພື່ອບໍ່ໃຫ້ໄປທັບກັບ ORACLE_HOST / ORACLE_USER ... ຂອງລະບົບຫຼັກ.
import oracledb from "oracledb";

type OraclePool = Awaited<ReturnType<typeof oracledb.createPool>>;
type OracleConnection = Awaited<ReturnType<OraclePool["getConnection"]>>;

let pool: OraclePool | null = null;

// ─── ຄ່າ default ຕາມທີ່ແຈ້ງມາ — override ໄດ້ຜ່ານ .env (CL_ORACLE_*) ─────────
export const CL_ORA_CONFIG = {
  host: process.env.CL_ORACLE_HOST ?? "172.22.7.53",
  port: Number(process.env.CL_ORACLE_PORT ?? "1521"),
  sid: process.env.CL_ORACLE_SID ?? "centralrptde",
  user: process.env.CL_ORACLE_USER ?? "CL",
  password: process.env.CL_ORACLE_PASSWORD ?? "Sokxay#2026",
};

export async function getClPool(): Promise<OraclePool> {
  if (!pool) {
    pool = await oracledb.createPool({
      user: CL_ORA_CONFIG.user,
      password: CL_ORA_CONFIG.password,
      connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${CL_ORA_CONFIG.host})(PORT=${CL_ORA_CONFIG.port}))(CONNECT_DATA=(SID=${CL_ORA_CONFIG.sid})))`,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    });
  }
  return pool;
}

export async function withClConnection<T>(
  fn: (conn: OracleConnection) => Promise<T>,
): Promise<T> {
  const conn = await (await getClPool()).getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close().catch(() => {});
  }
}

export type { OracleConnection as ClOracleConnection };
