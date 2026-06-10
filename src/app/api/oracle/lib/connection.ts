// ─── Oracle Connection Helper ──────────────────────────────────────────────
import { ORA_CONFIG } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export async function getOracleDb() {
  if (_db) return _db;
  const mod = await import("oracledb");
  _db = mod.default ?? mod;
  return _db;
}

export async function openConnection() {
  const oracledb = await getOracleDb();
  return oracledb.getConnection({
    connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${ORA_CONFIG.host})(PORT=${ORA_CONFIG.port}))(CONNECT_DATA=(SID=${ORA_CONFIG.sid})))`,
    user: ORA_CONFIG.user,
    password: ORA_CONFIG.password,
  });
}

export async function getOutFormat() {
  const oracledb = await getOracleDb();
  return {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    fetchArraySize: 200,
  };
}
