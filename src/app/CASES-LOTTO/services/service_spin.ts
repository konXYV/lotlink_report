// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/SPIN"; // ✅ path ต้องมี /api/ นำหน้า

class BCELServiceClass {
  async fetchSpinById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "OrderSpin",
        caseNumber: caseNumber, // ✅ route รับ p.get("id") ไม่ใช่ case_number
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅ unwrap { success, data } → return แค่ data
  }

  async fetchSpinStmtById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "StmtSpin",
        caseNumber: caseNumber, // ✅ route รับ p.get("id") ไม่ใช่ case_number
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅ unwrap { success, data } → return แค่ data
  }
}

export const BCEL_Service = new BCELServiceClass();
