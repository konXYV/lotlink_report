// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/JDB"; // ✅ path ต้องมี /api/ นำหน้า

class JDBServiceClass {
  async useGet_Reward_JDB_STMT(BillNumber: string) {
    if (!BillNumber?.trim()) return null; // ✅ guard

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "stmtJDB",
        BillNumber: BillNumber.trim(),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }
}

export const JDB_Service = new JDBServiceClass();
