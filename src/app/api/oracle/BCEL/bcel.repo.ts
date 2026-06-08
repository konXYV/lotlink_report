// src/app/api/oracle/Cases_support/repo/Repo_Cases.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db"; // ✅ path ถูกต้อง
import {
  Orders_BCEL,
  REWARD_BCEL,
  BCEL_STMT_ENTITY,
} from "../../../CASES-LOTTO/types/Type_bcel";

export class BCEL_Repo {
  async findByIdOrder(case_number: string): Promise<Orders_BCEL | null> {
    return withConnection(async (conn) => {
      const sql = `
      SELECT * FROM (
        SELECT * FROM APP_V_ORDER_BCEL WHERE LOTO_BILL_NO             LIKE :case_1
        UNION ALL
        SELECT * FROM APP_V_ORDER_BCEL WHERE PJRRNO                   LIKE :case_2
        UNION ALL
        SELECT * FROM APP_V_ORDER_BCEL WHERE POINT_CONSUMED_REFERENCE LIKE :case_3
      )
      FETCH FIRST 1 ROW ONLY
    `;

      const result = await conn.execute(
        sql,
        {
          case_1: `%${case_number}%`,
          case_2: `%${case_number}%`,
          case_3: `%${case_number}%`,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as Orders_BCEL[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByBillNumber_Reward(
    BillNumber: string,
  ): Promise<REWARD_BCEL | null> {
    return withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT * FROM APP_V_REWARD_BCEL
          WHERE TICKETID = :BillNumber`,
        { BillNumber },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ใช้ constant แทนตัวเลข 2
      );

      // ✅ cast ที่ rows แทน generic บน execute (แก้ "Untyped function calls")
      const rows = result.rows as REWARD_BCEL[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByBillNumber_STMT(
    BillNumber: string,
  ): Promise<BCEL_STMT_ENTITY | null> {
    return withConnection(async (conn) => {
      // 🌟 Scenario ແນະນຳ: ໃຊ້ UNION ALL ແທນ OR ເພື່ອໃຫ້ Oracle ໃຊ້ Index ໄດ້ 100% ແລະ ແກ້ບັນຫາ Bind parameter ຊ້ຳ
      const sql = `
        SELECT * FROM (
          SELECT * FROM APP_V_BCEL_STMT WHERE LOTTO_BILL_NO = :case_1
          UNION ALL
          SELECT * FROM APP_V_BCEL_STMT WHERE REFERENCE_ID = :case_2
        )
        FETCH FIRST 1 ROW ONLY
      `;

      const result = await conn.execute(
        sql,
        {
          case_1: BillNumber,
          case_2: BillNumber,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ຖືກຕ້ອງແລ້ວ
      );

      // ✅ Cast type ເພື່ອປ້ອງກັນ Untyped function calls ຢ່າງປອດໄພ
      const rows = result.rows as BCEL_STMT_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }
}
