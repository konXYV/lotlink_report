// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/LDB"; //

class LDBServiceClass {
  async fetchOrderById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "OrderLDB",
        caseNumber: caseNumber, // ✅
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅
  }

  async fetchByIdSTMT(BillNumber: string) {
    if (!BillNumber?.trim()) return null; // ✅ guard

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "stmtLDB",
        BillNumber: BillNumber.trim(),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }

  async fetchById_Reward_LDB(BillNumber: string) {
    if (!BillNumber?.trim()) return null; // ✅ guard

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "rewardLDB",
        BillNumber: BillNumber.trim(),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }

  async fetchLotoUser(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "lotoUser",
        caseNumber: caseNumber, // ✅
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅
  }
}

export const LDB_Service = new LDBServiceClass();
