// src/app/api/oracle/Cases_support/repo/Repo_Cases.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db"; // ✅ path ถูกต้อง
import {
  ORDER_SPIN_ENTITY,
  STMT_SPIN_ENTITY,
} from "../../../CASES-LOTTO/types/Type_spin";

export class Spin_Repo {
  async findByIdOrder(case_number: string): Promise<ORDER_SPIN_ENTITY | null> {
    return withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT * FROM APP_V_ORDER_SPIN
            WHERE WINXREF = :case_number
            FETCH FIRST 1 ROW ONLY`,
        { case_number },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ใช้ constant แทนตัวเลข 2
      );

      // ✅ cast ที่ rows แทน generic บน execute (แก้ "Untyped function calls")
      const rows = result.rows as ORDER_SPIN_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByIdSpin_Stmt(
    case_number: string,
  ): Promise<STMT_SPIN_ENTITY | null> {
    return withConnection(async (conn) => {
      // 🌟 Scenario ແນະນຳ: ໃຊ້ UNION ALL ແທນ OR ເພື່ອໃຫ້ Oracle ໃຊ້ Index ໄດ້ 100% ແລະ ແກ້ບັນຫາ Bind parameter ຊ້ຳ
      const sql = `
        SELECT * FROM (
          SELECT * FROM V_SPIN_STATEMENT_ALL WHERE XREF = :case_1
          UNION ALL
          SELECT * FROM V_SPIN_STATEMENT_ALL WHERE BILLNUMBER = :case_2
        )
        FETCH FIRST 1 ROW ONLY
      `;

      const result = await conn.execute(
        sql,
        {
          case_1: case_number,
          case_2: case_number,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ຖືກຕ້ອງແລ້ວ
      );

      // ✅ Cast type ເພື່ອປ້ອງກັນ Untyped function calls ຢ່າງປອດໄພ
      const rows = result.rows as STMT_SPIN_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }
}
