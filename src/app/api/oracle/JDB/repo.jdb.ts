// src/app/api/oracle/Cases_support/repo/Repo_Cases.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db"; // ✅ path ถูกต้อง
import { JDB_STMT_ENTITY } from "../../../CASES-LOTTO/types/Type_Jdb";

export class JDB_Repo {
  async findByBillNumber_STMT(
    BillNumber: string,
  ): Promise<JDB_STMT_ENTITY | null> {
    return withConnection(async (conn) => {
      const result = await conn.execute(
        `select * from APP_V_JDB_STMT
          WHERE LOTTO_BILL_NO = :BillNumber `,
        { BillNumber },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ใช้ constant แทนตัวเลข 2
      );

      // ✅ cast ที่ rows แทน generic บน execute (แก้ "Untyped function calls")
      const rows = result.rows as JDB_STMT_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }
}
