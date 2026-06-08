// lib/oracle/client.ts
import oracledb from "oracledb";
import mysql from "mysql2/promise";

type OraclePool = Awaited<ReturnType<typeof oracledb.createPool>>;
type OracleConnection = Awaited<ReturnType<OraclePool["getConnection"]>>;

let pool: OraclePool | null = null;

export async function getPool(): Promise<OraclePool> {
  if (!pool) {
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER ?? "",
      password: process.env.ORACLE_PASSWORD ?? "",
      connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST ?? "172.22.7.41"})(PORT=${process.env.ORACLE_PORT ?? "1521"}))(CONNECT_DATA=(SID=${process.env.ORACLE_SID ?? "centralrptde"})))`,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    });
  }
  return pool;
}

export async function withConnection<T>(
  fn: (conn: OracleConnection) => Promise<T>,
): Promise<T> {
  const conn = await (await getPool()).getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}

// กันเคส localhost → socket/IPv6: ใช้ 127.0.0.1
export const mysqlPool = mysql.createPool({
  host:
    process.env.MYSQL_HOST === "localhost"
      ? "127.0.0.1"
      : process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306, // ✅ แก้ตรงนี้
  user: process.env.MYSQL_USER,
  password:
    process.env.MYSQL_PASSWORD === "" ? undefined : process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

export async function pingMysql() {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.ping();
    console.log(
      `MySQL ping OK: ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT} / ${process.env.MYSQL_DATABASE}`,
    );
  } finally {
    conn.release();
  }
}

export async function connectMysql() {
  return mysqlPool.getConnection();
}

export type { OracleConnection };
