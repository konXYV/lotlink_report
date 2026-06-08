// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/BCEL"; // ✅ path ต้องมี /api/ นำหน้า

class BCELServiceClass {
  async fetchById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "OrderBCEL",
        caseNumber: caseNumber, // ✅ route รับ p.get("id") ไม่ใช่ case_number
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅ unwrap { success, data } → return แค่ data
  }

  async fetchByIdSTMT(BillNumber: string) {
    if (!BillNumber?.trim()) return null; // ✅ guard

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "stmtBCEL",
        BillNumber: BillNumber.trim(),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }

  async fetchById_Reward_BCEL(BillNumber: string) {
    if (!BillNumber?.trim()) return null; // ✅ guard

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "rewardBCEL",
        BillNumber: BillNumber.trim(),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }
}

export const BCEL_Service = new BCELServiceClass();
